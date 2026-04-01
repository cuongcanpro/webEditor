var gv = gv || {};

var JS_VERSION_STATUS = {
    UP_TO_DATE: 1,
    NEED_UPDATE: -1,
    UNKNOWN: 0
};


gv.onOffMgr = {
    init: function () {
        if (gv.isOnPortal){
            this.offlineOnStart = false;
        }
        else{
            // only for standalone version
            this.offlineOnStart = cc.sys.localStorage.getItem(KeyStorage.IS_OFFLINE_SESSION) == "1";
        }
        this.signalVersionStatusChange = new signals.Signal();

        if (!this.offlineOnStart){
            // flow login tải file -> set = version hiện tại
            this._setCheckVersion(Utility.getJSVersionNum());
            this.jsVersionStatus = JS_VERSION_STATUS.UP_TO_DATE;
            this.lastTimeDeviceUpToDate = Date.now();
        }
        else{
            var versionCheck = this._getVersionFromFileCheck();
            this._setCheckVersion(versionCheck);
            this.jsVersionStatus = JS_VERSION_STATUS.UNKNOWN;
        }
    },

    addCallBackStatusJsVersionChanged: function(listener, target){
        this.signalVersionStatusChange.add(listener, target);
    },
    getJsVersionStatus: function(){
        return this.jsVersionStatus;    // instance of JS_VERSION_STATUS
    },

    updateStatusJsVersion: function(status){
        if (this.jsVersionStatus != status){
            cc.log("updateStatusJsVersion:", status);
            this.jsVersionStatus = status;
            this.signalVersionStatusChange.dispatch(status);
        }
    },

    isOfflineOnStart: function () {
        return this.offlineOnStart;
    },

    isMustUpdateVersion: function(){
        return false;
        if (cc.sys.platform == cc.sys.WIN32) return false;
        if (gv.isOnPortal) return false;
        cc.log("game status: " + this.jsVersionStatus);
        // standalone version:
        if (this.jsVersionStatus == JS_VERSION_STATUS.NEED_UPDATE){
            return true;
        }
        else if(this.jsVersionStatus == JS_VERSION_STATUS.UNKNOWN){
            return this.offlineOnStart;
        }
        else if(this.jsVersionStatus == JS_VERSION_STATUS.UP_TO_DATE){
            return false;
        }
    },

    isCanSwitchToOnline: function(){
        var hasInternet = fr.platformWrapper.getConnectionStatus() > 0;
        var isPlayingInGame = cc.director.getRunningScene().getName() == GameScene.MAIN_SCENE;
        var mustUpdate = this.isMustUpdateVersion();
        cc.log ("onOffMgr isCanSwitchToOnline", hasInternet, !isPlayingInGame, !mustUpdate);
        return hasInternet && !isPlayingInGame && !mustUpdate;
    },

    checkJsVersionStatus: function(isForce){
        // cc.log("checkv status");
        if (gv.isOnPortal){
            this.updateStatusJsVersion(JS_VERSION_STATUS.UP_TO_DATE);
            return;
        }
        // status need update thì chỉ có thể tải lại file
        if (this.jsVersionStatus == JS_VERSION_STATUS.NEED_UPDATE){
            return;
        }
        // curVersion nhỏ hơn thì 100% phải update
        var curVersion = Utility.getJSVersionNum();
        if (curVersion < this.latestVersionChecked){
            this.updateStatusJsVersion(JS_VERSION_STATUS.NEED_UPDATE);
            return;
        }
        // check xem cần tải version về ko
        if (isForce || this._isNeedDownLoadVersionFile()){
            this._downloadJsVersionFile(this._onDownloadVersionFileFinish.bind(this));
        }
    },

    showAlertOffline: function(){
        cc.log("showAlert Offline");
        let curScene = cc.director.getRunningScene();
        if (curScene == null)
            return;

        var isPlayingInGame = cc.director.getRunningScene().getName() == GameScene.MAIN_SCENE;
        if (isPlayingInGame){
            return; // do nothing
        }

        var hasInternet = fr.platformWrapper.getConnectionStatus() > 0;
        if (!hasInternet){
            GUIAlert.notifyById(ALERT_TYPE.NO_INTERNET);
            return;
        }

        if(this.isMustUpdateVersion()){
            this.showAskRestartGame();
            return;
        }

        this.showAskReconnectGame();
    },

    showAskRestartGame: function(){
        gv.alert.showOKCustom(
            fr.Localization.text("ALERT_TITLE"),
            fr.Localization.text("lang_restart_to_online_ask_other"),
            null, null
        );

        cc.log("showAskRestartGame");
        // if (cc.sys.platform == cc.sys.ANDROID){
        //     var contentText, confirmText, funcOnConfirm;
        //     contentText = fr.Localization.text("lang_restart_to_online_ask_android");
        //     confirmText = fr.Localization.text("lang_btn_restart");
        //     funcOnConfirm = function () {
        //         fr.NativePortal.getInstance().restartVM();   // todo fix bug c++
        //     }
        //     var cancelText = fr.Localization.text("lang_btn_cancel");
        //     gv.alert.showTwoOptions(contentText, confirmText, cancelText,funcOnConfirm, function(){} );
        //
        // }
        // else{
        //     gv.alert.showOKCustom(
        //         fr.Localization.text("ALERT_TITLE"),
        //         fr.Localization.text("lang_restart_to_online_ask_other"),
        //         null, null
        //     );
        // }
    },
    showAskReconnectGame: function(){
        return;
        gv.alert.showTwoOptions(fr.Localization.text("lang_switch_to_online_ask"),
            fr.Localization.text("lang_btn_reconnect"),
            fr.Localization.text("lang_btn_cancel"),
            function () {
                gv.gameClient.retryConnect();
            },
            function () {
                // cancel
            }
        );
        cc.log("showAskReconnectGame");
    },


    _getCheckVersionFileStoragePath: function(){
        if (cc.sys.platform != cc.sys.WIN32) {
            return "match3/checkVersion/ver.json";
        }
        else {
            return fr.NativeService.getFolderUpdateAssets() + "/match3/checkVersion/ver.json";
        }
    },
    _getVersionFromFileCheck: function(){
        var checkVersionPath = this._getCheckVersionFileStoragePath();
        if (jsb.fileUtils.isFileExist(checkVersionPath)){
            return cc.loader.getRes(checkVersionPath)["version"];
        }
        return 0;
    },
    _setCheckVersion: function(versionCode){
        cc.log("_setCheckVersion", versionCode);
        this.latestVersionChecked = versionCode;
    },
    _isNeedDownLoadVersionFile: function(){
        if (this._isDownloadingVersionFile){
            return false;
        }

        // chua tai dc version
        if (this.latestVersionChecked == 0){
            return true;
        }
        // qua timeout -> refresh
        var minTimeCheckDownload = 3*60;    // 3 phut
        if ( (Date.now() - this.lastTimeDeviceUpToDate)/1000 > minTimeCheckDownload){
            return true;
        }

        return false;
    },
    _downloadJsVersionFile: function (downloadFinishCallback) {
        let cdnLink = Utility.getCdnLink();
        // test win32:
        if (cc.sys.platform == cc.sys.WIN32){
            cdnLink = "portal-gsn.mto.zing.vn/match3_dev";
        }

        if (cdnLink != ""){
            this._isDownloadingVersionFile = true;
            var onFileDownloadFinish = function() {downloadFinishCallback(true);};    // success
            var onFileDownloadError = function() {downloadFinishCallback(false);};    // failed
            var versionFileUrl = Utility.getCdnLink() +"/version.manifest";
            fr.download.downloadFile(versionFileUrl, this._getCheckVersionFileStoragePath(),"",
                function(result) {
                    if (result == -1) {onFileDownloadFinish();}
                    else if (result == -2) {onFileDownloadError();}
                }
            );
        }
        else{
            downloadFinishCallback(false);
        }

    },
    _onDownloadVersionFileFinish: function (isSuccess) {
        this._isDownloadingVersionFile = false;
        if (isSuccess){
            cc.log("rev version status");
            var version = this._getVersionFromFileCheck();
            this._setCheckVersion(version);
            var needUpdate = version > Utility.getJSVersionNum();
            if (needUpdate){
                this.updateStatusJsVersion(JS_VERSION_STATUS.NEED_UPDATE);
            }
            else{
                this.updateStatusJsVersion(JS_VERSION_STATUS.UP_TO_DATE);
                this.lastTimeDeviceUpToDate = Date.now();
            }
        }
        else{
            this.updateStatusJsVersion(JS_VERSION_STATUS.UNKNOWN);
        }
    }
}