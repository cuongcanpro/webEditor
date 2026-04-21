
// region Loading and Waiting
var Loading = cc.Layer.extend({

    ctor: function (text, fog) {

        this._layerColor = null;
        this._message = "";
        this._fog = true;
        this._super();
        if (text)
            this._message = text;
        if (fog != null) {
            this._fog = fog;
        }

    },

    timeout: function (time) {
        this.runAction(cc.sequence(cc.delayTime(time), cc.removeSelf()));
    },

    timeoutWithFunction: function (time, func, binder) {
        this.runAction(cc.sequence(cc.delayTime(time), cc.callFunc(func.bind(binder)), cc.removeSelf()));
    },

    onEnter: function () {
        cc.Layer.prototype.onEnter.call(this);
        if (this._fog) {
            this._layerColor = new cc.LayerColor(cc.BLACK);
            this._layerColor.runAction(cc.fadeTo(.25, 150));
            this.addChild(this._layerColor);
        }

        this.commonbg = new cc.Sprite("common_loading_icon.png");
        this.addChild(this.commonbg);
        this.commonbg.setPosition(cc.p(cc.winSize.width/2,cc.winSize.height/2 + 15));

        this.commoncircel = new cc.Sprite("common_loading_circle.png");
        this.addChild(this.commoncircel);
        this.commoncircel.setPosition(cc.p(cc.winSize.width/2,cc.winSize.height/2 + 15));
        this.commoncircel.runAction(cc.repeatForever(cc.rotateBy(2.5,360)));


        var scale = cc.director.getWinSize().width / Constant.WIDTH;
        scale = (scale > 1) ? 1 : scale;

        this._label = new ccui.Text();
        this._label.setAnchorPoint(cc.p(0.5, 0.5));
        this._label.setFontName(SceneMgr.FONT_NORMAL);
        this._label.setFontSize(SceneMgr.FONT_SIZE_DEFAULT);
        this._label.setTextHorizontalAlignment(cc.TEXT_ALIGNMENT_CENTER);
        this._label.setColor(cc.color(252, 255, 0, 0));
        this._label.setString(this._message);
        this._label.setScale(scale);
        this._label.setPosition(cc.winSize.width / 2, cc.winSize.height / 2 - 50);
        this.addChild(this._label);

        if (this._fog) {
            this._listener = cc.EventListener.create({
                event: cc.EventListener.TOUCH_ONE_BY_ONE,
                swallowTouches: true,
                onTouchBegan: this.onTouchBegan,
                onTouchMoved: this.onTouchMoved,
                onTouchEnded: this.onTouchEnded
            });

            cc.eventManager.addListener(this._listener, this);
        }

    },

    remove: function () {
        if (this._layerColor) {
            this._layerColor.runAction(cc.fadeTo(0.2, 0));
        }
        this.runAction(cc.sequence(cc.delayTime(0.2), cc.removeSelf()));
    },

    onTouchBegan: function (touch, event) {
        return true;
    },

    onTouchMoved: function (touch, event) {

    },

    onTouchEnded: function (touch, event) {

    }
});
Loading.TAG = "99999998";

Loading.show = function (text, fog) {
    let loading = sceneMgr.getLayerGUI().getChildByTag(Loading.TAG);
    if (loading) {
        loading.stopAllActions();
        loading.removeFromParent();
        loading = null;
    }

    loading = new Loading(text, fog);
    loading.setLocalZOrder(Loading.TAG);
    loading.setTag(Loading.TAG);

    sceneMgr.getLayerGUI().addChild(loading);
    return loading;
};
Loading.clear = function () {
    let loading = sceneMgr.getLayerGUI().getChildByTag(Loading.TAG);
    if (loading) {
        loading.stopAllActions();
        loading.removeFromParent();
    }
}

var Waiting = cc.Layer.extend({

    ctor: function () {

        this._layerColor = null;
        this._message = "";
        this._fog = true;
        this._super();
    },

    timeout: function (time) {
        this.runAction(cc.sequence(cc.delayTime(time), cc.removeSelf()));
    },

    onEnter: function () {
        cc.Layer.prototype.onEnter.call(this);

        this._layerColor = new cc.LayerColor(cc.BLACK);
        this._layerColor.runAction(cc.fadeTo(.25, 150));
        this.addChild(this._layerColor);

        var size = cc.director.getWinSize();
        var scale = size.width / Constant.WIDTH;

        scale = (scale > 1) ? 1 : scale;

        this._sprite = new cc.Sprite("common/circlewait.png");
        this.addChild(this._sprite);
        this._sprite.runAction(cc.repeatForever(cc.rotateBy(1.2, 360)));
        this._sprite.setPosition(cc.winSize.width / 2, cc.winSize.height / 2);
        this._sprite.setVisible(true);

        this._listener = cc.EventListener.create({
            event: cc.EventListener.TOUCH_ONE_BY_ONE,
            swallowTouches: true,
            onTouchBegan: this.onTouchBegan,
            onTouchMoved: this.onTouchMoved,
            onTouchEnded: this.onTouchEnded
        });

        cc.eventManager.addListener(this._listener, this);
    },

    remove: function () {
        if (this._layerColor) {
            this._layerColor.runAction(cc.fadeTo(0.2, 0));
        }
        this.runAction(cc.sequence(cc.delayTime(0.2), cc.removeSelf()));
    },

    onTouchBegan: function (touch, event) {
        return true;
    },

    onTouchMoved: function (touch, event) {

    },

    onTouchEnded: function (touch, event) {

    }
});
// endregion

// region Toast Float
var ToastFloat = cc.Node.extend({

    ctor: function () {
        this._super();

        this.timeDelay = -1;
        this.isRunningDelay = false;

        this.lb = null;
        this.bg = null;

        this.bg = new cc.Scale9Sprite("res/common/9patch.png");
        this.addChild(this.bg);

        this._scale = cc.director.getWinSize().width / Constant.WIDTH;
        this._scale = (this._scale > 1) ? 1 : this._scale;
        this.setScale(this._scale);
    },

    onEnter: function () {
        cc.Layer.prototype.onEnter.call(this);

        this.bg.setOpacity(0);
        this.lb.setOpacity(0);

        this.bg.runAction(cc.fadeTo(0.5, 200));
        this.lb.runAction(cc.fadeIn(0.5));

        this.runAction(cc.sequence(cc.delayTime(0.5), cc.callFunc(this.finishEffect.bind(this))));
    },

    finishEffect: function () {
        this.isRunningDelay = true;
    },

    setToast: function (txt, time) {
        if (txt) {
            this.lb = BaseLayer.createLabelText(txt);
            this.lb.setTextHorizontalAlignment(cc.TEXT_ALIGNMENT_CENTER);
            this.lb.setTextVerticalAlignment(cc.TEXT_ALIGNMENT_CENTER);
            this.lb.ignoreContentAdaptWithSize(false);
            this.addChild(this.lb);
            var winSize = cc.director.getWinSize();

            var lbSize = this.lb.getContentSize();
            var deltaWidth = winSize.width * ToastFloat.DELTA_WIDTH;
            if(lbSize.width > deltaWidth)
            {

                this.lb.setContentSize(cc.size(deltaWidth, lbSize.height * 2));
            }

            this.bg.setContentSize(this.lb.getContentSize().width + ToastFloat.PAD_SIZE, this.lb.getContentSize().height + ToastFloat.PAD_SIZE);
        }

        if (time === undefined || time == null) time = ToastFloat.SHORT;
        this.timeDelay = time;
        this.scheduleUpdate();
    },

    clearToast: function () {
        this.bg.runAction(cc.fadeOut(0.5));
        this.lb.runAction(cc.fadeOut(0.5));

        this.runAction(cc.sequence(cc.delayTime(0.5), cc.callFunc(this.removeFromParent.bind(this))));
    },

    update: function (dt) {
        if (this.timeDelay > 0 && this.isRunningDelay) {
            this.timeDelay -= dt;
            if (this.timeDelay <= 0) {
                this.clearToast();
            }
        }
    }
});

ToastFloat.makeToast = function (time, text) {
    var toast = new ToastFloat();
    toast.setToast(text, time);
    var winSize = cc.director.getWinSize();
    toast.setPosition(winSize.width / 2, winSize.height * ToastFloat.POSITION_Y);

    sceneMgr.layerGUI.addChild(toast);
    toast.setLocalZOrder(TOAST_FLOAT_TAG);
};

ToastFloat.SHORT = 1.0;
ToastFloat.LONG = 3.0;
ToastFloat.MEDIUM = 2.0;

ToastFloat.POSITION_Y = 1 / 3;
ToastFloat.DELTA_WIDTH = 0.8;
ToastFloat.PAD_SIZE = 35;
// endregion

// region Toast TOP
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

        this._label.setFontName(SceneMgr.FONT_NORMAL);
        this._label.setFontSize(26);
        this._label.setTextHorizontalAlignment(cc.TEXT_ALIGNMENT_CENTER);
        this._label.setColor(cc.color(203, 204, 206, 0));
        this._label.setString(this._message);
        this._label.setScale(scale);
        this._label._setWidth(cc.winSize.width * 0.9);
        this._label._setHeight(105);

        this._layerColor.addChild(this._label);
        this._layerColor.setPosition(0,0);

        this._label.setPosition(cc.winSize.width/2,-6);
        this.setPosition(0,cc.winSize.height);

        this.runAction(cc.sequence(new cc.EaseBackOut(cc.moveBy(0.3,cc.p(0,-this._label.getContentSize().height/2))),
            cc.delayTime(this._time),
            new cc.EaseBackIn(cc.moveBy(0.3,cc.p(0,this._label.getContentSize().height/2))),cc.removeSelf()));
    }
});

Toast.makeToast = function(time,message) {
    return ToastFloat.makeToast(time, message);

    var instance = new Toast(time,message);
    sceneMgr.layerGUI.addChild(instance);
    instance.setLocalZOrder(Loading.TAG);
    return instance;
};

Toast.SHORT = 1.0;
Toast.LONG = 2.0;
// endregion


// RichText
var RichLabelText = cc.Node.extend({

    ctor : function () {
        this._super();

        this.listText = [];
    },

    /**
     * Array RichText Object
     * Object :
     *  + text
     *  + color
     *  + font
     *  + size
     */
    setText : function (txts) {
        if(!txts) return;

        this.removeAllChildren();
        this.listText = [];

        for(var i = 0, size = txts.length ; i < size ; i++)
        {
            var info = txts[i];

            var lb = BaseLayer.createLabelText();

            if(info.font) lb.setFontName(info.font);
            else lb.setFontName(SceneMgr.FONT_NORMAL);

            if(info.size) lb.setFontSize(info.size);
            else lb.setFontSize(SceneMgr.FONT_SIZE_DEFAULT);

            if(info.color) lb.setColor(info.color);
            else lb.setColor(sceneMgr.ccWhite);

            if(info.text) lb.setString(info.text);
            else lb.setString("");

            if(info.anchor) lb.setAnchorPoint(info.anchor);
            else lb.setAnchorPoint(cc.p(0,0));

            if(info.hAlign) lb.setTextHorizontalAlignment(info.hAlign);
            if(info.vAlign) lb.setTextVerticalAlignment(info.vAlign);

            lb.textInfo = info;
            this.addChild(lb);
            this.listText.push(lb);
        }

        this.updatePosition();
    },

    updateText : function (idx, txt) {
        this.listText[idx].textInfo.text = txt;
        this.updatePosition();
    },

    updatePosition : function () {
        var nextWidth = 0;
        for(var i = 0, size = this.listText.length ; i < size ; i++)
        {
            var lb = this.listText[i];
            lb.setString(lb.textInfo.text);
            lb.setPositionX(nextWidth);

            nextWidth = lb.getContentSize().width + lb.getPositionX() + 5;
        }
    },

    getWidth : function () {
        var retVal = 0;
        for(var i = 0, size = this.listText.length ; i < size ; i++)
        {
            var lb = this.listText[i];
            retVal += lb.getContentSize().width;
        }

        return retVal;
    },

    getHeight : function () {
        var maxHeight = 0;
        for(var i = 0, size = this.listText.length ; i < size ; i++)
        {
            var lb = this.listText[i];
            if(maxHeight < lb.getContentSize().height)
                maxHeight = lb.getContentSize().height;
        }

        return maxHeight;
    }
});