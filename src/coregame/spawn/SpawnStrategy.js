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
    },

    /**
     * Returns the list of gem type IDs that may be spawned.
     * Uses boardMgr.gemTypes when available, otherwise falls back to [1..NUM_COLORS].
     * @param {BoardMgr} boardMgr
     * @returns {number[]}
     */
    _gemTypes: function (boardMgr) {
        var base;
        if (boardMgr && boardMgr.gemTypes && boardMgr.gemTypes.length > 0) {
            base = boardMgr.gemTypes;
        } else {
            base = [];
            for (var i = 1; i <= CoreGame.Config.NUM_COLORS; i++) base.push(i);
        }
        // TPP color concentration: filter excluded colors if set
        var excl = boardMgr && boardMgr._tppExcludeColors;
        if (!excl || excl.length === 0) return base;
        var filtered = [];
        for (var j = 0; j < base.length; j++) {
            if (excl.indexOf(base[j]) === -1) filtered.push(base[j]);
        }
        return (filtered.length >= 3) ? filtered : base;
    }
});
