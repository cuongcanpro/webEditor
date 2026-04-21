/**
 * Cherry - Multi-layer Blocker
 * Part of Match-3 Core Game
 */
var CoreGame = CoreGame || {};

CoreGame.Cherry = CoreGame.Blocker.extend({

    // Config ? 

    ctor: function () {
        this._super();
        this.layerBehavior = CoreGame.LayerBehavior.EXCLUSIVE; // 1x1 Content
        this.addAction(CoreGame.ElementObject.ACTION_TYPE.SIDE_MATCH, new CoreGame.Strategies.TakeDamageAction());
        this.haveBaseAction[CoreGame.ElementObject.Action.SWAP] = 1;
        this.haveBaseAction[CoreGame.ElementObject.Action.DROP] = 1;
    },

    /**
     * Initialize
     */
    init: function (row, col, type, hitPoints) {
        this._super(row, col, type, hitPoints || 3); // Default HP 3
        return this;
    },

    /**
     * Create specialized CherryUI
     */
    createUIInstance: function () {
        return new CoreGame.CherryUI(this);
    },

    /**
     * Get type name
     */
    getTypeName: function () {
        return 'cherry';
    },
});

// Register
if (CoreGame.Config.ElementType && CoreGame.Config.ElementType.CHERRY) {
    CoreGame.ElementObject.register(CoreGame.Config.ElementType.CHERRY, CoreGame.Cherry);
}
