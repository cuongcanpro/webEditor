
var ViewSizeMgr = cc.Class.extend({

    SCREEN_DEFAULT : cc.size(1200,720),
    SCREEN_SMALL : cc.size(800,480),

    _defaultSize : cc.size(0,0),
    _smallSize : cc.size(0,0),

    ctor : function () {
    },

    init : function () {
        this._defaultSize = this.calculateWinSize(this.SCREEN_DEFAULT);
        this._smallSize = this.calculateWinSize(this.SCREEN_SMALL);
    },

    calculateWinSize : function (designSize) {
        var frameSize = cc.view.getFrameSize();
        var rate = this.SCREEN_DEFAULT.width / this.SCREEN_DEFAULT.height;
        if (cc.sys.isNative) {  // android - ios - window
            var ratio = frameSize.width / frameSize.height;
            if(platformMgr.isIOS()) {
                if(ratio > 2) {
                    cc.view.setDesignResolutionSize(designSize.height * 2, designSize.height, cc.ResolutionPolicy.SHOW_ALL);
                }
                else if(ratio > rate) {
                    cc.view.setDesignResolutionSize(designSize.width, designSize.height, cc.ResolutionPolicy.FIXED_HEIGHT);
                }
                else {
                    cc.view.setDesignResolutionSize(designSize.width, designSize.height, cc.ResolutionPolicy.FIXED_WIDTH);
                }
            }
            else {
                if(ratio > rate) {
                    cc.view.setDesignResolutionSize(designSize.width, designSize.height, cc.ResolutionPolicy.FIXED_HEIGHT);
                }
                else {
                    cc.view.setDesignResolutionSize(designSize.width, designSize.height, cc.ResolutionPolicy.FIXED_WIDTH);
                }
            }

        }
        else {  // web
            cc.resPath = "./res";
            cc.loader.resPath = srcPath || "";
            jsb.fileUtils.init();
            jsb.fileUtils.analysticFrom(g_resources);

            cc.view.setDesignResolutionSize(Constant.WIDTH, Constant.HEIGHT, cc.ResolutionPolicy.SHOW_ALL);
        }
        return cc.winSize;
    }
});

// region ViewSizeMgr
ViewSizeMgr._inst = null;

/**
 * @returns {ViewSizeMgr}
 */
ViewSizeMgr.instance = function () {
    if(ViewSizeMgr._inst == null) {
        ViewSizeMgr._inst = new ViewSizeMgr();
    }
    return ViewSizeMgr._inst;
}

viewSizeMgr = ViewSizeMgr.instance();
// endregion