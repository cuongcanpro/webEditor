/**
 * Created by GSN on 9/30/2015.
 */
var fr = fr || {};
fr.google = {
    pluginUser: null,

    init: function () {
        if (plugin.PluginManager == null)
            return false;
        if (fr.google.pluginUser == null) {
            var pluginManager = plugin.PluginManager.getInstance();
            fr.google.pluginUser = pluginManager.loadPlugin("UserGoogle");
            var data = {
                id: "",
            };
            if (fr.google.pluginUser != null) {
                fr.google.pluginUser.configDeveloperInfo(data);
            }
        }
        return true;
    },

    /***
     *
     * @param callback
     */
    login: function (callback) {
        var self = this;
        if (this.pluginUser && this.pluginUser.isLoggedIn()) {
            this.pluginUser.logout(function () {
                self._requestLogin(callback);
            });

        } else {
            self._requestLogin(callback);
        }

    },

    logout: function () {
        if (this.pluginUser && this.pluginUser.isLoggedIn()) {
            this.pluginUser.logout(function () {

            });
        }
    },

    _requestLogin: function (callback) {
        if (fr.google.pluginUser) {
            fr.google.pluginUser.login(function (result, response) {
                if (result == plugin.ProtocolUser.UserActionResultCode.LOGOUT_SUCCEED) {
                    return;
                }
                if (result == plugin.ProtocolUser.UserActionResultCode.LOGIN_SUCCEED) {
                    var token = response;
                    callback(true, token);
                } else {
                    var msg = response;
                    callback(false, msg);
                }
            });
        }
    }
};
