/**
 * Created by AnhLMT on 8/4/2022.
 */

pm.payment.processSMSCharge = function (paymentType, accountName, accountId, phoneNumber, countryId, amount, extraData, callback, orderdesc) {
    var self = this;
    if (pm.isUseUILib) {
        if (paymentType == "" || paymentType == null) {
            this.showSelectPartner(pm.currLanguage, countryId, pm.PARTNER_TYPE.CARRIER, amount, function () {
                var newExtraData = pm.CURR_PAYMENT_TYPE + ':' + extraData;
                self.processSMSCharge(pm.CURR_PAYMENT_TYPE, accountName, accountId, phoneNumber, countryId, amount, newExtraData, callback, orderdesc);
            });
            return;
        }
    }
    var needPhoneNumber = false;
    for (var val in this.arrTypeNeedPhoneNumber) {
        if (paymentType == val && this.arrTypeNeedPhoneNumber[val] == 1) {
            needPhoneNumber = true;
            break;
        }
    }
    if (needPhoneNumber && (phoneNumber == "" || phoneNumber == null)) {
        if (pm.isUseUILib) {
            if (pm.UI_INPUT_PHONENUMBER == null) pm.UI_INPUT_PHONENUMBER = new UISeaPaymentInputPhoneNumber();
            pm.UI_INPUT_PHONENUMBER.showGui(pm.currLanguage, function () {
                self.processGetTransaction(paymentType, accountName, accountId, pm.UserData.getStringFromKey("seapayment_mcc_mnc_cache"), "", countryId, amount, extraData, callback, orderdesc)
            });
        } else {
            callback(pm.ERROR_CODE.NEED_PHONE_NUMBER, null);
        }
        return;
    }
    this.processGetTransaction(paymentType, accountName, accountId, phoneNumber, "", countryId, amount, extraData, callback, orderdesc);

    if(pm.UI_WEBVIEW) pm.UI_WEBVIEW.btnClose.setLocalZOrder(100);
};

pm.payment.processBankCharge = function(paymentType, accountName, accountId, phoneNumber, countryId, amount, extraData, callback,   orderdesc){
    var self = this;
    if(pm.isUseUILib){
        if(paymentType == "" || paymentType == null){
            this.showSelectPartner(pm.currLanguage, countryId, pm.PARTNER_TYPE.BANK, amount, function() {
                var newExtraData = pm.CURR_PAYMENT_TYPE + ':' + extraData;
                self.processSMSCharge(pm.CURR_PAYMENT_TYPE, accountName, accountId, phoneNumber, countryId, amount, newExtraData, callback,   orderdesc);
            });
            return;
        }
    }
    this.processGetTransaction(paymentType, accountName, accountId, phoneNumber, "", countryId, amount, extraData, callback,   orderdesc);

    if(pm.UI_WEBVIEW) pm.UI_WEBVIEW.btnClose.setLocalZOrder(100);
}

var BaseUI = BaseUI || {};
if(BaseUI.extend){
    UIWebview = BaseUI.extend({

        imageBgr:null,
        btnClose:null,
        view:null,
        Panel1:null,
        imageLoad:null,
        action:null,

        _isShowing: false,

        ctor:function(){
            this._super();
            this.syncAllChild("seapm/pmui_webview.json");

            this.retain();
            if (cc.sys.platform != cc.sys.WIN32) {
                this.view = ccui.WebView();
                this.view.setContentSize(cc.size(this.Panel1.width, this.Panel1.height*0.9));
                this.view.setScalesPageToFit(true);
                this.view.setPosition(cc.p(this.Panel1.x, this.Panel1.y));
                this.view.setOnDidFinishLoading(this.onLoaded.bind(this));
                this.view.visible = false;
                this.imageBgr.addChild(this.view);
                this.btnClose.setPosition(780, 505);
            }
            this.action = cc.rotateBy(1, 360).repeatForever();
            this.action.retain();
        },

        onEnter: function () {
            this._super();
            this.scheduleUpdate();
        },
        update:function(){
            // cc.log('kkk');
            // this.btnClose.setVisible(true);
            // this.btnClose.setLocalZOrder(100);
            // this.btnClose.setScale(4);
            cc.log("UIWebview.btnClose", this.btnClose.x, this.btnClose.y, this.btnClose.isVisible(), this.btnClose.getLocalZOrder(),
                    this.btnClose.getParent(),this.btnClose.getParent().getName());
                cc.log("UIWebview.view", this.view.x, this.btnClose.y, this.view.isVisible(), this.view.getLocalZOrder(),
                    this.view.getParent(),this.view.getParent().getName());
        },

        onExit: function () {
            this._super();
            //if (this._isShowing){
            //    this.hideGui();
            //}
        },

        showGui:function(language, url){
            if(pm.CURR_PAYMENT_TYPE == pm.PAYMENT_TYPE.TH_WALLET_LINE
                || pm.CURR_PAYMENT_TYPE == pm.PAYMENT_TYPE.TH_IBANKING_SCB) {
                cc.sys.openURL(url);
                return;
            }
            this._isShowing = true;
            this.showDisable();

            if(this.parent != null) this.parent.removeChild(this);
            var _parent = cc.director.getRunningScene();
            //_parent.addChild(this, _parent.getChildren().length);
            _parent.addChild(this, pm.ZORDER_BASE_UI);

            this.imageLoad.runAction(this.action);
            if (this.view) {
                if (url.indexOf("intent") != -1){
                    if (url.indexOf("intent://kbzpay") != -1){
                        url = url.replace("intent://", "kbzpay://");
                    }
                    cc.sys.openURL(url);
                } else {
                    //url = url.replace("https:", "http:");
                    this.view._loadURL(url);
                }
            }
            this.doZoomIn(this, 0);

            // setTimeout(function(){
            //     this.btnClose.setLocalZOrder(100);
            //     this.btnClose.setScale(4);
            //     this.btnClose.setNormalizedPosition(0.5,1)
            //     // this.view.setScale(0.5);
            //     cc.log("UIWebview.btnClose", this.btnClose.x, this.btnClose.y, this.btnClose.isVisible(), this.btnClose.getLocalZOrder(),
            //         this.btnClose.getParent(),this.btnClose.getParent().getName());
            //     cc.log("UIWebview.view", this.view.x, this.btnClose.y, this.view.isVisible(), this.view.getLocalZOrder(),
            //         this.view.getParent(),this.view.getParent().getName());
            // }.bind(this), 4000)
        },

        hideGui:function(){
            this._isShowing = false;
            this.imageLoad.stopAllActions();
            this.hideWebView();
            this.hideDisable();
            if(this.parent == null) return;
            this.parent.removeChild(this);
        },

        hideWebView:function(){
            if(this.view) this.view.visible = false;
        },

        onTouchEndEvent:function(sender) {
            this._super(sender);
            switch(sender){
                case this.btnClose:
                    this.hideGui();
                    break;
            }
        },

        onLoaded:function(sender, url){
            if(!this._isShowing) return;
            this.view.visible = true;
            this.btnClose.setVisible(true);
        },

    });
}