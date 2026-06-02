/**
 * MilkCabinet - Destructible 2x2 blocker
 * Part of Match-3 Core Game
 */
var CoreGame = CoreGame || {};

CoreGame.MilkCabinet = CoreGame.Blocker.extend({

    // Visual (MilkCabinetUI) renders 1 door + 6 bottles = 7 destructible
    // states, so the meaningful HP ceiling is 7. Declaring our own configData
    // (instead of inheriting Blocker's shared {maxHP:1}) lets the level editor
    // expose the +/- HP picker up to 7, and keeps this cap independent of other
    // blocker types.
    configData: {
        maxHP: 7
    },

    ctor: function () {
        this._super();
        this.layerBehavior = CoreGame.LayerBehavior.EXCLUSIVE;
        this.size = cc.size(2, 2); // 2x2
        // SIDE_MATCH: adjacent gem matches damage the cabinet.
        this.addAction(CoreGame.ElementObject.ACTION_TYPE.SIDE_MATCH, new CoreGame.Strategies.TakeDamageAction());
        // MATCH: PUs (bomb/rocket/plane) sweep cells via matchElement() which
        // dispatches MATCH, not SIDE_MATCH. Without this the cabinet never takes PU
        // damage. PU activations are deduped per element in TakeDamageAction, so
        // registering both action types never double-damages for one activation.
        this.addAction(CoreGame.ElementObject.ACTION_TYPE.MATCH, new CoreGame.Strategies.TakeDamageAction());
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
