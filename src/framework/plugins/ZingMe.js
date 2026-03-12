/**
 * Created by GSN on 9/29/2015.
 */

ZING_ME_ERROR = {
    SUCCESS:0,

    INVALID_PASSWORD: 4,
    REGISTER_EXIST:5,
    INVALID_ACCOUNT: 6,
    INVALID_GAME_ID: 7,
    INVALID_MAC: 8,
    UNDER_18_YEARS_OLD: 20,
    REGISTER_QUICK:-5,

    PARSE_JSON_FAIL:1001,
    FAIL:1002

};

fr.zingme = {
    SEC_KEY: "Fgpue7!@RKg8Pyc=",
    GAME_ID: "cotyphu",
    KEY_USER:"key_zm_user",
    KEY_PASS:"key_zm_pass",
    login:function(user, password, callback)
    {
        var userName = user.toLowerCase();
        var encrypted_pw = md5(password);
        var mac = md5(this.GAME_ID + userName + encrypted_pw + this.SEC_KEY);
        var url = "https://myplay.apps.zing.vn/sso3/login.php"
            + "?gameId=" + this.GAME_ID
            + "&username=" + userName
            + "&password=" + encrypted_pw
            + "&mac=" + mac
            + "&v=2";
        cc.log(url);
        var xhr = cc.loader.getXMLHttpRequest();
        var self = this;
        xhr.onreadystatechange = function () {
            if (xhr.readyState == 4 && (xhr.status >= 200 && xhr.status <= 207)) {
                var httpStatus = xhr.statusText;
                var response = xhr.responseText;
                var data = JSON.parse(response);
                if(data != null) {
                    if (data.error == 0) {
                        //luu thong tin lai
                        self.saveUserInfo(user,password);
                        callback(ZING_ME_ERROR.SUCCESS, data.sessionKey);
                    } else {
                        self.saveUserInfo(user,"");

                        callback(data.error, "");
                    }
                }else{
                    callback(ZING_ME_ERROR.PARSE_JSON_FAIL,"");
                }
            }
            else{
                if(!cc.sys.isNative && (xhr.status == 200 || xhr.status == 0))
                {
                    return;
                }
                callback(ZING_ME_ERROR.FAIL,"");
            }
        };
        xhr.onerror = function(){
            cc.log("onerror");
            callback(PORTAL_ERROR.CANNOT_CONNECT_TO_SERVER,"");
        };
        xhr.ontimeout = function(){
            cc.log("ontimeout");
            callback(PORTAL_ERROR.CONNECTION_TIMEOUT,"");
        };
        xhr.onabort = function () {
            cc.log("onabort");
            callback(PORTAL_ERROR.CONNECTION_ABORTED,"");
        };
        xhr.timeout = 5000;
        xhr.open("GET",url, true);
        xhr.send();
    },
    register:function(user, password, callback)
    {
        var dob = "01-01-1990"; // TODO: let player select date of birth.
        var userName = user.toLowerCase();
        var encrypted_pw = md5(password);
        var mac = md5(this.GAME_ID + userName + encrypted_pw + this.SEC_KEY);

        var xhr = cc.loader.getXMLHttpRequest();
        var url = "https://myplay.apps.zing.vn/sso3/register.php"
            + "?gameId=" + this.GAME_ID
            + "&username=" + userName
            + "&password=" + encrypted_pw
            + "&dob=" + dob
            + "&mac=" + mac
            + "&v=2";
        cc.log(url);
        var self = this;
        xhr.onreadystatechange = function () {
            if (xhr.readyState == 4 && (xhr.status >= 200 && xhr.status <= 207)) {
                var response = xhr.responseText;
                cc.log("response: " + response);
                var data = JSON.parse(response);
                if(data != null)
                {
                    //dk tai khoan thanh cong, luu thong tin user lai de tu dong dang nhap
                    if(data.error == ZING_ME_ERROR.SUCCESS)
                    {
                        self.saveUserInfo(user,password);
                    }

                    callback(data.error);
                }
                else
                {
                    callback(ZING_ME_ERROR.PARSE_JSON_FAIL,"");
                }

            }
            else{
                if(!cc.sys.isNative && (xhr.status == 200 || xhr.status == 0))
                {
                    return;
                }
                callback(ZING_ME_ERROR.FAIL,"");
            }
        };


        xhr.timeout = 5000;
        xhr.open("GET", url, true);
        xhr.send();
    },
    getCurrentUsername:function()
    {
        var user = fr.UserData.getStringFromKey(this.KEY_USER,"");
        if( user != null)
            return user;
        return "";
    },
    getCurrentPassword:function()
    {
        return fr.UserData.getStringWithCrypt(this.KEY_PASS,"");
    },
    saveUserInfo:function(user, pass)
    {
        fr.UserData.setStringFromKey(this.KEY_USER,user);
        fr.UserData.setStringWithCrypt(this.KEY_PASS,pass);
    },
    processLoginErrorNoUId: function (error) {
        var notifyStr = "";
        if(error == ZING_ME_ERROR.INVALID_ACCOUNT){
            notifyStr = fr.Localization.text("ZINGME_ERROR_INVALID_ACCOUNT");
        }
        else if (error == ZING_ME_ERROR.INVALID_PASSWORD){
            notifyStr = fr.Localization.text("ZINGME_ERROR_INVALID_PASSWORD");
        }
        else if (error == ZING_ME_ERROR.UNDER_18_YEARS_OLD){
            notifyStr = fr.Localization.text("ZINGME_ERROR_UNDER_18");
        }
        else if (error == PORTAL_ERROR.CONNECTION_TIMEOUT){
            notifyStr = fr.Localization.text("ALERT_1001");
        }
        else{
            notifyStr = fr.Localization.text("ZINGME_LOGIN_ERROR_GENERAL");
            notifyStr = notifyStr.replace("@error@", error);
        }

        EffectText.show(gv.guiMgr.getCurrentScreen(), notifyStr, cc.p(cc.winSize.width/2, cc.winSize.height/3));
    },

    onRegisterError: function (error) {
        var notifyStr = "";
        if(error == ZING_ME_ERROR.INVALID_ACCOUNT){
            notifyStr = fr.Localization.text("ZINGME_ERROR_INVALID_ACCOUNT");
        }
        else if (error == ZING_ME_ERROR.INVALID_PASSWORD){
            notifyStr = fr.Localization.text("ZINGME_ERROR_INVALID_PASSWORD");
        }
        else if (error == ZING_ME_ERROR.UNDER_18_YEARS_OLD){
            notifyStr = fr.Localization.text("ZINGME_ERROR_UNDER_18");
        }
        else{
            notifyStr = fr.Localization.text("ZINGME_REGISTER_ERROR_GENERAL");
            notifyStr = notifyStr.replace("@error@", error);
        }
        EffectText.show(gv.guiMgr.getCurrentScreen(), notifyStr, cc.p(cc.winSize.width/2, cc.winSize.height/3));

    }

};