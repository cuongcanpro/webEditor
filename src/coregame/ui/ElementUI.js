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
        // cc.log("type nay === " + element.type);
        this._super();
        this.element = element;
        this.type = element.type;
        if (this.type == -1)
            return true;
        this.setCascadeOpacityEnabled(true);

        this.initSprite();

        // Add background if defined in configData (e.g. for blockers from mapID.json)
        if (this.element && this.element.configData && this.element.configData.grid_path) {
            var bgPath = this.element.configData.grid_path;
            try {
                this.sprBg = new cc.Scale9Sprite(bgPath);
                if (this.sprBg) {
                    var cellSize = CoreGame.Config.CELL_SIZE;
                    var elemSize = this.element.size || cc.size(1, 1);
                    this.sprBg.setContentSize(cellSize * elemSize.width, cellSize * elemSize.height);
                    this.addChild(this.sprBg, -1);
                    // cc.log("ElementUI: Added grid background:", bgPath);
                }
            } catch (e) {
                // cc.log("ElementUI: Failed to add grid background:", e);
            }
        }

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
        let path = "res/modules/game/element/";
        var fileName;
        if (CoreGame.ElementObject.map[this.type]) {
            fileName = this.type + ".png";
            if (this.type == 7) {
                fileName = "randomGem.png";
            }
        } else {
            fileName = "7.png";
        }

        this.sprite = gv.getSprite(fileName, path + fileName);
        this.sprite.setCascadeOpacityEnabled(true);
        this.addChild(this.sprite);

        //isGem
        if (this.type < 10 && this.type != 7) {
            //Add Shadow
            // this.shawdow = gv.getSprite(this.type + "_shadow.png");
            // this.sprite.addChild(this.shawdow, -1);
            // UIUtils.posToCenter(this.shawdow);
            // this.shawdow.y -= 5;

            //Glow
            this.glow = gv.getSprite(this.type + "_glow.png");
            this.glow.setBlendFunc(new cc.BlendFunc(cc.ONE, cc.ONE));
            this.glow.setVisible(false);
            this.sprite.addChild(this.glow);
            UIUtils.posToCenter(this.glow);

            this.sprite.setScale(CoreGame.ElementUI.GEM_SCALE);
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

        // Recycle old visuals to sprite pool
        if (this.shawdow) {
            gv.pushSprite(this.shawdow);
            this.shawdow = null;
        }
        if (this.glow) {
            gv.pushSprite(this.glow);
            this.glow = null;
        }
        if (this.sprite) {
            gv.pushSprite(this.sprite);
            this.sprite = null;
        }

        // Rebuild sprite from pool
        this.initSprite();
    },

    updateVisual: function () {
        // cc.log("Type " + this.element.type);
        // this.lbState.setString(this.element.hitPoints);
    },

    getElementPosition: function () {
        return this.element.boardMgr.gridToPixel(this.element.position.x, this.element.position.y);
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
        fr.Sound.playHaptic(HAPTIC_TOUCH_TYPE.LIGHT);

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
     * Spawn a floating damage number that drifts up and fades out.
     * Used for monster/boss hits to give clear feedback on lost HP.
     *
     * Damage aggregation: because the core damage model calls takeDamage(1)
     * one-per-hit, a burst (e.g. RainbowBomb clearing a boss) would spawn
     * many overlapping "1" labels. Instead we keep a single "active" label
     * per ElementUI; follow-up hits arriving inside the aggregation window
     * bump the existing label's number and give it a small pop so the
     * accumulation reads as one growing number.
     *
     * @param {number} amount - damage dealt (positive integer)
     */
    playLoseLifeEffect: function (amount) {
        var parent = this.getParent();
        if (!parent) return;

        var self = this;

        // Builds the "hold → rise → fade → cleanup" tail. Called on both
        // the initial spawn (after the pop-in) and on every increment so
        // the hold window is always reset — the player never misses the
        // final aggregated value because the label just got another bump.
        var scheduleHoldAndRise = function (lbl) {
            lbl.stopActionByTag(CoreGame.ElementUI.LOSE_LIFE_TAIL_TAG);

            var riseDist = 40 + Math.random() * 20;
            var riseTime = 0.7;

            var tail = cc.sequence(
                // Hold so bursts can accumulate; reset on each bump.
                cc.delayTime(CoreGame.ElementUI.LOSE_LIFE_AGGREGATE_TIME),
                // Drift up while fading.
                cc.spawn(
                    cc.moveBy(riseTime, cc.p(0, riseDist)).easing(cc.easeOut(2.0)),
                    cc.sequence(
                        cc.delayTime(riseTime * 0.4),
                        cc.fadeOut(riseTime * 0.6).easing(cc.easeIn(2.5))
                    )
                ),
                cc.callFunc(function () {
                    if (self._loseLifeLbl === lbl) {
                        self._loseLifeLbl = null;
                        self._loseLifeAccum = 0;
                    }
                }),
                cc.removeSelf()
            );
            tail.setTag(CoreGame.ElementUI.LOSE_LIFE_TAIL_TAG);
            lbl.runAction(tail);
        };

        // Zoom + slight tilt emphasis, used on both first spawn and on
        // every increment to pull the eye back to the changing number.
        // Tilt direction alternates each bump for a punchy shake feel.
        var playBumpEmphasis = function (lbl) {
            lbl.stopActionByTag(CoreGame.ElementUI.LOSE_LIFE_BUMP_TAG);
            self._loseLifeTiltSign = -(self._loseLifeTiltSign || 1);
            var tiltAngle = (15 + (Math.random() - 0.5) * 5) * self._loseLifeTiltSign;
            var bump = cc.sequence(
                cc.spawn(
                    cc.scaleTo(0.08, Math.max(lbl.getScale(), 1) * 1.1).easing(cc.easeOut(2.5)),
                    cc.rotateTo(0.08, tiltAngle).easing(cc.easeOut(2.5)),
                    cc.moveTo(0.08, lbl.rawPos).easing(cc.easeOut(2.5))
                )
            );
            bump.setTag(CoreGame.ElementUI.LOSE_LIFE_BUMP_TAG);
            lbl.runAction(bump);
        };

        // If a label is still accumulating, bump & reset its lifetime.
        if (this._loseLifeLbl && cc.sys.isObjectValid(this._loseLifeLbl)) {
            this._loseLifeAccum += amount;
            var lblExisting = this._loseLifeLbl;
            lblExisting.setString(String(this._loseLifeAccum));
            // Reset opacity in case the rise/fade had already begun.
            lblExisting.setOpacity(255);
            playBumpEmphasis(lblExisting);
            scheduleHoldAndRise(lblExisting);
            return;
        }

        var lbl = new cc.LabelBMFont(String(amount), "res/modules/font/gotHit.fnt");

        // Spawn slightly above element center, in parent space, with a tiny
        // random horizontal jitter so stacked labels across elements don't
        // fully overlap each other.
        var startPos = cc.p(
            this.getPositionX() + (Math.random() - 0.5) * 150,
            this.getPositionY() + (Math.random() - 0.5) * 50
        );
        lbl.setPosition(startPos);
        lbl.rawPos = lbl.getPosition();
        lbl.setScale(0);
        lbl.setOpacity(255);
        parent.addChild(lbl, CoreGame.Config.zOrder.MATCH_4_EXPLODE + 200);

        this._loseLifeLbl = lbl;
        this._loseLifeAccum = amount;
        this._loseLifeTiltSign = 1;

        // Pop-in, then the resettable tail. Pop-in runs untagged so the
        // bump-on-increment logic doesn't cancel it mid-entry.
        var popInTime = 0.15;
        lbl.runAction(cc.sequence(
            cc.scaleTo(popInTime, 1).easing(cc.easeBackOut()),
            cc.callFunc(function () {
                if (!cc.sys.isObjectValid(lbl)) return;
                scheduleHoldAndRise(lbl);
            })
        ));
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
            fr.Sound.playHaptic(HAPTIC_TOUCH_TYPE.LIGHT);

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
                    CoreGame.Config.zOrder.EFF_EXPLODE
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

        // Bounce height scales with drop distance for a natural feel
        var dropDist = Math.abs(this.y - targetPos.y);
        var bounceHeight = Math.min(dropDist * 0.06, 12);
        var bouncePos = cc.p(targetPos.x, targetPos.y + bounceHeight);
        var bounceUpTime = 0.08;
        var bounceDownTime = 0.06;

        // Diagonal drop: split into a vertical drop followed by an exact
        // 45° diagonal so the sideways motion is clearly visible and the
        // path geometry is predictable. Total duration is preserved.
        var absDx = Math.abs(targetPos.x - this.x);
        var absDy = Math.abs(this.y - targetPos.y);

        var dropAction;
        if (absDx > 0 && absDy > absDx) {
            // Intermediate point: directly above target by absDx pixels,
            // so leg 2 moves (absDx, -absDx) → exact 45° diagonal.
            var midPos = cc.p(this.x, targetPos.y + absDx);

            // Split duration proportional to vertical distance covered by each leg.
            var t1 = duration * (absDy - absDx) / absDy;
            var t2 = duration - t1;

            dropAction = cc.sequence(
                // Leg 1 — pure vertical drop, easeIn mimics gravity acceleration from rest.
                cc.moveTo(t1, midPos).easing(cc.easeIn(2.0)),
                // Leg 2 — exact 45° diagonal, linear keeps dx == dy throughout the leg.
                cc.moveTo(t2, targetPos)
            );
        } else {
            // Pure vertical drop (or degenerate dx >= dy case — fall back to single moveTo).
            // Quadratic easeIn mimics real gravity: position ∝ t²
            dropAction = cc.moveTo(duration, targetPos).easing(cc.easeIn(2.0));
        }

        var move = cc.sequence(
            cc.delayTime(delayTime),
            dropAction,
            // Impact bounce
            cc.moveTo(bounceUpTime, bouncePos).easing(cc.easeOut(2.0)),
            cc.moveTo(bounceDownTime, targetPos).easing(cc.easeIn(1.5)),
            // Squash on settle — offset Y down to fake bottom-anchor squash
            cc.spawn(
                cc.scaleTo(0.05, 1.05, 0.92),
                cc.moveBy(0.05, 0, -CoreGame.Config.CELL_SIZE * 0.04)
            ),
            cc.spawn(
                cc.scaleTo(0.08, 1.0, 1.0).easing(cc.easeOut(2.0)),
                cc.moveTo(0.08, targetPos).easing(cc.easeOut(2.0))
            )
        );
        move.setTag(CoreGame.TAG_MOVE_ACTION);
        this.runAction(move);

        return duration + delayTime + bounceUpTime + bounceDownTime;
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
     * Play hint animation — nudge this element toward `targetPos` and back,
     * repeating, to show the player which direction to swap.
     * If targetPos is omitted, falls back to the old pulse-scale behaviour.
     *
     * @param {cc.Point} [targetPos] pixel position of the partner slot.
     */
    playHintAnim: function (targetPos) {
        if (this.isHinting) return;
        this.isHinting = true;
        this.stopActionByTag(999);

        // Remember original position so stopHintAnim can snap back cleanly
        // even if the repeat is cut mid-motion.
        this._hintOriginalPos = cc.p(this.x, this.y);

        var repeatTimes = 3;
        var repeat;
        if (targetPos) {
            // Move ~nudgeFactor% of the way toward the partner, then back. This reads
            // as a clear directional nudge without the gem leaving its slot.
            var nudgeFactor = 0.15;
            var nudgeX = this._hintOriginalPos.x + (targetPos.x - this._hintOriginalPos.x) * nudgeFactor;
            var nudgeY = this._hintOriginalPos.y + (targetPos.y - this._hintOriginalPos.y) * nudgeFactor;

            var moveForward = cc.moveTo(CoreGame.ElementUI.HINT_TIME_EFX, cc.p(nudgeX, nudgeY)).easing(cc.easeSineIn());
            var moveBack = cc.moveTo(CoreGame.ElementUI.HINT_TIME_EFX, this._hintOriginalPos).easing(cc.easeSineOut());
            var hold = cc.delayTime(CoreGame.ElementUI.HINT_TIME_HOLD);
            var seq = cc.sequence(moveForward, moveBack, hold);
            repeat = seq.repeat(repeatTimes);
        } else {
            // Fallback pulse (no direction info available).
            var scaleUp = cc.scaleTo(CoreGame.ElementUI.HINT_TIME_EFX, 1.15).easing(cc.easeSineIn());
            var scaleDown = cc.scaleTo(CoreGame.ElementUI.HINT_TIME_EFX, 1.0).easing(cc.easeSineOut());
            var hold = cc.delayTime(CoreGame.ElementUI.HINT_TIME_HOLD);
            var pulseSeq = cc.sequence(scaleUp, scaleDown, hold);
            repeat = pulseSeq.repeat(repeatTimes);
        }
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
        if (this._hintOriginalPos) {
            this.setPosition(this._hintOriginalPos);
            this._hintOriginalPos = null;
        }
    },

    /**
     * Pulse the glow sprite to highlight this gem as part of the hinted match
     * pattern. Loops indefinitely until stopHintGlowAnim is called.
     */
    playHintGlowAnim: function () {
        if (!this.glow) return;
        if (this.isHintGlowing) return;
        this.isHintGlowing = true;

        this.glow.stopActionByTag(998);
        this.glow.setOpacity(0);
        this.glow.setVisible(true);

        var repeatTimes = 3;
        var fadeIn = cc.fadeTo(CoreGame.ElementUI.HINT_TIME_EFX, 25).easing(cc.easeSineOut());
        var fadeOut = cc.fadeTo(CoreGame.ElementUI.HINT_TIME_EFX, 0).easing(cc.easeSineIn());
        var hold = cc.delayTime(CoreGame.ElementUI.HINT_TIME_HOLD);
        var pulse = cc.sequence(fadeIn, fadeOut, hold).repeat(repeatTimes);
        pulse.setTag(998);
        this.glow.runAction(pulse);
    },

    /**
     * Stop glow pulse started by playHintGlowAnim.
     */
    stopHintGlowAnim: function () {
        if (!this.isHintGlowing) return;
        this.isHintGlowing = false;
        if (this.glow) {
            this.glow.stopActionByTag(998);
            this.glow.setOpacity(0);
            this.glow.setVisible(false);
        }
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

CoreGame.ElementUI.GEM_SCALE = 0.5;

CoreGame.ElementUI.HINT_TIME_EFX = 0.333;
CoreGame.ElementUI.HINT_TIME_HOLD = 0.15;

// How long the floating damage label stays in place before drifting up.
// During this window, subsequent takeDamage(1) calls aggregate into the
// same label instead of spawning duplicates. Long enough to catch a burst
// from a merge-PU cascade, short enough that distinct player actions feel
// like separate hits.
CoreGame.ElementUI.LOSE_LIFE_AGGREGATE_TIME = 0.35;
CoreGame.ElementUI.LOSE_LIFE_BUMP_TAG = 9921;
CoreGame.ElementUI.LOSE_LIFE_TAIL_TAG = 9922;
CoreGame.ElementUI.extendDefault = CoreGame.ElementUI.extend;