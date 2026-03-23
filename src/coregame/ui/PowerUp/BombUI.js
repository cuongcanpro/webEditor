CoreGame.BombUI = CoreGame.PowerUpUI.extend({
    resAnim: resAni.pu_bomb,

    ctor: function (element) {
        this._super(element);
        return true;
    },

    startActive: function () {
        this.setLocalZOrder(CoreGame.ZORDER_BOARD_EFFECT);
        fr.Sound.playSoundEffect(resSound.active_bomb, false);

        this.mainSpr.setAnimation(0, "active", false);

        this.runAction(cc.sequence(
            // cc.scaleTo(0.2, 1.5 * this.getScaleX(), 1.5 * this.getScaleY()),
            cc.delayTime(CoreGame.PowerUpUI.DEFAULT_DELAY),
            cc.callFunc(function () {
                this.showEffectExplode();
                this.removeFromParent();
            }.bind(this))
        ));

        return true;
    },

    showEffectExplode: function () {
        // Shake screen if method exists on boardUI
        CoreGame.BoardUI.getInstance().shakeScreen(5);

        let pos = this.getParent().convertToWorldSpace(this.getPosition());
        let timelineFx = gv.createTLFX(
            "pu_giftbox_explosion",
            pos,
            this.getParent(),
            BoardConst.zOrder.MATCH_4_EXPLODE + 1
        );
        timelineFx.runAction(cc.sequence(
            cc.delayTime(0.2),
            cc.removeSelf()
        ));

        // Spine explosion effect
        this.bombSpine = gv.createSpineAnimation(resAni.bomb_spine);
        this.bombSpine.setPosition(this.x, this.y);
        this.bombSpine.setScale(0.5);
        this.getParent().addChild(this.bombSpine, BoardConst.zOrder.GEM_SWAP);

        this.bombSpine.setAnimation(0, "animation", false);
        gv.removeSpineAfterRun(this.bombSpine);
    },

    onExit: function () {
        this._super();
    }
});
