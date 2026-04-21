/**
 * Grass - Destructible blocker with connected borders
 * Part of Match-3 Core Game
 */
var CoreGame = CoreGame || {};

CoreGame.Grass = CoreGame.Blocker.extend({
    configData: {
        maxHP: 2
    },
    isConnectedUI: true, // Triggers border rendering updates
    ctor: function () {
        this._super();
        this.haveBaseAction[CoreGame.ElementObject.Action.MATCH] = 1;
        this.layerBehavior = CoreGame.LayerBehavior.BACKGROUND;
        this.addAction(CoreGame.ElementObject.ACTION_TYPE.MATCH, new CoreGame.Strategies.TakeDamageAction());
    },

    /**
     * Initialize grass with level (hitPoints)
     */
    init: function (row, col, type, hitPoints) {
        this._super(row, col, type, hitPoints);
        return this;
    },

    /**
     * Create specialized GrassUI
     */
    createUIInstance: function () {
        return new CoreGame.GrassUI(this);
    },

    /**
     * Get type name
     */
    getTypeName: function () {
        return 'grass';
    }
});

// Register Grass
if (CoreGame.Config.ElementType && CoreGame.Config.ElementType.GRASS) {
    CoreGame.ElementObject.register(CoreGame.Config.ElementType.GRASS, CoreGame.Grass);
}
