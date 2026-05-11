let GameBoardEndGame = BaseLayer.extend({
    pMain: null,
    nodeMain: null,

    bg: null,

    close: null,
    btnPlay: null,
    btnBuyMove: null,
    btnReplay: null,
    btnExit: null,

    lblWin: null,
    lblLose: null,

    bgLose: null,
    lblTargetLose: null,
    bg_target_lose: null,
    lblLevel: null,

    bg_target: null,

    heartTime: null,

    nodeStars: null,

    ctor: function (gameUI) {
        this.gameUI = gameUI;

        this._super();
        this.targetNode = [];

        this.initWithJsonFile(GameBoardEndGame.json);

        this.winStreakLevelBeforeLose = 0;
        this.blockButton = false;
    },

    initLayer: function () {
        // this.gold.setPosition(cc.winSize.width * -0.09, cc.winSize.height * 0.49);
        // this.heart.setPosition(cc.winSize.width * 0.25, cc.winSize.height * 0.49);
        if (fr.platformWrapper.isIOSHaveNotch()) {
            this.gold.y -= GUIConst.IOS_NOTCH_HEIGHT;
            this.heart.y -= GUIConst.IOS_NOTCH_HEIGHT;
        }

        // create Character
        this.char_win = gv.createSpineAnimation(resAni.char_win);
        this.char_win.setAnimation(0, "win_cat", true);
        this.char_win.setPosition(this.lblWin.getPosition());
        this.char_win.y -= 100;
        this.char_win.setScale(0.7);
        this.bg.addChild(this.char_win, -1);

        this.char_lose = gv.createSpineAnimation(resAni.char_lose);
        this.char_lose.setAnimation(0, "lose_cat", true);
        this.char_lose.setPosition(this.lblLevel.getPosition());
        this.bgLose.addChild(this.char_lose, -1);

        this.stars = this.nodeStars.getChildren();
        for (let node of this.stars) {
            node.slot = null;
            node.star = null;
            BaseLayer._syncInNode(node, node);
        }

        this.enableFog();
    },

    initHeartCooldownLabel: function () {
        let baseLabel = this.heart.getChildByName('label');
        let heartTime = new ccui.Text();
        heartTime.setFontName(res.FONT_GAME_BOLD);
        heartTime.setFontSize(22);
        heartTime.setTextHorizontalAlignment(cc.TEXT_ALIGNMENT_CENTER);
        heartTime.setColor(cc.color(255, 255, 255));
        heartTime.enableOutline(cc.color(149, 86, 64, 255), 2);
        heartTime.setAnchorPoint(0.5, 1);
        heartTime.setPosition(this.heart.width / 2, -4);
        this.heart.addChild(heartTime);
        this.heartTime = heartTime;
    },

    updateHeartDisplay: function () {
        let heartAmount = userMgr.getHeartWithUpdate();
        this.heart.getChildByName('label').setString(heartAmount);

        if (heartAmount >= ConfigResource.HEART_MAX) {
            this.heartTime.setString(fr.Localization.text("lang_full"));
        } else {
            let remaining = userMgr.getData().healingTime - TimeSystem.getCurTimeServerInSecond();
            if (remaining <= 0) {
                this.heartTime.setString(fr.Localization.text("lang_full"));
            } else {
                this.heartTime.setString(Number(remaining).formatAsTime());
            }
        }
    },

    onEnterFinish: function () {
        this.setShowHideAnimate(this.nodeMain);

        let efxTime = 0.25;
        let elements = [this.heart, this.gold];
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

        this.updateHeartDisplay();
        this.unschedule(this.updateHeartDisplay);
        this.schedule(this.updateHeartDisplay, 1.0);
    },

    onButtonRelease: function (btn, id) {
        cc.log("onButtonRelease", btn.getName());
        switch (btn) {
            case this.btnExit:
                this.onClickClose();
                break;

            case this.close:
                this.onClickClose();
                break;

            case this.btnPlay:
                this.onClickPlayNext();
                break;

            case this.btnBuyMove:
                this.onClickBuyMove();
                break;

            case this.btnReplay:
                this.onClickReplay();
                break;
        }
    },

    addListenerUpdateResource: function () {
        // var listenerUpdateResource = cc.EventListenerCustom.create(
        //     GameEvent.UPDATE_RESOURCE,
        //     function (event) {
        //         var resourceId = event.getUserData().resourceId;
        //         var oldVal = event.getUserData().oldVal;
        //         var newVal = event.getUserData().newVal;
        //         if (resourceId == ResourceType.GOLD) {
        //             this.gold.getChildByName('label').setString(newVal.formatAsMoney());
        //         } else if (resourceId == ResourceType.G) {
        //             this.heart.getChildByName('label').setString(newVal.formatAsMoney());
        //         }
        //     }.bind(this)
        // );
        // cc.eventManager.addEventListenerWithSceneGraphPriority(listenerUpdateResource, this);
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

        let levelId = this.gameUI.getLevel();
        let newStars = this.gameUI.boardUI.boardMgr.endStar;
        let oldStars = this.gameUI.oldStarBeforePlay || 0; // fallback if not tracked yet

        let rewardCoin = userMgr.calculateWinGold(levelId, newStars, oldStars);
        this.onEarnCoin(rewardCoin, "level_clear");

        var bm = this.gameUI.boardUI ? this.gameUI.boardUI.boardMgr : null;
        var objRemaining = 0;
        var tes = bm ? (bm.targetElements || []) : [];
        for (var ti = 0; ti < tes.length; ti++) { if (tes[ti].current > 0) objRemaining += tes[ti].current; }
        var isBoss = 0;
        var bossID = null;
        try { isBoss = levelMgr.isBossLevel(levelId) ? 1 : 0; bossID = levelMgr.bossID || null; } catch (e) {}
        var isCR = 0, roomId = null;
        try { if (typeof challengeRoomMgr !== "undefined" && challengeRoomMgr.isInGauntlet()) { isCR = 1; roomId = challengeRoomMgr.getCurrentRoomId(); } } catch (e) {}
        var tppDev = null;
        try { var tppM = CoreGame.AdaptiveTPP.getMetrics(); tppDev = tppM && tppM.deviation_distribution ? tppM.deviation_distribution.mean : null; } catch (e) {}
        var pw = CoreGame.Metrics._buildPrefix();
        pw.type = "level_attempt_end";
        pw.level_id = levelId;
        pw.outcome = "win";
        pw.is_win = 1;
        pw.starsAwarded = newStars;
        pw.movesUsed = bm ? (bm.totalMove - bm.numMove) : 0;
        pw.totalMoves = bm ? bm.totalMove : 0;
        pw.is_replay = (oldStars > 0) ? 1 : 0;
        pw.gold_reward = rewardCoin;
        pw.objectivesRemaining = objRemaining;
        pw.timeInLevelSec = this.gameUI._levelStartTime ? Math.round((Date.now() - this.gameUI._levelStartTime) / 1000) : 0;
        pw.isBoss = isBoss;
        pw.bossID = bossID;
        pw.isChallengeRoom = isCR;
        pw.roomId = roomId;
        pw.tppDeviationFinal = tppDev;
        pw.pu_stats = this.gameUI._puStats || null;
        try { pw.match_stats = bm && bm.matchMgr ? bm.matchMgr.getMatchStats() : null; } catch (e) { pw.match_stats = null; }
        CoreGame.Metrics.send(pw);

        this.runAction(cc.sequence(
            cc.delayTime(0.3),
            cc.callFunc(function () {
                lobbyMgr.setWin(this.gameUI.boardUI.boardMgr.isReplayWin, rewardCoin);
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

        let rewardCoin = userMgr.calculateLoseGold();
        this.onEarnCoin(rewardCoin, "lose_consolation");
        userMgr.updateHeart(-1, "fail");

        var levelId = this.gameUI.getLevel();
        var oldStars = this.gameUI.oldStarBeforePlay || 0;
        var bm = this.gameUI.boardUI ? this.gameUI.boardUI.boardMgr : null;
        var objRemaining2 = 0;
        var tes2 = bm ? (bm.targetElements || []) : [];
        for (var ti2 = 0; ti2 < tes2.length; ti2++) { if (tes2[ti2].current > 0) objRemaining2 += tes2[ti2].current; }
        var isBoss2 = 0;
        var bossID2 = null;
        try { isBoss2 = levelMgr.isBossLevel(levelId) ? 1 : 0; bossID2 = levelMgr.bossID || null; } catch (e) {}
        var isCR2 = 0, roomId2 = null;
        try { if (typeof challengeRoomMgr !== "undefined" && challengeRoomMgr.isInGauntlet()) { isCR2 = 1; roomId2 = challengeRoomMgr.getCurrentRoomId(); } } catch (e) {}
        var tppDev2 = null;
        try { var tppM2 = CoreGame.AdaptiveTPP.getMetrics(); tppDev2 = tppM2 && tppM2.deviation_distribution ? tppM2.deviation_distribution.mean : null; } catch (e) {}
        var pl = CoreGame.Metrics._buildPrefix();
        pl.type = "level_attempt_end";
        pl.level_id = levelId;
        pl.outcome = "fail";
        pl.is_win = 0;
        pl.starsAwarded = 0;
        pl.movesUsed = bm ? (bm.totalMove - bm.numMove) : 0;
        pl.totalMoves = bm ? bm.totalMove : 0;
        pl.is_replay = (oldStars > 0) ? 1 : 0;
        pl.gold_reward = rewardCoin;
        pl.objectivesRemaining = objRemaining2;
        pl.timeInLevelSec = this.gameUI._levelStartTime ? Math.round((Date.now() - this.gameUI._levelStartTime) / 1000) : 0;
        pl.isBoss = isBoss2;
        pl.bossID = bossID2;
        pl.isChallengeRoom = isCR2;
        pl.roomId = roomId2;
        pl.tppDeviationFinal = tppDev2;
        pl.pu_stats = this.gameUI._puStats || null;
        try { pl.match_stats = bm && bm.matchMgr ? bm.matchMgr.getMatchStats() : null; } catch (e) { pl.match_stats = null; }
        CoreGame.Metrics.send(pl);

        sceneMgr.openScene(SceneLobby.className);

        return;
        // check last heart realtime when user click close
        if (this.popupList.length == 0 && !this.isCheckedLastHeart) {
            this.isCheckedLastHeart = true;
            if (userMgr.getHeartWithUpdate() == 1 && !FreeFunction.getInstance().isInFreeResourceDuration(ResourceType.HEART)) {
                this.popupList.push(NodePopupGUIEndGame.POPUP_TYPE.OUT_OF_HEART);
            }
        }

        if (this.popupList.length == 0) {
            this.bg.getChildByName('lblLose').setVisible(true);
            this.hide();
            let loseStreak = userMgr.getData().getNumLose(this.gameUI.mapPlay);
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
                        boosterType = UIUtils.convertResTypeToBoosterType(this.suggestedBoosterType);
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
        if (this.blockButton) return;

        let hasFreeHeart = false;
        try { hasFreeHeart = FreeFunction.getInstance().isInFreeResourceDuration(ResourceType.HEART); } catch (e) {}
        if (!this.isWin && !hasFreeHeart && userMgr.getHeartWithUpdate() < 1) {
            Dialog.showOkDialogWithAction(fr.Localization.text("ALERT_15").replace("@num", userMgr.getHeartCooldownMinutes()), this, function () {
                this.onClickClose();
            });
            return;
        }

        let levelId = this.gameUI.getLevel();
        let oldStars = this.gameUI.oldStarBeforePlay || 0;
        let bm = this.gameUI.boardUI ? this.gameUI.boardUI.boardMgr : null;

        let objRemaining = 0;
        let tes = bm ? (bm.targetElements || []) : [];
        for (let ti = 0; ti < tes.length; ti++) { if (tes[ti].current > 0) objRemaining += tes[ti].current; }
        let isBoss = 0, bossID = null;
        try { isBoss = levelMgr.isBossLevel(levelId) ? 1 : 0; bossID = levelMgr.bossID || null; } catch (e) {}
        let isCR = 0, roomId = null;
        try { if (typeof challengeRoomMgr !== "undefined" && challengeRoomMgr.isInGauntlet()) { isCR = 1; roomId = challengeRoomMgr.getCurrentRoomId(); } } catch (e) {}
        let tppDev = null;
        try { let tppM = CoreGame.AdaptiveTPP.getMetrics(); tppDev = tppM && tppM.deviation_distribution ? tppM.deviation_distribution.mean : null; } catch (e) {}

        let rewardCoin = 0;
        if (this.isWin) {
            let newStars = bm ? bm.endStar : 0;
            rewardCoin = userMgr.calculateWinGold(levelId, newStars, oldStars);
            this.onEarnCoin(rewardCoin, "level_clear");
            lobbyMgr.setWin(bm ? bm.isReplayWin : false, rewardCoin);
        } else {
            this.onEventLose();
            userMgr.updateHeart(-1, "fail");
        }

        let p = CoreGame.Metrics._buildPrefix();
        p.type = "level_attempt_end";
        p.level_id = levelId;
        p.outcome = this.isWin ? "win_replay" : "fail_replay";
        p.is_win = this.isWin ? 1 : 0;
        p.starsAwarded = this.isWin && bm ? bm.endStar : 0;
        p.movesUsed = bm ? (bm.totalMove - bm.numMove) : 0;
        p.totalMoves = bm ? bm.totalMove : 0;
        p.is_replay = (oldStars > 0) ? 1 : 0;
        p.gold_reward = rewardCoin;
        p.objectivesRemaining = objRemaining;
        p.timeInLevelSec = this.gameUI._levelStartTime ? Math.round((Date.now() - this.gameUI._levelStartTime) / 1000) : 0;
        p.isBoss = isBoss;
        p.bossID = bossID;
        p.isChallengeRoom = isCR;
        p.roomId = roomId;
        p.tppDeviationFinal = tppDev;
        p.pu_stats = this.gameUI._puStats || null;
        try { p.match_stats = bm && bm.matchMgr ? bm.matchMgr.getMatchStats() : null; } catch (e) { p.match_stats = null; }
        CoreGame.Metrics.send(p);

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

        this.unschedule(this.updateHeartDisplay);

        let efxTime = 0.25;
        let elements = [this.heart, this.gold];
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

    showResult: function (result, targets, noMoveShuffle = false) {
        this.isWin = result == BoardResult.WIN;

        cc.log("GameBoardEndGame showResult", JSON.stringify(targets), " noMoveShuffle ", noMoveShuffle);

        // if (this.isWin && levelConfig["endScript"]) {
        //     gv.tutMgr.startScript(levelConfig["endScript"]);
        //     return;
        // }



        this.showReaction(false);
        // this.showReaction(this.isWin);
        this.btnPlay.setVisible(this.isWin);
        this.btnBuyMove.setVisible(!this.isWin);
        this.lblWin.setVisible(this.isWin);
        this.lblLose.setVisible(!this.isWin);
        this.heart.setVisible(!this.isWin);
        this.gold.setVisible(!this.isWin);
        this.updateHeartDisplay();
        this.char_win.setVisible(this.isWin);
        this.char_lose.setVisible(!this.isWin);

        this.clearTarget();
        // this.reAlignGui(this.isWin);
        if (this.isWin) {
            this.showReward();
        } else {
            this.showTarget(targets);

            if (this.btnBuyMove && this.btnBuyMove.isVisible()) {
                this.btnBuyMove.setVisible(!noMoveShuffle);
            }

            this.btnReplay.setVisible(!this.btnBuyMove.isVisible());
        }


        m3.trackEndGame(this.gameUI.levelId, result);
    },

    reAlignGui: function (isWin) {
        // this.bg.height = isWin ? 534 : 608;
        // this.bg.getChildByName('bg_target_1').setPositionY(isWin ? 350 : 430);
        // this.bg.getChildByName('bg_target').setPositionY(isWin ? 300 : 380);
        // this.bg.getChildByName('lblTarget').setPositionY(isWin ? 400 : 490);
        // this.bg.getChildByName('close').setPositionY(isWin ? 520 : 576);
    },

    showReward: function () {
        this.bg.setVisible(true);
        this.bgLose.setVisible(false);

        if (this.popup) this.popup.setVisible(false);

        let lblLevel;
        lblLevel = fr.Localization.text('lang_level') + " " + this.gameUI.getLevel();

        this.lblWin.setString(lblLevel);

        let levelId = this.gameUI.getLevel();
        let newStars = this.gameUI.boardUI.boardMgr.endStar;
        let oldStars = this.gameUI.oldStarBeforePlay || 0;
        var reward = userMgr.calculateWinGold(levelId, newStars, oldStars);

        var rootPos = { x: this.bg_target.width / 2, y: this.bg_target.height / 2 - 5 }, padding = 120;
        var listNode = [];
        var coin = this.createTarget("coin", reward);
        this.bg_target.addChild(coin);
        listNode.push(coin);

        for (let i in listNode) {
            listNode[i].setPosition(rootPos.x + (i - (listNode.length - 1) / 2) * padding, rootPos.y);
        }

        for (let i = 0; i < this.stars.length; i++) {
            let star = this.stars[i].star;
            star.setVisible(i < this.gameUI.boardUI.boardMgr.endStar);

            if (star.isVisible()) {
                star.stopAllActions();
                star.setOpacity(0);
                star.setPosition(star.rawPos);
                star.y += 250;
                star.setScale(2);

                let efxTime = 0.25;
                star.runAction(cc.sequence(
                    cc.delayTime(0.5 + 0.25 * i),
                    cc.spawn(
                        cc.moveTo(efxTime, star.rawPos).easing(cc.easeIn(5)),
                        cc.rotateBy(efxTime, 360).easing(cc.easeBackOut()),
                        cc.scaleTo(efxTime, 1).easing(cc.easeBackOut()),
                        cc.fadeIn(efxTime)
                    )
                ));
            }
        }
        // nodeBgTarget.addChild(star);
        // listNode.push(star);
    },

    onEarnCoin: function (goldReward, source) {
        var lvId = null;
        try { lvId = this.gameUI.getLevel(); } catch (e) {}
        userMgr.updateGold(goldReward, source, lvId);
    },

    showWinStreak: function () {

    },

    showTarget: function (targets) {
        let lblLevel;
        lblLevel = fr.Localization.text('lang_level') + " " + this.gameUI.getLevel();
        this.lblLevel.setString(lblLevel);

        this.bg.setVisible(false);
        this.bgLose.setVisible(true);

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

        this.lblTargetLose.setString(fr.Localization.text('lang_target'));
        let nodeBgTarget = this.bg_target_lose;
        var rootPos = { x: nodeBgTarget.width / 2, y: nodeBgTarget.height / 2 - 5 }, padding = 100;
        var listNode = [];
        for (var target of targets) {
            let type = target["id"];
            var currentAmount = target["count"] - target["current"];
            var amountTarget = target["count"];
            cc.log("SHOW TARGET LOSE", JSON.stringify(target));
            cc.log("SHOW TARGET LOSE", type, amountTarget, currentAmount);

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
        ccui.Helper.doLayout(this.bgLose);
        this.char_lose.setPosition(this.lblLevel.getPosition());

        // metric
        // if (this.gameUI.boughtMoveTurn == 0 && !this.gameUI.isEditMode && !this.gameUI.isShareMode)
        //     this.addMetricLoseTarget();
    },

    getMovePrice: function () {
        var price = {
            gold: CurrencyConfig.getExtraMovePrice(this.gameUI.boughtMoveTurn + 1)
        };
        return price;
    },

    showBuyMove: function () {
        cc.log("Show Buy Move =========== ");
        this.onBuyingMove = false;
        // User Gold
        let userGold = userMgr.getData().gold;
        this.gold.getChildByName('label').setString(userGold.formatAsMoney());
        this.updateHeartDisplay();

        // Price
        var price = this.getMovePrice();
        var btnBuyMove = this.btnBuyMove;
        var gold = price['gold'];
        var g = price['G'];
        let cost = g || gold;

        if (userGold < cost) {
            this.bgLose.height = 700;
            btnBuyMove.setVisible(false);
            return;
        }

        let margin = 10;
        let totalWidth = 0;
        let centerNode = btnBuyMove.getChildByName('centerNode');

        let label = centerNode.getChildByName('lblPlay');
        label.x = totalWidth;
        totalWidth += UIUtils.getLabelWidth(label) + margin;

        let icon = centerNode.getChildByName('icon');
        icon.setTexture(g != null ? 'lobby/icon_g.png' : 'lobby/icon_gold.png');
        icon.x = totalWidth;
        totalWidth += icon.width + margin;

        let costLbl = centerNode.getChildByName('cost');
        costLbl.setString(cost.formatAsMoney());
        costLbl.x = totalWidth;
        totalWidth += UIUtils.getLabelWidth(costLbl);

        centerNode.x = centerNode.rawPos.x - totalWidth * 0.5;

        this.btnBuyMove.setPosition(this.btnBuyMove.rawPos);

        this.btnExit.setVisible(true);
        this.btnExit.setPosition(this.btnExit.rawPos);

        this.bgLose.height = this.bgLose.rawSize.height;
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
            userMgr.processBuyMove(data);
        } else {
            // if (gv.alert && gv.alert.showNotEnoughGoldG) {
            //     gv.alert.showNotEnoughGoldG(ResourceType.GOLD, null);
            // } else {
            //LogLayer.show("Not enough gold!");
            // }
            Dialog.showOKDialog(fr.Localization.text("lang_not_enough_gold"));
        }
    },

    checkPriceBuyMove: function (turn) {
        var price = this.getMovePrice()['gold'];
        cc.log("checkPriceBuyMove", ResourceType.GOLD, price, userMgr.getResByType(ResourceType.GOLD));
        return price <= userMgr.getResByType(ResourceType.GOLD);
    },

    onEventLose: function () {
        cc.log("onEventLose");

        // this.gameUI.addActionEndGameLose(ActionType.LOG_LOSE_SUBTRACT_HEART);
    },

    clearTarget: function () {
        for (var id in this.targetNode) {
            var node = this.targetNode[id];
            node.removeFromParent(true);
        }
        this.targetNode = [];
    },

    addMetricLoseTarget: function () {

    },

    isEnableWinStreak: function () {
        return false;
        if (this.gameUI.isBossRun) return false;
        return Cheat.getInstance().enableWinStreak && userMgr.getData().getLevel() >= Cheat.getInstance().levelWinStreak;
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
GameBoardEndGame.json = "game/csd/GUIEndGame.json",
    GameBoardEndGame.ELEMENT_ZORDER = {
        TARGET: 9,
        POPUP: 10,
        CLOSE_BUTTON: 11
    };

const BoardResult = {
    NONE: 0,
    WIN: 1,
    LOSE: 2
}