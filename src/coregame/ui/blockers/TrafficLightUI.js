/**
 * TrafficLightUI - Visual for TrafficLight (1x2)
 * Part of Match-3 Core Game
 */
var CoreGame = CoreGame || {};

CoreGame.TrafficLightUI = CoreGame.ElementUI.extend({

    anim: null,

    // Animation mappings
    // 1: Green, 2: Yellow, 3: Red (based on legacy)
    idleAnims: {
        1: "lamp_green_idle",
        2: "lamp_yellow_idle",
        3: "lamp_red_idle"
    },
    startAnims: {
        1: "lamp_green_start",
        2: "lamp_red_start",  // Legacy mapping seems swapped? Red start for ID 2? 
        3: "lamp_yellow_start"
    },

    ctor: function (element) {
        this._super(element);
        this.initSpine();
        this.updateVisual();
        return true;
    },

    initSpine: function () {
        // Create Sprite container
        this.spr = new cc.Sprite();
        this.addChild(this.spr);

        // Spine
        if (typeof gv !== 'undefined') {
            var key = 'spine_' + this.element.type; // e.g. spine_2200
            if (!resAni[key] && resAni.spine_2200) key = 'spine_2200'; // Fallback
            if (resAni[key]) {
                this.anim = gv.createSpineAnimation(resAni[key]);
                this.anim.setPosition(0, 0); // Center?
                this.spr.addChild(this.anim);
            }
        }

        this.spr.setPosition(0, 0); // 1x2 centering
    },

    updateVisual: function () {
        if (!this.anim) return;

        var idleMap = {
            1: "lamp_green_idle",
            2: "lamp_yellow_idle",
            3: "lamp_red_idle"
        };
        var startMap = {
            1: "lamp_green_start",
            2: "lamp_red_start",
            3: "lamp_yellow_start"
        };

        var startAnim = startMap[this.element.getNextTypeId()];
        var idleAnim = idleMap[this.element.getNextTypeId()];

        if (startAnim && idleAnim) {
            this.anim.setAnimation(0, startAnim, false);
            this.anim.addAnimation(0, idleAnim, true);
        } else if (idleAnim) {
            this.anim.setAnimation(0, idleAnim, true);
        }
    },

    playExplodeEffect: function () {
        // Effect
    }
});
