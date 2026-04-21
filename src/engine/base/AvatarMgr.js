var AvatarMgr = cc.Class.extend({
    ctor: function () {
        this.queueWaitAsyncAvatar = {};
        this.queueRequestAvatar = {};
        this.cacheName = {};
        this.cacheLinkAvatar = {};
        this.queueSaveUname = [];
        this.idInterval = setInterval(this.saveUname.bind(this), 1000 * 60);
        this.idIntervalRequest = setInterval(this.checkRequest.bind(this), 1000 * 10);
    },

    // obj queue has uID and array listener

    asyncAvatarWithUID: function (uID, listener) {
        // cc.log("asyncAvatarWithUID", uID, listener);
        if(isNaN(uID)) return;
        // if in queue wait async avatar
        // push listener to queue wait
        var elementWait = this.queueWaitAsyncAvatar[uID];
        if(elementWait && !listener){
            elementWait.arListener.push(listener);
            return;
        }

        // check cache name and avatar
        var name = this.getNameInCache(uID);
        var hasAvatarLocal = this.checkCacheAvatar(uID);
        var linkAvatar = this.cacheLinkAvatar[uID]

        // cc.log("logic", uID, name, hasAvatarLocal, linkAvatar);
        if(name && (hasAvatarLocal || (linkAvatar !== null && linkAvatar !== undefined) )){
            // load cache successfully -> return
            // cc.log("load cache successfully -> return", name, linkAvatar)
            if(listener && listener.setNameAndAvatar){
                listener.setNameAndAvatar(uID, name, linkAvatar);
            }
            return;
        }

        var elementRequest = this.queueRequestAvatar[uID]
        if(elementRequest){
            if(listener){
                elementRequest.arListener.push(listener);
            }
        }
        else {
            // cc.log("push obj", listener);
            elementRequest = {};
            elementRequest.uID = uID;
            elementRequest.arListener = [];
            if(listener){
                elementRequest.arListener.push(listener);
            }
            this.queueRequestAvatar[uID] = elementRequest;
        }

        // cc.log("check async", JSON.stringify(this.queueRequestAvatar));
    },

    onReceivedData: function (arData) {
        if(!arData) return;
        var start = Date.now();
        var PATH_AVATAR = Config.PATH_AVATAR;
        var path = jsb.fileUtils.getWritablePath() + PATH_AVATAR;
        if(!jsb.fileUtils.isDirectoryExist(path)){
            jsb.fileUtils.createDirectory(path);
        }

        // cc.log("arListener", JSON.stringify(this.queueWaitAsyncAvatar));

        // var t1 = Date.now(); cc.log("t1", t1 - start);
        for(var i = 0;i < arData.arInfo.length; i ++){

            var t11 = Date.now();
            var data = arData.arInfo[i];
            var elementWait = this.queueWaitAsyncAvatar[data.uID];
            var arListener = [];

            if(elementWait){
                arListener = elementWait.arListener;
            }

            for(var j = 0; j < arListener.length; j ++){
                // cc.log("vao day r 1 -> listener")
                var listener = arListener[j];
                if(listener && listener.setNameAndAvatar){
                    listener.setNameAndAvatar(data.uID, data.name, data.avatarURL);
                }
            }

            this.queueSaveUname.push({"key" : AvatarMgr.KEY_NAME + data.uID, "name" : data.name})

            // cache link avatar + user name
            this.cacheName[data.uID] = data.name;
            this.cacheLinkAvatar[data.uID] = data.avatarURL;
            delete this.queueWaitAsyncAvatar[data.uID]
        }
    },

    checkRequest: function () {
        // cc.log("******************** CHECK REQUEST **********************");
        // cc.log("data", JSON.stringify(this.queueRequestAvatar));
        var len = Object.keys(this.queueRequestAvatar).length;

        if(len > 0){
            var arUID = [];

            var numUser = 0;
            for(var key in this.queueRequestAvatar){
                if(numUser >= 30) break;
                arUID.push(key);
                this.queueWaitAsyncAvatar[key] = this.queueRequestAvatar[key];
                delete this.queueRequestAvatar[key];
                numUser++;
            }

            var pk = new STCmdSendRequestGetAvatar();
            pk.putData(arUID);
            TournamentClient.getInstance().sendPacket(pk);
        }
    },

    getNameInCache: function (uID) {
        // cc.log("getNameInCache", uID, JSON.stringify(this.cacheName), this.cacheName[uID]);
        var name = null;
        if(this.cacheName[uID] !== undefined &&  this.cacheName[uID] !== null){
            name = this.cacheName[uID];
            // cc.log("name in cache", name);
        }
        else {
            name = cc.sys.localStorage.getItem(AvatarMgr.KEY_NAME + uID);
            if(name){
                this.cacheName[uID] = name;
            }
            else {
                name = null;
            }

            // cc.log("name in local", name);
        }

        // cc.log("get name in cache", name);
        return name;
    },

    getStorePath:function(path) {
        return jsb.fileUtils.getWritablePath() + path;
    },

    checkCacheAvatar : function(uID) {
        var PATH_AVATAR = Config.PATH_AVATAR;
        var path = jsb.fileUtils.getWritablePath() + PATH_AVATAR;
        if(!jsb.fileUtils.isDirectoryExist(path)){
            jsb.fileUtils.createDirectory(path);
        }

        //xu ly load tu cache
        var file = path + uID;

        // cc.log("checkCacheAvatar", file);
        //load avatar co san tu cache Texture
        var textureCache = cc.textureCache.getTextureForKey(file);
        if(textureCache){
            return true;
        }

        // check file exist
        //neu kich thuoc file co san < 500B => file bi lUserInfoGUIoi.
        if(jsb.fileUtils.isFileExist(file) && jsb.fileUtils.getFileSize(file) > 0){
            return imageValidator.isImage(jsb.fileUtils.getDataFromFile(file));
        }
        else {
            return false;
        }
    },

    saveUname: function (){
        // cc.log("save uname", JSON.stringify(this.queueSaveUname));
        var arElement = this.queueSaveUname.splice(0, 5);
        // cc.log("save uname", JSON.stringify(this.queueSaveUname));
        for(var i = 0; i < arElement.length; i ++){
            var elementSave = arElement[i];
            // cc.log("saveUname", elementSave.key, elementSave.name);
            cc.sys.localStorage.setItem(elementSave.key, elementSave.name);
        }
    },

    addCache: function (uID, uName, avatarUrl) {
        if(!this.cacheName[uID]){
            this.cacheName[uID] = uName;
        }

        if(!this.cacheLinkAvatar[uID]){
            this.cacheLinkAvatar[uID] = avatarUrl;
        }
    }
})

AvatarMgr.KEY_NAME = "username_";

AvatarMgr.instance = null;
AvatarMgr.getInstance = function(){
    if (AvatarMgr.instance === null){
        AvatarMgr.instance = new AvatarMgr();
    }
    return AvatarMgr.instance;
};
var avatarMgr = AvatarMgr.getInstance();
