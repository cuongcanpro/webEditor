let SceneBoard = BaseLayer.extend({
    ctor: function () {
        this._super(SceneBoard.className);
    },

    onEnterFinish: function () {
    },

    playMusic: function () {
        fr.Sound.playMusic(resMusic.ingame, true);
    },

    setLevel: function (level) {
        let mapData = levelMgr.getMapDataConfig(level);
        JSON.stringify("startPlayNewCore", JSON.stringify(mapData));

        CoreGame.BoardUI.instance = null;
        this.gameUI = new CoreGame.GameUI({ mapConfig: mapData}, false);

        this.addChild(this.gameUI);

        if (userMgr.getData().getLevel() === level) {
            if (!narrativeMgr.checkNarrative(SceneBoard.className, this)){
                this.gameUI.efxStart();
            }
        } else {
            this.gameUI.efxStart();
        }

        if (narrativeMgr.getCurrentAction() !== NarrativeManager.ACTIONS.SHOW_OFFLINE_VIDEO) {
            this.playMusic();
        }
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