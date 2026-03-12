/**
 * Created by KienVN on 11/5/2015.
 */

fr.gameLog = {
    isStarted: false,
    isEnableLog: true,
    start: function () {
        cc.log("gameLog:start");
        this.isStarted = true;
        if (cc.sys.platform == cc.sys.WIN32) {
            this.logFile = fr.platformWrapper.getExternalDataPath() + "/log/monopoly_" + fr.getFileNameByTime("txt");
        } else {
            this.logFile = fr.platformWrapper.getExternalDataPath() + "/monopoly_" + fr.getFileNameByTime("txt");
        }
        cc.log("fr.gameLog: " + this.logFile);
        this.logData = "";
        this.logPingData = "";

    },

    logPing: function (text) {
        if (!gv.gameClient.enableClientLogPing) return;

        var platform = cc.sys.platform;
        var osVersion = fr.platformWrapper.getOSVersion();
        var connectName = fr.platformWrapper.getConnectionStatusName();
        var language = "Viet Nam";
        var svIP = gv.gameClient._serverName + ":" + gv.gameClient._port;
        var storeType = "Viet";
        this.logPingData = this.logPingData + "\n" + storeType + " " + platform + " " + osVersion + " " + connectName + " " + language + " " + svIP + " " + text;
    },
    log: function (text) {
        // cc.log(text);
        if (!this.isStarted)
            return;
        this.logData = this.logData + (text + "\n");
    },
    logCMD: function (cmdId) {
        for (var key in gv.CMD) {
            if (gv.CMD[key] == cmdId) {
                this.log("CMD: " + key);
            }
        }
    },
    finishLogPing: function () {
        if (gv.gameClient.enableClientLogPing) {
            //if  (cc.sys.platform == cc.sys.WIN32) {
            //    jsb.fileUtils.writeStringToFile(this.logPingData, fr.platformWrapper.getExternalDataPath() + "/log/monopoly_" + fr.getFileNameByTime("txt"));
            //}
            cc.log("log ping = " + this.logPingData);
            var fileName = encodeURIComponent("monopoly_" + fr.getFileNameByTime("txt"));
            var fileData = encodeURIComponent(this.logPingData);

            var url = "http://49.213.81.39/logging/reportError2.php";

            this.sendToServer(fileName, fileData, url);

        }
    },
    finish: function () {
        cc.log("gameLog: finish " + this.isStarted);
        if (this.isStarted) {
            if (cc.sys.platform == cc.sys.WIN32) {
                cc.log("log local");
                jsb.fileUtils.writeStringToFile(this.logData, this.logFile);
            }
            var fileName = encodeURIComponent("monopoly_" + fr.getFileNameByTime("txt"));
            var fileData = encodeURIComponent(this.logData);
            if (cc.sys.platform == cc.sys.WIN32) {
                var url = "http://10.198.48.86/monopoly/reportError.php";
            }
            else {
                var url = "http://49.213.81.39/logging/reportError.php";
                //var url = "http://49.213.81.39/logging/reportError2.php";
            }

            this.sendToServer(fileName, fileData, url);
        }
        this.isStarted = false;
    },
    sendToServer: function (fileName, fileData, url) {


        var xhr = cc.loader.getXMLHttpRequest();
        xhr.open("POST", url);
        xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
        var args = "file_name=" + fileName + "&data=" + fileData;
        cc.log("sendToServer: " + args);
        xhr.send(args);

    },
    stop: function () {
        this.isStarted = false;
    }
};