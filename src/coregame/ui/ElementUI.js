/**
 * ElementUI - Visual representation of game elements
 * Wraps Cocos2d-JS Sprite for rendering
 * Part of Match-3 Core Game
 */
var CoreGame = CoreGame || {};

CoreGame.ElementUI = cc.Node.extend({
    element: null,  // Reference to ElementObject
    sprite: null,   // Visual sprite
    type: 0,
    isElementUI: true,

    ctor: function (element) {
        this._super();
        this.element = element;
        this.type = element.type;
        if (this.type == -1)
            return true;
        this.setCascadeOpacityEnabled(true);

        this.initSprite();

        this.lbState = ccui.Text.create("", "font/BalooPaaji2-Bold.ttf", 20);
        this.lbState.enableOutline(cc.color(50, 50, 50), 2);
        this.lbState.setPosition(cc.p(0, -30));
        this.addChild(this.lbState, 100);
        this.lbState.setVisible(false);

        return true;
    },

    /**
     * Initialize the visual sprite.
     * Overwrite in subclasses to provide custom visuals.
     */
    initSprite: function () {
        var fileName;
        if (CoreGame.ElementObject.map[this.type])
            fileName = "res/high/game/element/" + this.type + ".png";
        else
            fileName = "res/high/game/element/7.png";
        this.sprite = new cc.Sprite(fileName);
        this.addChild(this.sprite);
    },

    updateLabelState: function (content) {
        this.lbState.setString(content);
    },

    updateVisual: function () {
        // cc.log("Type " + this.element.type);
        // this.lbState.setString(this.element.hitPoints);
    },

    /**
     * Collect a type/color (for collect-based blockers like Pinwheel)
     * Override in subclasses to implement collection animations
     * @param {number} typeId - Type ID being collected
     */
    collectType: function (typeId) {
        // Base implementation - override in subclasses
    },

    /**
     * Set the element this ui represents
     */
    setElement: function (element) {
        this.element = element;
    },

    /**
     * Play match animation
     */
    playMatchAnim: function () {
        return this.playDestroyEffect();
    },

    /**
     * Play explode animation, when element is destroyed or damaged
     * BlockerUI or PowerUpUI can override this method
     */
    playExplodeEffect: function (hitpoints, row, col) {
        //Debris
        fr.platformWrapper.hapticTouch(HAPTIC_TOUCH_TYPE.LIGHT);

        if (this.type < debris_type_name.length) {
            let parent = this.getParent()
            this.setVisible(false);
            let nodeTLFX = gv.createTLFX(
                debris_type_name[this.type],
                UIUtils.getWorldPosition(this),
                parent,
                10
            );
            nodeTLFX.setScale(2 + Math.random() * 0.5);
        }
        //Debris

        var scaleUp = cc.scaleTo(0.1, 1.2);
        var scaleDown = cc.scaleTo(0.1, 0);
        this.runAction(cc.sequence(scaleUp, scaleDown));
        return 0.2;
    },

    playTakeDamageEffect: function (hitpoints, row, col) {
        var scaleUp = cc.scaleTo(0.1, 1.2);
        var scaleDown = cc.scaleTo(0.1, 1.0);
        this.runAction(cc.sequence(scaleUp, scaleDown));
        return 0.2;
    },

    /**
     * Play destroy effect
     */
    playDestroyEffect: function () {
        this.runAction(cc.sequence(
            cc.scaleTo(CoreGame.Config.DESTROY_DURATION, 0).easing(cc.easeBackIn()),
            cc.callFunc(this.efxDebris.bind(this))
        ));

        return CoreGame.Config.DESTROY_DURATION * 1.5;
    },

    /**
     * The UI explode into little pieces
     */
    efxDebris: function () {
        if (this.type < debris_type_name.length) {
            fr.platformWrapper.hapticTouch(HAPTIC_TOUCH_TYPE.LIGHT);

            //More debris?
            let numDebris = 2;
            for (let i = 0; i < numDebris; i++) {
                let pos = UIUtils.getWorldPosition(this);
                pos.x += (0.5 - Math.random()) * 20;
                pos.y += (0.5 - Math.random()) * 20;
                let nodeTLFX = gv.createTLFX(
                    debris_type_name[this.type],
                    pos,
                    this.getParent(),
                    BoardConst.zOrder.EFF_EXPLODE
                );
                nodeTLFX.setScale(1.5 + Math.random() * 0.5);
            }
        }
    },

    /**
     * Play drop bounce animation
     */
    playBounceAnim: function () {
        // var scaleY1 = cc.scaleTo(0.05, 1.0, 0.9);
        // var scaleY2 = cc.scaleTo(0.1, 1.0, 1.05);
        // var scaleY3 = cc.scaleTo(0.05, 1.0, 1.0);
        // this.runAction(cc.sequence(scaleY1, scaleY2, scaleY3));
        return 0.2;
    },

    /**
     * Play swap animation to target position
     */
    playSwapAnim: function (targetPos, duration) {
        this.stopActionByTag(CoreGame.TAG_MOVE_ACTION);
        var move = cc.moveTo(duration, targetPos);
        move.setTag(CoreGame.TAG_MOVE_ACTION);
        this.runAction(move);
        return duration;
    },

    /**
     * Play move animation to target position
     */
    playMoveToAnim: function (targetPos, duration, delayTime = 0) {
        this.stopActionByTag(CoreGame.TAG_MOVE_ACTION);

        var move = cc.sequence(
            cc.delayTime(delayTime),
            cc.moveTo(duration, targetPos).easing(cc.easeIn(2.5))
        );
        move.setTag(CoreGame.TAG_MOVE_ACTION);
        this.runAction(move);

        return duration + delayTime;
    },

    /**
     * Play drop animation to target position
     */
    playDropToAnim: function (targetPos, duration, delayTime = 0) {
        this.stopActionByTag(CoreGame.TAG_MOVE_ACTION);

        let extraBounce = 5;
        let bouncePos = cc.p(targetPos.x, targetPos.y + extraBounce);
        let speed = Math.abs(this.y - targetPos.y) / duration;
        var move = cc.sequence(
            cc.delayTime(delayTime),
            cc.moveTo(duration, targetPos).easing(cc.easeIn(1.5)),
            cc.moveTo(extraBounce / (speed * 0.25), bouncePos).easing(cc.easeOut(1.5)),
            cc.moveTo(extraBounce / (speed * 0.125), targetPos).easing(cc.easeIn(1.5))
        );
        move.setTag(CoreGame.TAG_MOVE_ACTION);
        this.runAction(move);

        return duration + delayTime + extraBounce / (speed * 0.25);
    },

    /**
     * Play move animation to target position and then move back
     */
    playMoveAnBackAnim: function (targetPos, originalPos, duration) {
        this.stopActionByTag(CoreGame.TAG_MOVE_ACTION);

        let seq = cc.sequence(
            cc.moveTo(duration, targetPos).easing(cc.easeIn(2.5)),
            cc.moveTo(duration, originalPos).easing(cc.easeOut(2.5))
        );

        seq.setTag(CoreGame.TAG_MOVE_ACTION);
        this.runAction(seq);
        return duration * 2;
    },

    /**
     * Play move animation to target position and then move back
     */
    playConvergeAnim: function (targetPos, duration) {
        this.stopActionByTag(CoreGame.TAG_MOVE_ACTION);

        var converge = cc.sequence(
            cc.moveTo(duration, targetPos).easing(cc.easeIn(2.5)),
            cc.hide()
        );
        converge.setTag(CoreGame.TAG_MOVE_ACTION);
        this.runAction(converge);

        return duration;
    },

    /**
     * Play fade in animation
     */
    playFadeInAnim: function (duration, delay = 0) {
        this.setOpacity(0);
        this.runAction(cc.sequence(
            cc.delayTime(delay),
            cc.fadeIn(duration).easing(cc.easeIn(2.5))
        ));

        return duration;
    },

    /**
     * Play invalid swap animation (shake)
     */
    playInvalidSwapAnim: function () {
        this.stopActionByTag(CoreGame.TAG_MOVE_ACTION);

        var originalPos = cc.p(0, 0);
        if (this.element && this.element.boardMgr) {
            originalPos = this.element.boardMgr.gridToPixel(this.element.position.x, this.element.position.y);
        }

        var shake1 = cc.moveTo(0.05, cc.p(originalPos.x - 5, originalPos.y));
        var shake2 = cc.moveTo(0.05, cc.p(originalPos.x + 5, originalPos.y));
        var shake3 = cc.moveTo(0.05, cc.p(originalPos.x - 5, originalPos.y));
        var shake4 = cc.moveTo(0.05, originalPos);

        var seq = cc.sequence(shake1, shake2, shake3, shake4);
        seq.setTag(CoreGame.TAG_MOVE_ACTION);
        this.runAction(seq);
        return 0.2;
    },

    /**
     * Play spawn animation
     */
    playSpawnAnim: function () {
        return 0;
    },

    /**
     * Highlight selection
     */
    showSelected: function () {
        this.setScale(1.1);
    },

    /**
     * Remove selection highlight
     */
    hideSelected: function () {
        this.setScale(1.0);
    },

    /**
     * Play hint animation
     */
    playHintAnim: function () {
        if (this.isHinting) return;
        this.isHinting = true;
        this.stopActionByTag(999);

        var scaleUp = cc.scaleTo(0.4, 1.15).easing(cc.easeSineOut());
        var scaleDown = cc.scaleTo(0.4, 1.0).easing(cc.easeSineIn());
        var seq = cc.sequence(scaleUp, scaleDown);
        var repeat = cc.repeatForever(seq);
        repeat.setTag(999);
        this.runAction(repeat);
    },

    /**
     * Stop hint animation
     */
    stopHintAnim: function () {
        if (!this.isHinting) return;
        this.isHinting = false;
        this.stopActionByTag(999);
        this.setScale(1.0);
    },

    /**
     * Play animation based on action type
     * @param {string} actionType - One of CoreGame.ElementObject.ACTION_TYPE
     * @returns {number} duration of the animation
     */
    playAnimation: function (actionType) {
        if (!this.element) return 0;

        switch (actionType) {
            case CoreGame.ElementObject.ACTION_TYPE.MATCH:
                return this.playMatchAnim();
            case CoreGame.ElementObject.ACTION_TYPE.SIDE_MATCH:
                return 0;
            case CoreGame.ElementObject.ACTION_TYPE.REMOVE:
                return this.playDestroyEffect();
            case CoreGame.ElementObject.ACTION_TYPE.SPAWN:
                return this.playSpawnAnim();
            default:
                return 0;
        }
    },
    setVisibleLbState: function (val) {
        this.lbState.setVisible(val);
    }
});

CoreGame.ElementUI.extendDefault = CoreGame.ElementUI.extend;