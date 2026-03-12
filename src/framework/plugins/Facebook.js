/**
 * Created by GSN on 9/30/2015.
 */

TIME_GET_FB_USER_DELAY = 1000;
fr.facebook = {

    pluginUser: null,


    init: function () {
        if(!cc.sys.isNative) {
            return false;
        }

        if (plugin.PluginManager == null)
            return false;

        if (fr.facebook.pluginUser == null || fr.facebook.pluginShare == null) {
            var pluginManager = plugin.PluginManager.getInstance();
            fr.facebook.pluginUser = pluginManager.loadPlugin("UserFacebook");
            fr.facebook.agent = plugin.FacebookAgent.getInstance();
        }
        return true;
    },

    login: function (callback) {

        if (fr.facebook.agent == null) {
            //false
            callback(-1, "");
            return;
        }
        if (fr.facebook.agent.isLoggedIn())
        {
            fr.facebook.agent.logout(function () {
                fr.facebook.requestLogin(callback);
            });
        }
        else
        {
            fr.facebook.requestLogin(callback);
        }
    },

    requestLogin:function(callback)
    {
        var permissions = ["user_friends"];
        fr.facebook.agent.login(permissions,function (type, data) {
            //=2 la logout
            if (type != SOCIAL_ACTION.LOGOUT_SUCCEED) {
                if(data.accessToken)
                    fr.UserData.setStringFromKey("FacebookAccessToken", data.accessToken);
                setTimeout(function() {callback(type, data.accessToken);}, 500);
                var userId = fr.facebook.agent.getUserID();
                if(userId == null || userId == "")
                {
                    setTimeout(function(){
                        var userId = fr.facebook.agent.getUserID();
                        fr.UserData.setStringFromKey("FacebookUserId", userId);
                        cc.log("socialId = " + userId);
                    }, TIME_GET_FB_USER_DELAY);
                }else{
                    fr.UserData.setStringFromKey("FacebookUserId", userId);
                    cc.log("socialId = " + userId);
                }
            }
        });
    },
    getCurrentUsername: function () {
        return fr.UserData.getStringFromKey("FacebookUserId", "");
    },
    getAvatarUrl: function (callbackFunc) {
        let accessToken = fr.UserData.getStringFromKey("FacebookAccessToken", "");
        let url = "https://graph.facebook.com/v3.2/me?fields=picture.width(160).height(160)&access_token=" + accessToken;
        cc.log("get user avatar url", "accessToken", accessToken);
        fr.Network.requestJsonGet(url, function (result, data) {
            cc.log("result get user avatar = " + result);
            if (result)
            {
                callbackFunc(true, data['picture']['data']['url']);
            } else
            {
                callbackFunc(false, '')
            }
        })
    },
    getFriendsPlayedGame:function(callbackFunc)
    {
        var accessToken =  fr.UserData.getStringFromKey("FacebookAccessToken", "");
        var url = "https://graph.facebook.com/v2.5/me/friends?fields=id,name,picture&limit=1000&access_token=" + accessToken;
        cc.log("getFriend played game url = ", url);
        fr.Network.requestJsonGet(url, function(result, data)
        {
            cc.log("result played game = " + result);
            cc.log("result played game data= " + JSON.stringify(data));
            if(result)
            {
                callbackFunc(true, data.data);
            }else
            {
                callbackFunc(false)
            }
        });
    },
    getFriendsNotPlayGame:function(callbackFunc)
    {
        var accessToken =  fr.UserData.getStringFromKey("FacebookAccessToken", "");
        var url = "https://graph.facebook.com/v2.5/me/invitable_friends?fields=id,name,picture&limit=1000&access_token=" + accessToken;
        cc.log("getFriend not play game url = ", url);
        fr.Network.requestJsonGet(url, function(result, data)
            {
                cc.log("result not played game = " + result);
                if(result)
                {
                    callbackFunc(true, data.data);

                }else
                {
                    callbackFunc(false)
                }
            }
        );
    },
    inviteRequest: function (listFriend, message, callbackFunc, title) {
        if (listFriend.length == 0) {
            if (callbackFunc != undefined) {
                callbackFunc(SOCIAL_ACTION.FAILED, "List friend empty!")
            }
            return;
        }
        var toFriend = "";
        for (var i = 0; i < listFriend.length; i++) {
            var id = "'";
            id += listFriend[i];
            id += "'";

            if (i == listFriend.length - 1) {
                toFriend += id;
            }
            else {
                toFriend += id;
                toFriend += ",";
            }
        }
        if (title == undefined) {
            title = "Invite play game";
        }
        var map = {
            "message": message,
            "title": title,
            "to": toFriend
        };
        plugin.FacebookAgent.getInstance().appRequest(map, function (resultcode, msg) {
            cc.log("appRequest", resultcode, msg);
            if (resultcode == plugin.FacebookAgent.CODE_SUCCEED) {
                callbackFunc(SOCIAL_ACTION.SUCCEED, "Success!");
            }
            else {

                callbackFunc(SOCIAL_ACTION.FAILED, "Failed!");
            }
        });
    }
};