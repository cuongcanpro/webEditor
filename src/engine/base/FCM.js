
fr.fcm = {
    pluginFCM: null,
    init: function() {
        if(!cc.sys.isNative) {
            return false;
        }
        if(plugin.PluginManager == null)
            return false;
        if(this.pluginFCM == null) {
            var pluginManager = plugin.PluginManager.getInstance();
            this.pluginFCM = pluginManager.loadPlugin("Fcm");
        }
        return true;
    },

    getToken: function() {
        if(this.isSupported()) {
            if(Config.ENABLE_CHEAT) cc.log("FCM: getToken");
            return this.pluginFCM.callStringFuncWithParam("getToken");
        }
        return "";
    },

    getExtraData: function() {
        if(this.isSupported()) {
            if(Config.ENABLE_CHEAT) cc.log("FCM: getExtraData");
            return this.pluginFCM.callStringFuncWithParam("getExtraData");
        }
        return "";
    },

    subscribeTopic: function(topic) {
        if(this.isSupported()) {
            return this.pluginFCM.callFuncWithParam("subscribeTopic", plugin.PluginParam(plugin.PluginParam.ParamType.TypeString, topic));
        }
    },
	unsubscribeTopic: function(topic) {
        if(this.isSupported()) {
            return this.pluginFCM.callFuncWithParam("unsubscribeTopic", plugin.PluginParam(plugin.PluginParam.ParamType.TypeString, topic));
        }
    },
	isSupported:function()
	{
		return this.pluginFCM != null;
	},
};

