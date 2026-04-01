CoreGame.PowerUpUI = CoreGame.ElementUI.extend({
    resAnim: "",
    skin: "normal",

    initSprite: function () {
        this.mainSpr = gv.createSpineAnimation(this.resAnim);
        this.mainSpr.setScale(CoreGame.PowerUpUI.DEFAULT_SCALE);
        this.mainSpr.setSkin(this.skin);

        this.whiteSpr = gv.createSpineAnimation(this.resAnim + "_white");
        this.whiteSpr.setScale(CoreGame.PowerUpUI.DEFAULT_SCALE);
        this.whiteSpr.setSkin(this.skin);

        this.anims = [this.mainSpr, this.whiteSpr];
        this.spawnAnim();

        this.addChild(this.mainSpr);
        this.addChild(this.whiteSpr);

        this.setLocalZOrder(BoardConst.zOrder.POWER_UP);
    },

    setMixAnim: function () {
        for (let anim of this.anims) {
            anim.setMix("init", "run", 0.2);
            anim.setMix("run", "active", 0.2);
        }
    },

    spawnAnim: function () {
        this.setMixAnim();
        for (let anim of this.anims) {
            anim.setAnimation(0, "init", false);
            anim.addAnimation(0, "run", true);
        }

        this.spawnHaptic();

        if (this.whiteSpr.isVisible()) {
            this.whiteSpr.runAction(cc.sequence(
                cc.callFunc(function () {
                    //Efx sparkle
                    let pos = UIUtils.getWorldPosition(this);
                    let nodeTLFX = gv.createTLFX(
                        "fx_blink_meta",
                        pos,
                        this.getParent(),
                        this.getLocalZOrder() - 1
                    );
                    nodeTLFX.setScale(0.5 + Math.random() * 0.1);
                }.bind(this)),
                cc.fadeOut(CoreGame.Config.CONVERGE_DURATION).easing(cc.easeOut(2.5)),
                cc.hide()
            ));
        }
    },

    spawnHaptic: function (delay = 0) {
        this.runAction(cc.sequence(
            cc.delayTime(delay),
            cc.callFunc(function () {
                fr.platformWrapper.hapticTouch(HAPTIC_TOUCH_TYPE.RIGID);
            }.bind(this))
        ));

    },

    /**
     * Play spawn animation
     */
    playSpawnAnim: function (delayTime = 0) {
        this.setVisible(false);
        this.runAction(cc.sequence(
            cc.delayTime(delayTime),
            cc.callFunc(this.spawnAnim.bind(this)),
            cc.show()
        ));

        return delayTime;
    },
});
CoreGame.PowerUpUI.DEFAULT_SCALE = CoreGame.Config.CELL_SIZE / 110;
CoreGame.PowerUpUI.DEFAULT_DELAY = 0.1;
CoreGame.PowerUpUI.DELETE_DELAY = 0.2;
CoreGame.PowerUpUI.SKIN = {
    NORMAL: "normal",
    CREATE_FROM_RAINBOW: "color"
};