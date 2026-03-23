/**
 * SceneLoading - A simple buffer scene that waits for 2 seconds
 * before transitioning to the target scene.
 */
var SceneLoading = cc.Scene.extend({
    _nextSceneClass: null,
    _nextSceneArgs: null,

    /**
     * @param {cc.Class} nextSceneClass - The class to instantiate after delay
     * @param {any} args - Arguments to pass to ctor of nextSceneClass
     */
    ctor: function (nextSceneClass, args) {
        this._super();
        this._nextSceneClass = nextSceneClass;
        this._nextSceneArgs = args;
        this.initUI();
    },

    initUI: function () {
        var landscape = false;
        // check if the nextScene is TestScene
        if (this._nextSceneClass === CoreGame.TestScene) {
            landscape = true;
        }

        var cfg = fr.ClientConfig.getInstance();
        var designSize = cfg.getDesignResolutionSize();

        // Tính kích thước mục tiêu theo orientation
        var targetW = landscape ? designSize.height : designSize.width;
        var targetH = landscape ? designSize.width : designSize.height;

        // Trên web, frame size phải là kích thước viewport thực, không phải design size
        if (cc.sys.isNative) {
            cc.view.setFrameSize(targetW, targetH);
        }

        var winSize = cc.director.getWinSize();

        // Background
        var bg = new cc.LayerColor(cc.color(25, 25, 35, 255));
        bg.setContentSize(winSize);
        this.addChild(bg);

        // Loading text
        var label = new cc.LabelTTF("LOADING...", "font/BalooPaaji2-Bold.ttf", 28);
        label.setPosition(winSize.width / 2, winSize.height / 2);
        label.setColor(cc.color(255, 215, 0));
        this.addChild(label);

        // Subtext
        var subLabel = new cc.LabelTTF("Adjusting resolution...", "font/BalooPaaji2-Regular.ttf", 14);
        subLabel.setPosition(winSize.width / 2, winSize.height / 2 - 40);
        subLabel.setColor(cc.color(180, 180, 190));
        this.addChild(subLabel);

        // Schedule delayed transition
        this.scheduleOnce(this.goToNextScene, 0.1);
    },

    goToNextScene: function () {
        var next;
        if (this._nextSceneClass) {
            next = new this._nextSceneClass(this._nextSceneArgs);
        } else {
            // If no next scene specified, fall back to Lobby if available
            if (typeof SceneLobby !== 'undefined') {
                next = new SceneLobby();
            } else {
                next = new cc.Scene();
            }
        }
        cc.director.runScene(next);
    }
});

/**
 * Static helper to open any scene with a loading buffer
 */
SceneLoading.openWithBuffer = function (sceneClass, args) {
    var loading = new SceneLoading(sceneClass, args);
    cc.director.runScene(loading);
};
