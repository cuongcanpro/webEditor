CoreGame.PowerUpUI = CoreGame.ElementUI.extend({
    resAnim: "",
    skin: "normal",

    initSprite: function () {
        this.mainSpr = gv.createSpineAnimation(this.resAnim);
        this.mainSpr.setScale(CoreGame.PowerUpUI.DEFAULT_SCALE);
        this.mainSpr.setSkin(this.skin);

        this.anims = [this.mainSpr];
        this.spawnAnim();

        this.addChild(this.mainSpr);

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