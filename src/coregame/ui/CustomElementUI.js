/**
 * CustomElementUI - Visual representation of game elements using Cocos Studio JSON files
 * Extends ElementUI to allow dynamic CSB/JSON resource assignment
 */
var CoreGame = CoreGame || {};

CoreGame.CustomElementUI = CoreGame.ElementUI.extend({
    jsonNode: null,
    animations: null,
    lastActionName: "",
    visualState: "",
    hijackedAnimation: false,

    /**
     * @param {CoreGame.ElementObject} element - Reference to the logically represented element
     * @param {string} jsonPath - Path to the Cocos Studio JSON file (e.g., "res/high/game/anim/special.json")
     */
    ctor: function (element, jsonPath) {
        this.jsonPath = jsonPath;
        this._super(element);
    },
    setVisualState: function (state){
        this.visualState = state;
    },
    /**
     * Override initSprite to load Cocos Studio JSON instead of a standard sprite
     */
    initSprite: function () {
        if (this.jsonPath) {
            try {
                // Load the JSON file using ccs.load (Cocos Studio 2.x+)
                var result = ccs.load(this.jsonPath, "res/newBlock/BlockUI/");
                this.jsonNode = result.node;
                this.mainAction = result.action;

                if (this.jsonNode) {
                    this.addChild(this.jsonNode);
                    // Standard scale for elements is 0.5

                    //Elements name?
                    BaseLayer._syncInNode(result.node, this);

                    // Load additional animations from meta if Cocot utility is available
                    this.animations = Cocot.load_animations_from_meta(this.jsonNode, "res/newBlock/BlockUI/");

                    // Group animations for randomization (e.g., actionType_0, actionType_1)
                    this._animationGroups = {};
                    if (this.animations) {
                        for (var key in this.animations) {
                            var underscoreIndex = key.lastIndexOf("_");
                            if (underscoreIndex !== -1) {
                                var baseName = key.substring(0, underscoreIndex);
                                var indexPart = key.substring(underscoreIndex + 1);
                                if (!isNaN(indexPart)) {
                                    if (!this._animationGroups[baseName]) {
                                        this._animationGroups[baseName] = [];
                                    }
                                    if (this._animationGroups[baseName].indexOf(key) === -1) {
                                        this._animationGroups[baseName].push(key);
                                    }
                                }
                            }
                        }
                    }
                }
            } catch (e) {
                if (typeof Cocot !== "undefined") {
                    Cocot.log("Failed to load JSON: " + this.jsonPath, e);
                } else {
                    cc.log("CustomElementUI: Failed to load JSON " + this.jsonPath);
                }
            }
        }
    },

    /**
     * Play animation based on action type string
     * @param {string} actionType - One of CoreGame.ElementObject.ACTION_TYPE
     * @param {function} callback - Callback to execute when animation completes
     * @returns {number} duration of the animation
     */
    playAnimation: function (actionType, state = "", callback = undefined) {
        if (this.lastActionName == "remove")
            return 0;
        // Try to play from custom animations loaded via Cocot
        // Note: Cocot.load_animations_from_meta already calls runAction on the node
        this.visualState = state
        actionType = state + actionType;
        if (this.animations) {
            var targetAnimKey = actionType;

            // Check if there's a group of randomized animations for this type
            if (this._animationGroups && this._animationGroups[actionType] && this._animationGroups[actionType].length > 0) {
                var group = this._animationGroups[actionType];
                var randomIndex = Math.floor(Math.random() * group.length); // Use standard Math.random for visual variance, or boardMgr.random if deterministic is strictly required
                if (this.element && this.element.boardMgr && this.element.boardMgr.random) {
                    randomIndex = this.element.boardMgr.random.nextInt32Bound(group.length);
                }
                targetAnimKey = group[randomIndex];
            }

            try {
                if (this.animations[targetAnimKey]) {
                    var action = this.animations[targetAnimKey];
                    var time = action.getDuration();
                    var speed = action.getTimeSpeed() || 1;
                    var duration = Math.max(0.2, time / 60 * speed);


                    if (this.animations[this.lastActionName])
                        this.animations[this.lastActionName].pause();
                    cc.log("CustomElementUI playAnimation: " + targetAnimKey);
                    this.lastActionName = targetAnimKey;
                    action.gotoFrameAndPlay(1, action.getDuration(), 0, false);

                    // Set last frame callback to automatically return to idle
                    action.setLastFrameCallFunc(this._onAnimationFinish.bind(this, actionType, callback));

                    this.setHijacked(false);

                    return duration;
                } else if (targetAnimKey === actionType) {
                    // If we couldn't find the exact animation and it wasn't a randomized key, finish immediately
                    if (callback) callback();
                    return 0;
                }
            }
            catch (e) {
                cc.log("Error playing animation " + targetAnimKey + ": " + e);
            }
            
        }

        // Fallback to main action if it has timelines
        if (this.mainAction && this.mainAction.play) {

            try {
                if (!this.mainAction.isDone() || !this.jsonNode.getActionByTag(this.mainAction.getTag())) {
                    this.jsonNode.runAction(this.mainAction);
                }
                this.lastActionName = actionType;
                this.mainAction.setLastFrameCallFunc(this._onAnimationFinish.bind(this, actionType, callback));
                this.mainAction.play(actionType, false);
                return 0; // Default duration for main action
            } catch (e) { }
        }

        return this._super(actionType, callback);
    },

    setHijacked: function (isHijacked = false) {
        this.hijackedAnimation = isHijacked;
    },

    /**
     * Internal helper called when an animation finishes
     * @private
     */
    _onAnimationFinish: function (actionType, callback) {
        if (!this.hijackedAnimation && this.animations && (this.animations["idle"] || this.animations["idle_0"]))
            this.playAnimation("idle", this.visualState);

        if (callback) callback();
    },

    playMatchAnim: function () {
        return 0;
    },

    /**
     * Play explode animation, when element is destroyed or damaged
     * BlockerUI or PowerUpUI can override this method
     */
    playExplodeEffect: function (hitpoints, row, col) {
        return 0;
    },

    playTakeDamageEffect: function (hitpoints, row, col) {
        return 0;
    },

    /**
     * Play destroy effect
     */
    playDestroyEffect: function () {
        return 0;
    },

    /**
     * Play drop bounce animation
     */
    playBounceAnim: function () {
        var scaleY1 = cc.scaleTo(0.05, 1.0, 0.9);
        var scaleY2 = cc.scaleTo(0.1, 1.0, 1.05);
        var scaleY3 = cc.scaleTo(0.05, 1.0, 1.0);
        this.runAction(cc.sequence(scaleY1, scaleY2, scaleY3));
        return 0.2;
    },

    onEnter: function () {
        this._super();
        this.playAnimation(CoreGame.ElementObject.ACTION_TYPE.SPAWN);
    }
});
