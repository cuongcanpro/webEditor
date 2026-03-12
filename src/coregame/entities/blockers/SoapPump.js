/**
 * SoapPump - Spawns Soap on gems
 * Part of Match-3 Core Game
 */
var CoreGame = CoreGame || {};

CoreGame.SoapPump = CoreGame.Blocker.extend({

    // Config: number of soaps remaining to be spawned? Or handled by Board level config?
    // Legacy code used: board.getNumObjectiveRemain.
    // Here we focus on spawning logic.

    // Logic: Active logic (turn end?)

    ctor: function () {
        this._super();
        this.layerBehavior = CoreGame.LayerBehavior.EXCLUSIVE;
        this.size = cc.size(1, 2); // 1x2 (Width 1, Height 2 per Legacy)
    },

    /**
     * Initialize
     */
    init: function (row, col, type, hitPoints) {
        this._super(row, col, type, hitPoints);
        this.hitPoints = hitPoints || 3; // or whatever
        return this;
    },

    /**
     * Create specialized SoapPumpUI
     */
    createUIInstance: function () {
        return new CoreGame.SoapPumpUI(this);
    },

    /**
     * Get type name
     */
    getTypeName: function () {
        return 'soap_pump';
    },

    // Spray Logic
    activeSkill: function (targetGem) {
        if (!targetGem || !this.boardMgr) return;

        // 1. Create Soap Logic
        var soap = this.boardMgr.addNewElement(targetGem.position.x, targetGem.position.y, CoreGame.Config.ElementType.SOAP);

        // 2. Attach immediately (Logic Safety)
        targetGem.addAttachment(soap);

        // 3. Visual Handling
        // 3. Visual Handling
        if (soap.ui && this.ui) {
            soap.ui.setVisible(false); // Hide real soap

            // Calculate positions
            var startPos = this.ui.getPosition(); // Pump pos (local to board usually)
            // Need world pos? Or Board Node space. Both are in Board Node space usually.
            // But Pump 1x2 might be offset.

            var endPos = targetGem.ui ? targetGem.ui.getPosition() : this.boardMgr.gridToPixel(targetGem.position.x, targetGem.position.y);

            // Play Shoot Effect (Delegated to Pump Avatar or handled here)
            // Using Pump Avatar to coordinate
            if (this.ui.playShootEffect) {
                this.ui.playShootEffect(startPos, endPos, function () {
                    soap.ui.setVisible(true);
                    if (soap.ui.playAppearAnim) soap.ui.playAppearAnim();
                });
            } else {
                // Fallback immediate
                soap.ui.setVisible(true);
            }
        }
    }
});

/**
 * Handle turn end logic for Pump
 */
CoreGame.SoapPump.onTurnEnd = function (pumps, context) {
    if (!pumps || pumps.length === 0) return;
    var boardMgr = context.boardMgr;

    // Config: Max soaps? Check Legacy: `getNumObjectiveRemain`. 
    // We'll spray X soaps per pump or total? Legacy: 3 total per turn usually.
    // Let's spray 1 per pump for simplicity or loop.

    // Find all valid targets
    var candidates = [];
    for (var r = 0; r < boardMgr.rows; r++) {
        for (var c = 0; c < boardMgr.cols; c++) {
            var slot = boardMgr.getSlot(r, c);
            var gem = slot.getMatchableElement();
            // Check if gem and NO soap attachment
            // Gem must be idle?
            if (gem && gem.type <= 6 && (!gem.attachments || gem.attachments.length === 0)) {
                candidates.push(gem);
            }
        }
    }

    if (candidates.length === 0) return;

    // Shuffle candidates
    // candidates.sort(() => Math.random() - 0.5); 

    for (var i = 0; i < pumps.length; i++) {
        var pump = pumps[i];

        // Logic: 1 shot per pump?
        if (candidates.length > 0) {
            var idx = this.boardMgr.random.nextInt32Bound(candidates.length);
            var target = candidates[idx];
            candidates.splice(idx, 1);

            pump.activeSkill(target);
        }
    }
};

// Register
if (typeof BoardConst !== 'undefined' && CoreGame.Config.ElementType && CoreGame.Config.ElementType.SOAP_PUMP) {
    CoreGame.ElementObject.register(CoreGame.Config.ElementType.SOAP_PUMP, CoreGame.SoapPump);
}
