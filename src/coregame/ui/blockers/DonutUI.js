/**
 * DonutUI - Visual representation of the Donut blocker.
 *
 * Sprite loaded from: res/modules/game/element/1000.png  (via ElementUI default)
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
     * Initialize the visual sprite.
     * Overwrite in subclasses to provide custom visuals.
     */
    initSprite: function () {
        this._super();
        //Add Shadow
        this.shadow = gv.getSprite(this.type + "_shadow.png");
        this.sprite.addChild(this.shadow, -1);
        UIUtils.posToCenter(this.shadow);

        this.sprite.setScale(CoreGame.DonutUI.SCALE);
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
CoreGame.DonutUI.SCALE = 0.5;
