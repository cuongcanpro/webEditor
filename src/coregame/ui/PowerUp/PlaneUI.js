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
        this.initSpine();
    },

    initSpine: function () {
        this.trail = new cc.MotionStreak(0.2, 10, 30, cc.color.WHITE, "res/high/game/element/streak.png");
        this.trail.setBlendFunc(new cc.BlendFunc(1, 1));
        this.addChild(this.trail);

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
        fr.Sound.playSoundEffect(resSound.active_plane, false)

        this.mainSpr.setAnimation(0, "active", true);

        this.showEffectExplode();
        var self = this;
        this.runAction(cc.sequence(
            cc.delayTime(0.2),
            cc.callFunc(function () {
                self.startFlyTo(targetGrid);
            })
        ));
    },

    showEffectExplode: function () {
        this.setLocalZOrder(BoardConst.zOrder.PUS_FLY);

        if (cc.sys.isObjectValid(this.trail)) {
            this.trail.setVisible(true);
        }

        // if (cc.sys.isObjectValid(this.planeSpine1)) {
        //     this.planeSpine1.setVisible(this.explodeNeighbor);
        //     this.planeSpine1.setAnimation(0, "run", false);
        //     gv.removeSpineAfterRun(this.planeSpine1);
        // }

        this.planeSpine = gv.createSpineAnimation(resAni.pus_bullet_1_spine);
        this.planeSpine.setPosition(this.x, this.y);
        this.getParent().addChild(this.planeSpine, BoardConst.zOrder.GEM_SWAP);

        this.planeSpine.setAnimation(0, "run", false);
        gv.removeSpineAfterRun(this.planeSpine);

        // let emitter = gv.createEfk(this.board.efkManager, resAni.pus_bullet_1_efk)
        // emitter.setPosition3D(cc.math.vec3(this.x, this.y, 0));
        // this.getParent().addChild(emitter, BoardConst.zOrder.GEM_SWAP);

        // this.planeSpine2.setAnimation(0, "run", true);
    },

    startFlyTo: function (targetGrid) {
        if (!targetGrid) return;

        this.targetSlot = targetGrid;
        this.stepStart = true;
        this.stepEnd = false;
        this.prePos = this.getPosition();

        // Get pixel position from slot
        var targetPos = targetGrid.getPosition();
        this.desPos = cc.p(targetPos.x, targetPos.y);

        if (this.trail && !this.trail.getParent() && this.getParent()) {
            this.trail.setPosition(this.getPosition());
            this.getParent().addChild(this.trail, this.getLocalZOrder() - 1);
        }
        if (this.trail) this.trail.setVisible(true);

        this.movePlane();
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
        this.prePos = cur;
    },

    movePlane: function () {
        if (!this.desPos) return;

        var startPos = this.getPosition();
        var dir = cc.p(this.desPos.x - startPos.x, this.desPos.y - startPos.y);
        var len = Math.sqrt(dir.x * dir.x + dir.y * dir.y);
        if (len <= 0.001) {
            this.onArrive();
            return;
        }

        dir.x /= len;
        dir.y /= len;

        var perp = cc.p(-dir.y, dir.x);
        var offset = Math.min(this.RADIUS, len * 0.5);
        if (Math.random() < 0.5) offset = -offset;

        var c1 = cc.p(startPos.x + dir.x * (len * 0.33) + perp.x * offset, startPos.y + dir.y * (len * 0.33) + perp.y * offset);
        var c2 = cc.p(startPos.x + dir.x * (len * 0.66) + perp.x * offset, startPos.y + dir.y * (len * 0.66) + perp.y * offset);

        this.runAction(cc.sequence(
            cc.bezierTo(this.TIME_FLY, [c1, c2, this.desPos]).easing(cc.easeSineInOut()),
            cc.callFunc(function () {
                this.onArrive();
            }.bind(this))
        ));
    },

    onArrive: function () {
        if (this.stepEnd) return;
        this.stepEnd = true;
        this.stepStart = false;
        this.showEffectFlyDone();
        if (this.trail && cc.sys.isObjectValid(this.trail)) {
            this.trail.removeFromParent(true);
            this.trail = null;
        }
        this.removeFromParent();
    },

    showEffectFlyDone: function () {
        fr.Sound.playSoundEffect(resSound.explosion_done, false);

        this.planeSpine3 = gv.createSpineAnimation(resAni.pus_bullet_3_spine);
        this.planeSpine3.setPosition(this.getPosition());
        this.getParent().addChild(this.planeSpine3, this.getLocalZOrder() + 100);
        //Run
        this.planeSpine3.setAnimation(0, "run", false);
        gv.removeSpineAfterRun(this.planeSpine3);


        let nodeTLFX = gv.createTLFX(
            'debris_balloon',
            cc.p(this.x, this.y + CoreGame.Config.CELL_SIZE),
            this.getParent(),
            this.getLocalZOrder() + 101
        );
        nodeTLFX.setScale(2 + Math.random() * 0.5);

        if (this.trail && cc.sys.isObjectValid(this.trail)) this.trail.removeFromParent(true);
    }
});