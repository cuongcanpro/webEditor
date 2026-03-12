/**
 * Bush - 2x2 Destructible blocker that spawns Grass on destruction
 * Part of Match-3 Core Game
 */
var CoreGame = CoreGame || {};

CoreGame.Bush = CoreGame.Blocker.extend({

    ctor: function () {
        this._super();
        this.layerBehavior = CoreGame.LayerBehavior.EXCLUSIVE;
        this.haveBaseAction[CoreGame.ElementObject.Action.DROP] = 1;
        this.size = cc.size(2, 2); // 2x2
        //this.addAction(CoreGame.ElementObject.ACTION_TYPE.REMOVE, new CoreGame.Strategies.AroundSpawnElementAction(CoreGame.Config.ElementType.GRASS));
        //this.addAction(CoreGame.ElementObject.ACTION_TYPE.SIDE_MATCH, new CoreGame.Strategies.TakeDamageAction());
    },

    /**
     * Initialize with hitPoints (Default 3)
     */
    init: function (row, col, type, hitPoints) {
        this._super(row, col, type, hitPoints);
        this.hitPoints = hitPoints || 3;
        // this.type = CoreGame.Config.ElementType.BUSH; // Assumed defined
        return this;
    },

    /**
     * Create specialized BushUI
     */
    createUIInstance: function () {
        return new CoreGame.BushUI(this);
    },

    /**
     * Get type name
     */
    getTypeName: function () {
        return 'bush';
    }
});

// Register
if (typeof BoardConst !== 'undefined' && CoreGame.Config.ElementType && CoreGame.Config.ElementType.BUSH) {
    CoreGame.ElementObject.register(CoreGame.Config.ElementType.BUSH, CoreGame.Bush);
}
