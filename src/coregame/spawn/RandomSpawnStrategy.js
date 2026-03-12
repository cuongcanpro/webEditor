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
        if (boardMgr && boardMgr.gemTypes && boardMgr.gemTypes.length > 0) {
            return boardMgr.gemTypes[boardMgr.random.nextInt32Bound(boardMgr.gemTypes.length)];
        }
        return boardMgr.random.nextInt32Bound(CoreGame.Config.NUM_GEN) + 1;
    }
});
