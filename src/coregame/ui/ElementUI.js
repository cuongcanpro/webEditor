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
        cc.log("type nay === " + element.type);
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
        let path = "res/high/game/element/";
        var fileName;
        if (CoreGame.ElementObject.map[this.type]) {
            fileName = this.type + ".png";
            if (this.type == 7) {
                fileName = "randomGem.png";
            }
        } else {
            fileName = "7.png";
        }

        this.sprite = fr.createSprite(fileName, path + fileName);
        this.sprite.setCascadeOpacityEnabled(true);
        this.addChild(this.sprite);

        //isGem
        if (this.type < 10 && this.type != 7) {
            //Add Shadow
            this.shawdow = fr.createSprite(this.type + "_shadow.png");
            this.sprite.addChild(this.shawdow, -1);
            UIUtils.posToCenter(this.shawdow);

            //Glow
            this.glow = fr.createSprite(this.type + "_glow.png");
            this.glow.setBlendFunc(new cc.BlendFunc(cc.ONE, cc.ONE));
            this.glow.setVisible(false);
            this.sprite.addChild(this.glow);
            UIUtils.posToCenter(this.glow);
        }
    },

    updateLabelState: function (content) {
        this.lbState.setString(content);
    },

    /**
     * Update visual to reflect a new gem type (used by shuffle).
     * Rebuilds the sprite, shadow, and glow for the new type.
     * @param {number} newType
     */
    updateType: function (newType) {
        this.type = newType;

        // Remove old visuals
        if (this.sprite) this.sprite.removeFromParent(true);
        if (this.shawdow) this.shawdow = null;
        if (this.glow) this.glow = null;

        // Rebuild sprite
        this.initSprite();
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

        let efxTime = 0.2;

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

        //Scale
        this.runAction(cc.sequence(
            cc.scaleTo(efxTime * 0.5, 1.2).easing(cc.easeIn(2.5)),
            cc.scaleTo(efxTime * 0.5, 0).easing(cc.easeOut(2.5))
        ));

        return efxTime;
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
        //Efx sparkle
        let pos = UIUtils.getWorldPosition(this);
        let nodeTLFX = gv.createTLFX(
            "fx_blink_meta",
            pos,
            this.getParent(),
            this.getLocalZOrder() - 1
        );
        nodeTLFX.setScale(0.5 + Math.random() * 0.1);

        this.runAction(cc.sequence(
            cc.scaleTo(CoreGame.Config.DESTROY_DURATION * 0.33, 1.5).easing(cc.easeIn(2.5)),
            cc.scaleTo(CoreGame.Config.DESTROY_DURATION * 0.67, 0).easing(cc.easeOut(2.5)),
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
    playMoveAnBackAnim: function (targetPos, originalPos, duration, isFront = false) {
        this.stopActionByTag(CoreGame.TAG_MOVE_ACTION);

        let seq = cc.sequence(
            cc.callFunc(function () {
                if (!isFront) {
                    this.setLocalZOrder(this.getLocalZOrder() - 1);
                }
            }.bind(this)),
            cc.moveTo(duration, targetPos).easing(cc.easeInOut(2.5)),
            cc.callFunc(function () {
                if (!isFront) {
                    this.setLocalZOrder(this.getLocalZOrder() + 1);
                }
            }.bind(this)),
            cc.moveTo(duration, originalPos).easing(cc.easeInOut(2.5))
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

        // Overshoot: pull back slightly away from target before converging
        var curPos = this.getPosition();
        var dx = targetPos.x - curPos.x;
        var dy = targetPos.y - curPos.y;
        var overshootPos = cc.p(curPos.x - dx * 0.15, curPos.y - dy * 0.15);

        var converge = cc.sequence(
            cc.moveTo(duration * 0.33, overshootPos).easing(cc.easeOut(2.5)),
            cc.moveTo(duration * 0.67, targetPos).easing(cc.easeIn(2.5)),
            cc.scaleTo(duration, 0).easing(cc.easeBackIn()),
            cc.hide()
        );
        converge.setTag(CoreGame.TAG_MOVE_ACTION);
        this.runAction(converge);

        //Flash
        if (this.glow) {
            this.glow.setOpacity(0);
            this.glow.setVisible(true);
            this.glow.runAction(cc.sequence(
                cc.delayTime(duration),
                cc.fadeIn(duration).easing(cc.easeOut(2.5))
            ));
        }

        //Hide shadow
        if (this.shawdow) {
            this.shawdow.runAction(
                cc.fadeOut(duration).easing(cc.easeOut(2.5))
            );
        }

        return duration * 2;
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
    },
    onExit: function () {
        this._super();
        if (this.element && this.element.onExit) {
            this.element.onExit();
        }
    }
});

CoreGame.ElementUI.extendDefault = CoreGame.ElementUI.extend;