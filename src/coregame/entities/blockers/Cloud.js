/**
 * Cloud - Destructible blocker that spreads
 * Part of Match-3 Core Game
 */
var CoreGame = CoreGame || {};

CoreGame.Cloud = CoreGame.DynamicBlocker.extend({
    isConnectedUI: true,

    ctor: function () {
        this._super();
        this.layerBehavior = CoreGame.LayerBehavior.OVERLAY;
        this.addAction(CoreGame.ElementObject.ACTION_TYPE.END_TURN, new CoreGame.Strategies.SpreadAction());
        this.addAction(CoreGame.ElementObject.ACTION_TYPE.SIDE_MATCH, new CoreGame.Strategies.TakeDamageAction());
        this.addAction(CoreGame.ElementObject.ACTION_TYPE.MATCH, new CoreGame.Strategies.TakeDamageAction());
        let action = new CoreGame.Strategies.SetDataAction();
        action.setConfigData({cooldownSpawn: 1});
        this.addAction(CoreGame.ElementObject.ACTION_TYPE.SIDE_MATCH, action);
        this.addAction(CoreGame.ElementObject.ACTION_TYPE.MATCH, action);
        // Note: turnFinished event is handled centrally by BoardMgr
        // No need to register individual listeners per Cloud instance
    },


    /**
     * Initialize cloud with level (hitPoints)
     */
    init: function (row, col, type, hitPoints, cells) {
        this._super(row, col, type, hitPoints, cells);
        return this;
    },

    /**
     * Create specialized CloudUI instance - Factory Method
     */
    createUIInstance: function () {
        return new CoreGame.CloudUI(this);
    },

    /**
     * Get type name
     */
    getTypeName: function () {
        return 'cloud';
    }
});

// Register Cloud
if (typeof BoardConst !== 'undefined' && CoreGame.Config.ElementType && CoreGame.Config.ElementType.CLOUD) {
    CoreGame.ElementObject.register(CoreGame.Config.ElementType.CLOUD, CoreGame.Cloud);
}

/**
 * Handle collective cloud logic at turn end
 */
CoreGame.Cloud.onTurnEnd = function (clouds, context) {
    // if (context.cloudExploded) return;


    var potentialSlots = [];
    var dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    var boardMgr = context.boardMgr;

    for (var i = 0; i < clouds.length; i++) {
        var cloud = clouds[i];
        for (var j = 0; j < dirs.length; j++) {
            var nr = cloud.position.x + dirs[j][0];
            var nc = cloud.position.y + dirs[j][1];
            var slot = boardMgr.getSlot(nr, nc);
            if (slot) {
                var gem = slot.getMatchableElement();
                // Spread to empty slot or slot with normal gem
                if (slot.isEmpty() || (gem && gem.type <= 6)) { // color gem types
                    if (potentialSlots.indexOf(slot) === -1) {
                        potentialSlots.push(slot);
                    }
                }
            }
        }
    }

    if (potentialSlots.length > 0) {
        cc.log("Cloud create ======== ");
        var targetSlot = potentialSlots[boardMgr.random.nextInt32Bound(potentialSlots.length)];
        targetSlot.clearElements();

        // Use addNewElement. Note: Ensure correct invalidation of "type" as hitPoints if necessary
        // Actually for Blockers, init usually takes hitPoints. 
        // If we want hp=1, we might need to be careful about create() signature matching init().
        // Cloud.init(row, col, hp). 
        // addNewElement(row, col, type, hp) -> create(row, col, type, hp) -> init(row, col, type, hp).
        // So hp becomes type. 
        // We might need to manually init OR rely on a fix in ElementObject.create?
        // Assuming we rely on manual fix for now to match old behavior:

        var newCloud = boardMgr.addNewElement(targetSlot.row, targetSlot.col, CoreGame.Config.ElementType.CLOUD, 1);
        // If Cloud.init took type as hp, we fix it:
        if (newCloud.hitPoints !== 1) newCloud.init(targetSlot.row, targetSlot.col, 1);

        if (typeof resSound !== 'undefined' && resSound.cloud_appear) {
            fr.Sound.playSoundEffect(resSound.cloud_appear, false);
        }
    }
};
