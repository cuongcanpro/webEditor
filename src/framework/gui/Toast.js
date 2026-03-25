/**
 * Created by HOANGNGUYEN on 7/23/2015.
 */

var Toast = cc.Layer.extend({

    ctor: function(time,message){
        this._super();
        this._time = time;
        this._message = message;
        this._layerColor = new cc.LayerColor(cc.BLACK);
        this._layerColor.setOpacity(210);
        this.addChild(this._layerColor);
    },

    onEnter: function() {
        var scale = cc.director.getWinSize().width/Constant.WIDTH;
        scale = (scale > 1) ? 1 : scale;

        cc.Layer.prototype.onEnter.call(this);

        this._label = new ccui.Text();
        this._label.setAnchorPoint(cc.p(0.5,0.5));
        this._label.ignoreContentAdaptWithSize(false);

        this._label._customSize = true;
        //this._label._setWidth(cc.winSize.width * 0.5);

        //this._label._setBoundingWidth(cc.winSize.width * 0.5);
        //this._label.setLineBreakOnSpace(true);
        //this._label.setTextAreaSize(cc.size(cc.winSize.width * 0.5, 40));

        this._label.setFontName("fonts/tahoma.ttf");
        this._label.setFontSize(26);
        this._label.setTextHorizontalAlignment(cc.TEXT_ALIGNMENT_CENTER);
        this._label.setColor(sceneMgr.ccWhite);
        this._label.setString(this._message);
        this._label.setScale(scale);
        this._label._setWidth(cc.winSize.width * 0.9);
        this._label._setHeight(105);

        this._layerColor.addChild(this._label);
        this._layerColor.setPosition(0,0);

        this._label.setPosition(cc.winSize.width/2, this._label.getVirtualRendererSize().height * 0.5 - 15);
        this._layerColor.setPosition(0,cc.winSize.height - this._label.getVirtualRendererSize().height * 0.5);

        this.runAction(cc.sequence(new cc.EaseBackOut(cc.moveBy(0.3,cc.p(0,-this._label.getContentSize().height/2))),
                                    cc.delayTime(this._time),
                                    new cc.EaseBackIn(cc.moveBy(0.3,cc.p(0,this._label.getContentSize().height/2))),cc.removeSelf()));
    }
});

Toast.makeToast = function(time,message){
    var instance = new Toast(time,message);
    sceneMgr.layerGUI.addChild(instance);
    instance.setLocalZOrder(LOADING_TAG);
    return instance;
};

Toast.SHORT = 1.0;
Toast.LONG = 2.0;

var SuggestQuickPLayToast = cc.Layer.extend({

    ctor: function(time, roomMode, roomBet){
        this._super();
        this._time = time;
        this.roomMode = roomMode;
        this.roomBet = roomBet;
        this._layerGUI = cc.Sprite("res/Lobby/Lobby/suggestQuickPlay/bgToast.png");
        this.setContentSize(cc.director.getWinSize().width, this._layerGUI.getContentSize().height + 10);
        this.addChild(this._layerGUI);
        this._layerGUI.setAnchorPoint(0.5, 1);
        this._layerGUI.setPosition(this.getContentSize().width / 2, this.getContentSize().height);

        let iconModel = null;
        if(roomMode === Tongits.BUTASAN_ROOM_MODE) {
            iconModel = cc.Sprite("res/Board/Game/modeButasan.png");
            this._layerGUI.addChild(iconModel);
        } else if(roomMode === Tongits.BIG_BET_ROOM_MODE) {
            iconModel = cc.Sprite("res/Board/Game/modeBigBet.png");
            this._layerGUI.addChild(iconModel);
        } else if(roomMode === Tongits.NORMAL_ROOM_MODE){
            iconModel = new ccui.Text("Normal","fonts/tahomabd.ttf", 30);
            iconModel.setAnchorPoint(cc.p(0.5,0.5));
            iconModel.ignoreContentAdaptWithSize(true);
            iconModel.enableOutline(cc.color(15, 22, 78, 200), 2);
            iconModel.setColor(cc.color(255, 255, 255, 255));
            this._layerGUI.addChild(iconModel);
        }
        if(iconModel) {
            iconModel.setScale(0.85);
            iconModel.setPosition(80, this._layerGUI.getContentSize().height / 2);
        }

        //roomBet
        this._label = new ccui.Text();
        this._label.setAnchorPoint(cc.p(0,0.5));
        this._label.ignoreContentAdaptWithSize(true);
        this._label.setFontName("fonts/tahoma.ttf");
        this._label.setFontSize(25);
        this._label.setColor(cc.color(169, 198, 255, 255));
        this._label.setString("Bet: " + StringUtility.formatNumberSymbol(this.roomBet));
        this._layerGUI.addChild(this._label);
        this._label.setPosition(roomMode === Tongits.NORMAL_ROOM_MODE ? 150 : 120, this._layerGUI.getContentSize().height / 2);

        //user in board
        for(let pos = 0; pos < 3; pos++) {
            let icUser = cc.Sprite("res/Lobby/Lobby/suggestQuickPlay/userOnline.png");
            if(pos === 2) icUser = cc.Sprite("res/Lobby/Lobby/suggestQuickPlay/bgUser.png");
            this._layerGUI.addChild(icUser);
            icUser.setPosition(300 + 30 * pos, this._layerGUI.getContentSize().height / 2);
        }

        //button playnow
        this.buttonPlayNow = ccui.Button("res/Lobby/Lobby/suggestQuickPlay/btnPlayNow.png", "res/Lobby/Lobby/suggestQuickPlay/btnPlayNow.png", "");
        this._layerGUI.addChild(this.buttonPlayNow);
        this.buttonPlayNow.setPosition(520, this._layerGUI.getContentSize().height / 2);

        this.buttonPlayNow.setPressedActionEnabled(true);
        this.buttonPlayNow.setTag(1);
        this.buttonPlayNow.addTouchEventListener(this.onTouchEventHandler, this);
    },

    onEnter: function() {
        cc.Layer.prototype.onEnter.call(this);
        this.setPosition(0, cc.winSize.height);

        this.runAction(cc.sequence(new cc.EaseBackOut(cc.moveBy(0.3,cc.p(0,-this.getContentSize().height))), cc.delayTime(this._time),
            new cc.EaseBackIn(cc.moveBy(0.3,cc.p(0,this.getContentSize().height))),cc.removeSelf()));
    },

    onTouchEventHandler: function(sender,type){
        switch (type){
            case ccui.Widget.TOUCH_BEGAN:
                this.onButtonTouched(sender,sender.getTag());
                fr.crashLytics.logPressButton(this._layoutPath + ": " + sender.getName());
                break;
            case ccui.Widget.TOUCH_ENDED:
                this.onButtonRelease(sender, sender.getTag());
                break;
            case ccui.Widget.TOUCH_CANCELED:
                this.onButtonCanceled(sender, sender.getTag());
                break;
        }
    },

    onButtonRelease: function(button, id){
        switch (id) {
            case 1:{
                let pk = new CmdSendQuickPlayByModeAndBet();
                let isBigBet = 0;
                let type = this.roomMode;
                if(this.roomMode === Tongits.BIG_BET_ROOM_MODE) {
                    type = Tongits.NORMAL_ROOM_MODE;
                    isBigBet = 1;
                }
                pk.putData(this.roomBet, type, isBigBet, -1);
                GameClient.getInstance().sendPacket(pk);
                pk.clean();
                break;
            }

        }
    },

    onButtonTouched: function(button,id){
    },

    onButtonCanceled: function(button,id){
    },
});

SuggestQuickPLayToast.makeSuggest = function(time,roomMode, roomBet){
    var instance = new SuggestQuickPLayToast(time,roomMode, roomBet);
    let gui = sceneMgr.getRunningScene().getMainLayer();
    if(gui && gui instanceof LobbyScene) {
        let loading = sceneMgr.layerGUI.getChildByTag(SuggestQuickPLayToast.TAG_GUI);
        if(loading){
            loading.stopAllActions();
            loading.removeFromParent();
        }

        sceneMgr.layerGUI.addChild(instance);
        instance.setLocalZOrder(SuggestQuickPLayToast.TAG_GUI);
        instance.setTag(SuggestQuickPLayToast.TAG_GUI);
        return instance;
    }
    return null;
};

SuggestQuickPLayToast.SHORT = 3.0;
SuggestQuickPLayToast.LONG = 5.0;
SuggestQuickPLayToast.TAG_GUI = 99999990;