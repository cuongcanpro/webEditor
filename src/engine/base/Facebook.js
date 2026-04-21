/**
 * Created by GSN on 9/30/2015.
 */
var fr = fr || {};
fr.facebook = {
    userId: "",
    userName: "",
    userAvatarUrl: "",
    loginSuccess: 2,
    pluginUser: null,
    accessToken: null,
    sessionKey: null,

    init: function () {
        this.callback = null;
        if (plugin.PluginManager == null)
            return false;
        this.pluginUser = plugin.PluginManager.getInstance().loadPlugin("UserFacebook");
        return true;
    },

    /**
     *
     * @param callback
     */
    login: function (callbackFunc) {
        var self = this;
        this.callback = callbackFunc;
        if (this.pluginUser && this.pluginUser.isLoggedIn()) {
            this.pluginUser.logout(function () {
                self._requestLogin(callbackFunc, true);
            });
        } else {
            self._requestLogin(callbackFunc, true);
        }
    },

    logout: function () {
        if (this.pluginUser && this.pluginUser.isLoggedIn()) {
            this.pluginUser.logout(function () {

            });
        }
    },

    _requestLogin: function (callbackFunc, isRequestFriends) {
        //tat tam quyen ban be
        isRequestFriends = false;
        if(isRequestFriends){
            var permissions = ["user_friends"];
            plugin.FacebookAgent.getInstance().login(permissions, this.callBackLogin.bind(this));
        }else{
            if (this.pluginUser)
                this.pluginUser.login(this.callBackLogin.bind(this));
        }
    },

    callBackLogin: function(result, response) {
        var callback = this.callback;
        if(typeof response == "object"){
            var data = response;
        }
        else{
            var data = JSON.parse(response);
        }
        if (result == plugin.ProtocolUser.UserActionResultCode.LOGIN_SUCCEED) {
            var accessToken = data["accessToken"];
            callback(true, accessToken);
        } else {
            if (result != plugin.ProtocolUser.UserActionResultCode.LOGOUT_SUCCEED) {
                var error = data;
                callback(false, "fb:" + error);
            }
        }
        this.callback = null;
    },

    getAccessToken: function() {
        let accesToken = "";
        if(portalMgr.isPortal()){
            accesToken = fr.portalState.getAccessToken();
        }
        else{
            var keyToken = "access_token";
            accesToken = cc.sys.localStorage.getItem(keyToken);
        }
        return accesToken;
    },

    getFriendsPlayedGame: function (callbackFunc) {
        var url = "https://graph.facebook.com/v2.5/me/friends?fields=id,name,picture.width(160).height(160)&limit=1000&access_token=" + this.getAccessToken();
        if (Config.ENABLE_CHEAT) cc.log("getFriendsPlayedGame", url);
        fr.Network.requestJsonGet(url, function (result, response) {
            if (Config.ENABLE_CHEAT) cc.log("requestJsonGet", JSON.stringify(result), JSON.stringify(response));
            if (result) {
                callbackFunc(true, response.data);
            } else {
                callbackFunc(false, "");
            }
        });
    },

    getFriendsNotPlayGame: function (callbackFunc) {
        var url = "https://graph.facebook.com/v2.5/me/invitable_friends?fields=id,name,picture.width(160).height(160)&limit=500&access_token=" + this.getAccessToken();
        fr.Network.requestJsonGet(url, function (result, response) {
                if (result) {
                    callbackFunc(true, response.data);

                } else {
                    callbackFunc(false, "");
                }
            }
        );
    },

    inviteRequest: function (toFriend, message, callbackFunc, title) {
        if (!toFriend) {
            if (callbackFunc != undefined) {
                callbackFunc(false, "List friend empty!")
            }
            return;
        }

        if (title == undefined) {
            title = "invite_install_zingplay";
        }
        var map = {
            "message": message,
            "title": title,
            "to": toFriend
        };
        plugin.FacebookAgent.getInstance().appRequest(map, function (result, response) {
            if (result == plugin.FacebookAgent.CODE_SUCCEED) {
                callbackFunc(true, "Success!");
            } else {

                callbackFunc(false, "Failed!");
            }
        });
    },

    getDeepLink: function () {
        if (this.pluginUser) {
            if(Config.ENABLE_CHEAT) cc.log("FACEBOOK: getDeepLink");
            return this.pluginUser.callStringFuncWithParam("getDeepLink");
        }
        return "";
    },

    shareScreenShoot : function (img, callBack, des) {
        cc.log("[Facebook] <sharePhoto> image = " + img);
        var info = {
            "dialog": "sharePhoto",
            "photo": img
        };
        if(des && cc.sys.os == cc.sys.OS_ANDROID) info["des"] = des;
        if(des && cc.sys.os == cc.sys.OS_IOS) info["hashtag"] = des;

        plugin.FacebookAgent.getInstance().dialog(info, function(ret, msg){
            cc.log("facebook ret = " + ret);
            cc.log("facebook msg = " + JSON.stringify(msg));
            switch (ret) {
                case plugin.FacebookAgent.CODE_SUCCEED:
                    cc.log("facebook SUCCEED!!!");
                    if(callBack instanceof Function)callBack(0);
                    break;
                case 1: // FAILED - NO APP
                    cc.log("facebook FAILED NO APP!!!");
                    if(callBack instanceof Function)callBack(-1);
                    break;
                case 2: // CANCELED
                    cc.log("facebook CANCELED!!!");
                    if(callBack instanceof Function)callBack(1);
                    break;
                default: // default: FAILED
                    cc.log("facebook FAILED!!!");
                    if(callBack instanceof Function)callBack(2);
                    break;
            }
        });
    }
};
