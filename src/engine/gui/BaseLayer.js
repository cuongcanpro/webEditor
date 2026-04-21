let BaseLayer = cc.Layer.extend({
    ctor: function () {
        cc.Layer.prototype.ctor.call(this);
    },

    initWithJsonFile: function (json, rootPath = "", size = cc.director.getWinSize()) {
        BaseLayer.initWithJsonFile(
            this, json, rootPath, size
        );
    },

    /**
     * Called when enter layer
     */
    onEnter: function () {
        cc.Layer.prototype.onEnter.call(this);
        this.onEnterFinish();
    },

    /**
     * Called when exit layer
     */
    onExit: function () {
        cc.Layer.prototype.onExit.call(this);
    },

    //region ABSTRACT
    initLayer: function () {

    },

    onEnterFinish: function () {

    },
    //endregion

    //region Button
    onTouchBeganEvent: function (button) {

    },

    onTouchMovedEvent: function (button) {

    },

    onTouchEndEvent: function (button) {

    },

    onTouchCancelledEvent: function (button) {

    },

    onButtonTouched: function (button, tag) {

    },

    onButtonRelease: function (button, tag) {

    },

    onButtonCanceled: function (button, tag) {

    },
    //endregion Button

    //region PopUp
    enableFog: function (opacity = 255 * 0.85, blockTouch = true) {
        if (this._fog) {
            this._fog.removeFromParent();
        }

        this._fog = new ccui.Layout();
        this._fog.setVisible(true);
        this._fog.setBackGroundColorType(ccui.Layout.BG_COLOR_SOLID);
        this._fog.setBackGroundColor(cc.BLACK);
        this._fog.setBackGroundColorOpacity(opacity);
        this._fog.setTouchEnabled(blockTouch);

        this.addChild(this._fog, -999);
    },

    setShowHideAnimate: function (bgMain) {
        this._showHideAnimate = true;

        if (bgMain === undefined) {
            this._bgShowHideAnimate = this._rootNode;
        } else {
            this._bgShowHideAnimate = bgMain;
        }

        let efxTime = BaseLayer.ANIMATE_TIME;
        let targetScale = this._bgShowHideAnimate.oriScale ? this._bgShowHideAnimate.oriScale : 1;

        this._bgShowHideAnimate.stopAllActions();
        this._bgShowHideAnimate.setScale(targetScale / 2);
        this._bgShowHideAnimate.setOpacity(0);
        this._bgShowHideAnimate.runAction(cc.sequence(
            cc.spawn(
                cc.scaleTo(efxTime, targetScale).easing(cc.easeBackOut()),
                cc.fadeIn(efxTime)
            ),
            cc.callFunc(this.finishShowAnimate, this)
        ));

        if (this._fog) {
            this._fog.stopAllActions();
            this._fog.setVisible(true);
            this._fog.setOpacity(0);
            this._fog.setContentSize(cc.winSize);
            this._fog.runAction(cc.fadeIn(efxTime).easing(cc.easeOut(2.5)));
        }
    },

    finishShowAnimate: function () {
        //Abstract
    },

    onClose: function () {
        if (this._fog && this._fog.isVisible()) {
            this._fog.runAction(cc.fadeOut(BaseLayer.ANIMATE_TIME).easing(cc.easeOut(2.5)));
        }

        if (this._showHideAnimate) {
            this._bgShowHideAnimate.stopAllActions();
            this._bgShowHideAnimate.runAction(cc.sequence(
                cc.spawn(
                    cc.scaleTo(BaseLayer.ANIMATE_TIME, 0.2).easing(cc.easeBackIn()),
                    cc.fadeOut(BaseLayer.ANIMATE_TIME).easing(cc.easeOut(2.5))
                ),
                cc.callFunc(this.onCloseDone.bind(this))
            ));
        } else {
            this.onCloseDone();
        }
    },

    onCloseDone: function () {
        this.removeFromParent(cc.sys.isNative); // neu la ban web khong remove, vi remove se xoa het eventListener khi cache
    },

    setBackEnable: function (enable) {
        this._enableBack = enable;
    },

    backKeyPress: function () {
        if (!this._enableBack) return;

        this.onBack();
    },

    onBack : function () {
        //Abstract
    },
    //endregion PopUp

    //region Others
    resetDefaultPosition: function (control) {
        if (control === undefined) return;

        try {
            if (control.defaultPos === undefined) control.defaultPos = control.getPosition();
            else control.setPosition(control.defaultPos);
        } catch (e) {

        }
    },

    setAsPopup: function (value, isCache) {
        this._aaPopup = value;
        this._cachePopup = isCache;

        if (value && this._layerGUI) {
            this._layerGUI.removeFromParent();
            this._layerGUI = null;
        }
    },
    //endregion Others
});
BaseLayer.ANIMATE_TIME = 0.333;

/* region BaseLayer common */
BaseLayer.initWithJsonFile = function (self, json, rootPath = "", size = cc.director.getWinSize()) {
    cc.log("LOAD JSON : " + json, rootPath);
    var start = new Date().getTime();

    self._jsonPath = json;
    self._rootNode = ccs.load(json, rootPath).node;
    self._rootNode.setContentSize(size);
    ccui.Helper.doLayout(self._rootNode);
    self.addChild(self._rootNode);

    self.setCascadeOpacityEnabled(true);
    self._rootNode.setCascadeOpacityEnabled(true);

    var end = new Date().getTime();
    cc.log("## Time Load " + json + " : " + (end - start));

    BaseLayer._syncInNode(self._rootNode, self);
    var end2 = new Date().getTime();
    cc.log("## Time SYNC NODE " + json + " : " + (end2 - end));

    if (self.initLayer) {
        self.initLayer();
        var end3 = new Date().getTime();
        cc.log("## Time initGUI " + json + " : " + (end3 - end2));
    }

    cc.log("## Time TOTAL " + json + " : " + (new Date().getTime() - start));
};

BaseLayer._syncInNode = function (node, ctx, createNew = true) {
    let children = node.getChildren();
    if (children.length === 0) return;

    let childName;
    for (let i = 0; i < children.length; i++) {
        childName = children[i].getName();
        if ((childName in ctx && ctx[childName] === null) || createNew) {
            ctx[childName] = children[i];
        }

        BaseLayer._handleDefaultNode(children[i], ctx);

        BaseLayer._syncInNode(children[i], ctx, createNew);
    }
};

BaseLayer._handleDefaultNode = function (node, self) {
    if (!node) return;

    if (node instanceof ccui.Button) {
        node.setPressedActionEnabled && node.setPressedActionEnabled(true);
        node.removeAllEventListeners && node.removeAllEventListeners();
        node.addTouchEventListener(function (sender, type) {
            switch (type) {
                case ccui.Widget.TOUCH_BEGAN:
                    fr.Sound.playHaptic();
                    this.onTouchBeganEvent && this.onTouchBeganEvent(sender);
                    this.onButtonTouched && this.onButtonTouched(sender, sender.getTag());
                    break;

                case ccui.Widget.TOUCH_MOVED:
                    this.onTouchMovedEvent && this.onTouchMovedEvent(sender);
                    break;

                case ccui.Widget.TOUCH_ENDED:
                    this.onTouchEndEvent && this.onTouchEndEvent(sender);
                    this.onButtonRelease && this.onButtonRelease(sender, sender.getTag());
                    break;

                case ccui.Widget.TOUCH_CANCELED:
                    this.onTouchCancelledEvent && this.onTouchCancelledEvent(sender);
                    this.onButtonCanceled && this.onButtonCanceled(sender, sender.getTag());
                    break;
            }
        }, self);
    }

    node.getPosition && (node.rawPos = node.getPosition()) && (node.oriPosition = node.getPosition());
    node.getScale && (node.rawScale = node.getScaleX()) && (node.oriScale = node.getScaleX());
    node.getContentSize && (node.rawSize = node.getContentSize()) && (node.oriOpacity = node.getOpacity());
    if (node.getString != null) {
        let str = node.getString();
        if (str.search("str_") === 0) {
            str = fr.Localization.text(str.replace("str_", ""));
            node.setString && node.setString(str);
        }
    }
    node.setCascadeOpacityEnabled && node.setCascadeOpacityEnabled(true);
};

BaseLayer.createTableView = function (parent, self) {
    let table = new cc.TableView(self, parent.getContentSize());
    table.setDirection(cc.SCROLLVIEW_DIRECTION_VERTICAL);
    table.setVerticalFillOrder(cc.TABLEVIEW_FILL_TOPDOWN);
    table.setDelegate(self);
    table.reloadData();
    parent.addChild(table);

    table.setCascadeOpacityEnabled(true);
    table.getContainer().setCascadeOpacityEnabled(true);

    return table;
};
/* endregion BaseLayer common*/