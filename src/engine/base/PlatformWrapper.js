/**
 * Created by KienVN on 10/23/2015.
 */
var fr = fr || {};
fr.platformWrapper = {
    init: function () {
        if (plugin.PluginManager == null) return false;
        if (fr.platformWrapper.pluginPlatform == null) {
            var pluginManager = plugin.PluginManager.getInstance();
            fr.platformWrapper.pluginPlatform = pluginManager.loadPlugin("PlatformWrapper");
        }
        return true;
    },

    // region Native Get
    getScriptVersion: function() {
        // phai su dung file project.manifest vi file version.manifest luon duoc down xuong de check co phien ban moi hay khong
        var manifest_path = jsb.fileUtils.fullPathForFilename("project.manifest");
        var manifestData = jsb.fileUtils.getStringFromFile(manifest_path);
        var version = "0";
        try{
            version = JSON.parse(manifestData).version;
        }catch(e){
            cc.log("Error getScriptVersion", e.toString());
        }
        return version;
    },

    getPhoneNumber: function () {
        if (this.pluginPlatform != null) {
            if(Config.ENABLE_CHEAT) cc.log("PlatfromWrapper: getPhoneNumber");
            return this.pluginPlatform.callStringFuncWithParam("getPhoneNumber");
        }

        return "";
    },

    getMailAccount: function () {
        if (this.pluginPlatform != null) {
            if(Config.ENABLE_CHEAT) cc.log("PlatfromWrapper: getMailAccount");
            return this.pluginPlatform.callStringFuncWithParam("getMailAccount");
        }
        return "";
    },

    getDeviceModel: function () {
        if (this.pluginPlatform != null) {
            if(Config.ENABLE_CHEAT) cc.log("PlatfromWrapper: getDeviceModel");
            return this.pluginPlatform.callStringFuncWithParam("getDeviceModel");
        }
        return "";
    },

    getAvailableRAM: function () {
        if (this.pluginPlatform != null) {
            return this.pluginPlatform.callIntFuncWithParam("getAvailableRAM");
        }
        return -1;
    },

    getVersionCode: function () {
        if (this.pluginPlatform != null) {
            return this.pluginPlatform.callIntFuncWithParam("getVersionCode");
        }
        return 0;
    },

    getOSVersion: function () {
        if (this.pluginPlatform != null) {
            if(Config.ENABLE_CHEAT) cc.log("PlatfromWrapper: getOSVersion");
            return this.pluginPlatform.callStringFuncWithParam("getOSVersion");
        }
        return "";
    },

    getConnectionStatus: function () {
        if (this.pluginPlatform != null) {
            return this.pluginPlatform.callIntFuncWithParam("getConnectionStatus");
        }
        return -1;
    },

    hasNetwork: function () {
        if (fr.platformWrapper.getConnectionStatus() == CONNECTION_STATUS.NO_NETWORK) {
            return false;
        } else return true;
    },

    getConnectionStatusName: function () {
        var connectionType = this.getConnectionStatus();
        switch (connectionType) {
            case 0:
                return "unknown";
            case 1:
                return "3g";
            case 2:
                return "wifi";
        }
        return "";
    },

    getOsName: function () {
        if (sys.platform == sys.WIN32) {
            return "Win32";
        }
        if (sys.platform == sys.ANDROID) {
            return "Android";
        }
        if (sys.platform == sys.IPAD || sys.platform == sys.IPHONE) {
            return "IOS";
        }
        if (sys.platform == sys.WP8) {
            return "WindowPhone8";
        }
        return "";
    },

    getClientVersion: function () {
        if (this.pluginPlatform != null) {
            if(Config.ENABLE_CHEAT) cc.log("PlatfromWrapper: getClientVersion");
            return this.pluginPlatform.callStringFuncWithParam("getAppVersion");
        }
        return "1.0";
    },

    getExternalDataPath: function () {
        if (this.pluginPlatform != null) {
            if(Config.ENABLE_CHEAT) cc.log("PlatfromWrapper: getExternalDataPath");
            return this.pluginPlatform.callStringFuncWithParam("getExternalDataPath");
        }
        return jsb.fileUtils.getWritablePath();
    },

    addNotify: function (notify) {
        if (this.pluginPlatform != null) {
            this.pluginPlatform.callFuncWithParam("addNotify",
                new plugin.PluginParam(plugin.PluginParam.ParamType.TypeString, JSON.stringify(notify)));
        }
    },

    showNotify: function () {
        if (this.pluginPlatform != null) {
            this.pluginPlatform.callFuncWithParam("showNotify", null);
        }
    },

    cancelAllNotification: function () {
        if (this.pluginPlatform != null) {
            this.pluginPlatform.callFuncWithParam("cancelAllNotification", null);
        }
    },

    getNotificationExtraData: function() {
        if (this.pluginPlatform != null) {
            if(Config.ENABLE_CHEAT) cc.log("PlatfromWrapper: getNotificationExtraData");
            return this.pluginPlatform.callStringFuncWithParam("getNotificationExtraData");
        }
        return "";
    },

    getAAID: function () {
        if (this.pluginPlatform != null) {
            if(Config.ENABLE_CHEAT) cc.log("PlatfromWrapper: getAAID");
            return this.pluginPlatform.callStringFuncWithParam("getAAID");
        }
        return "";
    },

    getDeviceID: function () {
        if (this.pluginPlatform != null) {
            if(Config.ENABLE_CHEAT) cc.log("PlatfromWrapper: getDeviceID");
            var deviceID = this.pluginPlatform.callStringFuncWithParam("getDeviceID");
            if (deviceID == "") {
                return this.getMailAccount();
            }
            return deviceID;
        }
        return "";
    },

    //accountType: google , zingme , facebook , zalo
    trackLoginGSN: function (_accountId, _accountType, _openAccount, _zingName) {
        if (this.pluginPlatform != null) {
            var data = {
                accountId: _accountId,
                accountType: _accountType,
                openAccount: _openAccount,
                zingName: _zingName
            };

            this.pluginPlatform.callFuncWithParam("trackLoginGSN",
                new plugin.PluginParam(plugin.PluginParam.ParamType.TypeString, JSON.stringify(data)));
        } else {
            cc.error("trackLoginGSN-pluginPlatform is null");
        }
    },

    isInstalledApp: function (url) {
        if (this.pluginPlatform != null) {
            return this.pluginPlatform.callIntFuncWithParam("isInstalledApp",
                new plugin.PluginParam(plugin.PluginParam.ParamType.TypeString, url));
        }
        return 0;
    },

    isInstalledFacebookApp: function () {
        if (this.isAndroid()) {
            return this.isInstalledApp("com.facebook.katana");
        } else if (this.isIOs()) {
            return true;
        }

        return false;
    },

    isInstalledZaloApp: function () {
        if (this.isAndroid()) {
            return this.isInstalledApp("com.zing.zalo");
        } else if (this.isIOs()) {
            return true;
        }
        return false;
    },

    getSimOperator: function () {
        if (this.isAndroid()) {
            if (this.pluginPlatform != null) {
                if(Config.ENABLE_CHEAT) cc.log("PlatfromWrapper: getSimOperator");
                return this.pluginPlatform.callStringFuncWithParam("getSimOperator").toLowerCase();
            }
        } else if (this.isIOs()) {
            return "";
        }

        return "";
    },

    getNetworkOperator: function () {
        if (this.isAndroid()) {
            if (this.pluginPlatform != null) {
                if(Config.ENABLE_CHEAT) cc.log("PlatfromWrapper: getNetworkOperator");
                return this.pluginPlatform.callStringFuncWithParam("getNetworkOperator").toLowerCase();
            }
        } else if (this.isIOs()) {
            return "";
        }

        return "";
    },

    getSimState: function () {
        if (this.isAndroid()) {
            if (this.pluginPlatform != null) {
                return this.pluginPlatform.callIntFuncWithParam("getSimState");
            }
        } else if (this.isIOs()) {
            return SIM_STATE.READY;
        }

        return 0;
    },

    getTotalUpdateAssetMemorySize: function () {
        if (this.isMobile()) {
            if (this.pluginPlatform != null) {
                return this.pluginPlatform.callIntFuncWithParam("getTotalUpdateAssetMemorySize");
            }
        }
        return -1;
    },

    getAvailableUpdateAssetMemorySize: function () {
        if (this.isMobile()) {
            if (this.pluginPlatform != null) {
                return this.pluginPlatform.callIntFuncWithParam("getAvailableUpdateAssetMemorySize");
            }
        }
        return -1;
    },

    getAvailableInternalMemorySize: function () {
        if (this.isAndroid()) {
            if (this.pluginPlatform != null) {
                return this.pluginPlatform.callIntFuncWithParam("getAvailableInternalMemorySize");
            }
        } else if (this.isIOs()) {
            return null;
        }

        return -1;
    },

    getTotalInternalMemorySize: function () {
        if (this.isAndroid()) {
            if (this.pluginPlatform != null) {
                return this.pluginPlatform.callIntFuncWithParam("getTotalInternalMemorySize");
            }
        }

        return -1;
    },

    getAvailableExternalMemorySize: function () {
        if (this.isAndroid()) {
            if (this.pluginPlatform != null) {
                return this.pluginPlatform.callIntFuncWithParam("getAvailableExternalMemorySize");
            }
        } else if (this.isIOs()) {
            return null;
        }

        return -1;
    },

    getTotalExternalMemorySize: function () {
        if (this.isAndroid()) {
            if (this.pluginPlatform != null) {
                return this.pluginPlatform.callIntFuncWithParam("getTotalExternalMemorySize");
            }
        } else if (this.isIOs()) {
            return null;
        }

        return 1;
    },

    getPackageName: function () {
        if(cc.sys.platform === cc.sys.WIN32){
            return Constant.PACKAGE_ANDROID_DEFAULT;
        }

        if (this.pluginPlatform) {
            if(Config.ENABLE_CHEAT) cc.log("PlatfromWrapper: getPackageName");
            return this.pluginPlatform.callStringFuncWithParam("getPackageName");
        }
        return null;
    },

    sendSMS: function (content, serviceNumber) {
        if (this.pluginPlatform != null) {
            var data = {
                message: content,
                recipent: serviceNumber
            };
            this.pluginPlatform.callFuncWithParam("sendMessage",
                new plugin.PluginParam(plugin.PluginParam.ParamType.TypeString, JSON.stringify(data)));
        }
    },

    isAndroid: function () {
        return sys.os === sys.OS_ANDROID;
    },

    isIOs: function () {
        return sys.os === sys.OS_IOS;
    },

    isMobile: function () {
        return sys.os === sys.OS_ANDROID || sys.os === sys.OS_IOS || sys.os === sys.OS_WP8 || sys.os === sys.OS_WINRT;
    },

    isEmulator : function () {
        return false;
    },

    // add zingplay
    getRefer : function () {
        if (this.pluginPlatform != null) {
            if(Config.ENABLE_CHEAT) cc.log("PlatfromWrapper: getRefer");
            return this.pluginPlatform.callStringFuncWithParam("getRefer");
        }
        return "";
    },

    getTrackerName: function() {
        if(this.pluginPlatform != null) {
            if(Config.ENABLE_CHEAT) cc.log("PlatfromWrapper: getTrackerName");
            return this.pluginPlatform.callStringFuncWithParam("getMetaDataValue",
                new plugin.PluginParam(plugin.PluginParam.ParamType.TypeString,"GSNTrackerAppName"));
        }
        return "";
    },

    getGSNTrackerPartner : function () {
        if (this.pluginPlatform != null) {
            if(Config.ENABLE_CHEAT) cc.log("PlatfromWrapper: getGSNTrackerPartner");
            return this.pluginPlatform.callStringFuncWithParam("getThirdPartySource");
        }
        return "";
    },

    openURL : function (url) {
        if (this.pluginPlatform != null) {
            this.pluginPlatform.callFuncWithParam("openURL",
                new plugin.PluginParam(plugin.PluginParam.ParamType.TypeString, url));
        }
    },

    getVersionName : function () {
        if (this.pluginPlatform != null) {
            if(Config.ENABLE_CHEAT) cc.log("PlatfromWrapper: getVersionName");
            return this.pluginPlatform.callStringFuncWithParam("getAppVersion");
        }
        return "w1";
    },

    getGameVersion : function () {
        if (this.pluginPlatform != null) {
            if(Config.ENABLE_CHEAT) cc.log("PlatfromWrapper: getGameVersion");
            return this.pluginPlatform.callStringFuncWithParam("getGameVersion");
        }
        return "";
    },

    logJSError: function(fName, line, msg, jsVersion) {
        // jsb.reflection.callStaticMethod("com.gsn.tracker.GSNTracker", "logJSError", "(Ljava/lang/String;Ljava/lang/String;Ljava/lang/String;Ljava/lang/String;)V",
        //     fName + "", line + "", msg + "", jsVersion);
        if (this.pluginPlatform != null) {
            var data = {
                Param1: fName,
                Param2: line,
                Param3: msg,
                Param4: jsVersion
            };

            this.pluginPlatform.callFuncWithParam("logJSError",
                new plugin.PluginParam(plugin.PluginParam.ParamType.TypeStringMap, data));
        } else {
            cc.error("logJSError-pluginPlatform is null");
        }
    },

    logJSLoginFail: function(loginType, errorType, accountName, message) {
        // jsb.reflection.callStaticMethod("com.gsn.tracker.GSNTracker", "logLoginFail", "(Ljava/lang/String;Ljava/lang/String;Ljava/lang/String;Ljava/lang/String;)V",
        //     loginType + "", errorType + "", accountName + "", message);
        if (this.pluginPlatform != null) {
            var data = {
                Param1: loginType,
                Param2: errorType,
                Param3: accountName,
                Param4: message
            };

            this.pluginPlatform.callFuncWithParam("logLoginFail",
                new plugin.PluginParam(plugin.PluginParam.ParamType.TypeStringMap, data));
        } else {
            cc.error("logJSLoginFail-pluginPlatform is null");
        }
    },

    logScreenView: function(screenView, extra) {
        if (this.pluginPlatform != null) {
            var data = {
                screenView: screenView,
                extra: extra,
            };

            this.pluginPlatform.callFuncWithParam("logScreenView",
                new plugin.PluginParam(plugin.PluginParam.ParamType.TypeString, JSON.stringify(data)));
        } else {
            cc.error("logScreenView-pluginPlatform is null");
        }
    },

    setKeyPref: function(key, value) {
        if (this.pluginPlatform != null) {
            var data = {
                key: key,
                value: value
            };
            this.pluginPlatform.callFuncWithParam("setKeyPref",
                new plugin.PluginParam(plugin.PluginParam.ParamType.TypeString, JSON.stringify(data)));
        } else {
            cc.error("setKeyPref-pluginPlatform is null");
        }
    },

    getKeyPref: function(key) {
        if (this.pluginPlatform != null) {
            if(Config.ENABLE_CHEAT) cc.log("PlatfromWrapper: getKeyPref");
            return this.pluginPlatform.callStringFuncWithParam("getKeyPref",
                new plugin.PluginParam(plugin.PluginParam.ParamType.TypeString, key));

        } else {
            cc.error("getKeyPref-pluginPlatform is null");
        }
    },

    share: function(title, msg) {
        if (this.pluginPlatform != null) {
            var data = {
                title: title,
                msg: msg
            };

            var jsonData = JSON.stringify(data);
            this.pluginPlatform.callBoolFuncWithParam("share",
                new plugin.PluginParam(plugin.PluginParam.ParamType.TypeString, jsonData));
        } else {
            cc.error("share-pluginPlatform is null");
        }
    },

    copy2Clipboard: function(label, text) {
        if (this.pluginPlatform != null) {
            var data = {
                label: label,
                text: text
            };
            this.pluginPlatform.callBoolFuncWithParam("copy2Clipboard",
                new plugin.PluginParam(plugin.PluginParam.ParamType.TypeString, JSON.stringify(data)));
        } else {
            cc.error("copy2Clipboard-pluginPlatform is null");
        }
    },

    checkPermission: function(permission) {
        if (this.pluginPlatform != null) {
            return this.pluginPlatform.callBoolFuncWithParam("checkPermission",
                new plugin.PluginParam(plugin.PluginParam.ParamType.TypeString, permission));
        } else {
            cc.error("checkPermission-pluginPlatform is null");
        }
        return false;
    },

    canRequestPermission: function(permission) {
        if (this.pluginPlatform != null) {
            return this.pluginPlatform.callBoolFuncWithParam("canRequestPermission",
                new plugin.PluginParam(plugin.PluginParam.ParamType.TypeString, permission));
        } else {
            cc.error("canRequestPermission-pluginPlatform is null");
        }
        return false;
    },

    requestPermissions: function(msg, title, btnYes, btnNo, permission) {
        if (this.pluginPlatform != null) {
            var data = {
                msg: msg,
                title: title,
                btnYes: btnYes,
                btnNo: btnNo,
                permission: permission
            };
            this.pluginPlatform.callFuncWithParam("requestPermissions",
                new plugin.PluginParam(plugin.PluginParam.ParamType.TypeString, JSON.stringify(data)));
        } else {
            cc.error("requestPermissions-pluginPlatform is null");
        }
    },
    // endregion

    // region JS Function
    openURL : function (url) {
        cc.sys.openURL(url);
    },

    openFacebook : function (url) {
        if(cc.sys.os === cc.sys.OS_IOS){
            fr.platformWrapper.openURL(url);
            return;
        }

        var fbWebUrl = url;
        var fbAppUrl = "fb://";
        if(cc.sys.os === cc.sys.OS_ANDROID)
            fbAppUrl += "facewebmodal/f?href=";
        if(cc.sys.os === cc.sys.OS_IOS)
            fbAppUrl += "profile/";
        fbAppUrl += url;

        if (cc.sys.os === cc.sys.OS_WINDOWS || !cc.sys.isNative){
            fr.platformWrapper.openURL(fbWebUrl);
            return;
        }

        if(!cc.Application.getInstance().openURL(fbAppUrl)) {
            cc.Application.getInstance().openURL(fbWebUrl);
        }
    },
    // endregion

    hapticTouch: function (type = 0) {
        if (this.pluginPlatform != null) {
            this.pluginPlatform.callFuncWithParam(
                "hapticTouch",
                new plugin.PluginParam(
                    plugin.PluginParam.ParamType.TypeInt,
                    type
                )
            );
        }

        if (Utility.isAndroid()) {
            cc.Device.vibrate(0.05 + (type + 1));
        }
    },

    isIOSHaveNotch: function () {
        // // test win32:
        // if (cc.sys.platform == cc.sys.WIN32) return true;
        //return true;
        return cc.sys.platform == cc.sys.IPHONE && cc.winSize.height / cc.winSize.width >= 2;
    }
};

var SIM_STATE = {
    UNKNOWN: 0,
    ABSENT: 1,
    PIN_REQUIRED: 2,
    PUK_REQUIRED: 3,
    NETWORK_LOCKED: 4,
    READY: 5,
};

var CONNECTION_STATUS = {
    NO_NETWORK: 0,
    CELULAR_DATA: 1,
    WIFI: 2
};

let HAPTIC_TOUCH_TYPE = {
    LIGHT: 0,
    MEDIUM: 1,
    HEAVY: 2,
    SOFT: 3,
    RIGID: 4
};