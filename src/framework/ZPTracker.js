// ZPTracker version_20210524

var fr = fr || {};

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
    logDebug : function (debugString) {
        try {
            var dataObj = {
                DebugString : debugString
            };

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
    sendLogFeedBack:function(message){
        try {
            var dataObj = {
                AccountID: userInfo.getUId(),
                AccountName: userInfo.getUserName(),
                DisplayName: userInfo.getDisplayName(),
                Message: message
            };

            var obj = {
                ActionType : "FEEDBACK",
                ActionData : dataObj
            };

            this.sendLogBulk(JSON.stringify(obj));
        } catch (e) {

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
    logStepGame: function (group, stepName, info, debug, prevStatus, prevAfterInfo, prevAfterDebug) {
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
        } catch (e) {

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
     * LOG AB TESTING
     * @param accountId           from service login
     * @param accountName         from service login (vd: fb.1231423464573456, gg.23425234235234)
     * @param abTestingName       UNIQUE NAME of AB Testing. (vd: AB_SKIP_TUT)
     * @param abTestingValue      A or B
     */
    logABTesting: function (accountId, accountName, abTestingName, abTestingValue) {
        try {
            var dataObj = {
                AccountID: accountId,
                AccountName: accountName,
                ABTestingName: abTestingName,
                ABTestingValue: abTestingValue
            };

            var obj = {
                ActionType : "AB_TESTING",
                ActionData : dataObj
            };

            this.sendLogBulk(JSON.stringify(obj));
            cc.log("ZPTracker logABTesting done: ", accountId, abTestingName, abTestingValue);
        } catch (e) {
            cc.log("ZPTracker logABTesting failed!", accountId, abTestingName);
        }
    }
};