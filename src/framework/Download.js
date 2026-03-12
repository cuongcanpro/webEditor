/**
 * Created by Cantaloupe on 8/30/2017.
 * A lone wolf died alone
 * But a whole pack will survive
 */

DOWNLOAD_ERROR = {
    SUCCESS:100,
    FINISH_ONE_FILE:1,
    FAILED:-1
};

fr.download = {
    ERR_SUCCESS:-1,
    downloadFile:function(url, desUrl, md5, callback) {
        fr.NativeService.downloadFile(url, desUrl, md5, callback);
    },
    deleteFile:function(path) {
        jsb.fileUtils.removeFile(path);
    }
};

fr.downloadMgr = {
    DOWNLOAD_URL_PREFIX:"localhost/high/",
    DES_PREFIX:"",
    ASSET_PREFIX: "",
    init:function() {
        if (Utility.isIOS()) return;

        if (cc.sys.platform != cc.sys.WIN32) {
            this.ASSET_PREFIX = fr.NativeService.getFolderUpdateAssets() + "/";
        }
        this.localFileDownload = {};
        this.getLocalDownloadManifest();
        this.remoteFileDownload = {};
        this.retryRemoteManifestLeft = 1;
        this.listFileNeedDownLoad = [];
        this.getRemoteDownloadManifest();
    },

    // Init prefix url of download source & local storages
    initPrefixUrl:function() {
        if (cc.sys.platform == cc.sys.WIN32) {
            this.DES_PREFIX = "dwnld/";
        }
        else {
            this.DES_PREFIX = fr.NativeService.getFolderUpdateAssets() + "/dwnld/";
            if (this.remoteFileDownload.packageUrl) {
                this.DOWNLOAD_URL_PREFIX = this.remoteFileDownload.packageUrl + "/";
            }
        }
        cc.log("this.DES_PREFIX = " + this.DES_PREFIX);
    },

    // If return true: downloader will assume that download job is completed and callback success.
    // Update more cases here...
    isNotSupportDownload: function(){
        if (cc.sys.platform == cc.sys.WP8 || cc.sys.platform == cc.sys.WINRT || cc.sys.platform == cc.sys.WIN32) {
            return true;
        }

        // must have: older APKs don't have this function
        return !fr.NativeService.downloadFile;
    },

    checkFilesValid:function(list) {
        var flagSave = false;
        for (var i = 0; i < list.length; ++i) {
            var path = list[i];
            var localMd5 = this.localFileDownload[path];
            if (localMd5 == null) {
                // cc.log("md5 cua file resource ko co trong local download manifest >> ko lam gi ca");
                continue;
            }
            // neu da co trong local download >> check xem file nay co outdate ko
            if (this.remoteFileDownload['assets'][path] == null || // neu tren remote ko co file resource trong list
                this.remoteFileDownload['assets'][path]['md5'] != localMd5) // hoac file resource tren live khac voi duoi local
            {
                // cc.log("check md5 = " + list[i] + "\n" + this.remoteFileDownload['assets'][path]['md5'] + "\n" + this.localFileDownload[path]);
                fr.download.deleteFile(this.DES_PREFIX + list[i]); // xoa file resource trong high
                delete this.localFileDownload[path]; // xoa file path trong local download manifest
                flagSave = true;
            }
        }
        // if (flagSave) {
        // cc.log("flagSave = true, rewrite lcldwnld.manifest");
        jsb.fileUtils.writeStringToFile(JSON.stringify(this.localFileDownload), (this.ASSET_PREFIX + "lcldwnld.manifest"));
        // }
    },

    addFileInfoToLocal:function(path, md5) {
        this.localFileDownload[path] = md5;
        jsb.fileUtils.writeStringToFile(JSON.stringify(this.localFileDownload), (this.ASSET_PREFIX + "lcldwnld.manifest"));
    },

    // get files info that existed from cache (filename/md5)
    getLocalDownloadManifest:function() {
        if (!jsb.fileUtils.isFileExist("lcldwnld.manifest")) {
            // cc.log("lcldwnld.manifest doesn't exist");
            return;
        }
        var data = jsb.fileUtils.getStringFromFile("lcldwnld.manifest");
        try {
            this.localFileDownload = JSON.parse(data);
        }
        catch (e) {
            this.localFileDownload = {};
        }
        // cc.log(JSON.stringify("this.localFileDownload:" + this.localFileDownload));
    },

    getProjectManifestPath:function(){
        if (jsb.fileUtils.isFileExist("project.manifest")) {
            return "project.manifest";
        }
        else {
            return "project.dat";
        }
    },

    getRemoteDownloadManifest: function() {
        return;
        var manifestPath = this.getProjectManifestPath();
        cc.log("manifestPath = " + manifestPath);
        var data = jsb.fileUtils.getStringFromFile(manifestPath);

        //var response = JSON.parse(data);
        //cc.log("response " + response);
        if (cc.sys.platform == cc.sys.WIN32) {
            jsb.fileUtils.writeStringToFile(data, ("download.manifest"));
        }
        else {
            jsb.fileUtils.writeStringToFile(data, (this.ASSET_PREFIX +  "download.manifest"));
        }

        var json = JSON.parse(data);
        if (json != null) {
            if (cc.sys.platform == cc.sys.WIN32) {
                jsb.fileUtils.writeStringToFile(data, ("download.manifest"));
            }
            else {
                jsb.fileUtils.writeStringToFile(data, (this.ASSET_PREFIX + "download.manifest"));
            }

            this.remoteFileDownload = json;

            cc.log("file download ");
            var listLocal = {};
            for (var fileData in this.remoteFileDownload['assets']) {
                if (this.remoteFileDownload['assets'][fileData].isIgnored) {
                    listLocal[fileData] = this.remoteFileDownload['assets'][fileData].md5;
                    this.listFileNeedDownLoad.push(fileData);
                    cc.log(fileData);
                }
            }
            this.initPrefixUrl();
            // write file local download manifest
            if (!jsb.fileUtils.isFileExist("lcldwnld.manifest")) {
                // cc.log("write file local download, fix bug dont download resources");
                jsb.fileUtils.writeStringToFile(JSON.stringify(listLocal), (this.ASSET_PREFIX + "lcldwnld.manifest"));
                cc.log("DOWNLOAD lcldwnld.manifest", JSON.stringify(listLocal));
            }
        }
    },

    retryGetRemoteDownloadManifest: function() {
        this.retryRemoteManifestLeft--;
        if (this.retryRemoteManifestLeft < 0) {
            // cannot download remote manifest
            return;
        }
        this.getRemoteDownloadManifest();
    },

    getNumFileInGroup: function(groupName) {
        if (this.remoteFileDownload['group'] == null) {
            return -1;
        }
        var cfg = this.remoteFileDownload['group'][groupName];
        if (cfg == null) {
            return 0;
        }
        return cfg.length;
    },

    /**
     * merge multi groups and download
     * @param groupName: ten group moi
     * @param groupList: danh sach cac groupName
     * @param callback: call khi download xong
     */
    downloadGroups: function(groupName, groupList, callback) {
        this.mergeGroup(groupName, groupList);
        this.downloadGroup(groupName, callback);
    },

    // create new group from existed groups
    mergeGroup: function(groupName, groupList) {
        if (this.remoteFileDownload['group'][groupName] != null) {
            cc.log("fr.download warning: " + groupName + " is existed");
            return;
        }
        var listDl = [];
        for (var i = 0; i < groupList.length; ++i) {
            var gname = groupList[i];
            var cfg = this.remoteFileDownload['group'][gname];
            if (cfg == null) {
                cc.log("fr.download warning: " + gname + " is not existed");
                continue;
            }
            listDl = listDl.concat(cfg);
        }
        this.remoteFileDownload['group'][groupName] = listDl;
    },

    // Create new download group programmatically
    createNewGroup: function (groupName, path) {
        cc.log("create new download group");
        return;
        if (cc.sys.platform == cc.sys.WIN32) return
        if (this.remoteFileDownload['group'][groupName] != null) {
            cc.log("fr.download warning: " + groupName + " is existed");
            return;
        }
        let groupFiles = [];
        for (var fileData in this.remoteFileDownload['assets']) {
            if (this.remoteFileDownload['assets'][fileData].isIgnored && fileData.indexOf(path) != -1) {
                groupFiles.push(fileData);
            }
        }
        this.remoteFileDownload['group'][groupName] = groupFiles;
        cc.log("created group %s: %s", groupName, JSON.stringify(groupFiles));
    },

    /**
     * download list files configured follow cdn.json
     * @param groupName: ten group se download
     * @param callback: call khi download xong
     */
    downloadGroup:function(groupName, callback) {
        if (this.isNotSupportDownload()) {
            cc.log("not support dlwnd");
            callback(groupName, DOWNLOAD_ERROR.SUCCESS);
            return;
        }
        cc.log("config", JSON.stringify(this.remoteFileDownload));
        if (this.remoteFileDownload['packageUrl'] == null) {
            // cannot download
            callback(DOWNLOAD_ERROR.FAILED);
            return;
        }

        var cfg = this.remoteFileDownload['group'][groupName];
        if (cfg == null) {
            callback(groupName, DOWNLOAD_ERROR.FAILED);
            return;
        }

        var listDl = []; // list path file
        for (var i = 0; i < cfg.length; ++i) {
            listDl.push(cfg[i]);
        }
        cc.log("listDl", listDl);
        var downloadResult = function (result) {
            callback(groupName, result)
        };
        this.downloadListFiles(listDl, downloadResult);
    },

    downloadListFiles:function(list, callback, isRecursiveCall, isRetry) {
        if(cc.sys.platform == cc.sys.WIN32){
            callback(DOWNLOAD_ERROR.SUCCESS);
            return;
        }
        if (!isRecursiveCall) {
            if (this.isNotSupportDownload()) {
                cc.log("not support dlwnd");
                callback(DOWNLOAD_ERROR.SUCCESS);
                return;
            }
            if (this.remoteFileDownload['packageUrl'] == null) {
                // cannot download
                callback(DOWNLOAD_ERROR.FAILED);
                return;
            }

            this.checkFilesValid(list);
            list = this.addPrefixPath(list);
        }

        var onFileDownloadFinish = function() {
            fr.downloadMgr.downloadListFiles(list, callback, true);
        };

        var onFileDownloadError = function() {
            if (isRetry) {
                callback(DOWNLOAD_ERROR.FAILED);
                return;
            }
            fr.downloadMgr.downloadListFiles(list, callback, true, true);
        };

        for (var i = list.length - 1; i >= 0; --i){
            var curDownloadPath = list[i];
            if (curDownloadPath == "" || jsb.fileUtils.isFileExist(this.DES_PREFIX + curDownloadPath)) {
                list.splice(list.length - 1, 1);
                if (list.length == 0) {
                    // cc.log("finish all file");
                    callback(DOWNLOAD_ERROR.SUCCESS);
                }
                else {
                    callback(DOWNLOAD_ERROR.FINISH_ONE_FILE);
                }
                if (curDownloadPath != "") {
                    // cc.log("file  " + this.DES_PREFIX + curDownloadPath +"\n");
                    this.addFileInfoToLocal(curDownloadPath, this.remoteFileDownload['assets'][curDownloadPath].md5);
                }
                continue;
            }
            // cc.log("download file = " + curDownloadPath + "\n");
            fr.download.downloadFile(
                this.DOWNLOAD_URL_PREFIX + curDownloadPath,
                this.DES_PREFIX + curDownloadPath,
                this.remoteFileDownload['assets'][curDownloadPath].md5,
                function(result) {
                    if (result == -1) {
                        onFileDownloadFinish();
                    }
                    else if (result == -2) {
                        onFileDownloadError();
                    }
                }
            );
            break;
        }
    },

    addPrefixPath:function(list) {
        for (var i = 0; i < list.length; ++i) {
            list[i] = this.addPrefixOnePath(list[i]);
        }
        return list;
    },

    addPrefixOnePath:function(path) {
        for (var fPath in this.remoteFileDownload['assets']) {
            if (fPath.indexOf(path) != -1) {
                return fPath;
            }
        }
        return "";
    }
};