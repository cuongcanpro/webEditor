const TOAST_FLOAT_TAG = 99997;
const TOUCH_EFFECT_TAG = 99999;

// Scene and Manager
let SceneMgr = cc.Class.extend({

    ctor: function () {
        this.curGui = "";
        this.arCacheGuis = {};
        this.arPopups = {};

        this.layerGUI = null;
        this.layerSystem = null;

        this.ignoreGuis = ["CheatCenterScene"];
    },

    /**
     * @return {cc.Scene}
     */
    getRunningScene: function () {
        let currentScene = cc.director.getRunningScene();
        if (currentScene instanceof cc.TransitionScene)
            currentScene = cc.director.getRunningScene().getInScene();
        return currentScene;
    },

    getMainLayer: function () {
        var curScene = this.getRunningScene();
        if (curScene === undefined || curScene == null) return null;
        return curScene.getChildByTag(BaseScene.TAG_LAYER);
    },

    isMainLayer : function (layer) {
        var curScene = this.getMainLayer();
        if(curScene.className == layer) return true;
        return false;
    },

    getLayerGUI: function () {
        var curScene = this.getRunningScene();
        if (curScene === undefined || curScene == null) return null;
        return curScene.getLayerGUI();
    },

    addWebview: function(webview) {
        try{
            if(window.webview) window.webview.removeFromParent();
        }catch(e){
            cc.log("ERROR WEBVIEW", e);
        }
        window.webview = webview;
        return webview;
    },

    /**
     * @param {string} className
     * @param {boolean} [isCache]
     * @return {object}
     */
    openScene: function (className, isCache= true, callback, direct) {
        cc.log("SceneMgr::openScene", className + "/" + this.curGui);
        if (className === this.curGui)
            return this.curScene;

        if (this.layerGUI && cc.sys.isObjectValid(this.layerGUI) && this.layerGUI.getParent()) {
            this.layerGUI.removeAllChildren();
            this.layerGUI.retain();
        }

        if (this.layerSystem && cc.sys.isObjectValid(this.layerSystem) && this.layerSystem.getParent()) {
            this.layerSystem.removeAllChildren();
            this.layerSystem.retain();
        }

        if (direct === undefined) {
            direct = false;
        }
        if (this._isWaitingCallBack && !direct && this._waitingScene != "") {
            className = this._waitingScene;

            cc.log("____CHANGE___TO__GUI___" + className);
            this._isWaitingCallBack = false;
            this._waitingScene = "";
        }

        if (callback !== undefined) {
            if (callback != "" || callback != null) {
                cc.log("Run here ======= ");
                this._isWaitingCallBack = true;
                this._waitingScene = callback;
            }
        }

        //cache old scene
        if (this.curGui in this.arCacheGuis) {
            cc.log("SceneMgr::removeCurGUI", this.curGui);
            this.arCacheGuis[this.curGui].retain();
        }

        //create or load cache scene
        let curLayer;
        if (isCache) {
            if (className in this.arCacheGuis) {
                cc.log("SceneMgr::loadCacheGUI", className);
                curLayer = this.arCacheGuis[className];
            }
            else {
                cc.log("SceneMgr::createNewGUI" + className);
                curLayer = new window[className];
                this.arCacheGuis[className] = curLayer;
            }
        }
        else curLayer = new window[className];

        curLayer.className = className;
        let scene = new BaseScene();
        scene.addChild(curLayer);
        this.curScene = curLayer;
        this.curGui = className;

        cc.director.runScene(scene);
        logMgr.crashLog(LogMgr.CRASH.SCENE, className);

        return curLayer;
    },

    openGUI: function (slayer, zoder, tag, isCache, isOverLap) {

        if (slayer === undefined || slayer == "") return null;

        var layer = null;

        if (isCache === undefined) isCache = false;
        if (isOverLap === undefined) isOverLap = false;

        if (zoder === undefined) zoder = 1;
        if (tag === undefined) tag = 1;

        if (isCache) {
            if (slayer in this.arPopups) {
                cc.log("____LOAD___CACHE___POPUP__" + slayer);
                layer = this.arPopups[slayer];
            }
            else {
                cc.log("____CREATE___NEW___POPUP__WITH___CACHE__" + slayer);
                var _class = this.getClassGUI(slayer);
                layer = new window[_class];
                this.arPopups[slayer] = layer;
            }
        }
        else {
            var _class = this.getClassGUI(slayer);
            if(!isOverLap && cc.sys.isObjectValid(this.layerGUI)) {
                var oldlayer = this.layerGUI.getChildByTag(tag);
                if(oldlayer && oldlayer._aaPopup == slayer){
                    cc.log("____LOAD___POPUP__OVERLAP___" + slayer);
                    layer = oldlayer;
                }
            }
            if(layer == null || !cc.sys.isObjectValid(layer)){
                cc.log("____CREATE___POPUP__NOT_CACHE___" + slayer);
                layer = new window[_class];
            }
        }

        if (layer !== undefined && layer != null) {
            if (layer.getParent()) {
                layer.retain();
                layer.removeFromParent();
                // layer.release();
            }
        }

        if (layer !== undefined && layer != null) {
            layer.setAsPopup(slayer, isCache);
            layer.setName(slayer);
            this.layerGUI.addChild(layer, zoder, tag);
        }
        logMgr.crashLog(LogMgr.CRASH.GUI, slayer);
        return layer;
    },

    getClassGUI: function (cName) {
        if (cName === undefined || cName == null || cName == "")
            return cName;

        var cIdx = cName.indexOf("_");
        if (cIdx > -1) {
            cName = cName.substr(0, cIdx);
        }

        return cName;
    },

    getGUI: function (tag) {
        return this.layerGUI.getChildByTag(tag);
    },

    getGUIByClassName: function (classname) {
        if (!classname) return null;
        return this.layerGUI.getChildByName(classname);
    },

    initialLayer: function () {
        cc.log("_______INITIAL____LAYER___GUI_____");

        // If the native peer was released (previous scene destroyed without
        // retain), the JS handle is still truthy but getParent() would throw
        // "Invalid Native Object". Treat an invalid object as "null" and
        // recreate the layer.
        if (this.layerGUI == null || !cc.sys.isObjectValid(this.layerGUI)) {
            this.layerGUI = new cc.Layer();
        }
        else {
            if (this.layerGUI.getParent()) {
                this.layerGUI.removeFromParent();
            }
        }

        if (this.layerSystem == null || !cc.sys.isObjectValid(this.layerSystem)) {
            this.layerSystem = new cc.Layer();
        }
        else {
            if (this.layerSystem.getParent()) {
                this.layerSystem.removeFromParent();
            }
        }

        this.getRunningScene().addChild(this.layerGUI, BaseScene.TAG_GUI, BaseScene.TAG_GUI);
        this.getRunningScene().addChild(this.layerSystem, BaseScene.TAG_GUI + 1, BaseScene.TAG_GUI + 1);

        gameMgr.onEnterScene();
    },

    checkBackAvailable: function (ignores) {
        if (ignores === undefined) ignores = [];

        for (var s in this.arPopups) {
            var check = true;
            for (var i = 0; i < ignores.length; i++) {
                if (s == ignores[i]) {
                    check = false;
                    break;
                }
            }

            if (check) {
                var g = this.arPopups[s];
                if (g && g.getParent() && !(g instanceof CheatCenterScene) && g.getBackEnable()) {
                    return true;
                }
            }
        }

        return false;
    },

    // for each cached scene, current scene, all cocos node accessible by SceneMgr
    forEachAccessibleNode: function (callback) {
        SceneMgr.forEachNode(this.getMainLayer(), callback);
        SceneMgr.forEachNode(this.layerGUI, callback);

        for (let key in this.arCacheGuis) {
            SceneMgr.forEachNode(this.arCacheGuis[key], callback);
        }

        for (let key in this.arPopups) {
            SceneMgr.forEachNode(this.arPopups[key], callback);
        }
    },

    takeScreenShot: function (isShareImage, layout, size) {
        var fileName = (isShareImage) ? "shareImg.png" : "screenshot.png";
        if (jsb.fileUtils.isFileExist(jsb.fileUtils.getWritablePath() + fileName)) {
            jsb.fileUtils.removeFile(jsb.fileUtils.getWritablePath() + fileName);
        }
        var winWidth = (isShareImage) ? Constant.WIDTH : cc.winSize.width;
        var winHeight = (isShareImage) ? Constant.HEIGHT : cc.winSize.height;
        if (size){
            winWidth = size.width;
            winHeight = size.height;
        }
        var text = new cc.RenderTexture(winWidth, winHeight, cc.Texture2D.PIXEL_FORMAT_RGBA8888, 0x88F0);
        text.setPosition(winWidth / 2, winHeight / 2);

        var curScene = sceneMgr.getRunningScene();
        var effectLayer = curScene.getChildByTag(EffectTouchLayer.TAG);
        if (effectLayer) effectLayer.setVisible(false);

        text.begin();
        if (isShareImage){
            layout.visit();
        } else {
            curScene.visit();
        }
        text.end();

        if (effectLayer) effectLayer.setVisible(true);

        var ret = text.saveToFile(fileName, cc.IMAGE_FORMAT_PNG);

        var path = "";
        if (ret) {
            if (settingMgr.sound && !isShareImage) {
                cc.audioEngine.playEffect(lobby_sounds.chupanh, false);
            }
            path = jsb.fileUtils.getWritablePath() + fileName;
        }
        return path;
    },

});

SceneMgr.sharedInstance = null;

SceneMgr.FONT_NORMAL = "fonts/PoetsenOne-Regular.ttf";
SceneMgr.FONT_BOLD = "fonts/PoetsenOne-Regular.ttf";
SceneMgr.FONT_SIZE_DEFAULT = 22;

// prev call
SceneMgr.forEachNode = function (node, callback) {
    callback(node);

    let children = node.getChildren();
    for (let i = 0; i < children.length; i++) {
        SceneMgr.forEachNode(children[i], callback);
    }
}

// post call
SceneMgr.forEachNode1 = function (node, callback) {
    let children = node.getChildren();
    for (let i = 0; i < children.length; i++) {
        SceneMgr.forEachNode(children[i], callback);
    }

    callback(node);
}

SceneMgr.getInstance = function () {
    if (!SceneMgr.sharedInstance) {
        SceneMgr.sharedInstance = new SceneMgr();
    }
    return SceneMgr.sharedInstance;
};
let sceneMgr = SceneMgr.getInstance();
