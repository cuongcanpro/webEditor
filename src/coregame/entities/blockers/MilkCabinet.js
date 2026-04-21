/**
 * MilkCabinet - Destructible 2x2 blocker
 * Part of Match-3 Core Game
 */
var CoreGame = CoreGame || {};

CoreGame.MilkCabinet = CoreGame.Blocker.extend({

    ctor: function () {
        this._super();
        this.layerBehavior = CoreGame.LayerBehavior.EXCLUSIVE;
        this.size = cc.size(2, 2); // 2x2
        this.addAction(CoreGame.ElementObject.ACTION_TYPE.SIDE_MATCH, new CoreGame.Strategies.TakeDamageAction());
    },

    /**
     * Initialize with hitPoints (Default 7)
     */
    init: function (row, col, type, hitPoints) {
        this._super(row, col, type, hitPoints);
        return this;
    },

    /**
     * Create specialized MilkCabinetUI
     */
    createUIInstance: function () {
        return new CoreGame.MilkCabinetUI(this);
    },

    /**
     * Get type name
     */
    getTypeName: function () {
        return 'milk_cabinet';
    }
});

// Register
if (CoreGame.Config.ElementType && CoreGame.Config.ElementType.MILK_CABINET) {
    CoreGame.ElementObject.register(CoreGame.Config.ElementType.MILK_CABINET, CoreGame.MilkCabinet);
}
