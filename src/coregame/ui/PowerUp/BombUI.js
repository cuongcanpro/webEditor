CoreGame.BombUI = CoreGame.PowerUpUI.extend({
    resAnim: resAni.pu_bomb,

    ctor: function (element) {
        this._super(element);
        return true;
    },

    initSprite: function () {
        this._super();

        for (let anim of this.anims) {
            anim.setScale(0.55);
        }
    },

    setMixAnim: function () {
    },

    startActive: function () {
        this.setLocalZOrder(CoreGame.ZORDER_BOARD_EFFECT);

        cc.log("CoreGame.BombPU startActive", this.element.type);
        let delayTime = CoreGame.BombPU.EXPLODE_DELAY;
        if (this.element.area === CoreGame.BombPUPlus.AREA) {
            this.mainSpr.setAnimation(0, "active", false);
            delayTime = CoreGame.BombPUPlus.EXPLODE_DELAY;
        } else {
            this.mainSpr.runAction(cc.scaleTo(CoreGame.BombPU.EXPLODE_DELAY, 0).easing(cc.easeBackIn()));
        }

        this.runAction(cc.sequence(
            // cc.scaleTo(0.2, 1.5 * this.getScaleX(), 1.5 * this.getScaleY()),
            cc.delayTime(delayTime),
            cc.callFunc(function () {
                this.showEffectExplode();
            }.bind(this)),
            cc.delayTime(CoreGame.BombUI.DELAY_REMOVE),
            cc.removeSelf()
        ));

        return true;
    },

    showEffectExplode: function () {
        // Shake screen if method exists on boardUI
        fr.Sound.playSoundEffect(resSound.active_bomb, false);
        CoreGame.BoardUI.getInstance().shakeScreen(5);

        // let pos = this.getParent().convertToWorldSpace(this.getPosition());
        // let timelineFx = gv.createTLFX(
        //     "pu_giftbox_explosion",
        //     pos,
        //     this.getParent(),
        //     CoreGame.Config.zOrder.MATCH_4_EXPLODE + 1
        // );
        // timelineFx.runAction(cc.sequence(
        //     cc.delayTime(0.2),
        //     cc.removeSelf()
        // ));

        // Spine explosion effect
        this.bombSpine = gv.createSpineAnimation(resAni.bomb_spine);
        this.bombSpine.setPosition(this.x, this.y);
        this.bombSpine.setScale(CoreGame.BombUI.SCALE * ((this.element.area * 2 + 1) / 5));
        this.getParent().addChild(this.bombSpine, CoreGame.Config.zOrder.MATCH_4_EXPLODE);

        this.bombSpine.setAnimation(0, "animation", false);
        gv.removeSpineAfterRun(this.bombSpine);
    },

    onExit: function () {
        this._super();
    }
});
CoreGame.BombUI.SCALE = 0.55;
CoreGame.BombUI.DELAY_REMOVE = 1.5;
