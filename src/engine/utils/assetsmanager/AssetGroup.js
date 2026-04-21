let AssetGroup = cc.Class.extend({
    ctor: function (storagePath, manifestPath, nameFeature, gameVersion) {
        this._storagePath = storagePath;
        this._localManifestPath = manifestPath;
        this._isUpdating = false;
        this._am = null;
        this.__failCount = 0;
        this._gameVersion = gameVersion;
        this._nameFeature = nameFeature;
        this.priority = 0;

        cc.log("AssetGroup attrs", JSON.stringify(this));
    },

    /**
     * @param {AssetGroupListener} listener
     */
    setListener: function (listener) {
        this.listener = listener;
    },

    isUpToDate: function () {
        if(this._am && this._am.getLocalManifest().isLoaded()){
            return (this._am.getLocalManifest().getVersion() == this._gameVersion);
        }
        else {
            return false;
        }
    },

    isUpdating: function () {
        return this._isUpdating;
    },

    getState: function () {
        cc.log("is up to date", this.isUpToDate());
        if(this.isUpToDate()){
            return jsb.AssetsManager.UP_TO_DATE;
        }
        else if(this._am) {
            return this._am.getState();
        }
        else {
            return jsb.AssetsManager.NOT_INIT;
        }
    },

    startDownload: function () {
        cc.log("start download ", this._nameFeature, this._isUpdating);
        if(this._isUpdating) return;

        this._isUpdating = true;
        if(this._am){
            this._am.release();
            this._am = null;
        }

        this._am = new jsb.AssetsManager(this._localManifestPath, this._storagePath);
        this._am.retain();

        if (!this._am.getLocalManifest().isLoaded())
        {
            cc.log("Fail to update assets, step skipped.");
            this._finishDownload();
        }
        else
        {
            if(this._isNeedDownload(this._am.getLocalManifest())){
                cc.log("NEED DOWNLOAD " + this._nameFeature);
                let listener = new jsb.EventListenerAssetsManager(this._am, this._cb.bind(this));
                cc.eventManager.addListener(listener, 1);
                this._am.update();
            }
            else {
                cc.log("DON'T NEED DOWNLOAD " + this._nameFeature);
                // TODO call back
                this._finishDownload();
            }
        }
    },

    cancelDownload: function () {
        cc.log("cancel download -> ", this._nameFeature);
        if(this._am) {
            this._am.saveDownloadState();
            this._am.cancelDownload();
        }
    },

    _cb: function(event) {
        switch (event.getEventCode())
        {
            case jsb.EventAssetsManager.ERROR_NO_LOCAL_MANIFEST: {
                cc.log("No local manifest file found, skip assets update.");
                this._finishDownload();
                break;
            }
            case jsb.EventAssetsManager.UPDATE_PROGRESSION: {
                let _percentByFile = event.getPercentByFile();
                let msg = event.getMessage();
                if (msg) {
                    cc.log("UPDATE_PROGRESSION -> ", msg);
                }

                if (this.listener && this.listener.onDownloadUpdateProgression) {
                    // cc.log("call back update ", _percentByFile);
                    this.listener.onDownloadUpdateProgression(_percentByFile, this._nameFeature);
                }
                break;
            }
            case jsb.EventAssetsManager.ERROR_DOWNLOAD_MANIFEST:
            case jsb.EventAssetsManager.ERROR_PARSE_MANIFEST: {
                cc.log("Fail to download manifest file, update skipped.");
                this._finishDownload();
                break;
            }
            case jsb.EventAssetsManager.UPDATE_FINISHED:
            case jsb.EventAssetsManager.ALREADY_UP_TO_DATE:
                cc.log("Update finished. " + event.getMessage());
                this._finishDownload();
                break;
            case jsb.EventAssetsManager.UPDATE_FAILED: {
                cc.log("Update failed. " + event.getMessage());

                this.__failCount++;

                // re-try download failed asset again (max 5 lan)
                if (this.__failCount < 5) {
                    this._am.downloadFailedAssets();
                } else {
                    this._finishDownload();
                }
                break;
            }
            case jsb.EventAssetsManager.ERROR_UPDATING: {
                // push asset to failed list
                cc.log("Asset update error: " + event.getAssetId() + ", " + event.getMessage());
                break;
            }
            case jsb.EventAssetsManager.ERROR_DECOMPRESS: {
                // push asset to failed list
                cc.log(event.getMessage());
                break;
            }
            default:
                break;
        }
    },

    // call when download finish(up-to-date, not download, ...)
    _finishDownload: function () {
        this._isUpdating = false;
        assetMgr._finishDownloadFeature(this._nameFeature);

        if (this.isUpToDate()) {
            try {
                if(this.listener && this.listener.onDownloadFinish)
                    this.listener.onDownloadFinish(this._nameFeature);
            }
            catch (e) {
                cc.log("Error: " + e.stack);
            }
        }
        else {
            if(this.listener && this.listener.onDownloadFail)
                this.listener.onDownloadFail(this._nameFeature);
        }
    },

    _isNeedDownload: function (localManifest) {
        cc.log("_isNeedDownload",
            localManifest.getVersion(),
            this._gameVersion,
            localManifest.getVersion() < this._gameVersion);

        return (localManifest.getVersion() < this._gameVersion);
    }
})

const AssetGroupListener = cc.Class.extend({

    onDownloadFinish: function (nameFeature) {

    },

    onDownloadFail: function (nameFeature) {

    },

    onDownloadUpdateProgression: function (percent, nameFeature) {

    }
})