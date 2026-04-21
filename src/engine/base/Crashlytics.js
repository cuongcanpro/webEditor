var fr = fr || {};

fr.crashLytics = {
    init : function () {
        fr.crashLytics.setString("Game", "Domino");
        fr.crashLytics.setString("PackageName", gameMgr.getPackageName());
        fr.crashLytics.setString("Version", gameMgr.getVersionString());
    },

    // region Function
    log : function(msg) {
        // cc.log("Crashlytics::log " + msg);
        if(fr.platformWrapper.pluginPlatform != null) {
            fr.platformWrapper.pluginPlatform.callFuncWithParam("crashlyticsLog",
                new plugin.PluginParam(plugin.PluginParam.ParamType.TypeString, msg));
        }
    },

    setString : function(key, value) {
        // cc.log("Crashlytics::setString " + key, value);
        if(fr.platformWrapper.pluginPlatform != null) {
            var data = {key:key, value:value};
            fr.platformWrapper.pluginPlatform.callFuncWithParam("crashlyticsSetString",
                new plugin.PluginParam(plugin.PluginParam.ParamType.TypeString, JSON.stringify(data)));
        }
    },
    // endregion
};
