/**
 * Box - Destructible blocker element
 * Part of Match-3 Core Game
 */
var CoreGame = CoreGame || {};

CoreGame.Box = CoreGame.Blocker.extend({
    configData: {
        maxHP: 5
    },
    ctor: function () {
        this._super();
        this.layerBehavior = CoreGame.LayerBehavior.EXCLUSIVE;
        this.addAction(CoreGame.ElementObject.ACTION_TYPE.SIDE_MATCH, new CoreGame.Strategies.TakeDamageAction());
        this.addAction(CoreGame.ElementObject.ACTION_TYPE.MATCH, new CoreGame.Strategies.TakeDamageAction());
        this.haveBaseAction[CoreGame.ElementObject.Action.MATCH] = 1;
        cc.log("Action Enable ================ " + JSON.stringify(this.haveBaseAction));
    },

    /**
     * Create specialized BoxUI
     */
    createUIInstance: function () {
        return new CoreGame.BoxUI(this);
    },

    /**
     * Get type name
     */
    getTypeName: function () {
        return 'box';
    },

    hasAction: function (action) {
        cc.log("Action Enable " + JSON.stringify(this.haveBaseAction));
        return this._super(action);
    }
});

// Register Box
if (typeof BoardConst !== 'undefined' && CoreGame.Config.ElementType && CoreGame.Config.ElementType.BOX) {
    CoreGame.ElementObject.register(CoreGame.Config.ElementType.BOX, CoreGame.Box);
}
