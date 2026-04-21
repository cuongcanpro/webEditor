fr.firebaseAnalytic = {
    pluginFA: null,

    init: function () {
        if (plugin.PluginManager == null) return false;
        if (fr.firebaseAnalytic.pluginFA == null) {
            var pluginManager = plugin.PluginManager.getInstance();
            fr.firebaseAnalytic.pluginFA = pluginManager.loadPlugin("FirebaseAnalytic");
        }
        return true;
    },

    logEvent: function (name, params) {
        cc.log("EVENT:", name, JSON.stringify(params));
        if (this.isSupported()) {
            var data = {name: name, params: params};
            this.pluginFA.callFuncWithParam("logEvent",
                plugin.PluginParam(plugin.PluginParam.ParamType.TypeString, JSON.stringify(data)));
        }
    },

    isSupported: function () {
        return this.pluginFA != null;
    },

    getDynamicLink: function () {
        if (this.isSupported()) {
            if (Config.ENABLE_CHEAT) cc.log("FirebaseAnalytics::getDynamicLink");
            return this.pluginFA.callStringFuncWithParam("getDynamicLink");
        }
        if (Config.ENABLE_CHEAT) cc.log("FirebaseAnalytics::getDynamicLink not init plugin");
        return "";
    },

    resetDynamicLink: function () {
        if (this.isSupported()) {
            return this.pluginFA.callFuncWithParam("resetDynamicLink", null);
        }
    },

    createDynamicLink: function(data) {
        try {
            if (this.isSupported()) {
                var FDL_DOMAIN = "https://tongits.page.link/";
                var PACKAGENAME = "com.zingplay.tongits";
                var FDL_LINK = "_DOMAIN_?link=_DOMAIN__DATA_&apn=_PACKAGE_";

                var str = StringUtility.replaceAll(FDL_LINK,"_DOMAIN_", FDL_DOMAIN);
                str = StringUtility.replaceAll(str,"_DATA_", data);
                str = StringUtility.replaceAll(str,"_PACKAGE_", PACKAGENAME);

                var json = {};
                json.link = str;
                cc.log("FirebaseAnalytics.createDynamicLink with data", JSON.stringify(json));
                return this.pluginFA.callBoolFuncWithParam("createDynamicLink", plugin.PluginParam(plugin.PluginParam.ParamType.TypeString, JSON.stringify(json)));
            }
        }
        catch (e) {
            cc.log("create dynamic link error", e);
        }
        return false;
    }
};

var onCreateDynamicLinkResult = function(isSuccess, shortLink, previewLink) {

}