CoreGame.RainbowUI = CoreGame.PowerUpUI.extend({
    resAnim: resAni.pu_rainbow,
    targetSlot: null,

    ctor: function (element) {
        this._super(element);
        this.listTargetPos = [];
        this.listHitFx = [];
        return true;
    },

    initSprite: function () {
        this._super();
        this.mainSpr.setScale(CoreGame.RainbowUI.DEFAULT_SCALE);
        this.whiteSpr.setScale(CoreGame.RainbowUI.DEFAULT_SCALE);
    },

    setMixAnim: function () {
        // for (let anim of this.anims) {
        //     anim.setMix("init", "run", 0.2);
        //     anim.setMix("run", "active", 0.2);
        // }
    },

    setTargets: function (listPos) {
        this.listTargetPos = listPos;
    },

    setOnTargetHit: function (callback) {
        this.onTargetHit = callback;
    },

    startActive: function () {
        this.setLocalZOrder(CoreGame.ZORDER_BOARD_EFFECT);
        fr.Sound.playSoundEffect(resSound.active_disco, false);

        this.mainSpr.setAnimation(0, "active", true);

        this.runAction(cc.sequence(
            cc.delayTime(0.3),
            cc.callFunc(function () {
                this.showEffectExplode();
            }.bind(this))
        ));

        // Estimate total animation time: 0.3 (start) + (N * 0.1) (rays) + 0.5 (buffer)
        return 0.8 + this.listTargetPos.length * 0.1;
    },

    showEffectExplode: function () {
        var selfPos = this.getPosition();
        var parent = this.getParent();

        // Self explosion visuals
        var spineExplode = gv.createSpineAnimation(resAni.rainbow_spine);
        spineExplode.setPosition(selfPos);
        parent.addChild(spineExplode, BoardConst.zOrder.MATCH_4_EXPLODE);
        spineExplode.setAnimation(0, "run", false);
        gv.removeSpineAfterRun(spineExplode);

        if (typeof gv.createEfk === "function") {
            var boardUI = CoreGame.BoardUI.getInstance();
            var efkManager = (boardUI && boardUI.efkManager) ? boardUI.efkManager : null;
            if (efkManager) {
                var emitter = gv.createEfk(efkManager, resAni.rainbow_efk);
                emitter.setPosition3D(cc.math.vec3(selfPos.x, selfPos.y, 0));
                parent.addChild(emitter, BoardConst.zOrder.MATCH_4_EXPLODE);
            }
        }

        // Shooting rays to targets
        var listAction = [];
        for (var i = 0; i < this.listTargetPos.length; i++) {
            var targetPos = this.listTargetPos[i];

            listAction.push(cc.callFunc(function (pos, index) {
                this.createRay(pos, index);
            }.bind(this, targetPos, i)));

            listAction.push(cc.delayTime(0.1));
        }

        // Final cleanup after shooting all rays + some buffer
        listAction.push(cc.delayTime(0.5));
        listAction.push(cc.callFunc(function () {
            this.removeFromParent();
        }.bind(this)));

        this.runAction(cc.sequence(listAction));
    },

    createRay: function (toPos, index) {
        var parent = this.getParent();
        var selfPos = this.getPosition();

        fr.Sound.playSoundEffect(resSound.disco_shot, false);

        // Ray Spine
        var ray = gv.createSpineAnimation(resAni.rainbow_ray_spine);
        ray.setPosition(selfPos);
        parent.addChild(ray, BoardConst.zOrder.MATCH_4_EXPLODE);

        var dir = cc.p(selfPos.x - toPos.x, selfPos.y - toPos.y);
        var angle = Math.atan2(dir.x, dir.y) * (180 / Math.PI) - 180;
        ray.setRotation(angle);

        var distance = cc.pDistance(selfPos, toPos);
        ray.setScale(1.0, Math.abs(distance / 200));
        ray.setAnimation(0, "run", false);

        // Ray completion logic
        ray.runAction(cc.sequence(
            cc.delayTime(0.1),
            cc.callFunc(function () {
                fr.platformWrapper.hapticTouch(HAPTIC_TOUCH_TYPE.SOFT);
                this.showHitEffect(toPos, index);
            }.bind(this)),
            cc.delayTime(0.2),
            cc.removeSelf()
        ));
    },

    showHitEffect: function (pos, index) {
        var parent = this.getParent();
        var boardUI = CoreGame.BoardUI.getInstance();
        var efkManager = (boardUI && boardUI.efkManager) ? boardUI.efkManager : null;

        // Hit Spine
        var hit = gv.createSpineAnimation(resAni.rainbow_hit_spine);
        hit.setPosition(pos);
        parent.addChild(hit, BoardConst.zOrder.MATCH_4_EXPLODE);
        hit.setAnimation(0, "run", true);

        // Hit Particle
        if (efkManager) {
            var emitterHit = gv.createEfk(efkManager, resAni.rainbow_hit_efk);
            emitterHit.setPosition3D(cc.math.vec3(pos.x, pos.y, 0));
            parent.addChild(emitterHit, BoardConst.zOrder.MATCH_4_EXPLODE);
        }
        if (this.onTargetHit) {
            this.onTargetHit(index);
        }
        this.listHitFx.push(hit);
    },

    onExit: function () {
        var boardUI = CoreGame.BoardUI.getInstance();
        var efkManager = (boardUI && boardUI.efkManager) ? boardUI.efkManager : null;
        for (var i = 0; i < this.listHitFx.length; i++) {
            var hit = this.listHitFx[i];
            hit.runAction(cc.sequence(
                cc.delayTime(0.4),
                cc.callFunc(function () {
                    var endFx = gv.createSpineAnimation(resAni.rainbow_end_spine);
                    endFx.setPosition(this.getPosition());
                    this.getParent().addChild(endFx, BoardConst.zOrder.MATCH_4_EXPLODE);
                    endFx.setAnimation(0, "run", false);
                    gv.removeSpineAfterRun(endFx);

                    if (efkManager) {
                        var emitterEnd = gv.createEfk(efkManager, resAni.rainbow_end_efk);
                        emitterEnd.setPosition3D(cc.math.vec3(this.x, this.y, 0));
                        this.getParent().addChild(emitterEnd, BoardConst.zOrder.MATCH_4_EXPLODE);
                    }

                    this.removeFromParent();
                    fr.Sound.playSoundEffect(resSound.explosion_done, false);
                }.bind(hit)
                )
            ));
        }
        this._super();
    }
});
CoreGame.RainbowUI.DEFAULT_SCALE = 0.5;

/**
 * RainbowPlusUI - UI for Rainbow+Rainbow combo.
 * Only plays the center explosion, no per-target rays or hit effects.
 */
CoreGame.RainbowPlusUI = CoreGame.RainbowUI.extend({
    startActive: function () {
        this.setLocalZOrder(CoreGame.ZORDER_BOARD_EFFECT);
        fr.Sound.playSoundEffect(resSound.active_disco, false);

        this.mainSpr.setVisible(false);


        var boardUI = CoreGame.BoardUI.getInstance();
        var efkManager = (boardUI && boardUI.efkManager) ? boardUI.efkManager : null;
        if (efkManager && typeof gv.createEfk === "function") {
            var effParticle = gv.createEfk(efkManager, resAni.rainbowX2_explosion_efk);
            effParticle.setPosition3D(cc.math.vec3(this.x, this.y, 0));
            this.getParent().addChild(effParticle, BoardConst.zOrder.EFF_MATCHING);
        }

        //Disco combine
        this.rainbowX2MergeSpine = gv.createSpineAnimation(resAni.rainbowX2_merge_spine);
        this.rainbowX2MergeSpine.setPosition(this.x, this.y);
        var zOrder = UIUtils.getLocalZOrderMax(this.getParent());
        var fog = UIUtils.addFog(this.getParent(), zOrder, null, null, 0);
        fog.runAction(cc.sequence(
            cc.fadeTo(0.2, 200), cc.delayTime(1.8), cc.fadeOut(0.2), cc.removeSelf()
        ));
        this.getParent().addChild(this.rainbowX2MergeSpine, zOrder + 1);
        this.rainbowX2MergeSpine.setAnimation(0, "active", false);
        gv.removeSpineAfterRun(this.rainbowX2MergeSpine);

        this.rainbowX2MergeSpine.runAction(cc.rotateBy(
            CoreGame.RainbowPlusUI.EXPLODE_TIME, 360 * 5
        ).easing(cc.easeIn(5)));

        this.runAction(cc.sequence(
            cc.delayTime(CoreGame.RainbowPlusUI.EXPLODE_TIME),
            cc.callFunc(function () {
                this.showEffectExplode();
            }.bind(this))
        ));

        return CoreGame.RainbowPlusUI.EXPLODE_TIME;
    },

    showEffectExplode: function () {
        fr.platformWrapper.hapticTouch(HAPTIC_TOUCH_TYPE.HEAVY);

        var selfPos = this.getPosition();
        var parent = this.getParent();

        // Center explosion visuals only — no rays or hit effects
        var spineExplode = gv.createSpineAnimation(resAni.rainbow_spine);
        spineExplode.setPosition(selfPos);
        parent.addChild(spineExplode, BoardConst.zOrder.MATCH_4_EXPLODE);
        spineExplode.setAnimation(0, "run", false);
        gv.removeSpineAfterRun(spineExplode);

        if (typeof gv.createEfk === "function") {
            var boardUI = CoreGame.BoardUI.getInstance();
            var efkManager = (boardUI && boardUI.efkManager) ? boardUI.efkManager : null;
            if (efkManager) {
                var emitter = gv.createEfk(efkManager, resAni.rainbow_efk);
                emitter.setPosition3D(cc.math.vec3(selfPos.x, selfPos.y, 0));
                parent.addChild(emitter, BoardConst.zOrder.MATCH_4_EXPLODE);
            }
        }

        // Cleanup after explosion
        this.runAction(cc.sequence(
            cc.delayTime(0.5),
            cc.callFunc(function () {
                fr.Sound.playSoundEffect(resSound.explosion_done, false);
            }),
            cc.removeSelf()
        ));
    }
});
CoreGame.RainbowPlusUI.EXPLODE_TIME = 2.3;
