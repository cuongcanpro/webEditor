
var randomFloat = function (min, max) {
    return Math.random() * (max - min) + min;
};
var randomInt = function (xmin, xmax) {
    return Math.floor(Math.random() * (xmax + 1 - xmin) + xmin);
};

let FunctionUtils = {};

FunctionUtils.asyncAvatarWithUrl = function (view, info, url, sendLog) {
    // cc.log("CommonLogic.asyncAvatarWithUrl ->", JSON.stringify(info), url);
    //cache image avatar ra folder rieng cho de quan ly
    var PATH_AVATAR = Config.PATH_AVATAR;
    var path = jsb.fileUtils.getWritablePath() + PATH_AVATAR;
    if(!jsb.fileUtils.isDirectoryExist(path)){
        jsb.fileUtils.createDirectory(path);
    }

    var key;
    if(url === undefined && info !== undefined && info.uID){
        view.setInfoAvatar(info);
        key = info.uID;
        url = info.avatarURL;
    }
    else{
        key = info;
    }

    if(url == "" || !url){
        view.setImagePath(PATH_AVATAR + key);
        return;
    }
    view.asyncExecuteWithUrl(PATH_AVATAR + key, url, sendLog);
};
