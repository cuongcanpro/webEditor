/**
 * Created by ANHVTT on 5/25/2021.
 */

var ALERT_TYPE = {
    NOT_ENOUGH_GOLD: 1,
    NOT_ENOUGH_DIAMOND: 2,

    ERROR_INPUT_USERNAME: 4,
    ERROR_STRONG_PASSWORD: 5,
    ERROR_PASSWORD_NOT_MATCH: 6,
    ERROR_ZING_REG_ACCOUNT_EXITS: 7,
    ERROR_ZING_REG_QUICK: 8,
    ERROR_ZING_REG_OTHER: 11,

    BUY_G_COMPLETE: 9,
    BUY_GOLD_COMPLETE: 10,
    PREPARE_MAINTAIN: 12,
    SV_MAINTAIN: 13,
    PLAY_180_MINUTE: 14,
    NOT_FIT_GOLD: 15,

    CONFIRM_PROGRESS: 16,
    NOT_LOGIN_YET: 17,
    PUNISH_CHEAT_HEART: 18,
    LOGIN_SUCCEED: 19,
    NO_INTERNET: 20,

    NOT_ENOUGH_CARD: 21,
    RECIPE_COOLING_DOWN: 22,
    RECIPE_WAIT_TILL_NEXT_DAY: 23,
    DISPLAY_UNAVAILABLE_ARTIFACT: 24,
    CONFIRM_UN_DISPLAY_ARTIFACT: 25,
    PUZZLE_LOCKED: 27,

    OUT_OF_LEVEL: 26,
};

var GUIAlert = cc.Node.extend({
    ctor: function (parentLayer) {
        this._super();
        this.parentLayer = parentLayer;
        this.setName("GUIAlert");

        this.initUI();

        this.confirmText = null;
        this.resetCallback();
        this.showing = false;
    },

    resetCallback: function () {
        this.beforeShowCallback = null;
        this.afterShowCallback = null;
        this.beforeHideCallback = null;
        this.afterHideCallback = null;
        this.confirmCallback = null;
        this.cancelCallback = null;
    },

    initUI: function () {
        var json = ccs.load(res.ZCSD_GUI_ALERT, "");
        this._rootNode = json.node;
        this.addChild(this._rootNode);
        UIUtils.mappingChildren(this._rootNode, this);

        this.bg.getChildByName("btnConfirm").addClickEventListener(this.onClickConfirm.bind(this));
        this.bg.getChildByName('btnCancel').addClickEventListener(this.onClickCancel.bind(this));
    },

    show: function (type) {
        cc.log("GUIAlert show");
        if (!this.showing) fr.showTopPanel(cc.director.getRunningScene());
        this.showing = true;

        // TODO: localization
        var title, info, confirmText, btnText;
        title = fr.Localization.text("ALERT_TITLE");
        switch (type) {
            case ALERT_TYPE.CONFIRM_PROGRESS:

                info = fr.Localization.text('lang_alert_confirm_progress');
                confirmText = "OKAY";
                btnText = fr.Localization.text("lang_override");
                break;
            case ALERT_TYPE.NOT_LOGIN_YET:

                info = fr.Localization.text('lang_alert_not_login');
                confirmText = null;
                btnText = "OK";
                break;
            case ALERT_TYPE.PUNISH_CHEAT_HEART:
                info = fr.Localization.text('lang_alert_punish_cheat');
                confirmText = null;
                btnText = "OK";
                break;
            case ALERT_TYPE.LOGIN_SUCCEED:
                info = fr.Localization.text('lang_alert_login_succeed');
                confirmText = null;
                btnText = "OK";
                break;
            case ALERT_TYPE.NO_INTERNET:
                info = fr.Localization.text('lang_alert_no_internet');
                confirmText = null;
                btnText = "OK";
                break;
            case ALERT_TYPE.NOT_ENOUGH_CARD:
                info = fr.Localization.text('lang_alert_not_enough_card');
                confirmText = null;
                btnText = "OK";
                break;
            case ALERT_TYPE.RECIPE_COOLING_DOWN:
                info = fr.Localization.text('lang_alert_recipe_cooling_down');
                confirmText = null;
                btnText = "OK";
                break;
            case ALERT_TYPE.RECIPE_WAIT_TILL_NEXT_DAY:
                info = fr.Localization.text('lang_alert_comeback_tomorrow');
                confirmText = null;
                btnText = "OK";
                break;
            case ALERT_TYPE.OUT_OF_LEVEL:
                title = fr.Localization.text('lang_congrat');
                info = fr.Localization.text('lang_alert_out_of_level');
                confirmText = null;
                btnText = "OK";
                break;
            case ALERT_TYPE.PUZZLE_LOCKED:
                title = fr.Localization.text("lang_meta_noti_0");
                info = fr.Localization.text("lang_meta_noti_1");
                confirmText = null;
                btnText = 'OK';
                break;
            default:
                title = fr.Localization.text("ALERT_TITLE");
                info = "";
                confirmText = null;
                btnText = "OK";
                break;
        }
        this.setConfirmText(confirmText);
        this.setInfo(title, info);
        this.setBtnText(btnText);

        // only show confirm button
        this.bg.getChildByName('btnCancel').setVisible(false);
        this.bg.getChildByName("btnConfirm").setScale(1.0);
        this.bg.getChildByName("btnConfirm").setPosition(329, 69.42);

        if (this.beforeShowCallback) this.beforeShowCallback();
        this.setVisible(true);
        this.bg.stopAllActions();
        fr.GuiEffect.bubbleIn(this.bg, this.afterShowCallback, null, 0);
    },

    showWithInfoString: function (infoString) {
        this.setVisible(true);
        if (!this.showing) fr.showTopPanel(cc.director.getRunningScene());
        this.showing = true;
        if (this.beforeShowCallback) this.beforeShowCallback();
        this.bg.stopAllActions();
        fr.GuiEffect.bubbleIn(this.bg, this.afterShowCallback, null, 0);

        var title, info, confirmText, btnText;

        title = fr.Localization.text("lang_notice");
        info = infoString;
        confirmText = null;
        btnText = "OK";

        this.setConfirmText(confirmText);
        this.setInfo(title, info);
        this.setBtnText(btnText);

        this.bg.getChildByName('btnCancel').setVisible(false);

        this.bg.getChildByName("btnConfirm").setScale(1.0);
        this.bg.getChildByName("btnConfirm").setPosition(329, 69.42);
    },

    showYesNo: function (type) {
        cc.log("GUIAlert show");
        if (!this.showing) fr.showTopPanel(cc.director.getRunningScene());
        this.showing = true;

        let title, info, btnYes, btnNo;
        title = fr.Localization.text("lang_notice");
        switch (type) {
            case ALERT_TYPE.DISPLAY_UNAVAILABLE_ARTIFACT:
                info = fr.Localization.text('lang_alert_display_unavailable_artifact');
                btnNo =  fr.Localization.text("lang_cancel");
                btnYes =  fr.Localization.text("lang_btn_agree");
                break;
            case ALERT_TYPE.CONFIRM_UN_DISPLAY_ARTIFACT:
                info = fr.Localization.text('lang_alert_confirm_undisplay_artifact');
                btnNo =  fr.Localization.text("lang_cancel");
                btnYes = fr.Localization.text("lang_btn_agree");
                break;
            default:
                btnYes = "OK";
                btnNo =  fr.Localization.text("lang_btn_agree");
                info = "";
                break;
        }
        this.setConfirmText(null);
        this.setInfo(title, info);
        this.setBtnText(btnYes);
        this.setCancelBtnText(btnNo);

        this.bg.getChildByName('btnConfirm').setPosition(460.6, 69.42);
        this.bg.getChildByName('btnConfirm').setScale(0.8);
        this.bg.getChildByName('btnCancel').setPosition(197.4, 69.42);
        this.bg.getChildByName('btnCancel').setScale(0.8);

        if (this.beforeShowCallback) this.beforeShowCallback();
        fr.GuiEffect.bubbleIn(this.bg, this.afterShowCallback, null, 0);
    },

    hide: function () {
        if (this.showing)
            fr.hideTopPanel(cc.director.getRunningScene());
        this.showing = false;
        if (this.beforeHideCallback) this.beforeHideCallback();
        if (this.bg.getChildByName("textField")){
            this.bg.getChildByName("textField").didNotSelectSelf();
        }
        fr.GuiEffect.bubbleOut(this.bg, function () {
            if (this.afterHideCallback) this.afterHideCallback();
            this.resetCallback();
            if (!this.showing) this.setVisible(false);
        }.bind(this), null, 0);
    },

    onClickCancel: function () {
        if (this.cancelCallback) this.cancelCallback();
        this.hide();
    },

    onClickConfirm: function () {
        if (this.confirmText != null) {
            var text = this.bg.getChildByName("textField").getString();

            if (text.toLowerCase() == this.confirmText.toLowerCase()) {
                if (this.confirmCallback) this.confirmCallback();
                this.hide();
            }
        } else {
            if (this.confirmCallback) this.confirmCallback();
            this.hide();
        }
    },

    setConfirmText: function (confirm) {
        this.confirmText = confirm;
        if (confirm != null) {
            let placeHolder = "_";
            for (let i = 1; i < confirm.length; i++)
                placeHolder += " _";
            let textField = this.bg.getChildByName("textField");
            textField.setTextHorizontalAlignment(cc.TEXT_ALIGNMENT_CENTER);
            textField.setFontSize(38); textField.height = 60;
            let insertedText = "", newText, neededAmount;
            textField.addEventListener(function (sender, type) {
                switch (type) {
                    case ccui.TextField.EVENT_INSERT_TEXT:
                        newText = textField.getString();
                        if (insertedText.length < confirm.length)
                            insertedText += newText[newText.length - 1];
                        newText = insertedText;
                        neededAmount = confirm.length - newText.length;
                        for (let i = 0; i < neededAmount; i++) newText += " _";
                        textField.setString(newText.toUpperCase());
                        break;
                    case ccui.TextField.EVENT_DELETE_BACKWARD:
                        insertedText = insertedText.substr(0, insertedText.length - 1);
                        newText = insertedText;
                        neededAmount = confirm.length - newText.length;
                        for (let i = 0; i < neededAmount; i++) newText += " _";
                        textField.setString(newText.toUpperCase());
                        break;
                }
            }, this);
            textField.setMaxLength(confirm.length);
            textField.setPlaceHolder(placeHolder);
        }

        // align info text
        if (confirm == null) {
            this.bg.getChildByName('info').setPosition(329, 293.7);
            this.bg.getChildByName('info').height = 300;
        } else {
            this.bg.getChildByName('info').setPosition(329, 373.8);
            this.bg.getChildByName('info').height = 150;
        }

        this.bg.getChildByName('confirmBox').setVisible(false);
        this.bg.getChildByName("textField").setVisible(confirm != null);
    },

    setInfo: function (title, info) {
        this.bg.getChildByName("title").setString(title);
        this.bg.getChildByName("info").setString(info);
    },

    setBtnText: function (btnText) {
        this.bg.getChildByName('btnConfirm').setVisible(true);
        this.bg.getChildByName("btnConfirm").getChildByName("lbl").setString(btnText);
    },

    setCancelBtnText: function (btnText) {
        this.bg.getChildByName('btnCancel').setVisible(true);
        this.bg.getChildByName("btnCancel").getChildByName("lbl").setString(btnText);
    },

    switchNegativeAction: function () {
        this.bg.getChildByName('btnCancel').setPosition(460.6, 69.42);
        this.bg.getChildByName('btnConfirm').setPosition(197.4, 69.42);
    }
});

GUIAlert.getGUIAlert = function (){
    let curScene = cc.director.getRunningScene();
    let guiAlert = curScene.getChildByName("GUIAlert");
    if(_.isNull(guiAlert)) {
        guiAlert = new GUIAlert(curScene);
        guiAlert.setPosition(cc.winSize.width / 2, cc.winSize.height / 2);
        curScene.addChild(guiAlert, 1000000);
    }
    else
        guiAlert = curScene.getChildByName("GUIAlert");

    return guiAlert;
};

GUIAlert.notify = function (info){
    cc.log("GUIAlert.notify info=", info);
    GUIAlert.getGUIAlert().showWithInfoString(info);
};

GUIAlert.notifyById = function (id){
    cc.log("GUIAlert.notifyById id=", id);
    GUIAlert.getGUIAlert().show(id);
}