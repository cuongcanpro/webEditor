/**
 * Created by AnhVTT on 3/15/2021.
 */
var CoreGame = CoreGame || {};

CoreGame.GameBoardEffectLayer = cc.Layer.extend({
    ctor: function (gameUI) {
        this._super();
        this.gameUI = gameUI;

        // Encourage Effect
        this.encourageBG = [new cc.Sprite(seq_match.background), new cc.Sprite(seq_match.background)];
        for (var i in this.encourageBG) {
            var BG = this.encourageBG[i];
            BG.setPosition(cc.p(this.width / 2, this.height / 2));
            this.addChild(BG);
        }
        this.resetEncourage();
        this.encourageLabel = [null, null];
        this.showingEncourageLabel = 0;
    },

    showEncourageLabel: function () {
        if (this.board.getGameResult() != BoardResult.NONE)
            return;

        // get label path
        var gemCombo = this.board.boardMgr.gemCombo;
        var matchSeq = this.board.boardMgr.matchSequence;
        this.board.boardMgr.gemCombo = 0;
        this.board.boardMgr.matchSequence = 0;
        var comboLevel = -1;
        for (var i = 0; i < BoardConst.COMBO_LEVEL; i++) {
            if (gemCombo >= BoardConst.GEM_COMBO_ENCOURAGE[i] || matchSeq >= BoardConst.MATCH_SEQUENCE_ENCOURAGE[i]) {
                comboLevel = i;
            }
        }
        if (comboLevel == -1) return;
        if (comboLevel >= 4) comboLevel = 4;

        var paths = seq_match["seq_" + comboLevel];

        var path = fr.generateRandomElement(paths);
        cc.log("pathEndGame " + path);

        // create sprite
        this.showingEncourageLabel = 1 - this.showingEncourageLabel;
        var BG = this.encourageBG[this.showingEncourageLabel];
        if (this.encourageLabel[this.showingEncourageLabel] == null) {
            let image = new cc.Sprite();
            this.encourageLabel[this.showingEncourageLabel] = image;
            image.setPosition(cc.p(BG.width / 2, BG.height / 2));
            BG.addChild(image);
        }
        var image = this.encourageLabel[this.showingEncourageLabel];

        // invisible previous sprite & visible new sprite
        this.encourageEndingTime = Math.max(this.encourageEndingTime, TimeSystem.getCurTimeServerInMillis());
        var delay = Math.max(0, this.encourageEndingTime - TimeSystem.getCurTimeServerInMillis());
        if (this.encourageEndingTime == 0) {
            delay = 0;
            this.encourageEndingTime = TimeSystem.getCurTimeServerInMillis();
        }
        this.runAction(cc.sequence(
            cc.delayTime(delay / 1000),
            cc.callFunc(function () {
                if (this.board.getGameResult() != BoardResult.NONE)
                    return;
                image.runAction(cc.sequence(
                    cc.fadeIn(0),
                    cc.callFunc(function () {
                        image.setTexture(path);
                    }),
                    cc.delayTime(BoardConst.ENCOURAGE_SHOWING_DURATION),
                    cc.fadeOut(0)
                ));
                this.encourageBG[this.showingEncourageLabel].runAction(cc.sequence(
                    cc.scaleTo(0, 0, 0),
                    cc.fadeIn(0),
                    cc.scaleTo(BoardConst.ENCOURAGE_SHOWING_DURATION / 4, 1.0, 1.0),
                    cc.fadeOut(BoardConst.ENCOURAGE_SHOWING_DURATION / 4 * 3)
                ));
                this.encourageBG[this.showingEncourageLabel].runAction(cc.sequence(
                    cc.delayTime(BoardConst.ENCOURAGE_SHOWING_DURATION / 4),
                    cc.moveBy(BoardConst.ENCOURAGE_SHOWING_DURATION / 4 * 3, 0, 10)
                ));
            }.bind(this))
        ));
        this.encourageEndingTime += BoardConst.ENCOURAGE_SHOWING_DURATION * 1000;
    },

    resetEncourage: function () {
        for (var i in this.encourageBG) {
            var BG = this.encourageBG[i];
            BG.stopAllActions();
            BG.opacity = 0;
            BG.scale = 0;
        }
        this.encourageEndingTime = 0;
    },

    showLevelCompleteLabel: function () {
        let boardMgr = CoreGame.BoardUI.getInstance().boardMgr;

        let guiTool = this.gameUI.gameBoardToolUI;
        if (guiTool.pausing) {
            guiTool.hideFogPause(guiTool.fogPause, 0);
        }

        fr.showTopPanel(this.board);
        fr.Sound.playSoundEffect(resSound.game_success, false);

        let guiBoardInfo = this.gameUI.gameBoardInfoUI;
        guiBoardInfo.gameEnded = true;
        guiBoardInfo.spine_cat.setAnimation(0, 'happy', true);

        guiTool.setVisible(false);

        if (this.char == null) {
            this.cloud1 = new cc.Sprite(left_cloud);
            this.cloud2 = new cc.Sprite(right_cloud);
            this.cloud1.setPosition(cc.winSize.width / 2 + 200, -450);
            this.cloud2.setPosition(cc.winSize.width / 2 - 200, -450);
            this.gameUI.addChild(this.cloud1, BoardConst.zOrder.EFF_MATCHING);
            this.gameUI.addChild(this.cloud2, BoardConst.zOrder.EFF_MATCHING);

            this.char = gv.createSpineAnimation(resAni.char_win);
            this.char.setPosition(cc.winSize.width / 2, -100);
            this.gameUI.addChild(this.char, BoardConst.zOrder.EFF_MATCHING);

            this.completeLabel = gv.createSpineAnimation(resAni.eureka);
            this.completeLabel.setPosition(cc.winSize.width / 2, 400);
            this.gameUI.addChild(this.completeLabel);
        }

        this.char.setPosition(cc.winSize.width / 2, -600);
        this.char.runAction(cc.moveTo(0.25, cc.winSize.width / 2, -100).easing(cc.easeSineIn()));
        this.cloud1.runAction(cc.moveTo(0.25, cc.winSize.width / 2 + 200, 50).easing(cc.easeSineIn()));
        this.cloud2.runAction(cc.moveTo(0.25, cc.winSize.width / 2 - 200, 50).easing(cc.easeSineIn()));
        this.char.setAnimation(0, 'win_cat', true);
        this.completeLabel.setVisible(false);
        this.completeLabel.runAction(cc.sequence(
            cc.delayTime(0.5),
            cc.callFunc(function () {
                this.completeLabel.setVisible(true);
                this.completeLabel.setAnimation(0, "text", false);
                gv.createTLFX(
                    "fire_work",
                    cc.p(cc.winSize.width / 2, 700),
                    this.gameUI,
                    BoardConst.zOrder.EFF_MATCHING - 1
                );
            }.bind(this))
        ));

        cc.log("wantToCollect!!!");
        // const mainScene = this.gameUI;
        // if (!mainScene.isEditMode && !mainScene.isShareMode) {
        //     mainScene.processWin();
        // }

        // let difficulty = this.board.levelCfg['difficulty'];
        let difficulty = 3;
        let reward = LEVEL_BONUS[Math.min(difficulty, 3)];
        // if (this.board.isLevelBonusGold) reward += this.board.listCurTarget[CoreGame.Config.ElementType.GOLD_BONUS];
        // cc.log("reward obj", this.board.listCurTarget[CoreGame.Config.ElementType.GOLD_BONUS], gv.numGold);
        cc.log("collect multiple coin");
        cc.log("reward = ", reward, Math.min(difficulty, 3), LEVEL_BONUS[Math.min(difficulty, 3)]);
        fr.Sound.playSoundEffect(resSound.earn_gold, false);
        guiBoardInfo.initCoinCollect(reward);

        this.completeLabel.runAction(cc.sequence(
            cc.delayTime(1.9),
            cc.callFunc(function () {
                // fr.hideTopPanel(this.board)
            }.bind(this)),
            cc.fadeOut(0.5),
            cc.callFunc(function () {
                //  CoreGame.BoardUI.getInstance().boardMgr.getLevelBonus = true;
                //  CoreGame.BoardUI.getInstance().boardMgr.removeAllBlocker();
            }.bind(this)),
            cc.delayTime(0.5),
            cc.callFunc(function () {
                this.char.runAction(cc.fadeOut(1.0));
                this.cloud1.runAction(cc.fadeOut(1.0));
                this.cloud2.runAction(cc.fadeOut(1.0));
            }.bind(this))
        ))
    },

    showOutOfMoveLabel: function () {
        fr.showTopPanel(this.board.mainScene);
        let bg = new cc.Sprite('game/gui/end_game/bg_out_of_move.png');
        var pathLabel = "localize/outOfMove.png";

        let label = new cc.Sprite(pathLabel);
        bg.addChild(label);
        label.setPosition(bg.width / 2, bg.height / 2);
        bg.setPosition(cc.winSize.width / 2, cc.winSize.height + 500);
        this.board.mainScene.addChild(bg, GUIConst.GUI_ZORDER);

        this.showingOutOfMoveLabel = true;
        this.outOfMoveLabel = bg;
        bg.label = label;

        this.board.mainScene.topPanel.getChildByName('panel').addTouchEventListener(this.touchFog, this);
        bg.runAction(cc.sequence(
            cc.moveTo(0.3, cc.winSize.width / 2, cc.winSize.height / 2).easing(cc.easeSineOut()),
            cc.delayTime(0.5),
            cc.callFunc(function () {
                this.hideOutOfMoveLabel();
            }.bind(this))
        ));
        if (Utility.isIOS()) {
            bg.setScaleX(cc.winSize.width / bg.width);
            label.setScaleX(bg.width / cc.winSize.width);
        }
    },

    touchFog: function (sender, type) {
        switch (type) {
            case ccui.Widget.TOUCH_BEGAN:
                break;
            case ccui.Widget.TOUCH_MOVED:
                break;
            case ccui.Widget.TOUCH_ENDED:
                if (this.showingOutOfMoveLabel) {
                    this.hideOutOfMoveLabel();
                }
                break;
        }
    },

    hideOutOfMoveLabel: function () {
        if (!this.showingOutOfMoveLabel) return;
        this.showingOutOfMoveLabel = false;
        this.outOfMoveLabel.runAction(cc.sequence(
            cc.moveTo(0.3, cc.winSize.width / 2, -500).easing(cc.easeSineOut()),
            cc.callFunc(function () {
                fr.hideTopPanel(this.board.mainScene);
                this.board.mainScene
                    .getGUI(MainScene.TagLayer.END_GAME)
                    .showResult(this.board.getGameResult());
            }.bind(this))
        ))
    },
});
