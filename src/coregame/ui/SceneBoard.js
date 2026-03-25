let SceneBoard = BaseLayer.extend({
    ctor: function () {
        this._super(SceneBoard.className);
    },

    onEnterFinish: function () {

    },

    setLevel: function (level) {
        if (userInfo.getLevel() === level) {
            narrativeMgr.checkNarrative(SceneBoard.className, this);
        }

        let mapData = {};
        let levelPath = "res/maps/level_" + (level) + ".json";
        mapData = JSON.parse(jsb.fileUtils.getStringFromFile(levelPath));

        JSON.stringify("startPlayNewCore", JSON.stringify(mapData));

        CoreGame.BoardUI.instance = null;
        this.gameUI = new CoreGame.GameUI({ mapConfig: mapData}, false);

        this.addChild(this.gameUI);
    },

    specialStartEfx: function () {

    },

    addPlayNewCore: function (gameUI) {
        this.gameUI = gameUI;
        this.addChild(this.gameUI);
        this.gameUI.efxStart();
    },

    onBuyMoveSuccess: function () {
        cc.log("SCENE BOARD onBuyMoveSuccess", this.gameUI);
        if (this.gameUI) {
            cc.log("SCENE BOARD onBuyMoveSuccess", this.gameUI.onBuyMoveSuccess);
            this.gameUI.onBuyMoveSuccess();
        }
    },

    getLevelWithVer: function () {
        if (this.gameUI) {
            return this.gameUI.getLevelWithVer();
        }
        return "";
    },
});
SceneBoard.className = "SceneBoard";