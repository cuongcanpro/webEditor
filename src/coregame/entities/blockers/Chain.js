/**
 * Chain - Destructible blocker with multiple layers (chains)
 * Part of Match-3 Core Game
 */
var CoreGame = CoreGame || {};

CoreGame.Chain = CoreGame.Blocker.extend({
    configData: {
        maxHP: 2
    },
    ctor: function () {
        this._super();
        this.layerBehavior = CoreGame.LayerBehavior.OVERLAY;
        this.addAction(CoreGame.ElementObject.ACTION_TYPE.MATCH, new CoreGame.Strategies.TakeDamageAction());
        this.haveBaseAction[CoreGame.ElementObject.Action.MATCH] = 1;
    },

    /**
     * Initialize chain with level (hitPoints)
     */
    init: function (row, col, type, hitPoints) {
        this._super(row, col, type, hitPoints);
        return this;
    },

    /**
     * Create specialized ChainUI
     */
    createUIInstance: function () {
        return new CoreGame.ChainUI(this);
    },

    /**
     * Get type name
     */
    getTypeName: function () {
        return 'chain';
    }
});

// Register Chain
if (CoreGame.Config.ElementType && CoreGame.Config.ElementType.CHAIN) {
    CoreGame.ElementObject.register(CoreGame.Config.ElementType.CHAIN, CoreGame.Chain);
}
