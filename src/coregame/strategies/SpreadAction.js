/**
 * SpreadAction - Strategy to spread elements to neighboring slots
 * Part of Match-3 Core Game
 */
var CoreGame = CoreGame || {};
CoreGame.Strategies = CoreGame.Strategies || {};

CoreGame.Strategies.SpreadAction = CoreGame.Strategies.NormalAction.extend({
    /**
     * Constructor
     */
    ctor: function () {
        this._super();
    },

    /**
     * Check if condition is met
     * @param {ElementObject} element - The element instance
     * @param {Object} context - Context data for evaluation
     * @returns {boolean} true if condition is met
     */
    checkCondition: function (element, context) {
        var boardMgr = element.boardMgr;

        // Prevent spread if this type was just removed (prevent instant respawn/infinite loop if needed)
        // Or specific rules (like limited spread per turn)
        // For now, simple check like RandomSpawnElementAction
        // cc.log("Check Condition " + JSON.stringify(boardMgr.removedElementTypes));
        // if (boardMgr.removedElementTypes && boardMgr.removedElementTypes.indexOf(element.type) !== -1) {
        //     return false;
        // }
        // return true;

        if (element.cooldownSpawn <= 0)
            return true;
        return false;
    },

    /**
     * Execute action
     * @param {ElementObject} element - The element instance that initiates the spread
     * @param {Object} context - Context data for execution
     */
    execute: function (element, context) {
        // Spread logic:
        // 1. Identify neighbors
        // 2. Filter valid targets (empty or penetrable)
        // 3. Pick one or more targets
        // 4. Transform target to element.type

        // Limit spread to one per turn globally? Or per element?
        // RandomSpawnElementAction used a static flag 'executedOnTurnEnd' to limit to 1 per turn total.
        // We might want to keep that if requested behavior is "End Turn Spread".
        // But "SpreadAction" sounds more generic. 
        // Let's implement generic spread logic here. If global limit is needed, manager should handle it.

        cc.log("SpreadAction execute", element.type);

        var boardMgr = element.boardMgr;
        if (!boardMgr) return;

        var potentialSlots = [];
        var dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];

        // Get cells of the current element (DynamicBlocker support)
        var cells = element.getGridCells();

        // Find neighbors of ALL occupied cells
        for (var i = 0; i < cells.length; i++) {
            var cell = cells[i];
            for (var j = 0; j < dirs.length; j++) {
                var nr = cell.x + dirs[j][0];
                var nc = cell.y + dirs[j][1];
                var slot = boardMgr.getSlot(nr, nc);

                if (slot) {
                    // Check if we can spread here
                    // Rule: Empty OR (Gem and type <= 6 i.e. basic color)
                    var gem = slot.getMatchableElement();
                    var canSpread = false;

                    if (slot.isEmpty()) {
                        canSpread = true;
                    } else if (gem && gem.type <= CoreGame.Config.NUM_COLORS) { // Basic gems
                        canSpread = true;
                    }

                    // Don't spread to self (if adjacent to another cell of self)
                    // (Slot check handles this generally as self occupies it)
                    if (canSpread) {
                        // Check duplications
                        if (potentialSlots.indexOf(slot) === -1) {
                            potentialSlots.push(slot);
                        }
                    }
                }
            }
        }

        if (potentialSlots.length > 0) {
            // Pick random target
            var targetSlot = potentialSlots[boardMgr.random.nextInt32Bound(potentialSlots.length)];

            // Effect
            if (typeof resSound !== 'undefined' && resSound.cloud_appear) {
                fr.Sound.playSoundEffect(resSound.cloud_appear, false);
            }

            // Clear target slot
            targetSlot.clearElements();

            // Handle spread differently based on blocker type
            if (element instanceof CoreGame.DynamicBlocker) {
                // DynamicBlocker: Add cell to expand the blocker
                element.addCell({
                    r: targetSlot.row,
                    c: targetSlot.col
                });
                cc.log("Spread: Added cell to DynamicBlocker at", targetSlot.row, targetSlot.col);
            } else {
                // Regular Blocker: Create new blocker instance at target slot
                var newBlocker = this.boardMgr.addNewElement(
                    targetSlot.row,
                    targetSlot.col,
                    element.type,
                    element.hitPoints
                );
                cc.log("Spread: Created new blocker at", targetSlot.row, targetSlot.col);
            }

            // Spawn new element
            // Note: If type is a Blocker, we need hitPoints.
            // If type is Cloud (DynamicBlocker), we need specific init?
            // For generic Spread, we assume HP=1 for new spawns or copy parent?
            // var hp = 1;
            // var newElement = boardMgr.addNewElement(targetSlot.row, targetSlot.col, this.type, hp);

            // // Visual effect
            // if (newElement && newElement.ui && newElement.ui.playSpawnAnim) {
            //     newElement.ui.playSpawnAnim();
            // }

        }

    }
});
