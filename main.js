var fr = fr || {};
cc.game.setViewGame = function () {

    var rW = window.innerWidth;
    var rH = window.innerHeight;
    //rW = 320;
    //rH = 480;
    cc.log("VIEW GAME NE ******  " + rW + " " + rH);
    if (cc.game.width == rW && cc.game.height == rH)
        return;
    cc.log("RESET VIEW GAME HERE *************** ");
    cc.game.width = rW;
    cc.game.height = rH;

    var isLandscape = false;
    if (rW > rH) {
        var t = rW;
        rW = rH;
        rH = t;
    }
    else {
        isLandscape = true;
    }
    // rH = rW / 4 * 5;
    var rate = 0.9;
    var w, h;
    var DESIGN_WIDTH = 640 * rate;
    var DESIGN_HEIGHT = 1136 * rate;
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


    // if (w / h > 2.1) {
    //     w = h * 2.1;
    // }

    //window.innerHeight = window.innerHeight * 0.9;
    cc.view.setDesignResolutionSize(w, h, cc.ResolutionPolicy.SHOW_ALL);
}

cc.game.onStart = function () {
    cc.game.isFinishLoadGameJS = true;
    cc.loader.resPath = "";
    if (!cc.sys.isNative && document.getElementById("cocosLoading"))
        document.body.removeChild(document.getElementById("cocosLoading"));
    if (!cc.sys.isNative) {
        // if(setEncryptKeys){
        //     setEncryptKeys(0xc06fe26e, 0x67649e66, 0x19317a3d, 0xe2ad9f85);
        // }
    }
   // cc.game.setTimeReload(10000);
    cc.view.enableRetina(true);
    cc.view.adjustViewPort(true);
    // cc.director.setDisplayStats(true);
    if(!cc.sys.isNative)
    {
     //   cc.view.setOrientation(cc.ORIENTATION_LANDSCAPE);
        // cc.sys.saveOs = cc.sys.os;
        // cc.sys.os = cc.sys.OS_WINDOWS;
        // cc.game.setViewGame();
        webHelper.initWeb();
    } else {
        // Setup the resolution policy and design resolution size
        cc.view.setDesignResolutionSize(Constant.WIDTH, Constant.HEIGHT, cc.ResolutionPolicy.FIXED_HEIGHT);
        var downloadPath = fr.NativeService.getFolderUpdateAssets();
        jsb.fileUtils.addSearchPath(downloadPath + "/res/Event", true);
        jsb.fileUtils.addSearchPath(downloadPath + "/res/MiniGame", true);

    }
    cc.view.resizeWithBrowserSize(true);

    if(!cc.sys.isNative) {
        // for (key in cc.content) {
        //     cc.loader.loadImgLocal(key, cc.content[key], {isCrossOrigin: false}, function (err, img) {
        //         // cc.LoadingScene.preload(Game_resource, function () {
        //         //
        //         //     cc.spriteFrameCache.addSpriteFrames("res/Particles/Coin/coin.plist");
        //         //     cc.spriteFrameCache.addSpriteFrames("res/Image/game.plist");
        //         //     //LocalizedString.preload(function (result) {
        //         //     // Load content plist
        //         //     // cc.director.runScene(makeScene(new LoginSceneWeb()));
        //         //     var scene = new MainScene();
        //         //     gameController.mainScene = scene;
        //         //     cc.director.runScene(scene);
        //         //     // });
        //         //     cc.log("ghi log test version 2");
        //         // }, this);
        //
        //         cc.log("LOAD SUCCESS ");
        //     });
        // }
        // cc.loader.loadImgLocal("res/Image/game.png", cc.game_png, {isCrossOrigin: false}, function (err, img) {
            cc.LoadingScene.preload(Game_resource, function () {
                jsb.fileUtils.init();
                jsb.fileUtils.analysticFrom(Game_resource);
                jsb.fileUtils.addSearchPath("/");
                jsb.fileUtils.addSearchPath("res/");
                jsb.fileUtils.addSearchPath("res/high/");
                CoreGame.BlockerFactory.preloadAllConfigs();
                cc.spriteFrameCache.addSpriteFrames("game/board/art.plist", "game/board/art.png");
                cc.spriteFrameCache.addSpriteFrames("res/Particles/Coin/coin.plist");
                cc.spriteFrameCache.addSpriteFrames("res/Image/game.plist");
                //LocalizedString.preload(function (result) {
                // Load content plist
                // cc.director.runScene(makeScene(new LoginSceneWeb()));
                var scene = new CoreGame.TestScene();
                cc.director.runScene(scene);
                // });
                cc.log("ghi log test version 2");
            // }, this);
        });




    }
    else {
        // Init Map GUI, in advance mode
        resourceManager.initMapGUI();
        cc.spriteFrameCache.addSpriteFrames("res/common/common.plist");
        cc.spriteFrameCache.addSpriteFrames("res/Lobby/common.plist");
        cc.spriteFrameCache.addSpriteFrames("res/Lobby/lobby.plist");
        cc.spriteFrameCache.addSpriteFrames("res/Lobby/login.plist");
        cc.spriteFrameCache.addSpriteFrames("res/Lobby/topFriend.plist");
        cc.spriteFrameCache.addSpriteFrames("res/Other/table.plist");
        LocalizedString.preload(function (result) {
            GameData.getInstance().startGame();
        });
    }
    // if (window["safari"]) {
    //     history.pushState(null, null, location.href);
    //     window["onpopstate"] = function(event) {
    //         history.go(1);
    //     };
    // }
    // setTimeout(function () {
    //     window.location.href = '?changeThePath';
    // }, 100);
};

cc.game.run();
/** @expose */
FbPlayableAd.onCTAClick;

/** @expose */
ExitApi.exit;
