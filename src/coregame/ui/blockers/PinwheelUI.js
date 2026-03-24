/**
 * PinwheelUI - Visual for Pinwheel
 * Part of Match-3 Core Game
 */
var CoreGame = CoreGame || {};

CoreGame.PinwheelUI = CoreGame.ElementUI.extend({

    spineFx: null,
    colorSpines: null, // { colorId: spine }

    ctor: function (element) {
        this._super(element);
        this.colorSpines = {};
        // this.sprite.setScale(0.5);
        this.initSpine();
        return true;
    },

    initSpine: function () {
        if (typeof gv === 'undefined') return;

        // Base Spine (FX) - Background/Hub?
        var baseKey = 'spine_2300';
        if (resAni[baseKey]) {
            this.spineFx = gv.createSpineAnimation(resAni[baseKey] + "_fx");
            this.addChild(this.spineFx);
            this.spineFx.setAnimation(0, 'idle', true);
            this.spineFx.setScale(0.6); // Compromise
        }

        // Color Spines (Overlays)
        var colorMap = {
            1: "green",
            2: "blue",
            3: "red",
            4: "yellow"
        };

        for (var id in colorMap) {
            var suffix = colorMap[id];
            var key = '_' + suffix; // e.g. spine_2300_green

            var animName = "spine_2300";
            if (resAni[animName]) {
                var sp = gv.createSpineAnimation(resAni[animName] + key);
                this.addChild(sp);
                this.colorSpines[id] = sp;
                sp.setScale(0.6);
            }
        }

        // this.setScale(0.85);
        
    },

    /**
    * Collect a type/color and play animation
    * @param {number} typeId - The gem type/color being collected
    */
    collectType: function (typeId) {
        // Find mapping
        var colorMap = {
            1: "green",
            2: "blue",
            3: "red",
            4: "yellow"
        };
        cc.log("ColorId " + typeId);
        cc.log("Color Map " + colorMap);
        var suffix = colorMap[typeId];
        if (!suffix) return;

        var sp = this.colorSpines[typeId];
        if (sp) {
            // Play paint animation
            var animName = "paint_" + suffix;
            sp.setAnimation(0, animName, false);

            // Effect?
            if (typeof fr !== 'undefined') {
                fr.Sound.playSoundEffect(resSound.traffic_light, false); // Reuse sound or pinwheel sound
            }
        }
    },

    /**
     * Override destroy effect
     */
    playDestroyEffect: function (callback) {
        // Fly anim logic
        if (this.spineFx) {
            this.spineFx.setLocalZOrder(100);
            this.spineFx.setAnimation(0, "fly", true);

            // Hide colors
            for (var k in this.colorSpines) {
                this.colorSpines[k].setVisible(false);
            }

            var self = this;
            this.runAction(cc.sequence(
                cc.delayTime(0.5),
                cc.moveBy(0.5, cc.p(0, 800)).easing(cc.easeBackIn()),
                cc.callFunc(function () {
                    if (callback) callback();
                })
            ));
        } else {
            if (callback) callback();
        }
    },
});
