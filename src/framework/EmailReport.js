/**
 * Created by TienNT on 8/29/2017.
 */

var EmailReport = cc.Class.extend({
    ctor: function () {
        this._emailTo = "";
        this._subject = "";
        this._body = "";
        this._chooserTitle = "";
        this._isHtmlText = false;
    },

    initUserDataInfo: function () {
        this._emailTo = fr.Localization.text("EMAIL_REPORT_SENDTO");
        this._subject = fr.Localization.text("EMAIL_REPORT_TITLE");

        var device, os_name, os_version, game_version, user_id;

        device = fr.platformWrapper.getDeviceModel();
        if ( !device ){
            device = "Unknown";
        }
        os_name = fr.platformWrapper.getOsName();
        if ( !os_name ) {
            os_name = "Unknown";
        }
        os_version = fr.platformWrapper.getOSVersion();
        if ( !os_version ){
            os_version = "Unknown";
        }
        game_version = fr.platformWrapper.getVersionCode();
        if ( !game_version ){
            game_version = "Unknown";
        }
        if ( gv.myInfo != undefined ){
            user_id = gv.myInfo.getUId();
        }
        else{
            user_id = "Unknown";
        }
        this._body = fr.Localization.text("EMAIL_REPORT_DEVICE").replace("@device@", device )
            + fr.Localization.text("EMAIL_REPORT_OS_NAME").replace("@os_name@", os_name )
            + fr.Localization.text("EMAIL_REPORT_OS_VERSION").replace("@os_version@", os_version )
            + fr.Localization.text("EMAIL_REPORT_GAME_VERSION").replace("@game_version@", game_version )
            + fr.Localization.text("EMAIL_REPORT_USER_ID").replace("@user_id@", user_id )
            + fr.Localization.text("EMAIL_REPORT_OPENING")
            + "\n\n";
        //+ fr.Localization.text("EMAIL_REPORT_ENDING");

        this._chooserTitle = "";
        this._isHtmlText = false;
    },

    getEmailJSONString: function () {
        var jsonObj = {};
        jsonObj.email = this._emailTo;
        jsonObj.subject = this._subject;
        jsonObj.body = this._body;
        jsonObj.chooserTitle = this._chooserTitle;
        jsonObj.isHtmlText = this._isHtmlText;
        return  JSON.stringify(jsonObj);
    }

});