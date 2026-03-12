WebHelper = cc.Class.extend({
    ctor: function () {

    },

    initWeb: function () {
        versionCode = "?v=2";
        cc.resPath = "./res";
        try {
            //  cc.loader.resPath = "" || srcPath;
        }
        catch (ex) {
            //  cc.loader.resPath = "";
        }
        jsb.fileUtils.init();
        jsb.fileUtils.analysticFrom(Game_resource);
        webResource.initModule();
       // Constant.WIDTH = 800;
      //  Constant.HEIGHT = 480;

        cc.view.setOrientation(cc.ORIENTATION_LANDSCAPE);
        this.setViewGame();
        cc.sys.saveOs = cc.sys.os;
        cc.sys.os = cc.sys.OS_WINDOWS;
    },

    removeContent: function () {
        // Remove content Cheat
        if (!Config.ENABLE_CHEAT) {
            for (var j = 0; j < Game_resource.length; j++) {
                if (Game_resource[j]["includes"]("CheatCenterScene")) {
                    Game_resource.splice(j, 1);
                    break;
                }
            }
        }

        if (Config.WITHOUT_LOGIN) {
            for (var i = 0; i < resourceManager.listIgnore.length; i++) {
                for (var j = 0; j < Game_resource.length; j++) {
                    if (Game_resource[j]["includes"](resourceManager.listIgnore[i])) {
                        Game_resource.splice(j, 1);
                        break;
                    }
                }
            }
        }
    },

    initResizeEvent: function () {
        window.addEventListener('resize', function () {
            setTimeout( function () {
                cc.log("INIT RESIZE EVENT **** " + screen.width + " " + screen.height + " " + window.innerWidth + " " + window.innerHeight);
                var mainScene = sceneMgr.getRunningScene().getMainLayer();
                // if ((mainScene instanceof ShopIapScene))
                //     return;
                webHelper.setViewGame();
                cc.view._resizeEvent();
                // remove all gui in cache
                sceneMgr.arPopups = [];
                sceneMgr.arGuis = [];
                var event = new cc.EventCustom("RESIZE_EVENT");
                cc.eventManager.dispatchEvent(event);
                return;
            }, 100);

        });
    },

    setViewGame: function () {
        var rW = window.innerWidth;
        var rH = window.innerHeight;
        cc.log("VIEW GAME NE ******  " + rW + " " + rH);
        if (cc.game.width == rW && cc.game.height == rH)
            return;
        cc.log("RESET VIEW GAME HERE *************** ");
        cc.game.width = rW;
        cc.game.height = rH;

        var isLandscape = false;
        if (rW < rH) {
            var t = rW;
            rW = rH;
            rH = t;
        }
        else {
            isLandscape = true;
        }

        var w, h;
        var DESIGN_WIDTH = 800;
        var DESIGN_HEIGHT = 480;
        var rateWidth = rW / DESIGN_WIDTH;
        var rateHeight = rH / DESIGN_HEIGHT;
        if (rateWidth > rateHeight) {
            // lay theo chieu cao
            h = DESIGN_HEIGHT;
            w = rW / rH * h;
        }
        else {
            w = DESIGN_WIDTH;
            h = rH / rW * w;
        }

        if (w / h > 2.2) {
            w = h * 2.2;
        }

        //window.innerHeight = window.innerHeight * 0.9;
        cc.view.setDesignResolutionSize(w, h, cc.ResolutionPolicy.SHOW_ALL);
        this.isFullscreen();
    },

    isFullscreen: function () {
        // Constant.HEIGHT_DECREASE = 0;
        // if (this.isStandaloneApp()) {
        //     cc.log("STAND ALONE VERSION ******** ");
        //     return;
        // }
        // if (cc.sys.isNative)
        //     return false;
        // // if (window.innerHeight < window.innerWidth) {
        // if(screen.width + screen.height - 30 <= window.innerHeight + window.innerWidth) {
        //     Constant.HEIGHT_DECREASE = 20;
        //     return true;
        // }
        // else {
        //     Constant.HEIGHT_DECREASE = 0;
        //     return false;
        // }
    },

    isStandaloneApp: function () {
        if ((window.matchMedia('(display-mode: standalone)').matches) || (window.navigator["standalone"]) || document.referrer["includes"]('android-app://')) {
            cc.log("STAND ALONE VERSION ******** ");
            cc.sys.localStorage.setItem("haveStandalone", 1);
            return true;
        }
        return false;
    },


})

WebHelper.firstInit = true;
WebHelper.instance = null;

WebHelper.getInstance = function () {
    if (WebHelper.firstInit) {
        WebHelper.instance = new WebHelper();
        WebHelper.firstInit = false;
    }
    return WebHelper.instance;
};

var webHelper = WebHelper.getInstance();

/** @expose */
startGame = function () {
    cc.game.onStart();
}

/** @expose */
WebHelper.isFinishLoadCodeJs = false;
