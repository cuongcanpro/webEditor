CoreGame.PlaneUI = CoreGame.PowerUpUI.extend({
    resAnim: resAni.pus_spine,
    targetSlot: null,

    ANGLE: 30,
    TIME_FLY: 1.0,
    RADIUS: 200,

    stepStart: false,
    stepEnd: false,

    ctor: function (element) {
        this._super(element);
        this.targetSlot = null;
        this.stepStart = false;
        this.stepEnd = false;
        this.prePos = this.getPosition();
        this.desPos = null;
        return true;
    },

    initSprite: function () {
        this._super();

        for (let anim of this.anims) {
            anim.setPosition(CoreGame.PlaneUI.OFF_SET);
            anim.setScale(CoreGame.PlaneUI.SCALE);
        }
    },

    initSpine: function () {
        // cc.MotionStreak(fade, minSeg, stroke, color, texture)
        //   fade   — seconds each trail segment survives. Bigger = longer tail.
        //   minSeg — min pixel distance between emitted points (lower = smoother).
        //   stroke — line thickness in pixels.
        this.trail = new cc.MotionStreak(0.8, 3, 30, cc.color.WHITE, "res/modules/game/element/streak.png");
        this.trail.setBlendFunc(new cc.BlendFunc(1, 1));
        this.getParent().addChild(this.trail, this.getLocalZOrder() - 1);

        // Do NOT add the streak as a child of `this` — a MotionStreak needs
        // its own position to change frame-to-frame (in its parent's coord
        // space) to emit trail segments. If it's a child of the moving plane
        // its local position stays at (0,0) and no streak is ever produced.
        // We add it to the board (this.getParent()) in startFlyTo, and sync
        // its position from flyPlane().
        this.trail.setVisible(false);
    },

    onEnter: function () {
        this._super();
        this.scheduleUpdate();
    },

    onExit: function () {
        this.unscheduleUpdate();
        this._super();
    },

    update: function (dt) {
        this.flyPlane(dt);
    },

    startActive: function (targetGrid) {
        this.setLocalZOrder(CoreGame.ZORDER_BOARD_EFFECT);
        fr.Sound.playSoundEffect(resSound.active_plane, false);

        this.mainSpr.setAnimation(0, "active", true);

        if (!this.element.isSubPU) {
            this.showEffectExplode();
        }

        // [IMPROVEMENT] Guard: null target → plane activates visually but doesn't fly
        if (!targetGrid) {
            cc.log("[PlaneUI] No target found, skipping flight");
            var self = this;
            this.runAction(cc.sequence(
                cc.delayTime(0.5),
                cc.callFunc(function () {
                    self.removeFromParent();
                })
            ));
        }

        // var self = this;
        // this.runAction(cc.sequence(
        //     cc.delayTime(0.2),
        //     cc.callFunc(function () {
        //         self.startFlyTo(targetGrid);
        //     })
        // ));
    },

    showEffectExplode: function () {
        this.setLocalZOrder(CoreGame.Config.zOrder.PUS_FLY);

        this.planeSpine = gv.createSpineAnimation(resAni.pus_bullet_1_spine);
        this.planeSpine.setPosition(this.element.boardMgr.gridToPixel(this.element.position.x, this.element.position.y));
        this.planeSpine.setScale(0.8);
        this.getParent().addChild(this.planeSpine, CoreGame.Config.zOrder.MATCH_4_EXPLODE);

        this.planeSpine.setAnimation(0, "run", false);
        gv.removeSpineAfterRun(this.planeSpine);
    },

    /**
     * Begin flight toward targetGrid.
     *
     * [IMPROVEMENT] Guard: if targetGrid slot is now empty (cleared between
     * activeLogic pick and actual flight start 0.2s later), play a small
     * "confused" effect and remove self rather than flying to an empty slot.
     */
    startFlyTo: function (targetGrid) {
        if (!targetGrid) return;

        // [IMPROVEMENT] Check if target became empty between pick and flight start.
        // Can happen if another power-up chain cleared it in those 0.2s.
        if (targetGrid.isEmpty && targetGrid.isEmpty()) {
            cc.log("[PlaneUI] Target slot empty at flight start, cancelling");
            this.removeFromParent();
            return;
        }

        this.targetSlot = targetGrid;
        this.stepStart = true;
        this.stepEnd = false;
        this.prePos = this.getPosition();

        // Get pixel position from slot
        var targetPos = targetGrid.getPosition();
        this.desPos = cc.p(targetPos.x, targetPos.y);

        if (!this.trail) {
            this.initSpine();
        }
        // Reset any stale segments from a previous flight.
        if (this.trail.reset) this.trail.reset();
        this.trail.setVisible(true);

        return this.movePlane();
    },

    flyPlane: function (dt) {
        if (!this.stepStart || this.stepEnd) return;
        var cur = this.getPosition();
        if (!this.prePos) {
            this.prePos = cur;
            return;
        }

        var dX = cur.x - this.prePos.x;
        var dY = cur.y - this.prePos.y;
        if (dX === 0 && dY === 0) return;

        var angle = Math.atan2(dX, dY) * (180 / Math.PI) - this.ANGLE;
        this.setRotation(angle);

        // Feed the plane's world-space position to the streak each frame so
        // it emits trail segments along the flight path. The streak lives
        // under the same parent as the plane, so plane-local == streak-local.
        if (this.trail && cc.sys.isObjectValid(this.trail)) {
            this.trail.setPosition(cur);
        }

        this.prePos = cur;
    },

    movePlane: function () {
        if (!this.desPos) return 0;

        var startPos = this.getPosition();
        var dir = cc.p(this.desPos.x - startPos.x, this.desPos.y - startPos.y);
        var len = Math.sqrt(dir.x * dir.x + dir.y * dir.y);
        if (len <= 0.001) {
            this.onArrive();
            return 0;
        }

        dir.x /= len;
        dir.y /= len;

        var perp = cc.p(-dir.y, dir.x);
        var offset = Math.min(this.RADIUS, len * 0.5);
        if (Math.random() < 0.5) offset = -offset;

        var c1 = cc.p(
            startPos.x + dir.x * (len * 0.33) + perp.x * offset,
            startPos.y + dir.y * (len * 0.33) + perp.y * offset
        );
        var c2 = cc.p(
            startPos.x + dir.x * (len * 0.66) + perp.x * offset,
            startPos.y + dir.y * (len * 0.66) + perp.y * offset
        );

        // Scale TIME_FLY with the actual path length (bezier arc length)
        // so the plane keeps a consistent speed regardless of distance /
        // curvature. TIME_FLY is treated as the time to cover the
        // straight-line distance `len`; a longer curved path scales up
        // proportionally.
        var bezierLen = this._computeBezierLength(startPos, c1, c2, this.desPos, 24);
        var flyTime = Math.max(Math.min(
            this.TIME_FLY * (bezierLen / (CoreGame.Config.CELL_SIZE * 5)),
            CoreGame.PlaneUI.MAX_FLY
        ), CoreGame.PlaneUI.MIN_FLY);

        this.runAction(cc.sequence(
            cc.spawn(
                cc.sequence(
                    cc.scaleTo(flyTime * 0.5, CoreGame.PlaneUI.SCALE * 2).easing(cc.easeOut(2.5)),
                    cc.scaleTo(flyTime * 0.5, CoreGame.PlaneUI.SCALE).easing(cc.easeIn(2.5))
                ),
                cc.bezierTo(
                    flyTime, [c1, c2, this.desPos]
                ).easing(cc.easeBezierAction(0, 0.4, 0.6, 1))
            ),
            cc.callFunc(function () {
                this.onArrive();
            }.bind(this))
        ));

        return flyTime;
    },

    /**
     * Approximate the arc length of a cubic bezier by sampling.
     * @param {cc.Point} p0 start
     * @param {cc.Point} p1 control 1
     * @param {cc.Point} p2 control 2
     * @param {cc.Point} p3 end
     * @param {number} [samples=20] number of line segments to sum
     * @returns {number} approximate curve length
     */
    _computeBezierLength: function (p0, p1, p2, p3, samples) {
        samples = samples || 20;
        var total = 0;
        var prevX = p0.x;
        var prevY = p0.y;
        for (var i = 1; i <= samples; i++) {
            var t = i / samples;
            var mt = 1 - t;
            var b0 = mt * mt * mt;
            var b1 = 3 * mt * mt * t;
            var b2 = 3 * mt * t * t;
            var b3 = t * t * t;
            var x = b0 * p0.x + b1 * p1.x + b2 * p2.x + b3 * p3.x;
            var y = b0 * p0.y + b1 * p1.y + b2 * p2.y + b3 * p3.y;
            var dx = x - prevX;
            var dy = y - prevY;
            total += Math.sqrt(dx * dx + dy * dy);
            prevX = x;
            prevY = y;
        }
        return total;
    },

    onArrive: function () {
        if (this.stepEnd) return;
        this.stepEnd = true;
        this.stepStart = false;
        this.showEffectFlyDone();
        // if (this.trail && cc.sys.isObjectValid(this.trail)) {
        //     this.trail.removeFromParent(true);
        //     this.trail = null;
        // }
        this.removeFromParent();
    },

    showEffectFlyDone: function () {
        fr.Sound.playSoundEffect(resSound.explosion_done, false);

        this.planeSpine3 = gv.createSpineAnimation(resAni.pus_bullet_3_spine);
        this.planeSpine3.setPosition(this.getPosition());
        this.getParent().addChild(this.planeSpine3, this.getLocalZOrder() + 100);
        this.planeSpine3.setAnimation(0, "run", false);
        gv.removeSpineAfterRun(this.planeSpine3);

        // let nodeTLFX = gv.createTLFX(
        //     'debris_balloon',
        //     cc.p(this.x, this.y + CoreGame.Config.CELL_SIZE),
        //     this.getParent(),
        //     this.getLocalZOrder() + 101
        // );
        // nodeTLFX.setScale(2 + Math.random() * 0.5);

        // if (this.trail && cc.sys.isObjectValid(this.trail)) this.trail.removeFromParent(true);

        if (this.trail && cc.sys.isObjectValid(this.trail)) {
            this.trail.runAction(cc.sequence(
                cc.delayTime(1),
                cc.removeSelf()
            ));
        }
    }
});
CoreGame.PlaneUI.OFF_SET = cc.p(-10, -15);
CoreGame.PlaneUI.SCALE = 0.725;
CoreGame.PlaneUI.DELAY = 0.2;
CoreGame.PlaneUI.MAX_FLY = 1;
CoreGame.PlaneUI.MIN_FLY = 0.25;