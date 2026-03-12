// DateUtil: transform local date to exact zone with server from epoch seconds time value.

var fr = fr ||{};
fr.DateUtil = {
    serverOffset: -420, // GMT+7
    // minutes: offset in minutes
    // UTC+ -> offset-  : UTC+7 -> offset -420
    // UTC- -> offset+  : UTC-1 -> offset 60
    init: function(serverOffset){
        this.serverOffset = serverOffset;
    },
    /**
     *
     * @returns {number} offset Diff from minutes.
     */
    getOffsetDiff: function(){
        let dateLocal = new Date();
        let deviceOffset = dateLocal.getTimezoneOffset();
        // cc.log("offsetDiff: "+ (this.serverOffset - deviceOffset));
        return this.serverOffset - deviceOffset;
    },
    getFirstTimeThisDayInSecond: function () {
        let curTime = TimeSystem.getCurTimeServerInMillis();
        let date = new Date(curTime);
        date.setHours(0);
        date.setMinutes(0);
        date.setSeconds(0);
        let firstTimeThisDayLocal = Math.floor(date.getTime()/1000);
        let firstTimeThisDaySvZone = firstTimeThisDayLocal - this.getOffsetDiff()*60;
        return firstTimeThisDaySvZone;
    },
    getCurDateTimeServer: function () {
        let curTime = TimeSystem.getCurTimeServerInMillis();
        let d = new Date(curTime - this.getOffsetDiff()*60*1000);
        cc.log("date with diff:"+ d.toString());
        return {
            year: d.getFullYear(),
            month: d.getMonth(),
            date: d.getDate(),
            hour: d.getHours(),
            minute: d.getMinutes(),
            second: d.getSeconds()
        };
    },
    getTimeLeftToNextDayInSec: function(){
        let oneDayInSec = 86400;
        let firstTimeNextDay = this.getFirstTimeThisDayInSecond() + oneDayInSec;
        return firstTimeNextDay - TimeSystem.getCurTimeServerInSecond();
    },
    isDayDiff: function (time1InSec, time2InSec) {
        let oneDayInSec = 86400;
        let diff = Math.abs(time2InSec - time1InSec);
        if (diff > oneDayInSec){
            return true;
        }
        else{
            let d1 = new Date(time1InSec*1000 - this.getOffsetDiff()*60*1000);
            let d2 = new Date(time2InSec*1000 - this.getOffsetDiff()*60*1000);
            return d1.getDate() != d2.getDate();
        }
    }
};