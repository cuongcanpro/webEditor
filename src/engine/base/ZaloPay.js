fr.zaloPay = {

    init: function (appID) {
        cc.log("ZaloPay::init");
        if (plugin.PluginManager != undefined) {
            var pluginManager = plugin.PluginManager.getInstance();
            if (pluginManager != null) {
                this.plugin = pluginManager.loadPlugin("ZLPWrapper");
                if (this.plugin) {
                    cc.log("ZaloPay::init plugin " + appID);
                    this.plugin.setListener(this);

                    this.plugin.configDeveloperInfo({
                        appId : appID
                    });
                }
            }
        }
    },

    payOrder : function (transaction) {
        cc.log("ZaloPay::payOrder");
        if(this.plugin) {
            cc.log("ZaloPay::payForProduct " + transaction);
            this.plugin.payForProduct({
                transtoken : transaction
            });
        }
    }
};
