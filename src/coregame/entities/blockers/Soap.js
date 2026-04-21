/**
 * Soap - Attachment blocker (Soap bubble on gem)
 * Part of Match-3 Core Game
 */
var CoreGame = CoreGame || {};

CoreGame.Soap = CoreGame.Blocker.extend({

    ctor: function () {
        this._super();
        this.layerBehavior = CoreGame.LayerBehavior.OVERLAY; // Above Element
        this.addAction(CoreGame.ElementObject.ACTION_TYPE.MATCH, new CoreGame.Strategies.TakeDamageAction());
        this.blockBaseAction[CoreGame.ElementObject.Action.SWAP] = 0;
        this.blockBaseAction[CoreGame.ElementObject.Action.DROP] = 0;
        this.blockBaseAction[CoreGame.ElementObject.Action.ACTIVE] = 0;
        this.blockBaseAction[CoreGame.ElementObject.Action.MATCH] = 0;
        this.haveBaseAction[CoreGame.ElementObject.Action.MATCH] = 1;
    },

    /**
     * Initialize
     */
    init: function (row, col, type,  hitPoints) {
        // type is SOAP
        this._super(row, col, type, hitPoints || 1);
        return this;
    },

    /**
     * Create specialized SoapUI
     */
    createUIInstance: function () {
        return new CoreGame.SoapUI(this);
    },

    /**
     * Get type name
     */
    getTypeName: function () {
        return 'soap';
    },

    // Override remove to notify holder
    // Base remove calls holder.removeAttachment which is good.
});

// Register
if (CoreGame.Config.ElementType && CoreGame.Config.ElementType.SOAP) {
    CoreGame.ElementObject.register(CoreGame.Config.ElementType.SOAP, CoreGame.Soap);
}
