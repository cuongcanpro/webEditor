let AssetsManager = cc.Class.extend({
    ctor: function () {
        this._gameManifest = null;

    },

    init: function()
    {
        this._init();
        // dispatcherMgr.addListener(GameMgr.EVENT.OPEN_GAME, this);
        // dispatcherMgr.addListener(GameMgr.EVENT.RECONNECT_ROOM_SOCKET, this);
    },

    // region Init
    _init: function () {
        cc.log("Init AssetsManager ================= ");
        this.queueDownload = [];
        this.arFeature = {};
        this._isDownloading = false;
        this._isOpenGame = true;

        this._initGameManifest();

        if (this._isGameManifestAvailable()) {
            // this._initPathDownload();
            cc.log("AssetsManager ->arFeature", JSON.stringify(this.arFeature));
        }
    },

    /**
     * Load game manifest to get version game + url content
     * Url download feature = url game + path feature
     * @private
     */
    _initGameManifest: function () {
        if (cc.sys.platform === cc.sys.WIN32) {
            if (AssetsManager.ENABLE_TEST_LOCAL) {
                this._gameManifest = new Manifest("");
                this._gameManifest.setLocalInfo(13, "http://portal-gsn.mto.zing.vn/dominoid_cdn_event");
            }
            return;
        }
        const PRJ_MANIFEST = "/project.manifest";
        const PRJ_DATA = "/project.dat";
        let pathProjectManifest = fr.NativeService.getFolderUpdateAssets();
        if (!portalMgr.isPortal() && platformMgr.isIOS())
            pathProjectManifest = pathProjectManifest + PRJ_DATA;
        else
            pathProjectManifest = pathProjectManifest + PRJ_MANIFEST;
        let fullPathProjectManifest = jsb.fileUtils.fullPathForFilename(pathProjectManifest);
        cc.log("fullPathProjectManifest " + fullPathProjectManifest);
        // if (jsb.fileUtils.isFileExist(fullPathProjectManifest)) {
            cc.log("Run here ====== ");
            this._gameManifest = new Manifest(fullPathProjectManifest);
        // }

        if (this._gameManifest && this._gameManifest.isLoaded()) {
            cc.log("AssetsManager ->Load game manifest success",
                this._gameManifest.isLoaded(),
                this._gameManifest.getManifestFileUrl(),
                this._gameManifest.getVersion());
        } else {
            cc.log("Not init game manifest");
            this._gameManifest = null;
        }
    },

    /**
     * @return {null|bool}
     * @private
     */
    _isGameManifestAvailable: function () {
        return this._gameManifest && this._gameManifest.isLoaded();
    },

    /**
     * Creat AssetGroup manage Download Content for a module
     * @param pathFeature
     * @param nameFeature
     * @param listener
     * @private
     */
    _createAssetGroup: function (pathFeature, nameFeature, listener) {
        cc.log("AssetsManager ->create local manifest", pathFeature, nameFeature, !pathFeature || !nameFeature)
        if (!pathFeature || !nameFeature) return;

        cc.log("AssetsManager ->start create local");
        let pathGameCDN = this._gameManifest.getUrl();
        let gameVersion = this._gameManifest.getVersion();
        let pathFeatureCDN = pathGameCDN + "/" + pathFeature;

        let downloadPath = fr.NativeService.getFolderUpdateAssets();
        let storagePathFeature = downloadPath + "/" + pathFeature;
        //let localManifestFolder = downloadPath + nameFeature;
        let pathLocalManifest = downloadPath + "/project" + nameFeature + ".manifest";

        cc.log("AssetsManager ->_createLocalManifest", pathGameCDN, pathFeatureCDN, pathLocalManifest);
        // neu khong co local manifest cua feature -> create file local
        if (!jsb.fileUtils.isFileExist(pathLocalManifest)) {
            cc.log("AssetsManager ->file doesn't exits create new file");
            let manifest = {
                "packageUrl": pathFeatureCDN,
                "remoteManifestUrl": pathFeatureCDN + "project.manifest",
                "remoteVersionUrl": pathFeatureCDN + "version.manifest",
                "version": "0",
                "engineVersion": "3.8.1",
                "assets": {},
                "searchPaths": []
            };

            try {
                let data = JSON.stringify(manifest);
                cc.log("AssetsManager ->data", data)
                cc.log("AssetsManager ->AssetsManager CREATE FILE MANIFEST", pathLocalManifest);
                let result = jsb.fileUtils.writeStringToFile(JSON.stringify(manifest), pathLocalManifest);
                cc.log('result', result);
            } catch (e) {
                cc.log("AssetsManager ->AssetsManager ERROR Create file manifest", e);
            }
        }

        if (jsb.fileUtils.isFileExist(pathLocalManifest)) {
            let assetGroup = new AssetGroup(storagePathFeature, pathLocalManifest, nameFeature, gameVersion);
            assetGroup.setListener(listener);
            this.arFeature[nameFeature] = assetGroup;
        }
    },
    // endregion

    // region Download

    /**
     * Add feature need to Download content
     * @param {String} pathFeature
     * @param {String} nameFeature
     * @param {AssetGroupListener} listener
     */
    addDownloadFeature: function (pathFeature, nameFeature, listener) {
        cc.log("AssetsManager ->registerDownloadInfo", pathFeature, nameFeature);
        if (this._isGameManifestAvailable()) {
            this._createAssetGroup(pathFeature, nameFeature, listener);
        }
    },

    /**
     * @param {string} nameFeature
     * @param {number} priority
     */
    startDownloadFeature: function (nameFeature, priority = 0) {
        cc.log("StartDownload " + nameFeature);
        let feature = this.arFeature[nameFeature];
        if (feature.isUpdating())
            return;
        let idx = 0, isFound = false;
        for (let i = 0; i < this.queueDownload.length; i++) {
            if (this.queueDownload[i].priority < priority) {
                idx = i;
                isFound = true;
                break;
            }
        }
        if(!isFound){
            this.queueDownload.push(feature);
        }
        else {
            this.queueDownload.splice(idx, 0, feature);
        }
        this._checkQueueDownload();
    },

    /**
     * @param {string} nameFeature
     * @private
     */
    _finishDownloadFeature: function (nameFeature) {
        cc.log("AssetsManager ->--------////////// FINISH DOWNLOAD feature", nameFeature);
        this._isDownloading = false;
        this._checkQueueDownload();
        // dispatcherMgr.dispatchEvent(AssetsManager.EVENT.FINISH_DOWNLOAD, nameFeature);
    },

    _checkQueueDownload: function () {
        cc.log("AssetsManager ->check queue download", this._isOpenGame, this._isDownloading, this.queueDownload.length, 
            this._isOpenGame && !this._isDownloading && this.queueDownload.length > 0);

        // cc.log("_checkQueueDownload", JSON.stringify(this.queueDownload));

        if (this._isOpenGame && !this._isDownloading && this.queueDownload.length > 0) {
            const feature = this.queueDownload.shift();
            // cc.log("AssetsManager ->feature",
            //     JSON.stringify(this.queueDownload),
            //     JSON.stringify(this.arFeature),
            //     JSON.stringify(feature));

            if (feature) {
                cc.log("AssetsManager ->_checkQueueDownload -> ", feature._nameFeature);
                this._isDownloading = true;
                feature.startDownload();
            }
        }
    },

    cancelDownloadFeature: function () {
        cc.log('cancel download asset mgr');
        for (let nameFeature in this.arFeature) {
            let feature = this.arFeature[nameFeature];

            cc.log("AssetsManager ->cancel download ->", nameFeature, feature.isUpdating());
            if(feature && feature.isUpdating()) {
                feature.cancelDownload();
            }
        }
    },

    // endregion

    // region Attrs Download
    checkAvailable: function (nameFeature) {
        if(platformMgr.isWindow() && AssetsManager.ENABLE_TEST_LOCAL === false)
            return true;
        //cc.log("Check Available " + this.arFeature[nameFeature].isUpToDate());
        return (this._isGameManifestAvailable()
            && this.arFeature[nameFeature]
            && this.arFeature[nameFeature].isUpToDate())
    },

    checkDownloading: function (nameFeature) {
        let feature = this.arFeature[nameFeature];
        if(feature){
            return feature.isUpdating();
        }
        return false;
    },

    // endregion

    onReceiveEvent: function (event, dataEvent) {
        // switch (event) {
        //     case GameData.EVENT.OPEN_GAME:
        //     case GameData.EVENT.RECONNECT_ROOM_SOCKET:{
        //         cc.log("AssetsManager -> OPEN_GAME");
        //         this._isOpenGame = true;
        //         this._checkQueueDownload();
        //     }
        //
        // }
    },
})

// region Create instance

// use as priority
AssetsManager.TYPE_EVENT = 0;
AssetsManager.TYPE_TOURAMENT = 1;
AssetsManager.TYPE_VIDEO_POCKER = 1;

AssetsManager.ENABLE_TEST_LOCAL = false;

AssetsManager.EVENT = {
    FINISH_DOWNLOAD: "FINISH_DOWNLOAD_FEATURE"
}


AssetsManager._instance = null;
AssetsManager.getInstance = function () {
    if (!AssetsManager._instance) {
        AssetsManager._instance = new AssetsManager();
    }

    return AssetsManager._instance;
}

let assetMgr = AssetsManager.getInstance();
// end region