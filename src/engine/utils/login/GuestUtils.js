
var GuestUtils = GuestUtils || {};

GuestUtils.doGuestLogin = function (){
    gv.socialMgr.onSelectLoginGuest();
    cc.log("getGuestSessionKey");
    if (cc.sys.platform == cc.sys.WIN32 && gv.gameClient.isLocalServer()){
        fr.UserData.setStringFromKey(KeyStorage.GUEST_SSK, "aWQ9Mzg1Mjk5MTYmdXNlcm5hbWU9OTU0YzVhNWRiYTUyZTNmZSZzb2NpYWw9Z3Vlc3Qmc29jaWFsbmFtZT1ndWVzdC4zODUyOTkxNiZhdmF0YXI9JTJGYXZhdGFyJTJGZGVmYXVsdC5qcGcmdGltZT0xNjI0NDIyMjU0Jm90aGVyPWRlZmF1bHQlM0ElM0ElM0ElM0EzODUyOTkxNiZ0b2tlbktleT05MTg1NDkxNjc2NWZhZTQ2NzM4MTk5NzI2MzNiNDYxNg==");
    }

    var sskey = fr.UserData.getStringFromKey(KeyStorage.GUEST_SSK, null);
    if(!_.isNull(sskey) && sskey != "") {
        gv.gameClient.setSessionKey(fr.UserData.getStringFromKey(KeyStorage.GUEST_SSK, null));
        gv.gameClient.onGuestLogin();
        return;
    }

    let gameId = 250;
    let secretKey = '$ecRe!l<ei';

    let mac = md5(fr.platformWrapper.getDeviceID() + secretKey);
    let url = "https://login.zingplay.com/";
    let args = "service_name=zacc_guest&gameId=" + gameId +
        "&deviceId=" + fr.platformWrapper.getDeviceID() + "&mac=" + mac +"&isPortal=1";
    cc.log("getGuestSessionKey", args);


    let callBackFunc = function (result, response){
        if(result) {
            cc.log(response);
            let data;
            try {
                data = JSON.parse(response);
            }
            catch (e) {
                cc.log("getGuestSessionKey parse error: " + url + " : " + response);
                GuestUtils.onGetGuestSessionKeyError();
                return;
            }
            if (data) {
                cc.log("getGuestSessionKey data : ", JSON.stringify(data));
                fr.UserData.setStringFromKey(KeyStorage.GUEST_SSK, data.sessionKey);
                gv.gameClient.setSessionKey(data.sessionKey);
                gv.gameClient.onGuestLogin();

            }
            else {
                cc.log("getGuestSessionKey parse error : " + url + " : " + response);
                GuestUtils.onGetGuestSessionKeyError();
            }
        }
        else {
            cc.log("getGuestSessionKey get FAIL!");
            GuestUtils.onGetGuestSessionKeyError(fr.Localization.text("lang_notice_reconnect"));
        }
    };
    fr.Network.xmlHttpPostForm(url,args,callBackFunc);
};

GuestUtils.onGetGuestSessionKeyError = function(text){
    // must login to server
    if (!TimeSystem.isGotServerTime()){
        // if (gv.gameClient.isLocalServer()){
        //     TimeSystem.set1stServerTime(0);
        //     return;
        // }
        fr.LoginErrorProcessor.backToSceneLoginWithError(text);
    }
};

GuestUtils.isGuestPlayer = function (){
    return (userMgr.getData().social == SOCIAL.GUEST);
};

GuestUtils.isGuestPlayerByUId = function (userId) {
    cc.log("isGuestPlayerByUId userId = ", userId);
    if(_.isNull(userId))
        cc.warn("isGuestPlayer NULL userId = " + userId);

    let social = fr.UserData.getStringFromKeyByUId(userId, KeyStorage.SOCIAL_TYPE, null);
    if(_.isNull(social))
        return false;

    return (userMgr.getData().social == SOCIAL.GUEST);
};

GuestUtils.getGuestUserName = function (){
    var uid = GuestUtils.getGuestUId();
    if (uid != ""){
        var storedName = fr.UserData.getStringFromKeyByUId(GuestUtils.getGuestUId(), KeyStorage.USER_NAME, null);
        if(!_.isNull(storedName)) return storedName;
    }
    return "Guest";
};

GuestUtils.getGuestDisplayName = function (){
    return GameConstant.GUEST;
};

GuestUtils.getGuestUId = function (){
    let id =  fr.UserData.getStringFromKey(KeyStorage.GUEST_ID, '');

    if (gv.isEnableTestOfflineClient && id == ""){
        id = "10001";
        fr.UserData.setStringFromKey(KeyStorage.GUEST_ID, id);
    }

    return id;
};

GuestUtils.getGuestAvatar = function (){
    let avatarUrl =  fr.UserData.getStringFromKeyByUId(GuestUtils.getGuestUId(), KeyStorage.AVATAR, '');
    return avatarUrl;
};

GuestUtils.existGuestPlayHistory = function (){
    cc.log("getLengthFlowPlayGuest" + EventProcessor.getCheckState(GuestUtils.getGuestUId()));
    return (EventProcessor.getCheckState(GuestUtils.getGuestUId()) != "Nothing");
};

// GuestUtils.isGuestSessionKey = function (ssk){
//     let guestSsk = fr.UserData.getStringFromKey(KeyStorage.GUEST_SSK, null);
//     cc.log("guestSsk = ", guestSsk, " ssk = ", ssk);
//     return !(_.isNull(guestSsk) || guestSsk != ssk);
// };

GuestUtils.showGuestCanNotUseFeature = function () {
    gv.alert.showOKCustom(
        fr.Localization.text("ALERT_TITLE"),
        fr.Localization.text("lang_guess_can_not_use_feature"),
        null, null
    );
};

GuestUtils.getDeviceId = function (){
    let deviceId = fr.platformWrapper.getAAID().replace(/-/g,'');
    cc.log("AAID " + deviceId + " deviceId " + fr.platformWrapper.getDeviceID());
    if(fr.platformWrapper.getOsName() == "IOS" || _.isEmpty(deviceId))
        deviceId = fr.platformWrapper.getDeviceID().replace(/-/g,'');
    cc.log("deviceId", deviceId);
    return deviceId;
};
