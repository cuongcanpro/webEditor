/**
 * Created by AnhVTT on 5/14/2021.
 */
var GUIQuitGame = BaseLayer.extend({
    bg: null,
    btnContinue: null,
    btnQuitGame: null,
    target: null,
    title: null,

    ctor: function (mainScene) {
        this._super();
        this.mainScene = mainScene;
        this.gameQuited = false;

        this.initWithJsonFile(GUIQuitGame.json);
    },

    initLayer: function () {
        this.enableFog();
    },

    onEnterFinish: function () {
        this.setShowHideAnimate(this.bg);
        this.initTarget();
    },

    hide: function () {
        fr.hideTopPanel(this.mainScene);
        this.runAction(cc.sequence(
            cc.moveBy(0.1, 0, 50),
            cc.moveTo(0.25, this.x, -500).easing(cc.easeSineIn()),
            cc.callFunc(function () {
                this.bg.setVisible(false);
            }.bind(this))
        ))
    },

    show: function () {
        this.setPosition(cc.winSize.width / 2, -500);
        this.bg.setVisible(true);
        this.runAction(cc.sequence(
            cc.moveTo(0.25, cc.winSize.width / 2, cc.winSize.height / 2 + 50).easing(cc.easeSineIn()),
            cc.moveBy(0.1, 0, -50)
        ))
    },

    initTarget: function () {
        var isChallengeRoom = typeof challengeRoomMgr !== "undefined" && challengeRoomMgr.isInGauntlet();

        if (isChallengeRoom) {
            var room = ChallengeRoomConfig.getRoomById(challengeRoomMgr.getCurrentRoomId());
            var normalFloors = room.floors.length;
            // if (room) {
            //     for (var i = 0; i < room.floors.length; i++) {
            //         if (!room.floors[i].isBoss) normalFloors++;
            //     }
            // }
            if (challengeRoomMgr.isBossFight()) {
                this.title.setString(fr.Localization.text("cr_floor_intro_boss_title"));
            } else {
                this.title.setString(fr.Localization.text("cr_floor_intro_title")
                    .replace("@cur@", challengeRoomMgr.getCurrentFloorIndex() + 1)
                    .replace("@total@", normalFloors));
            }
        } else {
            this.title.setString(
                fr.Localization.text('lang_level')
                + " "
                + CoreGame.BoardUI.getInstance().boardMgr.getLevelId()
            );
        }

        let targets = CoreGame.BoardUI.getInstance().boardMgr.targetElements;
        cc.log("TARGETS ===== ", JSON.stringify(targets));

        let nodeBgTarget = this.target;
        nodeBgTarget.removeAllChildren();
        var rootPos = { x: nodeBgTarget.width / 2, y: nodeBgTarget.height / 2 - 5 }, padding = 100;
        var listNode = [];

        if (isChallengeRoom && challengeRoomMgr.isBossFight()) {
            let bossId = null;
            for (let target of targets) {
                if (target["id"] >= 10000) {
                    bossId = target["id"];
                    break;
                }
            }
            if (bossId) {
                let curHp = challengeRoomMgr.getBossHp();
                let maxHp = challengeRoomMgr.getBossHpMax();

                let nodeInfo = null;
                if (curHp > 0) nodeInfo = curHp + "/" + maxHp;

                let node = this.createTarget(bossId, nodeInfo);
                nodeBgTarget.addChild(node, GameBoardEndGame.ELEMENT_ZORDER.TARGET);
                listNode.push(node);
            }
        } else {
            for (var target of targets) {
                let type = target["id"];
                var currentAmount = target["count"] - target["current"];
                var amountTarget = target["count"];
                cc.log("SHOW TARGET LOSE", JSON.stringify(target));
                cc.log("SHOW TARGET LOSE", type, amountTarget, currentAmount);

                var nodeInfo = null;
                var node = null;
                if (currentAmount < amountTarget) nodeInfo = currentAmount + "/" + amountTarget;
                node = this.createTarget(type, nodeInfo);
                nodeBgTarget.addChild(node, GameBoardEndGame.ELEMENT_ZORDER.TARGET);
                listNode.push(node);
            }
        }

        padding += (4 - listNode.length) * 10;
        for (var i in listNode) {
            listNode[i].setPosition(
                rootPos.x + (i - (listNode.length - 1) / 2) * padding,
                rootPos.y
            );
        }
    },

    createTarget: function (type, lbl) {
        cc.log("Create Target", type, lbl);

        var node = new cc.Node();

        var spr = new ccui.ImageView("res/modules/game/element/icon/" + type + ".png");
        spr.setPosition(0, 20);
        node.addChild(spr);
        node.spr = spr;

        if (lbl != null) {
            node.lbl = new NumberLabel(res.FONT_GAME_BOLD, 32, lbl);
            node.lbl.label.enableOutline(cc.color(149, 86, 64, 255), 2);
            node.lbl.label.enableShadow(cc.color(149, 86, 64, 255), cc.size(2, -2), 1);
            node.lbl.setPosition(0, -33);
            node.addChild(node.lbl);

            // if (ElementUtils.isBossElement(type) && lbl.length > 0) {
            //     // add heart icon
            //     var heart = new ccui.ImageView("res/modules/game/gui/end_game/heart.png");
            //     let lastLetter = node.lbl.label.getVirtualRenderer().getLetter(lbl.length - 1);
            //     heart.setPosition(node.lbl.getPositionX() + lastLetter.getPositionX() / 2 + 10, node.lbl.getPositionY());
            //     heart.setScale(0.7);
            //     node.heart = heart;
            //     node.addChild(heart);
            //     node.lbl.setPositionX(-12);
            // }
        } else {
            node.lbl = new ccui.ImageView(check_icon);
            node.lbl.setScale(0.6);
            node.lbl.setPosition(0, -30);
            node.addChild(node.lbl);
        }

        return node;
    },

    onQuitGame: function () {
        var gameUI = this.mainScene ? this.mainScene : null;
        var bm = gameUI && gameUI.boardUI ? gameUI.boardUI.boardMgr : null;
        var levelId = bm ? bm.getLevelId() : 0;
        var isCR = 0, roomId = null;
        try { if (typeof challengeRoomMgr !== "undefined" && challengeRoomMgr.isInGauntlet()) { isCR = 1; roomId = challengeRoomMgr.getCurrentRoomId(); } } catch (e) {}
        var pa = CoreGame.Metrics._buildPrefix();
        pa.type = "level_attempt_end";
        pa.level_id = levelId;
        pa.outcome = "abandon";
        pa.is_win = 0;
        pa.starsAwarded = 0;
        pa.movesUsed = bm ? (bm.totalMove - bm.numMove) : 0;
        pa.totalMoves = bm ? bm.totalMove : 0;
        pa.timeInLevelSec = gameUI && gameUI._levelStartTime ? Math.round((Date.now() - gameUI._levelStartTime) / 1000) : 0;
        pa.isChallengeRoom = isCR;
        pa.roomId = roomId;
        try { pa.match_stats = bm && bm.matchMgr ? bm.matchMgr.getMatchStats() : null; } catch (e) { pa.match_stats = null; }
        CoreGame.Metrics.send(pa);

        userMgr.updateHeart(-1, "abandon");
        lobbyMgr.openScroll();
        challengeRoomMgr.exitGauntlet();
        sceneMgr.openScene(SceneLobby.className);

        // if (this.gameQuited) return;
        // this.gameQuited = true;
        // if (this.confirmLoseWinStreak || userMgr.getData().getWinStreakLevel() <= 0) {
        //     if (this.quitGameCallBack) {
        //         this.quitGameCallBack();
        //     } else {
        //         this.hide();
        //     }
        // } else {
        //     this.confirmLoseWinStreak = true;
        //     if (!this.mainScene.guiAlertLoseWinStreak) {
        //         let gui = new GUIAlertLoseWinStreak(this.mainScene);
        //         this.mainScene.addChild(gui, this.mainScene.topPanelZOrder);
        //         gui.setPosition(cc.winSize.width / 2, cc.winSize.height / 2);
        //         gui.quitGameCallBack = function () {
        //             this.setLocalZOrder(12);
        //             this.gameQuited = false;
        //             this.onQuitGame();
        //         }.bind(this);
        //         gui.closeCallback = function () {
        //             this.gameQuited = false;
        //             this.setLocalZOrder(12);
        //         }.bind(this);
        //         this.mainScene.guiAlertLoseWinStreak = gui;
        //     }
        //     this.setLocalZOrder(this.mainScene.topPanelZOrder - 1);
        //     this.mainScene.guiAlertLoseWinStreak.show(false);
        // }
    },

    onButtonRelease: function (btn, id) {
        switch (btn) {
            case this.btnContinue:
                this.onClose();
                break;

            case this.btnQuitGame:
                this.onQuitGame();
                break;
        }
    }
});
GUIQuitGame.className = "GUIQuitGame";
GUIQuitGame.json = "game/csd/GUIQuitGame.json";