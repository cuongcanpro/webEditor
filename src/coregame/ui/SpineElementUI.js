/**
 * SpineElementUI - Visual representation of game elements using Spine animations
 * Extends ElementUI to allow dynamic Spine resource assignment and animation control
 */
var CoreGame = CoreGame || {};

CoreGame.SpineElementUI = CoreGame.ElementUI.extend({
    spine: null,

    /**
     * @param {CoreGame.ElementObject} element - Reference to the logically represented element
     * @param {string} spinePath - Path to the Spine resource (without extension)
     */
    ctor: function (element, spinePath) {
        this.spinePath = spinePath;
        this._super(element);
    },

    /**
     * Override initSprite to create Spine animation instead of a standard sprite
     */
    initSprite: function () {
        cc.log("WHAT IS THIS SPINE", cc.log(this.spinePath));
        var spinePath = this.spinePath;
        if (spinePath) {
            if (typeof gv !== "undefined" && gv.createSpineAnimation) {
                this.spine = gv.createSpineAnimation(spinePath);
            } else if (typeof sp !== "undefined" && sp.SkeletonAnimation) {
                this.spine = new sp.SkeletonAnimation(spinePath + ".json", spinePath + ".atlas");
            }

            if (this.spine) {
                this.addChild(this.spine);
                this.spine.setScale(0.5); // Consistent with ElementUI scaling
            }
        }
    },

    /**
     * Play animation based on action type string
     * @param {string} actionType - One of CoreGame.ElementObject.ACTION_TYPE
     * @returns {number} duration of the animation
     */
    playAnimation: function (actionType) {
        if (!this.spine) return this._super(actionType);

        // Use actionType directly as animation name
        var animationName = actionType;

        try {
            var entry = this.spine.setAnimation(0, animationName, false);
            if (entry) {
                // Return duration if available, else default to 0.2
                var duration = entry.duration || (entry.animation ? entry.animation.duration : 0.2);
                return duration;
            }
        } catch (e) {
            cc.log("SpineElementUI: Failed to play animation " + animationName);
        }

        // Fallback to base implementation if animation not found or failed
        return this._super(actionType);
    }
});
