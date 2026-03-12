/**
 * Created by KienVN on 10/23/2015.
 */

fr.platformWrapper = {
    init: function () {

        cc.log("Init Platform Wrapper");
        if (plugin.PluginManager == null) return false;
        cc.log("has PluginManager");
        if (fr.platformWrapper.pluginPlatform == null) {
            cc.log("Init Platform Wrapper null");
            var pluginManager = plugin.PluginManager.getInstance();
            fr.platformWrapper.pluginPlatform = pluginManager.loadPlugin("PlatformWrapper");
        }

        this.test();
    },
    test: function () {
        cc.log("test platformWrapper: ", this.getPhoneNumber(),
            this.getMailAccount(),
            this.getDeviceModel(),
            this.getAvailableRAM(),
            this.getVersionCode(),
            this.getOSVersion(),
            this.getConnectionStatus(),
            this.getExternalDataPath(),
            this.getPackageName()
        );
    },
    isIOSHaveNotch: function () {
        // // test win32:
        // if (cc.sys.platform == cc.sys.WIN32) return true;
        //return true;
        return cc.sys.platform == cc.sys.IPHONE && cc.winSize.height / cc.winSize.width >= 2;
    },
    getPackageName: function () {
        // test win32
        if (cc.sys.platform == cc.sys.WIN32) return "com.zps.test";

        if (this.pluginPlatform != null) {
            return this.pluginPlatform.callStringFuncWithParam("getPackageName");
        }
        return "";
    },
    getPhoneNumber: function () {
        if (this.pluginPlatform != null) {
            return this.pluginPlatform.callStringFuncWithParam("getPhoneNumber");
        }

        return "";
    },

    getPhoneCount: function(){
        if (this.pluginPlatform != null) {
            return this.pluginPlatform.callIntFuncWithParam("getPhoneCount");
        }

        return 0;
    },

    getMailAccount: function () {
        if (this.pluginPlatform != null) {
            return this.pluginPlatform.callStringFuncWithParam("getMailAccount");
        }
        return ""
    },
    getDeviceModel: function () {
        if (this.pluginPlatform != null) {
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
        return 1;
    },
    getOSVersion: function () {
        if (this.pluginPlatform != null) {
            return this.pluginPlatform.callStringFuncWithParam("getOSVersion");
        }
        if (!cc.sys.isNative) {
            return cc.sys.browserVersion;
        }
        return "";

    },
    //connection type 0: ko co mang, 1: 3g, 2: wifi
    getConnectionStatus: function () {
        // test win32
        if(cc.sys.platform == cc.sys.WIN32){
            return 1;
        }

        if (this.pluginPlatform != null) {
            return this.pluginPlatform.callIntFuncWithParam("getConnectionStatus");
        }
        return -1;
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
        if (!cc.sys.isNative) {
            return 'Web';
        }
        if (cc.sys.platform == cc.sys.WIN32) {
            return "Win32"
        }
        if (cc.sys.platform == cc.sys.ANDROID) {
            return "Android"
        }
        if (cc.sys.platform == cc.sys.IPAD || cc.sys.platform == cc.sys.IPHONE) {
            return "IOS"
        }
        if (cc.sys.platform == cc.sys.WP8) {
            return "WindowPhone8"
        }
        if (cc.sys.platform == cc.sys.WINRT) {
            return "WinRT"
        }
        return "";
    },
    getClientVersion: function () {
        if (this.pluginPlatform != null) {
            return this.pluginPlatform.callStringFuncWithParam("getAppVersion");
        }
        return "1.0";
    },
    getDownloadSource: function () {
        if (this.pluginPlatform != null) {
            //return this.pluginPlatform.callStringFuncWithParam("getDownloadSource");
        }
        return "google";
    },
    getThirdPartySource: function () {
        if (this.pluginPlatform != null) {
            return this.pluginPlatform.callStringFuncWithParam("getThirdPartySource");
        }
        return "";
    },
    getExternalDataPath: function () {
        if (!cc.sys.isNative) {
            return "";
        }
        if (this.pluginPlatform != null) {
            return this.pluginPlatform.callStringFuncWithParam("getExternalDataPath");
        }
        return jsb.fileUtils.getWritablePath();
    },
    addNotify: function (notify) {
        if (this.pluginPlatform != null) {
            let time = new Date(notify['time']);
            cc.log("AddNotify: %d/%d/%d - %d:%d - %s", time.getDate(), time.getMonth(), time.getFullYear(), time.getHours(), time.getMinutes(), JSON.stringify(notify));
            this.pluginPlatform.callFuncWithParam("addNotify",
                new plugin.PluginParam(plugin.PluginParam.ParamType.TypeString, JSON.stringify(notify)));
        }
        if (cc.sys.platform == cc.sys.WIN32){
            cc.log("TestLogicNotify win32: ", JSON.stringify(notify));
        }

    },
    resetNotifyExtraData: function () {
        if (this.pluginPlatform != null) {
            this.pluginPlatform.callFuncWithParam("resetNotifyExtraData");
        }
    },
    getNotificationExtraData: function(){
        if (this.pluginPlatform != null) {
            try{
                return this.pluginPlatform.callStringFuncWithParam("getNotificationExtraData");
            } catch (e) {
                return "";
            }
        }
        return "";
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
    getStoreType: function () {
        if (this.pluginPlatform != null) {
            return this.pluginPlatform.callIntFuncWithParam("getStoreType");
        }
        return 1;
    },

    getDeviceID: function () {
        // // test multiple device: change deviceID returned
        // return "11111";

        let deviceId = this.getAAID().replace(/-/g,'');
        cc.log("getDeviceID: AAID " + deviceId);

        if(fr.platformWrapper.getOsName() == "IOS" || _.isEmpty(deviceId)){
            if (this.pluginPlatform != null) {
                deviceId = this.pluginPlatform.callStringFuncWithParam("getDeviceID");
                if (deviceId == "") {
                    deviceId = this.getMailAccount();
                }
            }
            else{
                deviceId = fr.UserData.getStringFromKey("deviceID", "");
                if (deviceId == ""){
                    deviceId = fr.platformWrapper.genDeviceID();
                    fr.UserData.setStringFromKey("deviceID", deviceId);
                }
            }
            deviceId = deviceId.replace(/-/g,'');
            cc.log("getDeviceID: deviceId ", deviceId);
        }

        return deviceId;
    },
    genDeviceID: function () {
        cc.log("genDeviceId");
        var curTimeWithRandom = Date.now() + Math.floor(Math.random() * 1000000 + 1);
        return "954c5a5dba52e3fe" + curTimeWithRandom;
    },
    //accountType: google , zingme , facebook , zalo
    //openAccount: socialID, voi zingme la username
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
        }


        if (!cc.sys.isNative) {
            // for web
            try {
                gsntracker.login(_accountId, _accountType, _openAccount, _zingName);
            } catch (e) {
            }

            if (_.isUndefined(this.gsnTrackerLogAlive)) {
                cc.director._calculateFrameRate = true;

                this.gsnTrackerLogAlive = setInterval(function () {
                    try {
                        gsntracker.alive(cc.director._frameRate, _zingName);

                    } catch (e) {
                    }

                }, 2 * 60 * 1000);
            }
        }
    },
    logFabric: function (data) {
        if (this.pluginPlatform != null) {
            this.pluginPlatform.callFuncWithParam("logFabric",
                new plugin.PluginParam(plugin.PluginParam.ParamType.TypeString, data));
        }
    },
    openCSApplication: function (userId, content) {
        if (!cc.sys.isNative) {
            cc.sys.openURL('http://hotro.zing.vn/gui-yeu-cau-trong-game.html?param=VXNlcj0mUHJvZHVjdGlkPTQ0NCZDb250ZW50PSZTb3VyY2U9d2Vic2l0ZSZTaWc9MzNlYzI3OTI5Zjk0ZTRlOTJmNjZkNjBiMmQ3NzMzZDI%3D');
            return;
        }
        if (this.pluginPlatform != null) {
            var data = {
                accountId: userId,
                content: content
            };
            this.pluginPlatform.callFuncWithParam("openCSApplication",
                new plugin.PluginParam(plugin.PluginParam.ParamType.TypeString, JSON.stringify(data)));
        }
    },
    //zalo uri = "com.zing.zalo";
    isInstalledApp: function (uri) {
        var ret = 0;
        if (this.pluginPlatform != null) {
            try {
                ret = this.pluginPlatform.callIntFuncWithParam("isInstalledApp",
                    new plugin.PluginParam(plugin.PluginParam.ParamType.TypeString, uri));
            } catch (e) {
                ret = 0;
            }
        }
        cc.log("PlatformWrapper: installed " + uri + " : " + ret);
        return ret > 0;
    },
    logAppFlyerPurchase: function (revenue, contentId, contentType, currency) {
        if (this.pluginPlatform != null) {
            var data = {
                revenue: revenue,
                contentId: contentId,
                contentType: contentType,
                currency: currency
            };
            this.pluginPlatform.callFuncWithParam("logAppFlyerPurchase",
                new plugin.PluginParam(plugin.PluginParam.ParamType.TypeString, JSON.stringify(data)));
        }
    },
    typeOfAppLaunched: function () {
        if (this.pluginPlatform != null) {
            try {
                return this.pluginPlatform.callIntFuncWithParam("typeOfAppLaunched");
            } catch (e) {
                return 0;
            }
        }
        return 0;
    },
    getCarrierName: function () {
        // test Win32:
        // if (cc.sys.platform == cc.sys.WIN32) return "Viettel";

        if (this.pluginPlatform != null) {
            try {
                var carrierName = this.pluginPlatform.callStringFuncWithParam("getCarrierName");
                if (carrierName === "45205") return "Vietnamobile";
                return carrierName;
            } catch (e) {
                return null;
            }
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
    isAndroidEmulator: function () {
        var isEmulator = false;
        if (cc.sys.platform == cc.sys.ANDROID) {
            if (this.pluginPlatform != null) {
                try {
                    isEmulator = this.pluginPlatform.callBoolFuncWithParam("isEmulator");
                    if (typeof isEmulator == "boolean") {
                        return isEmulator;
                    }
                } catch (e) {
                    cc.log(" PlatformWrapper call isEmulator fail!");
                }
            }
        }
        return false;
    },
    sendEmail: function (stringData) {
        if (this.pluginPlatform != null) {
            this.pluginPlatform.callFuncWithParam("sendEmail",
                new plugin.PluginParam(plugin.PluginParam.ParamType.TypeString, stringData));
        }
    },
    getAAID: function () {
        if (this.pluginPlatform != null) {
            cc.log("getAAID" + this.pluginPlatform.callStringFuncWithParam("getAAID", null));
            return this.pluginPlatform.callStringFuncWithParam("getAAID", null);
        }
        cc.log("getAAID == null");
        return "";
    },
    openURL: function (urlString) {
        if (this.pluginPlatform != null) {
            this.pluginPlatform.callFuncWithParam("openURL",
                new plugin.PluginParam(plugin.PluginParam.ParamType.TypeString, urlString));
            cc.log("PlatformWrapper openURL: " + urlString);
        }
    },
    copy2Clipboard: function (stringData) {
        if (this.pluginPlatform != null) {
            this.pluginPlatform.callFuncWithParam("copy2Clipboard",
                new plugin.PluginParam(plugin.PluginParam.ParamType.TypeString, stringData));
            cc.log("PlatformWrapper copy2Clipboard: " + stringData);
        }
    },
    openInAppReview:function () {
        if (this.pluginPlatform != null) {
            this.pluginPlatform.callFuncWithParam("openInAppReview", null);
        }
    },

    hapticTouch: function (type) {
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
        }
    }
};
let HAPTIC_TOUCH_TYPE = {
    LIGHT: 0,
    MEDIUM: 1,
    HEAVY: 2,
    SOFT: 3,
    RIGID: 4
};