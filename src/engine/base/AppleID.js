/**
 * Created by GSN on 9/30/2015.
 */

fr.appleid = {
    pluginUser:null,
    /***
     *
     * @returns {boolean}
     */
    init:function()
    {
        if(plugin.PluginManager == null)
            return false;
        if(this.pluginUser == null) {
            var pluginManager = plugin.PluginManager.getInstance();
            this.pluginUser = pluginManager.loadPlugin("AppleID");
            var data = {
            };
            if(this.pluginUser != null) {
                this.pluginUser.configDeveloperInfo(data);
            }
        }
        return true;
    },
    /***
     *
     * @param callback
     */
    login:function(callback)
    {
        cc.log("appleid login");
        if(!this.pluginUser)
        {
            callback(false, "Not support Apple sign.");
            return;
        }
        var self = this;
        this.pluginUser.login(function (result, msg) {
            cc.log("apple callback login ", result, msg, self.getFullName(), self.getUserID());
            callback(result == 0, msg);
        });

    },
    getUserID:function()
    {
        if(this.pluginUser != null)
        {
            if(Config.ENABLE_CHEAT) cc.log("AppleIAP: getUserID");
           return this.pluginUser.callStringFuncWithParam("getUserID");
        }

        return "";
    },
    getFullName:function()
    {
        if(this.pluginUser != null)
               {
                   if(Config.ENABLE_CHEAT) cc.log("AppleIAP: getFullName");
                  return this.pluginUser.callStringFuncWithParam("getFullName");
               }

               return "";
    }

};
