var CoreGame = CoreGame || {};

CoreGame.GameBoardToolUI = BaseLayer.extend({
    isHaveFreeBooster: null,
    myInterval: null,

    pnlFog: null,

    toolTray: null,
    pTools: null,
    btnTool0: null,
    btnTool1: null,
    btnTool2: null,

    btnPause: null,
    btnQuit: null,
    btnSound: null,
    btnMusic: null,

    nodeToolInfo: null,

    ctor: function (mainScene) {
        this._super();
        this.mainScene = mainScene;
        this.board = mainScene.board;
        this.listTool = {};
        this.curTool = null;
        this.forceToolAction = null;

        this.initWithJsonFile(CoreGame.GameBoardToolUI.JSON);

        this.pTools.setVisible(false);

        this.checkEnableTools();
    },

    initLayer: function () {
        this.pnlFog.setContentSize(cc.winSize);
        this.pnlFog.setPositionX(-cc.winSize.width/2);
        this.pnlFog.setLocalZOrder(CoreGame.GameBoardToolUI.zOrder.FOG);
        this.nodeToolInfo.setLocalZOrder(CoreGame.GameBoardToolUI.zOrder.INFO);
        this.pnlFog.setVisible(false);
        this.nodeToolInfo.setVisible(false);

        this.toolTray.width = cc.winSize.width;

        // idx same with CommonTool.Type
        // this.listTool[0] = new Glove(this.btnTool0, this, this.board);
        // this.listTool[1] = new Hammer(this.btnTool1, this, this.board);
        // this.listTool[2] = new BigHammer(this.btnTool2, this, this.board);
        this.listTool = [];
        this.updateAmountTool();

        this.pausing = false;
        this.btnSound.getChildByName('icon_on').setVisible(fr.Sound.effectOn);
        this.btnSound.getChildByName('icon_off').setVisible(!fr.Sound.effectOn);
        this.btnMusic.getChildByName('icon_on').setVisible(fr.Sound.musicOn);
        this.btnMusic.getChildByName('icon_off').setVisible(!fr.Sound.musicOn);

        this.btnQuit.addClickEventListener(this.onClickQuit.bind(this));
        this.btnPause.addClickEventListener(this.onClickPause.bind(this));
        this.btnSound.addClickEventListener(this.onClickSound.bind(this));
        this.btnMusic.addClickEventListener(this.onClickMusic.bind(this));

        this.btnCheat.setVisible(!gv.isRelease);

        this.showGUIPause(false, false);
    },

    setBoard: function (mainBoard) {
        this.board = mainBoard;
        for (let tool in this.listTool) {
            this.listTool[tool].board = mainBoard;
            this.listTool[tool].initEffect();
        }
    },

    // click event registered in cocos studio
    onClickPause: function () {
        if (this.board && this.board.getGameResult() != BoardResult.NONE) return;
        if (this.pausing) return;
        this.pausing = true;

        // const scene = cc.director.getRunningScene();
        // const fog = UIUtils.addFog(scene);
        this.pnlFog.setVisible(true);

        this.btnPause.stopAllActions();
        this.btnPause.setScale(1);
        // UIUtils.changeParent(this.btnPause, scene);
        // this.btnPause.setLocalZOrder(fog.getLocalZOrder() + 1);

        const timeAnim = 0.3;
        this.pnlFog.setOpacity(0);
        this.pnlFog.runAction(cc.fadeTo(timeAnim, 255));
        this.pnlFog.addClickEventListener(function () {
            this.hideFogPause(this.pnlFog, timeAnim);
        }.bind(this));
        this.fogPause = this.pnlFog;

        this.showGUIPause(true);
    },

    hideFogPause:function(fog, timeAnim){
        if(fog.getNumberOfRunningActions() > 0) return;
        this.showGUIPause(false);
        fog.runAction(cc.sequence(
            cc.fadeOut(timeAnim),
            cc.callFunc(function () {
                // UIUtils.changeParent(this.btnPause, this);
                this.pausing = false;
            }.bind(this)),
            cc.removeSelf()
        ));
    },

    showGUIPause: function (bool, isAnim = true) {
        const listBtn = [this.btnQuit, this.btnSound, this.btnMusic];
        // for (let i = 0; i < listBtn.length; i++) {
            // UIUtils.changeParent(listBtn[i], this.btnPause.getParent(), 100000, false);
            // listBtn[i].setVisible(true);
        // }

        // this.pnlFog.setVisible(bool);

        if (!isAnim) {
            for (let i = 0; i < listBtn.length; i++) {
                listBtn[i].stopAllActions();
                listBtn[i].setVisible(bool);
            }
            return;
        }

        const timeAnim = 0.15;
        for (let i = 0; i < listBtn.length; i++) {
            let action, btn = listBtn[i];
            btn.stopAllActions();
            if (bool) {
                btn.setVisible(true);
                btn.setOpacity(0);
                btn.setPosition(btn.oriPosition);
                action = cc.sequence(
                    cc.moveBy(0, 0, -50),
                    cc.delayTime(timeAnim * 0.4 * i),
                    cc.spawn(
                        cc.fadeIn(timeAnim * 0.5),
                        cc.moveBy(timeAnim, 0, 50).easing(cc.easeBackOut())
                    )
                );
            } else {
                action = cc.sequence(
                    cc.spawn(
                        cc.moveTo(timeAnim * 0.75, btn.oriPosition).easing(cc.easeBackIn()),
                        cc.fadeOut(timeAnim * 0.75)
                    ),
                    cc.hide()
                );
            }

            btn.runAction(action);
        }
    },

    // click event registered in cocos studio
    onClickQuit:function(){
        fr.temporaryDisableBtn(this.btnQuit, 1.0);
        this.btnQuit.setScale(1);

        // this.board.onClickBack();

        sceneMgr.openGUI(GUIQuitGame.className).quitGameCallBack = function () {
            this.onQuitGame();
        }.bind(this);

        // this.guiQuitGame.initTarget([]);
    },

    onQuitGame: function () {
        cc.log("onQuitGame");

        // Subtract heart on abandon (same as lose)
        var boardMgr = this.mainScene.boardUI.boardMgr;
        var logType;
        if (boardMgr.numMove > 0) {
            logType = ActionType.LOG_OUT_GAME;
        } else {
            logType = ActionType.LOG_LOSE_SUBTRACT_HEART;
        }
        this.mainScene.addActionEndGameLose(logType);

        // Return to lobby
        sceneMgr.openScene(SceneLobby.className);
    },

    // click event registered in cocos studio
    onClickSound:function(){
        fr.Sound.turnOnSound();
        this.btnSound.getChildByName('icon_on').setVisible(fr.Sound.effectOn);
        this.btnSound.getChildByName('icon_off').setVisible(!fr.Sound.effectOn);
    },

    // click event registered in cocos studio
    onClickMusic:function(){
        fr.Sound.turnOnMusic();
        this.btnMusic.getChildByName('icon_on').setVisible(fr.Sound.musicOn);
        this.btnMusic.getChildByName('icon_off').setVisible(!fr.Sound.musicOn);
    },

    // click event registered in cocos studio
    onClickCheat: function () {
        if(gv.isRelease) return;

        this.mainScene.guiCheat.show();
    },

    setToolInfo: function (type, name, des) {
        this.imgTool.setTexture('game/gui/tool/tool_' + type + '.png');
        this.lbToolName.setString(name);
        this.lbToolFeature.setString(des);
    },

    showUseTool: function () {
        //remove all efk running
        gv.removeAllEfk();

        this.pnlFog.addClickEventListener(function () {
            this.cancelUseTool();
        }.bind(this))
        this.nodeToolInfo.y = this.board.panelBoard.y + this.board.panelBoard.height / 2 + 120;
        this.nodeToolInfo.setVisible(true);
        this.pnlFog.setVisible(true);

        this.nodeToolInfo.setOpacity(0);
        this.pnlFog.setOpacity(0);

        this.nodeToolInfo.runAction(cc.fadeIn(0.2));
        this.pnlFog.runAction(cc.fadeIn(0.2));

        var wPosBoard = this.board.convertToWorldSpace(this.board.panelBoard.getPosition());
        this.board.panelBoard.retain();
        this.board.panelBoard.removeFromParent(false);
        this.mainScene.addChild(this.board.panelBoard, this.getLocalZOrder() + 1);
        this.board.panelBoard.release();
        this.board.panelBoard.setPosition(wPosBoard);

        let nodeBalloon = this.board.getSingleElement(CoreGame.Config.ElementType.BALLOON)
            || this.board.getSingleElement(CoreGame.Config.ElementType.PROTECT_BALLOON);
        if (nodeBalloon != null){
            nodeBalloon.origZorder = nodeBalloon.getLocalZOrder();
            nodeBalloon.origScaleX = nodeBalloon.getScaleX();
            nodeBalloon.origScaleY = nodeBalloon.getScaleY();
            // UIUtils.changeParent(nodeBalloon, this.board, MainScene.ZORDER.MAIN_BOARD, false);
            nodeBalloon.setScale(this.board.panelBoard.getScaleX(),this.board.panelBoard.getScaleY());
        }
    },

    hideUseTool: function (callback) {
        this.nodeToolInfo.runAction(cc.sequence(
            cc.fadeOut(0.2),
            cc.callFunc(function () {
                this.nodeToolInfo.setVisible(false);
            }.bind(this))
        ))
        this.pnlFog.runAction(cc.sequence(
            cc.fadeOut(0.2),
            cc.callFunc(function () {
                this.pnlFog.setVisible(false);

                this.board.panelBoard.retain();
                this.board.panelBoard.removeFromParent(false);
                this.board.addChild(this.board.panelBoard);
                this.board.panelBoard.release();
                this.board.panelBoard.setPosition(this.board.finalBoardPanelPos);

                let nodeBalloon = this.board.getSingleElement(CoreGame.Config.ElementType.BALLOON)
                    || this.board.getSingleElement(CoreGame.Config.ElementType.PROTECT_BALLOON);
                if (nodeBalloon != null){
                    // UIUtils.changeParent(nodeBalloon, this.board.panelBoard, nodeBalloon.origZorder, false);
                    nodeBalloon.setScale(nodeBalloon.origScaleX ,nodeBalloon.origScaleY);
                }

                callback && callback();
                if (this.curTool != null){
                    this.curTool.listSlot = [];
                    this.curTool = null;
                }
            }.bind(this))
        ))
    },

    cancelUseTool: function () {
        this.hideUseTool(function () {
            this.board.boardState = BoardState.MOVE;
        }.bind(this))
    },

    updateAmountTool: function () {
        cc.log("updateAmountTool");
        for (let i in this.listTool)
            this.listTool[i].updateAmount();
    },

    checkEnableTools: function(){
        win32.log("checkEnableTools");
        var isEnabled = gv.tutMgr.getData().isFinishedFeatureTut(TUTORIAL_FEATURE.TOOL);
        this.enableTools(isEnabled);
        if (gv.tutMgr.isNeedDoTutFeature(TUTORIAL_FEATURE.TOOL)){
            this.showTools();
            gv.tutMgr.getData().setTutFeatureState(userInfo.getUId(), TUTORIAL_FEATURE.TOOL, TUTORIAL_STATE.DONE);
        }
    },
    enableTools: function (isEnabled) {
        for (let i in this.listTool){
            this.listTool[i].setEnableTool(isEnabled);
            this.listTool[i].btn.setColor(isEnabled ? cc.color(255, 255, 255) : cc.color(225, 225, 225));
            this.listTool[i].getIcon().setOpacity(isEnabled ? 255 : 255*0.35);
        }
    },
    getToolByType: function(toolType) {
        for (let i in this.listTool){
            if (this.listTool[i].type == toolType) return this.listTool[i];
        }
        return null;
    },
    showTools: function () {
        var count = 0;
        for (let i in this.listTool){
            var tool = this.listTool[i];
            tool.setEnableTool(true);
            var btn = tool.btn;
            btn.setColor(cc.color(255,255,255));
            btn.setEnabled(true);
            btn.runAction(cc.sequence(
                cc.delayTime(count*0.1),
                cc.scaleTo(0.1, tool._origScaleX*1.15, tool._origScaleY*1.15), cc.scaleTo(0.1, tool._origScaleX, tool._origScaleY)
            ));
            this.listTool[i].getIcon().runAction(cc.sequence(
                cc.delayTime(count*0.1),
                cc.fadeIn(0.1)
            ));
            count++;
        }
    },

    forceTouchTool: function(action){
        this.forceToolAction = action;
        var tool = this.getToolByType(action.toolType);
        if (tool){
            var btn = tool.btn;
            btn.setEnabled(true);
            btn.origZorder = btn.getLocalZOrder();
            btn.origScale = btn.getScale();
            btn.origPos = btn.getPosition();
            var scaleVal = 1.2;
            var diffY = btn.getContentSize().height * (scaleVal-1) * btn.origScale;    // size scaleOut - size normal
            UIUtils.addFog(this._rootNode, 100, "FOG_HIGHLIGHT_TOOL");
            btn.setLocalZOrder(101);
            var show = cc.sequence(
                cc.delayTime(1.0),
                cc.spawn(
                    cc.scaleTo(0.5,btn.origScale*scaleVal).easing(cc.easeBackOut()),
                    cc.moveBy(0.5, 0, diffY)
                )
            )
            btn.runAction(show);
        }
    },
    checkFinishStepForceTool: function(toolType){
        if (this.forceToolAction != null && this.forceToolAction.toolType == toolType){
            this.finishForceTool();
        }
    },
    finishForceTool: function () {
        // finish action
        this.forceToolAction.finishAction();
        // update UI
        var fog = this._rootNode.getChildByName("FOG_HIGHLIGHT_TOOL");
        if (fog) fog.removeFromParent(true);
        var tool = this.getToolByType(this.forceToolAction.toolType);
        if (tool){
            var btn = tool.btn;
            if (btn.origZorder == null) btn.origZorder = 0;
            btn.setLocalZOrder(btn.origZorder);
            btn.runAction(cc.scaleTo(0.5, btn.origScale));
            btn.runAction(cc.moveTo(0.5, btn.origPos));
        }
        this.forceToolAction = null;
    },
    setEnableToolOnTutorial: function (isEnabled) {
        for (let i in this.listTool){
            this.listTool[i].btn.setEnabled(isEnabled);
        }
    },

    //region EFX
    efxIn: function (delayTime = 0, efxTime = 0.25) {
        this.toolTray.stopAllActions();
        this.toolTray.setPosition(this.toolTray.rawPos);
        this.toolTray.y -= 250;
        this.toolTray.runAction(cc.sequence(
            cc.delayTime(delayTime),
            cc.moveTo(efxTime, this.toolTray.rawPos).easing(cc.easeBackOut())
        ));
    }
    //endregion EFX
});
CoreGame.GameBoardToolUI.JSON = "zcsd/game/GameBoardToolUI.json";
CoreGame.GameBoardToolUI.zOrder = {
    TRAY: 0,
    TOOL_HIDE: 1,
    FOG: 5,
    INFO: 10,
    TOOL_SHOW: 10
};