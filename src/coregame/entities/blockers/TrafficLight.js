/**
 * TrafficLight - 1x2 Blocker that requires specific color matches
 * Part of Match-3 Core Game
 */
var CoreGame = CoreGame || {};

CoreGame.TrafficLight = CoreGame.QueueBlocker.extend({

    ctor: function () {
        this._super();
        this.layerBehavior = CoreGame.LayerBehavior.EXCLUSIVE;
        this.size = cc.size(1, 2); // 1x2
        this.queueTypeIds = [3, 4, 1];
        // this.addAction(CoreGame.ElementObject.ACTION_TYPE.SIDE_MATCH, new CoreGame.Strategies.QueueTakeDamageAction([3, 2, 1]));
        this.addAction(CoreGame.ElementObject.ACTION_TYPE.SIDE_MATCH, new CoreGame.Strategies.TakeDamageAction());
    },

    /**
     * Create specialized Avatar
     */
    createUIInstance: function () {
        return new CoreGame.TrafficLightUI(this);
    },

    /**
     * Get type name
     */
    getTypeName: function () {
        return 'traffic_light';
    }
});

// Register
if (typeof BoardConst !== 'undefined' && CoreGame.Config.ElementType && CoreGame.Config.ElementType.TRAFFIC_LIGHT) {
    CoreGame.ElementObject.register(CoreGame.Config.ElementType.TRAFFIC_LIGHT, CoreGame.TrafficLight);
}
