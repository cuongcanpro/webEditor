/**
 * SpawnStrategy.js
 * Base class for gem spawn strategies.
 *
 * Subclasses must override getGemType() to return the element type ID
 * for a gem about to be spawned into the given board position.
 *
 * Usage:
 *   CoreGame.MyStrategy = CoreGame.SpawnStrategy.extend({
 *       getGemType: function (row, col, boardMgr) { ... }
 *   });
 *   boardMgr.dropMgr.setSpawnStrategy(new CoreGame.MyStrategy());
 */
var CoreGame = CoreGame || {};

CoreGame.DropStrategy = CoreGame.DropStrategy || {};
CoreGame.DropStrategy.SpawnStrategy = cc.Class.extend({

    /**
     * Return the element type ID for a gem spawning at (row, col).
     * @param {number}   row       Grid row of the destination slot
     * @param {number}   col       Grid column of the destination slot
     * @param {BoardMgr} boardMgr  The active board manager
     * @returns {number} Element type ID (must be a valid gem type)
     */
    getGemType: function (row, col, boardMgr) {
        return -1;
    }
});
