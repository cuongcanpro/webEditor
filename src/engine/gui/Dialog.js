let Dialog = BaseLayer.extend({

    ctor: function () {
        this._bg = null;
        this._btnOK = null;
        this._btnCancel = null;
        this._pCenter = null;
        this._pLeft = null;
        this._pRight = null;
        this._lb_message = null;

        this._target = null;
        this._callback = null;
        this._btnId = -1;

        this._super(Dialog.className);
        this.initWithBinaryFile("Dialog/json/Dialog.json");
    },

    initGUI: function () {
        var bg = this.getControl("bg");
        this._bg = bg;

        this._btnOK = this.customButton("btnOK", Dialog.BTN_OK, bg);
        this._btnCancel = this.customButton("btnCancel", Dialog.BTN_CANCEL, bg);
        this._btnClose = this.customButton("btnQuit", Dialog.BTN_QUIT, bg);

        this.lbOk = this.getControl("lbOk", this._btnOK);
        this.lbCancel = this.getControl("lbCancel", this._btnCancel);
        this._lb_message = this.getControl("lb_message", bg);

        this._pLeft = this._btnCancel.getPosition();
        this._pRight = this._btnOK.getPosition();
        this._pCenter = ccui.Helper.seekWidgetByName(ccui.Helper.seekWidgetByName(this._layout, "bg"), "btnCenter").getPosition();
    },

    customizeGUI: function () {
        this.setFog(true);
    },

    onEnterFinish: function () {
        this.setFog(true);
        this.setShowHideAnimate(this._bg, true);

        FxUtils.setCascadeOpacityEnabledRecursive(this._bg, true);
    },

    resetButton: function () {
        this._btnOK.setVisible(false);
        this._btnCancel.setVisible(false);

        this._btnOK.setPosition(this._pLeft);
        this._btnCancel.setPosition(this._pRight);

        this._target = null;
        this._callback = null;
        this._btnId = -1;
    },

    onButtonRelease: function (sender, id) {
        this._btnId = id;
        this.onClose();
    },

    onCloseDone: function () {
        BaseLayer.prototype.onCloseDone.call(this);

        if (this._callback != null)
            this._callback.call(this._target, this._btnId);
    },

    setOkCancel: function (message, target, selector) {
        this.setMessage(message);
        this._target = target;
        this._callback = selector;

        this._btnOK.loadTextures("Dialog/btnRed.png", "Dialog/btnRed.png");
        this.lbOk.setString(localized("AGREE"));
        this.lbCancel.setString(localized("CANCEL"));

        this._btnOK.setPosition(this._pLeft);
        this._btnCancel.setPosition(this._pRight);
        this._btnOK.setVisible(true);
        this._btnCancel.setVisible(true);
    },

    setOkWithAction: function (message, target, selector) {
        this.setMessage(message);
        this._target = target;
        this._callback = selector;

        this._btnOK.loadTextures("Dialog/btnRed.png", "Dialog/btnRed.png");
        this.lbOk.setString(localized("AGREE"));
        this._btnOK.setVisible(true);
        this._btnOK.setPosition(this._pCenter);

        this._btnCancel.setVisible(false);
        this._btnClose.setVisible(false);
    },

    setOKNotify: function (message) {
        this.setMessage(message);

        this._btnOK.loadTextures("Dialog/btnRed.png", "Dialog/btnRed.png");
        this.lbOk.setString(localized("AGREE"));
        this._btnOK.setVisible(true);
        this._btnOK.setPosition(this._pCenter);

        this._btnCancel.setVisible(false);
    },

    setMessage: function (message) {
        this.resetButton();
        this._lb_message.setString(message);
    },

    customText: function (message, strLeft, strRight, target, selector) {
        this.setMessage(message);
        this.lbOk.setString(strLeft);
        this.lbOk.setFontSize(27);
        this._btnOK.setVisible(true);
        this._btnOK.setPosition(this._pLeft);
        this.lbCancel.setString(strRight)
        this.lbCancel.setFontSize(27);
        this._btnCancel.setVisible(true);
        this._btnCancel.setPosition(this._pRight);
        this._target = target;
        this._callback = selector;
    }
});
Dialog.className = "Dialog";
Dialog.BTN_OK = 0;
Dialog.BTN_CANCEL = 1;
Dialog.BTN_QUIT = 2;
Dialog.ZODER = 100000;
Dialog.TAG = 10000;

Dialog.showOkCancelDialog = function (message, target, selector, tag, zOrder) {
    JSLog.d("#showOkCancelDialog : " + message);
    let isCache = false;
    if(tag === undefined){
        tag = Dialog.TAG;
        isCache = true;
    }
    if(zOrder == undefined){
        zOrder = Dialog.ZODER;
    }

    let dlg = sceneMgr.openGUI(Dialog.className, zOrder, tag, isCache, true);
    dlg.setOkCancel(message, target, selector);
    return dlg;
};
Dialog.showOKDialog = function (message) {
    JSLog.d("#showOKDialog : " + message);

    let dlg = sceneMgr.openGUI(Dialog.className, Dialog.ZODER, Dialog.TAG, true, true);
    dlg.setOKNotify(message);
    return dlg;
};
Dialog.showOkDialogWithAction = function (message, target, selector) {
    JSLog.d("#showOkDialogWithAction : " + message);

    let dlg = sceneMgr.openGUI(Dialog.className, Dialog.ZODER, Dialog.TAG, true, true);
    dlg.setOkWithAction(message, target, selector);
    return dlg;
};

