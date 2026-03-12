/*
 * Created by KienVN
 */

fr.firebaseAnalytic = {
    pluginFA: null,
    init: function() {
        if(!cc.sys.isNative) {
            return false;
        }
        if(plugin.PluginManager == null)
            return false;
        if(this.pluginFA == null) {
            var pluginManager = plugin.PluginManager.getInstance();
            this.pluginFA = pluginManager.loadPlugin("FirebaseAnalytic");
        }
        cc.log("Init firebaseAnalytic success!");
        return true;
    },
    testFirebaseAnalytic:function()    {
        fr.firebaseAnalytic.logEvent("M3_Demo", {
            key1:1.01,
            key2:2,
            key3:9999999999,
            key4: "abc xyz"
        });
    },
    logEvent: function(name, params) {
        if(this.isSupported()) {
            cc.log("pluginFA.logEvent:" + name);
            if (params == undefined) params = {};
            var data = {name:name, params:params};
            this.pluginFA.callFuncWithParam("logEvent",
                plugin.PluginParam(plugin.PluginParam.ParamType.TypeString, JSON.stringify(data)));
        }
    },
    getDynamicLink:function() {
        if(this.isSupported()) {
            return this.pluginFA.callStringFuncWithParam("getDynamicLink", null);
        }
        return "";
    },
    resetDynamicLink:function() {
        if(this.isSupported()) {
            return this.pluginFA.callFuncWithParam("resetDynamicLink", null);
        }
    },
    isSupported:function()   {
        return this.pluginFA != null;
    }
};

// todo add and log event.
var FireBaseAnalyticEvent = {
    NEW_USER: "M3_NEW_USER",
    VIEW_LOADING: "M3_VIEW_LOADING",
    LOGIN_SUCCESS: "M3_LOGIN_SUCCESS",
    START_MATCH: "M3_START_PLAY"
};