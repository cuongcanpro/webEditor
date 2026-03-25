/**
 * RandomSpawnStrategy.js
 * Spawn strategy that picks a uniformly random gem color using the
 * board's seeded RNG (boardMgr.random).
 *
 * This is the default strategy used by DropMgr.
 */
var CoreGame = CoreGame || {};

CoreGame.DropStrategy = CoreGame.DropStrategy || {};
CoreGame.DropStrategy.RandomSpawnStrategy = CoreGame.DropStrategy.SpawnStrategy.extend({

    /**
     * @param {number}   row       (unused — color is position-independent)
     * @param {number}   col       (unused)
     * @param {BoardMgr} boardMgr
     * @returns {number} Random gem type in [1, NUM_COLORS]
     */
    getGemType: function (row, col, boardMgr) {
        var types = this._gemTypes(boardMgr);
        return types[boardMgr.random.nextInt32Bound(types.length)];
    }
});
