/**
 * BoxUI - Specialized visual representation for Boxes
 * Part of Match-3 Core Game
 */
var CoreGame = CoreGame || {};

CoreGame.BoxUI = CoreGame.ElementUI.extend({
    ctor: function (element) {
        this._super(element);
        this.sprite.setScale(1.0);
    },

    /**
     * Update box sprite based on current hit points
     */
    updateVisual: function () {
        // Base type for Box is 700. Visual frames are 701, 702, ...
        var visualType = this.element.type + this.element.hitPoints;
        var fileName = "res/modules/game/element/" + visualType + ".png";
        if (this.sprite) {
            if (typeof fr !== 'undefined' && typeof fr.changeSprite === 'function') {
                fr.changeSprite(this.sprite, visualType + ".png", fileName);
            } else {
                var texture = cc.textureCache.addImage(fileName);
                if (texture) {
                    this.sprite.setTexture(texture);
                }
            }
        }
    },

    /**
     * Play explosion effect for Box
     */
    playTakeDamageEffect: function () {
        cc.log("playTakeDamageEffect ");
        var num = this.element.hitPoints <= 0 ? 1 : this.element.hitPoints;

        this.setVisible(this.element.hitPoints > 0);

        // Gentle shake: a few random nudges + small rotation wiggle that
        // eases back to the sprite's original position and angle.
        if (this.sprite && this.element.hitPoints > 0) {
            this.sprite.stopActionByTag(CoreGame.BoxUI.SHAKE_TAG);

            var amp = 2;       // max pixel offset per step
            var rotAmp = 4;    // max degrees per step
            var t = 0.06;      // per-step duration
            var steps = 3;     // number of random kicks

            // Build a random-direction path, then return to origin so the
            // sprite never drifts after the action completes.
            var totalDx = 0, totalDy = 0, totalDr = 0;
            var actions = [];
            var easings = [cc.easeSineOut(), cc.easeSineInOut(), cc.easeSineIn()];

            for (var i = 0; i < steps; i++) {
                // Pick a random 2D direction and angular direction. Using a
                // random angle keeps the motion varied each hit instead of a
                // predictable left/right wobble.
                var theta = Math.random() * Math.PI * 2;
                var mag = amp * (0.6 + Math.random() * 0.4);
                var dx = Math.cos(theta) * mag;
                var dy = Math.sin(theta) * mag;
                var dr = (Math.random() * 2 - 1) * rotAmp;

                totalDx += dx; totalDy += dy; totalDr += dr;

                var move = cc.moveBy(t, cc.p(dx, dy)).easing(easings[i % easings.length]);
                var rot = cc.rotateBy(t, dr).easing(easings[i % easings.length]);
                actions.push(cc.spawn(move, rot));
            }

            // Settle back: reverse the net offset / rotation over one step so
            // the sprite ends exactly where it started.
            var settle = cc.spawn(
                cc.moveBy(t, cc.p(-totalDx, -totalDy)).easing(cc.easeSineInOut()),
                cc.rotateBy(t, -totalDr).easing(cc.easeSineInOut())
            );
            actions.push(settle);

            var shake = cc.sequence(actions);
            shake.setTag(CoreGame.BoxUI.SHAKE_TAG);
            this.sprite.runAction(shake);

            // One-shot impact squash: pop up briefly then settle back. Runs
            // independently of the shake so the motion and the "hit felt"
            // scale beat layer cleanly. Cancel any in-flight pulse first so
            // rapid hits don't leave the sprite stuck scaled up.
            this.sprite.stopActionByTag(CoreGame.BoxUI.PULSE_TAG);
            var baseScale = this.sprite.getScale();
            var pulse = cc.sequence(
                cc.scaleTo(t, baseScale * 1.08).easing(cc.easeSineOut()),
                cc.scaleTo(t * 2, baseScale).easing(cc.easeSineIn())
            );
            pulse.setTag(CoreGame.BoxUI.PULSE_TAG);
            this.sprite.runAction(pulse);
        }

        // Sound effect
        if (typeof resSound !== 'undefined' && resSound["box_0" + num]) {
            fr.Sound.playSoundEffect(resSound["box_0" + num], false);
        }

        // Visual effect (VFX)
        // if (cc.sys.platform == cc.sys.WIN32 && typeof gv !== 'undefined' && gv.isForGD) return;

        if (this.getParent()) {
            let posEff = this.getParent().convertToWorldSpace(this.getPosition());
            if (typeof gv !== 'undefined' && typeof gv.createTLFX === 'function') {
                gv.createTLFX(
                    "run" + num,
                    posEff,
                    this.getParent(),
                    CoreGame.Config.zOrder.MATCH_4_EXPLODE + 10
                );
            }
        }
    },

    playAnimation: function (animationName) {
        this.playTakeDamageEffect();
    }
});

// Action tag for the take-damage shake so repeated hits cancel the previous
// shake cleanly instead of stacking (which would drift the sprite off-origin).
CoreGame.BoxUI.SHAKE_TAG = 7101;
CoreGame.BoxUI.PULSE_TAG = 7102;
