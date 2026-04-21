
let PlatformMgr = BaseMgr.extend({
    ctor : function() {

    },

    init : function() {

    },

    isWindow : function () {
        return cc.sys.os == cc.sys.OS_WINDOWS;
    },

    isAndroid : function () {
        if(this.isWindow())
            return DEFAULT_WIN_PLATFORM == cc.sys.OS_ANDROID;

        return cc.sys.os == cc.sys.OS_ANDROID;
    },

    isIOS : function () {
        // return true;
        if(this.isWindow())
            return DEFAULT_WIN_PLATFORM == cc.sys.OS_IOS;

        return cc.sys.os == cc.sys.OS_IOS;
    },

    isReview : function () {
        if(platformMgr.isIOS()) {
            if(!paymentMgr.checkEnableLocalPayment())
                return true;
        }
        return false;
    },

    getPlatform : function () {
        cc.log(">>getPlatform " + DEFAULT_WIN_PLATFORM
            + " - " + cc.sys.os
            + " - " + this.isIOS()
            + " - " + this.isAndroid());
        if(this.isIOS())
            return PLATFORM.IOS;
        if(this.isAndroid())
            return PLATFORM.ANDROID;

        return PLATFORM.WINDOW;
    }
});

const DEFAULT_WIN_PLATFORM = cc.sys.OS_ANDROID;

const PLATFORM = {
    ANDROID : {
        ID: 3,
        CODE : "ADR",
        NAME: "Android"
    },
    IOS : {
        ID : 1,
        CODE : "IOS",
        NAME : "iOS"
    },
    WINDOW : {
        ID : 0,
        CODE : "WIN",
        NAME : "Window"
    }
};

// region PlatformMgr Instance
PlatformMgr._inst = null;
PlatformMgr.instance = function() {
    if(!PlatformMgr._inst) {
        PlatformMgr._inst = new PlatformMgr();
    }
    return PlatformMgr._inst;
}
let platformMgr = PlatformMgr.instance();
// endregion