let GameBoardEndGame = BaseLayer.extend({
    pMain: null,
    bg: null,

    close: null,
    btnPlay: null,
    btnReplay: null,

    ctor: function (gameUI) {
        this.gameUI = gameUI;

        this._super();
        this.targetNode = [];

        this.initWithJsonFile(res.ZCSD_GUI_END_GAME);

        this.winStreakLevelBeforeLose = 0;
        this.blockButton = false;
    },

    initLayer: function () {
        // this.gold.setPosition(cc.winSize.width * -0.09, cc.winSize.height * 0.49);
        // this.g.setPosition(cc.winSize.width * 0.25, cc.winSize.height * 0.49);
        if (fr.platformWrapper.isIOSHaveNotch()) {
            this.gold.y -= GUIConst.IOS_NOTCH_HEIGHT;
            this.g.y -= GUIConst.IOS_NOTCH_HEIGHT;
        }

        // create Character
        this.char_win = gv.createSpineAnimation(resAni.char_win);
        this.char_win.setAnimation(0, "win_cat", true);
        this.char_win.setPosition(this.bg.width / 2, 414);
        this.char_win.setScale(0.7);
        this.bg.addChild(this.char_win, -1);
        this.char_lose = gv.createSpineAnimation(resAni.char_lose);
        this.char_lose.setAnimation(0, "lose_cat", true);
        this.char_lose.setPosition(this.bg.width / 2, 580);
        this.bg.addChild(this.char_lose, -1);

        this.enableFog();
    },

    onEnterFinish: function () {
        this.setShowHideAnimate(this.bg);

        let efxTime = 0.25;
        let elements = [this.g, this.gold];
        for (let i = 0; i < elements.length; i++) {
            let element = elements[i];
            element.stopAllActions();
            element.setPosition(element.rawPos);
            element.y += 200;
            element.setOpacity(0);

            element.runAction(cc.sequence(
                cc.delayTime(0.333 + i * 0.15),
                cc.spawn(
                    cc.moveTo(efxTime, element.rawPos).easing(cc.easeBackOut()),
                    cc.fadeIn(efxTime)
                )
            ));
        }

        this.addListenerUpdateResource();
    },

    onButtonRelease: function (btn, id) {
        cc.log("onButtonRelease", btn.getName());
        switch (btn) {
            case this.close:
                this.onClickClose();
                break;

            case this.btnPlay:
                this.onClickPlayNext();
                break;

            case this.btnReplay:
                this.onClickBuyMove();
                break;
        }
    },

    addListenerUpdateResource: function () {
        var listenerUpdateResource = cc.EventListenerCustom.create(
            GameEvent.UPDATE_RESOURCE,
            function (event) {
                var resourceId = event.getUserData().resourceId;
                var oldVal = event.getUserData().oldVal;
                var newVal = event.getUserData().newVal;
                if (resourceId == ResourceType.GOLD) {
                    this.gold.getChildByName('label').setString(newVal.formatAsMoney());
                } else if (resourceId == ResourceType.G) {
                    this.g.getChildByName('label').setString(newVal.formatAsMoney());
                }
            }.bind(this)
        );
        cc.eventManager.addEventListenerWithSceneGraphPriority(listenerUpdateResource, this);
    },

    onClickClose: function () {
        if (this.blockButton) return;

        cc.log("onClickClose", this.isWin);
        if (this.isWin) {
            this.onClickCloseWin();
        } else {
            this.onClickCloseLose();
        }
    },

    onClickCloseWin: function () {
        cc.log("onClickCloseWin");
        this.hide();

        let rewardCoin = 10;
        this.onEarnCoin(rewardCoin);

        this.runAction(cc.sequence(
            cc.delayTime(0.3),
            cc.callFunc(function () {
                userInfo.isJustWin = true;
                sceneMgr.openScene(SceneLobby.className);

                // let mapReward = {
                //     gold: Number(this.gameUI.levelConfig.mapConfig.reward),
                //     star: 1
                // }
                // sceneLobby.addActionOnEnter(LOBBY_ACTION_ID.ADD_GOLD, mapReward);
            }.bind(this))
        ))
    },

    onClickCloseLose: function () {
        this.onEventLose();
        sceneMgr.openScene(SceneLobby.className);

        return;
        // check last heart realtime when user click close
        if (this.popupList.length == 0 && !this.isCheckedLastHeart) {
            this.isCheckedLastHeart = true;
            if (userInfo.getHeartWithUpdate() == 1 && !FreeFunction.getInstance().isInFreeResourceDuration(ResourceType.HEART)) {
                this.popupList.push(NodePopupGUIEndGame.POPUP_TYPE.OUT_OF_HEART);
            }
        }

        if (this.popupList.length == 0) {
            this.bg.getChildByName('lblLose').setVisible(true);
            this.hide();
            let loseStreak = userInfo.getNumLose(this.gameUI.mapPlay);
            let guiSuggest = this.gameUI.getGUI(gv.GUI_ID.SUGGEST);
            let usingBooster = Utility.deepCopyObject(this.gameUI.boosters);
            for (let i in usingBooster)
                usingBooster[i] = ResourcesUtils.convertBoosterTypeToResType(usingBooster[i]);
            this.suggestedBoosterType = guiSuggest.suggestUseBooster(null, usingBooster);
            if (loseStreak == 3 && this.suggestedBoosterType != -1) {
                if (this.suggestedBoosterType != -1) {
                    guiSuggest.closeCallBack = function () {
                        this.processLoseGame();
                    }.bind(this);
                    guiSuggest.confirmCallback = function () {
                        boosterType = ResourcesUtils.convertResTypeToBoosterType(this.suggestedBoosterType);
                        if (this.gameUI.boosters.indexOf(boosterType) == -1) {
                            this.gameUI.boosters.push(boosterType);
                        }
                        this.processLoseGame();
                    }.bind(this);
                    guiSuggest.show();
                } else {
                    this.processLoseGame();
                }
            } else {
                this.processLoseGame();
            }
        } else {
            this.bg.getChildByName('lblLose').setVisible(false);
            if (this.popup) this.popup.hide();
            this.popup = new NodePopupGUIEndGame(this);
            this.popup.setPosition(this.bg.width / 2, this.bg.height * 0.72);
            this.bg.addChild(this.popup, GameBoardEndGame.ELEMENT_ZORDER.POPUP);
            this.popup.show(this.popupList[0]);
            this.popupList.shift();
        }
    },

    processLoseGame: function () {
        sceneMgr.openScene(SceneLobby.className);
        // this.runAction(cc.sequence(
        //     cc.delayTime(0.1),
        //     cc.callFunc(function () {
        //
        //         // this.onEventLose();
        //         // this.gameUI.getGUI(gv.GUI_ID.LEVEL_INFO).show(true, this.gameUI.levelCfg,
        //         //     this.gameUI.isBossRun, this.gameUI.bossRunLevelName, this.gameUI.bossRunLevelId
        //         // );
        //         //
        //         // if (!this.gameUI.isBossRun) {
        //         //     this.gameUI.guiCurrentStreak.showLoseWinStreak(this.winStreakLevelBeforeLose);
        //         //     this.gameUI.guiCurrentStreak.introduceMacFactoryCallback = function () {
        //         //         this.gameUI.getGUI(gv.GUI_ID.LEVEL_INFO).hide();
        //         //         this.gameUI.introduceWinStreak();
        //         //     }.bind(this);
        //         //     this.gameUI.getGUI(gv.GUI_ID.MAC_FACTORY_INFO).closeCallback = function () {
        //         //         this.gameUI.getGUI(gv.GUI_ID.LEVEL_INFO).reShow();
        //         //     }.bind(this);
        //         // }
        //     }.bind(this))
        // ));
    },

    onClickReplay: function () {
        this.gameUI.onClickReplay();
    },

    onClickPlayNext: function () {
        cc.log("onClickPlayNext", this.blockButton, this.isEnableWinStreak());

        if (this.blockButton) return;
        if (this.isEnableWinStreak()) this.gameUI.guiCurrentStreak.hide();
        this.onClickClose();
    },

    hide: function () {
        this.onClose();

        let efxTime = 0.25;
        let elements = [this.g, this.gold];
        for (let i = 0; i < elements.length; i++) {
            let element = elements[i];
            element.stopAllActions();
            element.runAction(cc.sequence(
                cc.delayTime(i * 0.15),
                cc.spawn(
                    cc.moveTo(efxTime, cc.p(element.rawPos.x, element.rawPos.y + 200)).easing(cc.easeBackIn()),
                    cc.fadeOut(efxTime).easing(cc.easeOut(2.5))
                )
            ));
        }
    },

    show: function (delayTime = 0) {
        // fr.showTopPanel(this.gameUI);

        // if (this.gameUI.mainBoard.skipLbl)
        //     this.gameUI.mainBoard.skipLbl.setVisible(false);

        return;

        let efxTime = 0.25;
        this.bg.scale = 2;
        this.bg.setOpacity(0);
        this.setVisible(true);
        for (let i in this.targetNode) {
            let node = this.targetNode[i];
            node.lbl.opacity = 0;
            node.spr.opacity = 0;
            node.lbl.runAction(cc.sequence(
                cc.delayTime(delayTime),
                cc.fadeIn(efxTime))
            );
            node.spr.runAction(cc.sequence(
                cc.delayTime(delayTime),
                cc.fadeIn(efxTime))
            );
        }
        this.bg.runAction(cc.sequence(
            cc.spawn(
                cc.fadeIn(efxTime),
                cc.scaleTo(efxTime, 1, 1).easing(cc.easeBezierAction(0, 0.15, 1.51, 1.0))
            )
        ));

        fr.Sound.playSoundEffect(resSound.end_level_positive, false);
    },

    showResult: function (result, targets, delayTime = 0) {
        this.isWin = result == BoardResult.WIN;

        cc.log("GameBoardEndGame showResult", JSON.stringify(targets));

        // if (this.isWin && levelConfig["endScript"]) {
        //     gv.tutMgr.startScript(levelConfig["endScript"]);
        //     return;
        // }

        this.showReaction(false);
        // this.showReaction(this.isWin);
        this.bg.getChildByName("btnPlay").setVisible(this.isWin);
        this.bg.getChildByName("btnReplay").setVisible(!this.isWin);
        if (this.guiBuyMoveBonus) this.guiBuyMoveBonus.setVisible(!this.isWin);
        this.bg.getChildByName("lblWin").setVisible(this.isWin);
        this.bg.getChildByName("lblLose").setVisible(!this.isWin);
        this.g.setVisible(!this.isWin);
        this.gold.setVisible(!this.isWin);
        this.char_win.setVisible(this.isWin);
        this.char_lose.setVisible(!this.isWin);
        this.bg.getChildByName("close").setVisible(!this.isWin);

        this.clearTarget();
        this.reAlignGui(this.isWin);
        if (this.isWin) {
            this.showReward();
        } else {
            this.showTarget(targets);
        }

        // this.show(delayTime);

        // mark as win
        if (this.isWin) {
            var listPass = JSON.parse(fr.UserData.getStringFromKey(KeyStorage.KEY_LIST_MAP_PASS, "{}"));
            cc.log("listPass " + JSON.stringify(listPass));
            if (JSON.stringify(listPass).length == 0) this.btnBack.setTitleText("get fail");

            listPass[this.gameUI.levelId] = true;
            cc.log("listPass " + JSON.stringify(listPass));
            fr.UserData.setStringFromKey(KeyStorage.KEY_LIST_MAP_PASS, JSON.stringify(listPass));
        }
        m3.trackEndGame(this.gameUI.levelId, result);
    },

    reAlignGui: function (isWin) {
        this.bg.height = isWin ? 534 : 608;
        this.bg.getChildByName('bg_target_1').setPositionY(isWin ? 350 : 430);
        this.bg.getChildByName('bg_target').setPositionY(isWin ? 300 : 380);
        this.bg.getChildByName('lblTarget').setPositionY(isWin ? 400 : 490);
        this.bg.getChildByName('close').setPositionY(isWin ? 520 : 576);
    },

    showReward: function () {
        if (this.popup) this.popup.setVisible(false);

        let lblLevel;
        lblLevel = fr.Localization.text('lang_level') + this.gameUI.getLevel();

        this.bg.getChildByName("lblWin").setString(lblLevel);
        if (lblLevel.length >= 16) {
            this.bg.getChildByName("lblWin").setFontSize(34);
        } else {
            this.bg.getChildByName("lblWin").setFontSize(44);
        }

        var reward = this.gameUI.levelConfig.mapConfig.reward;
        let nodeBgTarget = this.bg.getChildByName('bg_target');
        var rootPos = {x: nodeBgTarget.width / 2, y: nodeBgTarget.height / 2 - 5}, padding = 120;
        var listNode = [];
        var coin = this.createTarget("coin", reward);
        nodeBgTarget.addChild(coin);
        listNode.push(coin);

        let star = this.createTarget("star", this.gameUI.boardUI.boardMgr.endStar);
        nodeBgTarget.addChild(star);
        listNode.push(star);

        for (let i in listNode) {
            listNode[i].setPosition(rootPos.x + (i - (listNode.length - 1) / 2) * padding, rootPos.y);
        }
    },

    onEarnCoin: function (goldReward) {
        let actionType;
        if (this.gameUI.isBossRun) {
            actionType = ActionType.BOSS_RUN_END_GAME_REWARD;
        } else {
            actionType = ActionType.END_GAME_REWARD;
        }

        let dataArr = [
            this.gameUI.levelConfig.mapConfig.levelId,
            ResourceType.GOLD,
            userInfo.gold,
            Number(userInfo.gold) + goldReward,
            goldReward
        ];
        cc.log("END GAME ACTION", JSON.stringify(dataArr));
        eventProcessor.addNewAction(actionType, dataArr);
    },

    showWinStreak: function () {
        this.bg.getChildByName("btnPlay").setVisible(false);
        if (userInfo.isNeedShowIncreaseWinStreak()) {
            this.gameUI.guiCurrentStreak.performIncrease = true;
            userInfo.setIsNeedShowIncreaseWinStreak(false);
        }
        this.gameUI.getGUI(gv.GUI_ID.MAC_FACTORY_INFO).closeCallback = function () {
            this.gameUI.guiCurrentStreak.show();
            this.show();
        }.bind(this);
        this.gameUI.guiCurrentStreak.introduceMacFactoryCallback = function () {
            this.gameUI.introduceWinStreak();
            this.hide();
        }.bind(this);
        this.guiCurrentStreakShowed = true;
        this.runAction(cc.sequence(
            cc.delayTime(0.5),
            cc.callFunc(function () {
                this.gameUI.guiCurrentStreak.show();
            }.bind(this)),
            cc.delayTime(1.0),
            cc.callFunc(function () {
                var btnPlay = this.bg.getChildByName("btnPlay");
                btnPlay.setVisible(true);
                btnPlay.setOpacity(0);
                btnPlay.runAction(cc.fadeIn(0.2));
                btnPlay.runAction(cc.sequence(
                    cc.scaleTo(0.2, 1.1, 1.1),
                    cc.scaleTo(0.1, 0.9, 0.9),
                    cc.scaleTo(0.1, 1.0, 1.0),
                    cc.delayTime(2.0)
                ).repeatForever())
            }.bind(this))
        ))
    },

    showTarget: function (targets) {
        this.gameUI.gameBoardInfoUI.spine_cat.setAnimation(0, 'sad', true);
        // this.gameUI.hideToolGuis();

        // init popupList
        this.popupList = [];
        this.isCheckedLastHeart = false;
        if (this.popup) {
            this.popup.removeFromParent(true);
            this.popup = false;
        }

        // win streak
        // if (this.isEnableWinStreak() && userInfo.getWinStreakLevel() > 0) {
        //     this.popupList.push(NodePopupGUIEndGame.GameBoardEndGame.POPUP_TYPE.WIN_STREAK);
        // }
        // this.winStreakLevelBeforeLose = userInfo.getWinStreakLevel();

        // event collect
        // let targetType = EvtCollectMgr.getInstance().targetType;
        // if (targetType && this.gameUI.mainBoard.countCollectedGemByType(targetType) > 0) {
        //     this.popupList.push(NodePopupGUIEndGame.GameBoardEndGame.POPUP_TYPE.EVENT_COLLECT);
        // }

        // target
        fr.Sound.playSoundEffect(resSound.game_fail, false);

        this.bg.getChildByName("lblTarget").setString(fr.Localization.text('lang_target'));
        let nodeBgTarget = this.bg.getChildByName('bg_target');
        var rootPos = {x: nodeBgTarget.width / 2, y: nodeBgTarget.height / 2 - 5}, padding = 100;
        var listNode = [];
        for (var target of targets) {
            let type = target["id"];
            var amountTarget = target["count"];
            var currentAmount = target["current"];

            var nodeInfo = null;
            var node = null;
            if (currentAmount < amountTarget) nodeInfo = currentAmount + "/" + amountTarget;
            // if (ElementUtils.isProgressTypeElement(type)) {
            //     let listElement = this.gameUI.mainBoard.elementFactory.elementByType[type];
            //     for (let i = 0; i < listElement.length; i++) {
            //         nodeInfo = this.gameUI.mainBoard.elementFactory.elementByType[type][i].getProgress();
            //         node = this.createTarget(type, nodeInfo);
            //         nodeBgTarget.addChild(node, GameBoardEndGame.ELEMENT_ZORDER.TARGET);
            //         listNode.push(node);
            //     }
            // } else {
                node = this.createTarget(type, nodeInfo);
                nodeBgTarget.addChild(node, GameBoardEndGame.ELEMENT_ZORDER.TARGET);
                listNode.push(node);
            // }
        }
        padding += (4 - listNode.length) * 10;
        for (var i in listNode) {
            listNode[i].setPosition(
                rootPos.x + (i - (listNode.length - 1) / 2) * padding,
                rootPos.y
            );
        }

        // buy move
        this.showBuyMove();

        // metric
        // if (this.gameUI.boughtMoveTurn == 0 && !this.gameUI.isEditMode && !this.gameUI.isShareMode)
        //     this.addMetricLoseTarget();
    },

    getMovePrice: function () {
        var price = gv.itemPriceCfg.getMovePrice(Math.min(this.gameUI.boughtMoveTurn, 4));
        price = {
            gold: 10
        }
        return price;
    },

    showBuyMove: function () {
        this.onBuyingMove = false;
        // User Gold
        this.gold.getChildByName('label').setString(userInfo.gold.formatAsMoney());
        this.g.getChildByName('label').setString(userInfo.G.formatAsMoney());

        // Price
        var price = this.getMovePrice();
        var btnReplay = this.bg.getChildByName('btnReplay');
        var gold = price['gold'];
        var g = price['G'];
        let cost = g || gold;
        let scale = cost >= 1000 ? 0.8 : 1.0;
        let icon = btnReplay.getChildByName('icon');
        let costLbl = btnReplay.getChildByName('cost');
        icon.setTexture(g != null ? 'lobby/icon_g.png' : 'lobby/icon_gold.png');
        icon.setScale(0.8 * scale);
        costLbl.setString(cost.formatAsMoney());
        costLbl.setScale(scale);
        if (scale == 0.8) costLbl.setPosition(290, 52);
        else costLbl.setPosition(299, 52);

        // Bonus
        // if (!this.guiBuyMoveBonus) {
        //     this.guiBuyMoveBonus = new GUIBuyMoveBonus();
        //     this.bg.addChild(this.guiBuyMoveBonus);
        //     this.guiBuyMoveBonus.setPosition(this.bg.width / 2, 100);
        // }
        // let bonus = Utility.deepCopyObject(gv.itemPriceCfg.getMovePrice(this.gameUI.boughtMoveTurn)["PUs"]);
        //
        // bonus.unshift("move");
        // this.guiBuyMoveBonus.setBonus(bonus);
        // this.guiBuyMoveBonus.hide();
        // this.runAction(cc.sequence(
        //     cc.delayTime(0.5),
        //     cc.callFunc(function () {
        //         this.guiBuyMoveBonus.show();
        //     }.bind(this))
        // ))
    },

    createTarget: function (type, lbl) {
        cc.log("Create Target", type, lbl);

        var node = new cc.Node();

        var spr = new ccui.ImageView("res/high/game/element/icon/" + type + ".png");
        spr.setPosition(0, 20);
        node.addChild(spr);
        node.spr = spr;

        if (lbl != null) {
            node.lbl = new NumberLabel(res.FONT_GAME_BOLD, 32, lbl);
            node.lbl.label.enableOutline(cc.color(149, 86, 64, 255), 2);
            node.lbl.label.enableShadow(cc.color(149, 86, 64, 255), cc.size(2, -2), 1);
            node.lbl.setPosition(0, -33);
            node.addChild(node.lbl);

            if (ElementUtils.isBossElement(type) && lbl.length > 0) {
                // add heart icon
                var heart = new ccui.ImageView("res/high/game/gui/end_game/heart.png");
                let lastLetter = node.lbl.label.getVirtualRenderer().getLetter(lbl.length - 1);
                heart.setPosition(node.lbl.getPositionX() + lastLetter.getPositionX() / 2 + 10, node.lbl.getPositionY());
                heart.setScale(0.7);
                node.heart = heart;
                node.addChild(heart);
                node.lbl.setPositionX(-12);
            }
        } else {
            node.lbl = new ccui.ImageView(check_icon);
            node.lbl.setScale(0.6);
            node.lbl.setPosition(0, -30);
            node.addChild(node.lbl);
        }

        this.targetNode.push(node);
        return node;
    },

    onClickBuyMove: function () {
        if (this.onBuyingMove || this.blockButton)
            return;

        let config = this.getMovePrice();
        let costType = config['gold'] ? "gold" : "g"
        if (this.checkPriceBuyMove(this.gameUI.boughtMoveTurn)) {
            this.onBuyingMove = true;
            let data = [this.gameUI.boughtMoveTurn, costType, config['gold'] || config['g'], this.gameUI.getLevel(), this.gameUI.isBossRun];
            eventProcessor.addNewAction(ActionType.BUY_MOVE, data);
        } else {
            // if (gv.alert && gv.alert.showNotEnoughGoldG) {
            //     gv.alert.showNotEnoughGoldG(ResourceType.GOLD, null);
            // } else {
                LogLayer.show("Not enough gold!");
            // }
        }
    },

    checkPriceBuyMove: function (turn) {
        var price = this.getMovePrice()['gold'];
        cc.log("checkPriceBuyMove", ResourceType.GOLD, price, userInfo.getResByType(ResourceType.GOLD));
        return price <= userInfo.getResByType(ResourceType.GOLD);
    },

    onEventLose: function () {
        cc.log("onEventLose");

        this.gameUI.addActionEndGameLose(ActionType.LOG_LOSE_SUBTRACT_HEART);
    },

    clearTarget: function () {
        for (var id in this.targetNode) {
            var node = this.targetNode[id];
            node.removeFromParent(true);
        }
        this.targetNode = [];
    },

    addMetricLoseTarget: function () {
        let target = this.gameUI.levelCfg["listTarget"];
        // basic info
        let dataArr = [
            ActionType.LOG_LOSE_TARGET,
            this.gameUI.getLevel(),
            this.gameUI.levelCfg.version,
            this.gameUI.getLevelWithVer(),
            userInfo.getNumPlay(this.gameUI.mapPlay),
            fr.platformWrapper.getVersionCode(),
            userInfo.getWinStreakLevel(),
            FreeFunction.getInstance().getResourceFreeTimeRemainInSec(ResourceType.HEART)
        ];

        // collect target data
        let numTarget = 0;
        let listRequire = [];
        let listNotEnough = [];
        for (let type in target) {
            if (ElementUtils.isProgressTypeElement(type)) {
                let listElement = this.gameUI.mainBoard.elementFactory.elementByType[type];
                for (let i = 0; i < listElement.length; i++) {
                    let progress = this.gameUI.mainBoard.elementFactory.elementByType[type][i].getProgress();
                    let cur = progress.split("/")[0], need = progress.split("/")[1];
                    listRequire.push(need);
                    listNotEnough.push((Number(need) - Number(cur)).toString());
                    numTarget++;
                }
            } else {
                let cur = this.gameUI.mainBoard.listCurTarget[type], need = target[type];
                listRequire.push(need);
                listNotEnough.push((Number(need) - Number(cur)).toString());
                numTarget++;
            }
        }
        // form data, send to sv
        dataArr.push(numTarget);
        for (let i = 0; i < listRequire.length; i++) {
            dataArr.push(listRequire[i]);
            dataArr.push(listNotEnough[i]);
        }
        gv.clientNetwork.connector.sendMetricLevel(dataArr);
    },

    isEnableWinStreak: function () {
        return false;
        if (this.gameUI.isBossRun) return false;
        return Cheat.getInstance().enableWinStreak && userInfo.getLevel() >= Cheat.getInstance().levelWinStreak;
    },

    showReaction: function (isShow) {
        this.nodeReaction.setVisible(false);
    },

    onClickReact: function (sender) {
        let btnId = Number(sender.getName().split("btnReact")[1]);
        cc.log("onClickReact", btnId)
        for (let i = 1; i <= 5; i++) this['btnReact' + i].setOpacity(150);
        this['btnReact' + btnId].setOpacity(255);
        this.reactionId = btnId;
    }
});
GameBoardEndGame.className = "GameBoardEndGame";
GameBoardEndGame.ELEMENT_ZORDER = {
    TARGET: 9,
    POPUP: 10,
    CLOSE_BUTTON: 11
};