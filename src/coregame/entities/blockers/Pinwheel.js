/**
 * Pinwheel - Blocker that collects colors
 * Part of Match-3 Core Game
 */
var CoreGame = CoreGame || {};

CoreGame.Pinwheel = CoreGame.Blocker.extend({
    ctor: function () {
        this._super();
        this.layerBehavior = CoreGame.LayerBehavior.EXCLUSIVE; // 1x1 Content
        this.addAction(CoreGame.ElementObject.ACTION_TYPE.SIDE_MATCH, new CoreGame.Strategies.CollectTakeDamageAction([
            CoreGame.Config.ElementType.GREEN, // 1
            CoreGame.Config.ElementType.BLUE,  // 2
            CoreGame.Config.ElementType.RED,   // 3
            CoreGame.Config.ElementType.YELLOW  // 4
        ]));
    },

    /**
     * Initialize
     */
    init: function (row, col, type, hitPoints) {
        this._super(row, col, type, 4); // Max 4 colors
        return this;
    },

    /**
     * Create specialized PinwheelUI
     */
    createUIInstance: function () {
        return new CoreGame.PinwheelUI(this);
    },

    /**
     * Get type name
     */
    getTypeName: function () {
        return 'pinwheel';
    },

});

// Register
if (typeof BoardConst !== 'undefined' && CoreGame.Config.ElementType && CoreGame.Config.ElementType.PINWHEEL) {
    CoreGame.ElementObject.register(CoreGame.Config.ElementType.PINWHEEL, CoreGame.Pinwheel);
}
