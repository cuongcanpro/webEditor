/**
 * DonutUI - Visual representation of the Donut blocker.
 *
 * Sprite loaded from: res/high/game/element/1000.png  (via ElementUI default)
 * Collect animation: scale-down + fade-out when removed.
 *
 * Part of Match-3 Core Game
 */
var CoreGame = CoreGame || {};

CoreGame.DonutUI = CoreGame.ElementUI.extend({

    ctor: function (element) {
        this._super(element);
        return true;
    },

    /**
     * Called by doExplode → plays collect animation then signals removal.
     * Returns duration so TimedActionMgr can schedule the actual remove().
     */
    playAnimation: function (animationName) {
        if (animationName !== CoreGame.ElementObject.ACTION_TYPE.REMOVE) return 0;

        var duration = 0.3;
        if (this.sprite) {
            this.sprite.runAction(cc.sequence(
                cc.spawn(
                    cc.scaleTo(duration, 0),
                    cc.fadeOut(duration)
                )
            ));
        }
        return duration;
    }
});
