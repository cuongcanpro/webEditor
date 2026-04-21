
const TimeSystem = {
    _isGotServerTime: null,                     // is sync delta time with server at least once
    deviceDeltaTime: null,                      // delta = sv time - cl time in seconds

    init: function(){
        this.isNewDay = false;
        this.addListenerShowHideGame();

        // check recordTimeClient
        var isDeviceGotSvTime = fr.UserData.getNumberFromKey(KeyStorage.DEVICE_IS_GOT_SERVER_TIME, 0);
        this._isGotServerTime = (isDeviceGotSvTime == 1);
        cc.log("TimeSystem tmp = ", isDeviceGotSvTime);
        this.deviceDeltaTime = 0;
        if (this._isGotServerTime){
            this.deviceDeltaTime = fr.UserData.getNumberWithCrypt(KeyStorage.DEVICE_DELTA_TIME, 0);
            cc.log("deviceDeltaTime=", this.deviceDeltaTime);
            this.recordTimeOnUser();
        }
    },

    isGotServerTime: function(){
        cc.log("gv.isEnableTestOfflineClient " + gv.isEnableTestOfflineClient);
        if (gv.isEnableTestOfflineClient){
            return true;
        }

        return this._isGotServerTime;
    },

    getDeviceTimeInSecond: function(){
        return Math.floor(Date.now()/1000);
    },

    // = client.now + (server - client) = server.now
    getCurTimeServerInSecond : function () {
        // cc.log("getCurTimeServerInSecond = ", (Math.floor(Date.now()/1000)  + this.deviceDeltaTime));
        if (!this._isGotServerTime){
            this.deviceDeltaTime = 0;
        }
        return Math.floor(Date.now()/1000)  + this.deviceDeltaTime;
    },

    getTimeServerFromTimeDevice: function (deviceTimeInSec) {
        if (!this._isGotServerTime){
            this.deviceDeltaTime = 0;
        }
        return deviceTimeInSec  + this.deviceDeltaTime;
    },

    getTimeDeviceFromTimeServer: function (serverTime) {
        if (!this._isGotServerTime){
            this.deviceDeltaTime = 0;
        }
        return serverTime - this.deviceDeltaTime;
    },

    getCurTimeServerInMillis : function () {
        if (!this._isGotServerTime){
            // cc.warn("No server time");
            this.deviceDeltaTime = 0;
        }
        return Date.now() + this.deviceDeltaTime*1000;
    },

    syncDeltaTime: function(newDeviceDeltaTime){
        cc.log("syncDeltaTime, new = ", newDeviceDeltaTime, "old = ", this.deviceDeltaTime);
        if (!this._isGotServerTime){
            this.set1stServerTime(newDeviceDeltaTime);
            return;
        }
        var timeDiff = newDeviceDeltaTime - this.deviceDeltaTime;   //  delta = sv time - cl time
        if (timeDiff != 0){
            // record then update delta then record again.
            this.recordTimeOnUser();
            cc.log("updateDeltaTime:", this.deviceDeltaTime, newDeviceDeltaTime);
            this.deviceDeltaTime = newDeviceDeltaTime;
            fr.UserData.setNumberWithCrypt(KeyStorage.DEVICE_DELTA_TIME, this.deviceDeltaTime);
            this.recordTimeOnUser();
        }
        else{
            this.recordTimeOnUser();
        }

    },
    // timeDiff = client.getCurTimeServerInSecond() - real time on server.
    syncTimeDiff: function(timeDiff){
        cc.log("syncTimeDiff", timeDiff);
        var newDeviceDeltaTime = this.deviceDeltaTime - timeDiff;
        this.syncDeltaTime(newDeviceDeltaTime);

    },
    syncServerTime : function (serverTimeInSeconds, uid) {
        cc.log("syncServerTime", serverTimeInSeconds, uid);
        var newDeviceDeltaTime = serverTimeInSeconds - Math.round(Date.now()/1000);
        this.syncDeltaTime(newDeviceDeltaTime);

        this.setNewDay(serverTimeInSeconds);

    },

    // revertBackwardTime: function(backwardDurationInSec){
    //     cc.log("revertBackwardTime:", this.deviceDeltaTime, this.deviceDeltaTime-backwardDurationInSec);
    //     this.deviceDeltaTime = this.deviceDeltaTime-backwardDurationInSec;
    //     fr.UserData.setNumberWithCrypt(KeyStorage.DEVICE_DELTA_TIME, this.deviceDeltaTime);
    // },

    // set time lần đầu / hoặc khi login thành công: lấy lại time từ server.
    set1stServerTime: function(newDeviceDeltaTime){
        cc.log("TimeSystem.set1stServerTime: delta =", newDeviceDeltaTime);
        this._isGotServerTime = true;
        this.deviceDeltaTime = newDeviceDeltaTime;
        fr.UserData.setNumberWithCrypt(KeyStorage.DEVICE_DELTA_TIME, this.deviceDeltaTime);
        fr.UserData.setNumberFromKey(KeyStorage.DEVICE_IS_GOT_SERVER_TIME, 1);
        this.recordTimeOnUser();
    },

    addListenerShowHideGame: function(){
        cc.eventManager.addCustomListener(cc.game.EVENT_HIDE, this.onRunBackground.bind(this));
        cc.eventManager.addCustomListener(cc.game.EVENT_SHOW, this.onBackFromBackground.bind(this));
    },
    onRunBackground: function () {
        this.recordTimeOnUser();
    },
    onBackFromBackground: function () {
        this.recordTimeOnUser();
        if(gv.gameClient.isConnected){
            gv.clientNetwork.connector.sendGetServerTime();
        }
    },

    recordTimeOnUser: function () {
        cc.log("recordTimeOnUser");
        if (userMgr.getData().getUId() != null){
            var curTimeServerInSeconds = this.getCurTimeServerInSecond();
            userMgr.recordTime(curTimeServerInSeconds);
        }
    },
    setNewDay:function (serverTimeInSeconds) {
        var lastTimeLogin = fr.UserData.getNumberFromKey(KeyStorage.LAST_TIME_LOGIN, 0);
        var pastDate = new Date();
        pastDate.setTime(lastTimeLogin*1000);

        var curDate = new Date();
        curDate.setTime(serverTimeInSeconds*1000);

        if(curDate.getDate() != pastDate.getDate()){
            this.isNewDay = true;
        }
        cc.log("pastDate " + pastDate.getDate() + " " + curDate.getDate())
        fr.UserData.setNumberFromKey(KeyStorage.LAST_TIME_LOGIN, serverTimeInSeconds);
    },
    getIsNewDay:function () {
        return this.isNewDay;
    }
};
