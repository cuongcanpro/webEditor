/**
 * Created by KienVN on 11/3/2015.
 */

SOCIAL = {
    UNKNOWN:    "unknown",
    FACEBOOK:   "facebook",
    GOOGLE:     "google",
    GUEST:      "guest",
    ZINGME:     "zingme"
};

SOCIAL_ACTION = {
    SUCCEED:0,
    FAILED:1,
    LOGOUT_SUCCEED:2
};


fr.Social = {
    getFriendList:function(socialType,isPlayedGame, callback){

        if (cc.sys.platform == cc.sys.WIN32)
        {
            var fakeData = [
                {
                    social_id:"1",
                    name:"absd hehe",
                    avatar_url:"http://cpu02153:8080/mantisbt/images/mantis_logo_232x80.png"
                },
                {
                    social_id:"2",
                    name:"absd hehe",
                    avatar_url:"http://cpu02153:8080/mantisbt/images/mantis_logo_232x80.png"
                },
                {
                    social_id:"3",
                    name:"absd hehe",
                    avatar_url:"http://cpu02153:8080/mantisbt/images/mantis_logo_232x80.png"
                },
                {
                    social_id:"4",
                    name:"absd hehe",
                    avatar_url:"http://cpu02153:8080/mantisbt/images/mantis_logo_232x80.png"
                },
                {
                    social_id:"5",
                    name:"absd hehe",
                    avatar_url:"http://cpu02153:8080/mantisbt/images/mantis_logo_232x80.png"
                }
            ];
            callback(0, fakeData, socialType);
            return;
        }


        if(socialType == SOCIAL.FACEBOOK)
        {
            var funcFbFriends = function(result, listFbFriends)
            {

                //cc.log("callback result = " + result);
                if(result)
                {
                    var listFriends = [];
                    for (var i = 0; i < listFbFriends.length; i++)
                    {
                        var userData = listFbFriends[i];
                        listFriends.push(
                            {
                                social_id: userData.id,
                                name: userData.name,
                                avatar_url: userData.picture.data.url,
                                check_id: userData.name
                            }
                        )
                    }
                    callback(SOCIAL_ACTION.SUCCEED, listFriends, socialType);
                }
                else
                {
                    callback(SOCIAL_ACTION.FAILED,[], socialType);
                }
            };
            if(isPlayedGame){
                cc.log("isPlayedGame = " + isPlayedGame);
                fr.facebook.getFriendsPlayedGame(funcFbFriends);
            }else
            {
                cc.log("isPlayedGame = " + isPlayedGame);
                fr.facebook.getFriendsNotPlayGame(funcFbFriends);
            }
        }else{
            cc.log("getFriendList: Not support social: " + socialType);
            callback(SOCIAL_ACTION.FAILED,[],socialType);
        }
    },
    requestInviteMessage:function(socialType, toIdList, message, callbackFunc, idImage)
    {
        if(socialType == SOCIAL.FACEBOOK) {
            fr.facebook.inviteRequest(toIdList,message,callbackFunc,fr.Localization.text("title_share_facebook"));
        }
    }
};
