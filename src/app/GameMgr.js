
let GameMgr = cc.Class.extend({

    ctor: function () {
        this.nTimeStart = new Date().getTime();
    },

    initGame: function () {
        JSLog.i(">>initGame");

        this.initRefactor();
        // this.initView();
        // assetMgr.init();
        // this.initSearchPath();
        // this.initCheat();
        // this.initVersion();
        this.initFramework();
        this.initModuleMgr();
        fr.Sound.init();
        this.startGame();
    },

    startGame: function () {
        JSLog.i(">>startGame");
        // this.requestServices();
        // loginMgr.openLaunching();
        CoreGame.BlockerFactory.preloadAllConfigs();
        cc.spriteFrameCache.addSpriteFrames("res/modules/game/board/art.plist", "res/modules/game/board/art.png");
        // var scene = new CoreGame.TestScene();
        // cc.director.runScene(scene);

        // userMgr.getData().initResources();
        // cc.director.runScene(new GameBoardBg());
        // sceneMgr.openScene("GameBoardBg");
        LoginMgr.start();
        // fr.OnStartGameSupporter.init();
        // fr.OnStartGameSupporter.startGame();
    },

    prepaidLogin: function () {
        JSLog.i(">>startLogin");
        try {
            if (sceneMgr.isMainLayer(LaunchingScene.className)) {
                sceneMgr.getMainLayer().finishLoading();
            }
            else {
                gameMgr.startLogin();
            }
        }
        catch (e) {
            gameMgr.startLogin();
        }
    },

    startLogin: function () {
        loginMgr.openLogin();
    },

    // region Init
    // init framework from native code Android-iOS
    initFramework: function () {
        // fr.google.init();
        // fr.facebook.init();
        fr.platformWrapper.init();
        // fr.fcm.init();
        // fr.paymentInfo.init();
        // fr.tracker.enableLogErrorJSNew();
        //
        // fr.firebaseAnalytic.init();
        //
        // fr.crashLytics.init();
        //
        // if (portalMgr.isPortal()) {
        //     fr.portalState.init();
        // }
        //
        // if(platformMgr.isIOS()) {
        //     fr.iosiap.init();
        //     fr.appleid.init();
        // }
        //
        // assetMgr.init();
    },

    initRefactor: function () {
        // update restartVM
        const saveRestart = cc.game.restart;
        cc.game.restart = function () {
            gameMgr.onRestartVM();
            saveRestart();
        }

        // log for dragonebones + spines
        if (Config.ENABLE_CHEAT) {
            db.DBCCFactory.getInstance()._old_loadDragonBonesData = db.DBCCFactory.getInstance().loadDragonBonesData;
            db.DBCCFactory.getInstance().loadDragonBonesData = function () {
                cc.log("[DEBUG]: db.DBCCFactory.loadDragonBonesData " + JSON.stringify(arguments));

                if (!jsb.fileUtils.isFileExist(arguments[0])) {
                    throw new Error("File's not exist!");
                }

                return db.DBCCFactory.getInstance()._old_loadDragonBonesData.apply(db.DBCCFactory.getInstance(), arguments);
            }

            db.DBCCFactory.getInstance()._old_loadTextureAtlas = db.DBCCFactory.getInstance().loadTextureAtlas;
            db.DBCCFactory.getInstance().loadTextureAtlas = function () {
                cc.log("[DEBUG]: db.DBCCFactory.loadTextureAtlas " + JSON.stringify(arguments));

                if (!jsb.fileUtils.isFileExist(arguments[0])) {
                    throw new Error("File's not exist!");
                }

                return db.DBCCFactory.getInstance()._old_loadTextureAtlas.apply(db.DBCCFactory.getInstance(), arguments);
            }

            sp._old_SkeletonAnimation = sp.SkeletonAnimation;
            sp.SkeletonAnimation = function () {
                cc.log("[DEBUG]: sp.SkeletonAnimation " + JSON.stringify(arguments));

                if (!jsb.fileUtils.isFileExist(arguments[0]) || !jsb.fileUtils.isFileExist(arguments[1])) {
                    throw new Error("File's not exist!");
                }

                return sp._old_SkeletonAnimation.apply(sp._old_SkeletonAnimation, arguments);
            }
        }
    },

    initView: function () {
        cc.director.setDisplayStats(false);

        cc.view.enableRetina(true);
        cc.view.adjustViewPort(true);
        cc.view.resizeWithBrowserSize(true);

        viewSizeMgr.init();

        let frameSize = cc.view.getFrameSize();
        let designSize = cc.size(Constant.WIDTH, Constant.HEIGHT);
        let ratio = frameSize.width / frameSize.height;

        JSLog.i("FrameSize " + JSON.stringify(frameSize) + " -> " + ratio);

        if (ratio > 1.5) {
            cc.view.setDesignResolutionSize(designSize.width, designSize.height, cc.ResolutionPolicy.FIXED_HEIGHT);
        }
        else {
            cc.view.setDesignResolutionSize(designSize.width, designSize.height, cc.ResolutionPolicy.SHOW_ALL);
        }

        // view event
        cc.eventManager.addCustomListener(cc.game.EVENT_HIDE, gameMgr.onPauseGame.bind(gameMgr));
        cc.eventManager.addCustomListener(cc.game.EVENT_SHOW, gameMgr.onResumeGame.bind(gameMgr));
    },

    initSearchPath: function () {
        const arPath = [
            "/",
            "res",
            "res/common",
            "res/Board",
            "res/Modules",
            "res/Lobby",
            "res/Event",
        ];
        const downloadPath = fr.NativeService.getFolderUpdateAssets();
        JSLog.i("GameMgr::addSearchPath");
        for (let path of arPath) {
            JSLog.i("-->" + path);
            JSLog.i("-->" + downloadPath + "/" + path);

            jsb.fileUtils.addSearchPath(path);
            jsb.fileUtils.addSearchPath(downloadPath + "/" + path, true);
        }
    },

    initCheat: function () {
        // reset cheat and check from cdn
        Config.ENABLE_CHEAT = false;
        Config.ENABLE_DEV = false;
        const CDN_PRIVATE = "portal-gsn.mto.zing.vn";
        try {
            let verManfiest = gameMgr.getVersionManifest();
            let url = verManfiest.packageUrl;
            if (url.indexOf(CDN_PRIVATE) > -1) {
                Config.ENABLE_CHEAT = Config.ENABLE_DEVICE_CHEAT;
            }
            else {
                Config.ENABLE_CHEAT = false;
            }
        }
        catch (e) {
            if (cc.sys.os === cc.sys.OS_WINDOWS)
                Config.ENABLE_CHEAT = Config.ENABLE_W32_CHEAT;
            else
                Config.ENABLE_CHEAT = false;
        }
    },

    initVersion: function () {
        // JS Version
        this.jsVersion = "";

        try {
            let verManifest = gameMgr.getVersionManifest();
            this.jsVersion = verManifest.version + "";
            JSLog.i("#GameMgr::jsVersion from manifest " + this.jsVersion);

        } catch (e) {
            this.jsVersion = "";
            JSLog.i("#GameMgr::jsVersion cannot get from manifest " + this.jsVersion);
        }

        if (this.jsVersion === undefined || this.jsVersion == null || this.jsVersion == "") {
            this.jsVersion = "0";
            JSLog.i("#GameMgr::jsVersion error to default " + this.jsVersion);
        }
    },

    initModuleMgr: function () {
        BaseMgr.initAll();
    },
    // endregion

    // region API Services
    requestServices: function () {
        setTimeout(gameMgr.responseServices.bind(this), 800);
    },

    responseServices: function (data) {
        // finish loading
        this.prepaidLogin();
    },
    // endregionL

    // region Utils
    getDeviceID: function () {
        let deviceId = "";

        if (Config.ENABLE_CHEAT && CheatCenter.IS_FAKE_UID) {
            deviceId = StorageUtil.getString(CHEAT_DEVICE_ID, "");
            JSLog.i(">>Fake: " + deviceId);
        }

        if (!deviceId) {
            if (platformMgr.isWindow()) {
                deviceId = StorageUtil.getString("_w32_did_");
                if (!deviceId) {
                    deviceId = StringUtility.subRandomString(md5("w32" + new Date().getTime()), 12);
                    StorageUtil.setString("_w32_did_", deviceId);
                }
                JSLog.i(">>Window " + deviceId);
            }
            else {
                deviceId = fr.platformWrapper.getDeviceID();
                JSLog.i(">>Device " + deviceId);
            }
        }

        JSLog.i("GameMgr::getDeviceID " + deviceId);
        return deviceId;
    },

    getAppVersion: function () {
        return "0";
    },

    getJSVersion: function () {
        if (!this.jsVersion) {
            cc.log("#GameMgr::jsVersion init from call jsVersion");
            this.initVersion();
        }

        return parseInt(this.jsVersion);
    },

    getVersionString: function () {
        let version = "release";
        if (Config.ENABLE_CHEAT) version = "dev";

        try {
            version += "." + platformMgr.getPlatform().CODE.toLowerCase();
            version += "." + loginMgr.getServer().TYPE.toLowerCase();
        }
        catch (e) {

        }

        version += "." + fr.platformWrapper.getVersionName();
        version += "." + fr.platformWrapper.getVersionCode();
        version += "." + gameMgr.getJSVersion();
        return version;
    },

    getVersionManifest: function () {
        const PRJ_MANIFEST = "/project.manifest";
        const PRJ_DATA = "/project.dat";

        try {
            let project_manifest_path = fr.NativeService.getFolderUpdateAssets() + PRJ_MANIFEST;
            let manifestData = jsb.fileUtils.getStringFromFile(project_manifest_path);
            if (!manifestData) {    // ios
                let project_manifest_path_ios = fr.NativeService.getFolderUpdateAssets() + PRJ_DATA;
                manifestData = jsb.fileUtils.getStringFromFile(project_manifest_path_ios);
            }
            return JSON.parse(manifestData);
        }
        catch (e) {
            JSLog.e("")
        }
    },

    isDayInstall: function () {
        let installDay = gameMgr.getInstallDate();
        let curDay = TimeUtils.getCurrentDMY();

        return (installDay == curDay);
    },

    getInstallDate: function () {
        let strDate = StorageUtil.getString("game_install_date");
        if (!strDate) {
            strDate = TimeUtils.getCurrentDMY();
            StorageUtil.setString("game_install_date", TimeUtils.getCurrentDMY());
        }

        JSLog.i(">>Install Date: " + strDate);
        return strDate;
    },

    getCountryCode: function () {
        return "";
    },

    getAppSource: function () {
        return "";
    },

    getTrackerName: function () {
        return "aa";
    },

    getTrackerPartner: function () {
        return "aa";
    },

    getPackageName: function () {
        let pkg = fr.platformWrapper.getPackageName();
        if (!pkg) {
            pkg = Constant.PACKAGE_ANDROID_DEFAULT;
        }
        return pkg;
    },

    getTotalTimeInGame: function () {
        return parseInt((new Date().getTime() - this.nTimeStart) / 1000);
    },

    isWideScreen: function () {
        let frameSize = cc.view.getFrameSize();
        let ratio = frameSize.width / frameSize.height;
        return (ratio > 2);
    },
    // endregion

    // region Function
    openURL: function (url) {

    },

    openFacebook: function (url) {

    },
    // endregion

    // region Game Action
    onPauseGame: function () {
        logMgr.crashLog(LogMgr.CRASH.CLIENT, "onPauseGame");
        this.timeHideGame = Date.now();

        logMgr.journeySendLog();
        dispatcherMgr.dispatchEvent(GameMgr.EVENT.PAUSE_GAME);
    },

    onResumeGame: function () {
        let deltaResumeTime = (Date.now() - this.timeHideGame) / 1000;
        logMgr.crashLog(LogMgr.CRASH.CLIENT, "onResumeGame " + deltaResumeTime + "s");

        dispatcherMgr.dispatchEvent(GameMgr.EVENT.RESUME_GAME);
    },

    onUpdateScene: function (dt) {
        BaseMgr.update(dt);
    },

    onEnterScene: function () {
        JSLog.i(">>onEnterScene " + Config.ENABLE_CHEAT);
    },

    onRestartVM: function () {
        logMgr.crashLog(LogMgr.CRASH.CLIENT, "Restart VM");

        assetMgr.cancelDownloadFeature();
    }
    // endregion
});

GameMgr._inst = null;
GameMgr.instance = function () {
    if (!GameMgr._inst) {
        GameMgr._inst = new GameMgr();
    }
    return GameMgr._inst;
}
let gameMgr = GameMgr.instance();

// region Event
GameMgr.EVENT = GameMgr.EVENT || {};
GameMgr.EVENT.OPEN_GUI = "OPEN_GUI";
GameMgr.EVENT.OPEN_GAME = "OPEN_GAME";
GameMgr.EVENT.CLOSE_ALL_POPUP = "CLOSE_ALL_POPUP";
GameMgr.EVENT.RECONNECT_ROOM_SOCKET = 'RECONNECT_ROOM_SOCKET';

GameMgr.EVENT.PAUSE_GAME = "GameMgr.EVENT.PAUSE_GAME";
GameMgr.EVENT.RESUME_GAME = "GameMgr.EVENT.RESUME_GAME";
// endregion
