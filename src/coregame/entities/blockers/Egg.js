/**
 * Egg - Destructible blocker that does not fall (Stationary)
 * Part of Match-3 Core Game
 */
var CoreGame = CoreGame || {};

CoreGame.Egg = CoreGame.Blocker.extend({
    configData: {
        maxHP: 1
    },

    ctor: function () {
        this._super();
        this.layerBehavior = CoreGame.LayerBehavior.EXCLUSIVE;
        this.addAction(CoreGame.ElementObject.ACTION_TYPE.SIDE_MATCH, new CoreGame.Strategies.TakeDamageAction());
        this.addAction(CoreGame.ElementObject.ACTION_TYPE.MATCH, new CoreGame.Strategies.TakeDamageAction());
        this.haveBaseAction[CoreGame.ElementObject.Action.DROP] = 1;
        this.haveBaseAction[CoreGame.ElementObject.Action.SWAP] = 1;
    },

    /**
     * Initialize Egg with level (hitPoints)
     */
    init: function (row, col, type, hitPoints) {
        this._super(row, col, type, hitPoints);
        return this;
    },

    /**
     * Create specialized EggUI
     */
    createUIInstance: function () {
        return new CoreGame.EggUI(this);
    },

    /**
     * Get type name
     */
    getTypeName: function () {
        return 'Egg';
    }
});

// Register Egg
if (typeof BoardConst !== 'undefined' && CoreGame.Config.ElementType && CoreGame.Config.ElementType.FABERGE_EGG) {
    CoreGame.ElementObject.register(CoreGame.Config.ElementType.FABERGE_EGG, CoreGame.Egg);
}
