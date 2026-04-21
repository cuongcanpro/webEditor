var fr = fr || {};

fr.GAME_PREFIX = "DOMINO";

fr.tracker = {

    init: function () {
        // init after PlatformWrapper init
        if(!fr.platformWrapper) {
            if (plugin.PluginManager == null) return false;

            fr.platformWrapper = {};
            if (fr.platformWrapper.pluginPlatform == null) {
                var pluginManager = plugin.PluginManager.getInstance();
                fr.platformWrapper.pluginPlatform = pluginManager.loadPlugin("PlatformWrapper");
            }
        }
        // init firebase analytics
        if(!fr.fbAnalytics) {
            if(plugin.PluginManager == null) return false;
            fr.fbAnalytics = {};
            if(fr.fbAnalytics.pluginFA == null) {
                var pluginManager = plugin.PluginManager.getInstance();
                fr.fbAnalytics.pluginFA = pluginManager.loadPlugin("FirebaseAnalytic");
            }
        }
    },

    enableLogErrorJSNew : function () {
        try {
            if (fr.platformWrapper.pluginPlatform != null) {
                fr.platformWrapper.pluginPlatform.callFuncWithParam("changeLogJSErrorNew", null);
            }
        }
        catch(e) {

        }
    },

    /**
     * DEBUG LOG
     * DebugString : thông tin log cần check
     * @param debugString
     */
    logDebug : function (g1,g2,debugString) {
        JSLog.d("#ZPTracker::logDebug " + JSON.stringify(arguments));

        try {
            var dataObj = {
                GroupByL1 : g1,
                GroupByL2 : g2,
                DebugString : debugString
            }

            var obj = {
                ActionType : "LOG_DEBUG",
                ActionData : dataObj
            };

            if (fr.platformWrapper.pluginPlatform != null) {
                var sParam = new plugin.PluginParam(plugin.PluginParam.ParamType.TypeString, JSON.stringify(obj));
                fr.platformWrapper.pluginPlatform.callFuncWithParam("sendLogBulk", sParam);
            }
        } catch (e) {

        }
    },

    /**
     * DEBUG A/B Testing
     */
    logABTesting : function (uId,uName,campaignName, groupName) {
        try {
            var dataObj = {
                AccountID : uId,
                AccountName : uName,
                ABTestingName: campaignName,
                ABTestingValue: groupName
            };

            var obj = {
                ActionType : "AB_TESTING",
                ActionData : dataObj
            };

            if (fr.platformWrapper.pluginPlatform != null) {
                var sParam = new plugin.PluginParam(plugin.PluginParam.ParamType.TypeString, JSON.stringify(obj));
                fr.platformWrapper.pluginPlatform.callFuncWithParam("sendLogBulk", sParam);
            }
            else {
                cc.log("#ZPTracker::logDebug " + JSON.stringify(obj));
            }
        } catch (e) {

        }
    },

    /**
     * LOG APK PACKAGE EXIST
     * @param packageName
     */
    logCheckAPK : function (packageName) {
        try {
            var isExist = fr.tracker.isPackageExisted(packageName);

            var dataObj = {
                PackageName : packageName,
                IsExists : isExist
            };

            var obj = {
                ActionType : "CHECK_APK",
                ActionData : dataObj
            };

            this.sendLogBulk(JSON.stringify(obj));
        } catch (e) {

        }
    },

    /**
     * LOG APK PACKAGE WITH STATE EXIST
     * @param packageName
     * @param isExist
     */
    logAPK : function (packageName,isExist) {
        try {
            var dataObj = {
                PackageName : packageName,
                IsExists : isExist
            };

            var obj = {
                ActionType : "CHECK_APK",
                ActionData : dataObj
            };

            this.sendLogBulk(JSON.stringify(obj));
        } catch (e) {

        }
    },

    /**
     * Log JS ERROR
     * @param str
     */
    logJSError : function (fName, line, msg, jsVersion) {
        try {
            var dataObj = {
                FileName : fName,
                LineNo : line,
                ErrorMessage : msg,
                JSVersion : jsVersion
            };

            var obj = {
                ActionType : "JS_ERROR",
                ActionData : dataObj
            };

            this.sendLogBulk(JSON.stringify(obj));
        } catch (e) {
            cc.log("Send Log JSERROR " + e);
        }
    },

    sendLogBulk : function (str) {
        try {
            if (fr.platformWrapper.pluginPlatform != null) {
                var sParam = new plugin.PluginParam(plugin.PluginParam.ParamType.TypeString, str);
                fr.platformWrapper.pluginPlatform.callFuncWithParam("sendLogBulk", sParam);
            }
        }
        catch(e) {

        }
    },

    isPackageExisted : function (pName) {
        if (fr.platformWrapper.pluginPlatform != null) {
            return fr.platformWrapper.pluginPlatform.callIntFuncWithParam("isPackageExisted",
                new plugin.PluginParam(plugin.PluginParam.ParamType.TypeString, pName));
        }
        return 0;
    },

    /**
     * LOG STEP GAME
     * @param group             : tên group các step chung ( LOADING, LOGIN ... )
     * @param stepName          : tên step ( _begin_loadgui , _end_ )
     * @param info              : thông tin của step object
     * @param debug             : thông tin debug cho step
     * @param prevStatus        : kết quả step trước ( SUCC hoặc mã lỗi )
     * @param prevAfterInfo     : thông tin của step trước sau khi thực hiện
     * @param prevAfterDebug    : thông tin của step trước hỗ trợ debug
     */
    logStepStart: function (group, stepName, info, debug, prevStatus, prevAfterInfo, prevAfterDebug,isFirebase) {
        try {
            var obj = {
                "group": group,
                "name": stepName,
                "debug": debug || "",
                "info": info || "",
                "prev_status": prevStatus || "SUCC",
                "prev_after_debug": prevAfterDebug || "",
                "prev_after_info": prevAfterInfo || ""
            };

            cc.log("Tracker Step : " + JSON.stringify(obj));
            if (fr.platformWrapper.pluginPlatform != null) {
                var sParam = new plugin.PluginParam(plugin.PluginParam.ParamType.TypeString, JSON.stringify(obj));
                fr.platformWrapper.pluginPlatform.callFuncWithParam("logStepgGame", sParam);
            }

            if(fr.fbAnalytics.pluginFA != null && isFirebase) {
                var key = fr.GAME_PREFIX + "_" + group + "_" + stepName;
                var obj = {
                    name : key,
                    params : {
                        key : key,
                        group : group,
                        step : stepName
                    }
                }
                var sParam = new plugin.PluginParam(plugin.PluginParam.ParamType.TypeString, JSON.stringify(obj));
                fr.fbAnalytics.pluginFA.callFuncWithParam("logEvent", sParam);
                cc.log("Tracker Step firebase: " + JSON.stringify(obj));
            }
        } catch (e) {
            cc.log("ZPTracker::logStepStart error", JSON.stringify(e));
        }
    },

    logStep : function (group,stepName,isFirebase, info) {
        try {
            var obj = {
                "group": group,
                "name": stepName,
                "debug": "",
                "info": info || "",
                "prev_status": "SUCC",
                "prev_after_debug": "",
                "prev_after_info": ""
            };

            cc.log("Tracker Step : " + JSON.stringify(obj));
            if (fr.platformWrapper.pluginPlatform != null) {
                var sParam = new plugin.PluginParam(plugin.PluginParam.ParamType.TypeString, JSON.stringify(obj));
                fr.platformWrapper.pluginPlatform.callFuncWithParam("logStepgGame", sParam);
            }

            if(fr.fbAnalytics.pluginFA != null && isFirebase) {
                var key = fr.GAME_PREFIX + "_" + group + "_" + stepName;
                var obj = {
                    name : key,
                    params : {
                        key : key,
                        group : group,
                        step : stepName
                    }
                }
                var sParam = new plugin.PluginParam(plugin.PluginParam.ParamType.TypeString, JSON.stringify(obj));
                fr.fbAnalytics.pluginFA.callFuncWithParam("logEvent", sParam);
                cc.log("Tracker Step firebase: " + JSON.stringify(obj));
            }
        } catch (e) {
            cc.log("ZPTracker::logStep error " + JSON.stringify(e));
        }
    },

    /**
     * LOG STEP GAME
     * @param group             : tên group các step chung ( LOADING, LOGIN ... )
     * @param gameID            : tên game trong portal ( tienlen , pokdeng_th ... )
     * @param stepName          : tên step ( _begin_loadgui , _end_ )
     * @param info              : thông tin của step object
     * @param debug             : thông tin debug cho step
     * @param prevStatus        : kết quả step trước ( SUCC hoặc mã lỗi )
     * @param prevAfterInfo     : thông tin của step trước sau khi thực hiện
     * @param prevAfterDebug    : thông tin của step trước hỗ trợ debug
     */
    logStepPortalListGame: function (group, gameId, stepName, info, debug, prevStatus, prevAfterInfo, prevAfterDebug) {
        try {
            var obj = {
                "group": group,
                "name": stepName,
                "debug": debug || "",
                "info": info || "",
                "prev_status": prevStatus || "SUCC",
                "prev_after_debug": prevAfterDebug || "",
                "prev_after_info": prevAfterInfo || ""
            };

            cc.log("Tracker Portal : " + JSON.stringify(obj));
            if (fr.platformWrapper.pluginPlatform != null) {
                var sParam = new plugin.PluginParam(plugin.PluginParam.ParamType.TypeString, JSON.stringify(obj));
                fr.platformWrapper.pluginPlatform.callFuncWithParam("logStepgPortalListGame", sParam);
            }
        } catch (e) {

        }
    },

    /**
     * LOG STEP ONCE TIME IN DAY
     */
    logOnceDayStep : function (group, stepName, isFirebase) {
        if(this.checkGroupIsNewDay(group, stepName)) {
            cc.log("#LoginTracker::sendLogin " + group + ":" + stepName);
            this.logStepStart(group,stepName, isFirebase);
            this.saveGroupIsNewDay(group, stepName);
            return true;
        }
        else {
            cc.log("#ZPTracker:: " + group + "- " + stepName + " again in day !");
        }
        return false;
    },

    saveGroupIsNewDay : function (group, stepName) {
        try {
            var sKey = group + "_" + stepName + "_day";

            var d = new Date();
            var curDay = "" + d.getDate() + d.getMonth() + d.getFullYear();

            // cc.log("#LoginTracker::saveGroupIsNewDay " + sKey + " : " + curDay);
            cc.sys.localStorage.setItem(sKey,curDay);
        }
        catch(e) {
            // cc.log("#saveGroupIsNewDay error " + e);
        }
    },

    checkGroupIsNewDay : function (group, stepName) {
        try {
            var sKey = group + "_" + stepName + "_day";

            var d = new Date();
            var curDay = "" + d.getDate() + d.getMonth() + d.getFullYear();
            var lastDay = cc.sys.localStorage.getItem(sKey);

            // cc.log("#LoginTracker::compare " + sKey + " -> " + curDay + " vs " + lastDay);

            if(curDay == lastDay) {
                return false;
            }
            return true;
        }
        catch(e) {
            // cc.log("#checkGroupIsNewDay error " + e);
        }

        return false;
    },

    clearCheckListApk: function () {
        this.isCheckApk = false;
    },

    checkListApk: function () {
        if(!this.isCheckApk) {
            this.isCheckApk = true;
            try {
                for (let packageName of ConfigLog.LIST_PACKAGE_NAME){
                    // cc.log("packageName: ", packageName);
                    fr.tracker.logCheckAPK(packageName);
                }
            } catch (e) {
                cc.error("checkListApk: ", e);
            }
        }
    },
};

ConfigLog = {};
ConfigLog.TRACKING_USE_OTHER_APP = "CHECKING_USE_OTHER_APP";
ConfigLog.BEGIN = "_begin_";
ConfigLog.END = "_end_";

ConfigLog.LIST_PACKAGE_NAME = [
    "com.globe.gcash.android",
    "com.paymaya",
    "com.grabtaxi.passenger",
    "com.tongitsgo.play",
    "com.higgs.tongitsstar",
    "com.tg.poker",
    "com.eastudios.tongit",
    "com.emagssob.tongits",
    "com.zps.ph",
    "com.playjoygame.pg",
    "beatmaker.edm.musicgames.PianoGames",
    "com.miracle.savethedoge.an",
    "com.zynga.livepoker",
    "com.grandegames.slots.dafu.casino",
    "com.intech.c66app",
    "com.tatay.manokNaPula",
    "com.GonoGames.Sabong",
    "com.facebook.lite",
    "com.facebook.katana",
    "com.life360.android.safetymapd",
    "com.ss.android.ugc.trill",
    "com.whatsapp",
    "org.telegram.messenger",
    "com.axieinfinity.mystic",
    "com.axieinfinity.origin",
    "com.zingplay.tongits",
    "phil.luckynine",
    "com.rummy.pusoy.dos",
    "com.zhiliaoapp.musically.go",
    "com.instagram.android",
    "com.instagram.lite",
    "com.discord",
    "com.viber.voip",
    "sg.bigo.live",
    "sg.bigo.live.lite",
    "com.baitu.qingshu",
    "com.pita.oyem",
    "com.snapchat.android",
    "com.tencent.mm",
    "www.pay.bdo.com.ph",
    "com.shopee.ph",
    "ph.atome.paylater",
    "com.plentina.app",
    "com.eg.android.AlipayGphone",
    "com.sodexo.philippines",
    "com.twitter.android",
    "com.pinterest",
    "com.linkedin.android",
    "com.facebook.orca"
]