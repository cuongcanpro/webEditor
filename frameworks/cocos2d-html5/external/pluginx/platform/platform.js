plugin.extend('PlatformWrapper', {
    ctor: function (config) {
        this.config = config['tracker'];
        if(this.config) {
            var trackerName = this.config['name'];
            var version = this.config['version'];
            var partner = this.config['partner'];
            this._initGSNTracker(trackerName, version, partner);
        }

    },
    /** @expose */
    initGSNTracker:function(data){
        var info = JSON.parse(data);
        this._initGSNTracker(info.trackerName, info.version, info.partner);
    },
    _initGSNTracker:function(trackerName, version, partner){
        (function(d, s, id, c) {                      // Load the SDK asynchronously
            var js, fjs = d.getElementsByTagName(s)[0];
            if (d.getElementById(id)) {return};
            js = d.createElement(s); js.id = id;
            js.type = "text/javascript";
            js.src = "https://tracking.playzing.g6.zing.vn/TrackClickInstall/js/gsntracker.min.js";
            if (c) { js.addEventListener('load', function (e) { c(null, e); }, false); }
            fjs.parentNode.insertBefore(js, fjs);
        }(document, 'script', 'gsntrackerjs', function(){
            gsntracker["init"](trackerName,version);
            gsntracker["setDistributor"](partner);
        }));
    },
    /** @expose */
    trackLoginGSN:function(data)
    {
        var info = JSON.parse(data);
        var trackFunc = function () {
            gsntracker["login"](info.accountId, info.accountType, info.openAccount, info.zingName);
        }
        if(typeof gsntracker != "undefined"){
            trackFunc();
        }
        //do chua load kip gsn tracker
        else{
            setTimeout(trackFunc, 1000);
        }

    },
    /** @expose */
    logCustom:function (data) {
        cc.log("logCustom", data);
    },
    getDeviceID:function () {

    },
    /** @expose */
    showAddToHomePopup:function () {
        if(!this.isCanShowAddToHomePopup())
        {
            return false;
        }
        var startX, startY;
        var duration, iPadXShift = 208;
        return true;
    },
    /** @expose */
    isCanShowAddToHomePopup:function(){
        if(cc.sys.os !== cc.sys.OS_IOS){
            return false;
        }
        if(this.isStandalone()){
            return false;
        }
        return true;
    },
    /** @expose */
    isStandalone:function(){
        return (typeof window.navigator != "undefined" && window.navigator.standalone);
    }

});