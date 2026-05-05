var GUILoadingBoardScene = cc.Scene.extend({
    ctor: function () {
        this._super();
        // this.setName(GameScene.LOADING_BOARD);
        this.layer = new GUILoadingBoard();
        this.addChild(this.layer);
        this.layer.setPosition(0, 0);

        fr.Sound.addHideAndShowGameListener(this);
    },

    switchToLobby: function () {
        cc.log("switchToLobby");
        if (this.layer.finishLoadLogo) {
            sceneMgr.openScene(SceneLobby.className);

            CoreGame.BlockerFactory.preloadAllConfigs();
            // cc.director.runScene(new SceneLobby);
        } else {
            this.layer.loadLogoDoneCallBack = function () {
                cc.director.runScene(new SceneLobby);
            }
        }
    },
});

var GUILoadingBoard = BaseLayer.extend({
    p0: null,
    p5: null,
    demo: null,

    bg: null,
    balloon: null,
    env: null,
    pbLoading: null,
    imgLoading: null,

    backgroundStreet: null,

    imgLoadingCircle: null,

    ctor: function (mainScene) {
        this._super();
        this.mainScene = mainScene;
        this.finishLoadLogo = false;
        this.loadLogoDoneCallBack = null;

        this.initWithJsonFile("res/modules/game/csd/GUILoadingBoard.json");
    },

    initLayer: function () {
        //set position
        this.bg.width = cc.winSize.width;
        this.bg.height = cc.winSize.height;

        this.balloon.x = this.bg.width / 2;
        this.env.x = this.bg.width / 2;
        this.pbLoading.x = this.bg.width / 2;
        this.imgLoading.x = this.bg.width / 2;


        // cc.log("Localization",('logo'+fr.Localization.getLang()))
        //this.logo = gv.createSpineAnimation(resAni['logo']);
        //
        //this.logo.setAnimation(0, 'start', false);
        // cc.log("logo start");

        // this.scheduleOnce(function () {
        //     this.logo.setAnimation(0, 'idle', true);
        //     cc.log("logo idle");
        //     if (this.loadLogoDoneCallBack) {
        //         this.loadLogoDoneCallBack();
        //     }
        //     this.finishLoadLogo = true;
        // }.bind(this), 2.5);

        if (this.loadLogoDoneCallBack) {
            this.loadLogoDoneCallBack();
        }
        this.finishLoadLogo = true;

        this.logo = new cc.Sprite("res/modules/no_pack/update/logo_" + Utility.getResourcesCountryCode() + ".png")
        this.logo.setPosition(this.backgroundStreet.width / 2, this.backgroundStreet.height * 0.81);
        this.backgroundStreet.addChild(this.logo);
        // this.bg.setVisible(false);
        this.backgroundStreet.setScale(cc.winSize.height / this.backgroundStreet.height)
        if (Utility.isIOS()) {
            this.env.setScaleX(cc.winSize.width / this.env.width);
        }
        this.bg.setPosition(cc.winSize.width / 2, cc.winSize.height / 2);

        this.p0.setVisible(false);
        this.p5.setVisible(false);
        this.demo.setVisible(false);
    },

    onEnterFinish: function () {
        this.imgLoadingCircle.stopAllActions();
        this.imgLoadingCircle.runAction(cc.rotateBy(2.5, 360).repeatForever());
    },

    show: function () {
        this.bg.setOpacity(0);
        this.bg.runAction(cc.fadeIn(0.2));
    },

    setCutScene: function (levelId = -1) {
        this.bg.setVisible(false);
        this.levelId = levelId;
        switch (this.levelId) {
            case 1:
                this.p0.setVisible(true);
                break;

            case 5:
                this.p5.setVisible(true);
                break;

            default:
                this.bg.setVisible(true);
                break;
        }
    },

    hide: function (cb) {
        let efxTime = 1;
        let deltaTime = 0.01;
        switch (this.levelId) {
            case 1:
                let bg = this.p0.getChildByName("0");
                bg.stopAllActions();
                bg.setPosition(cc.p(cc.winSize.width * 0.5, cc.winSize.height * 0.5));
                bg.setOpacity(255);
                bg.runAction(cc.spawn(
                    cc.fadeOut(efxTime * 0.5).easing(cc.easeIn(2.5))
                ));

                let p01 = this.p0.getChildByName("1");
                p01.setScaleX(this.p0.width / p01.width);
                p01.setScaleY(this.p0.height / p01.height);
                let crate = p01.getChildByName("crate");
                crate.runAction(cc.sequence(
                    cc.spawn(
                        cc.rotateTo(efxTime, 90).easing(cc.easeOut(2.5)),
                        cc.moveTo(
                            efxTime,
                            cc.p(cc.winSize.width * 0.5, cc.winSize.height * 0.5)
                        ).easing(cc.easeIn(2.5)),
                        cc.scaleTo(efxTime, 0).easing(cc.easeBackIn())
                    ),
                    cc.callFunc(function () {
                        this.setVisible(false);
                        cb && cb();
                    }.bind(this))
                ));
                break;

            case 5:
                let listGrass = [];
                for (let i = 0; i < (cc.winSize.width / (CoreGame.Config.SlotSize.WIDTH * 2)) + 1; i++) {
                    for (let j = 0; j < (cc.winSize.height / (CoreGame.Config.SlotSize.HEIGHT * 2)) + 1; j++) {
                        let newImg = fr.createSprite("grass_layer_" + (
                            Math.random() < 0.5 ? "1.png" : "2.png"
                        ));
                        this.p5.addChild(newImg);

                        newImg.setPosition(cc.p(
                            i * CoreGame.Config.SlotSize.WIDTH * 2, j * CoreGame.Config.SlotSize.HEIGHT * 2
                        ));
                        newImg.setScale(0);
                        listGrass.push(newImg);
                    }
                }

                let maxDelay = 0;
                let maxDelay2 = 0;
                for (let imgView of listGrass) {
                    imgView.setScale(0);
                    let delayTime = efxTime * Math.random();
                    let delayTime2 = efxTime * Math.random();
                    imgView.runAction(cc.sequence(
                        cc.delayTime(delayTime),
                        cc.scaleTo(efxTime * 0.5, 4 + Math.random() * 0.5).easing(cc.easeOut(2.5)),
                        cc.delayTime(efxTime - delayTime + delayTime2),
                        cc.scaleTo(efxTime * 0.5, 0).easing(cc.easeIn(2.5))
                    ));
                    imgView.setRotation(Math.random() * 360);
                    imgView.runAction(cc.sequence(
                        cc.delayTime(delayTime),
                        cc.rotateBy(efxTime + delayTime2, Math.random() < 0.5 ? 360 : -360).easing(cc.easeOut(2.5))
                    ));

                    maxDelay = Math.max(delayTime, maxDelay);
                    maxDelay2 = Math.max(delayTime2, maxDelay2);
                }

                let p5Bg = this.p5.getChildByName("p5_bg");
                p5Bg.runAction(cc.sequence(
                    cc.delayTime(efxTime * 1.5),
                    cc.hide(),
                    cc.delayTime(efxTime * 0.5 + maxDelay2),
                    cc.callFunc(function () {
                        this.setVisible(false);
                        cb && cb();
                    }.bind(this))
                ));

                break;

            default:
                for (let child of this._rootNode.getChildren()) {
                    child.setVisible(false);
                }

                var act = cc.sequence(
                    cc.fadeOut(0.4),
                    cc.callFunc(function () {
                        this.setVisible(false);
                        cb && cb();
                    }.bind(this))
                );
                this.bg.runAction(act);
                this.bg.setVisible(true);
                break;
        }
    },
});
GUILoadingBoard.className = "GUILoadingBoard";

/***
 * chuyển từ gui loading đầu game sang SceneLobby, vì lúc chuyển cc.director.getRunningScene().switchToLobby bị indefined,
 * đã check là do gui đang chạy getName k phải GUILoadingBoardScene.
 */
var switchToLobby = function () {
    if (typeof cc.director.getRunningScene().switchToLobby === "function") {
        cc.log("switchToLobby");
        clearInterval(cc.game.switchToLobbyInterval);
        cc.director.getRunningScene().switchToLobby();
    }
};
