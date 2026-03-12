/**
 * BiasedSpawnStrategy.js
 * Spawn strategy that biases new gem colors toward the currently dominant color
 * on the board, making it easier to create matches.
 *
 * Algorithm (mirrors engine.py _refill bias logic):
 *   1. Count how many of each color is currently on the board.
 *   2. Find the most-frequent color (dominant color).
 *   3. Multiply that color's spawn weight by `biasWeight`.
 *   4. Draw from the resulting weighted distribution.
 *
 * biasWeight > 1.0 → dominant color spawns more often  (default: 2.0)
 * biasWeight = 1.0 → uniform (same as RandomSpawnStrategy)
 * biasWeight < 1.0 → dominant color spawns less often
 * biasWeight = 0.0 → dominant color never spawns
 *
 * Usage:
 *   var strategy = new CoreGame.BiasedSpawnStrategy();
 *   strategy.biasWeight = 3.0;           // optional, tune strength
 *   boardMgr.dropMgr.setSpawnStrategy(strategy);
 */
var CoreGame = CoreGame || {};
CoreGame.DropStrategy = CoreGame.DropStrategy || {};
CoreGame.DropStrategy.BiasedSpawnStrategy = CoreGame.DropStrategy.SpawnStrategy.extend({

    /**
     * Multiplier applied to the dominant color's base weight of 1.0.
     * Tune this to control how strongly the bias pulls toward the dominant color.
     */
    biasWeight: 2.0,

    /**
     * Return a weighted-random gem type, biased toward the board's dominant color.
     * @param {number}   row
     * @param {number}   col
     * @param {BoardMgr} boardMgr
     * @returns {number} Gem type in [1, NUM_COLORS]
     */
    getGemType: function (row, col, boardMgr) {
        var numColors = CoreGame.Config.NUM_COLORS;
        var i;

        // 1. Count each gem color currently on the board
        var counts = this._countBoardColors(boardMgr, numColors);

        // 2. Find the dominant color (1-indexed)
        var maxCount      = 0;
        var dominantColor = -1;
        for (i = 1; i <= numColors; i++) {
            var n = counts[i] || 0;
            if (n > maxCount) {
                maxCount      = n;
                dominantColor = i;
            }
        }

        // 3. Build weight array — uniform base, then boost the dominant color
        var weights = [];
        for (i = 0; i < numColors; i++) {
            weights[i] = 1.0;
        }
        if (dominantColor >= 1) {
            weights[dominantColor - 1] *= this.biasWeight;
        }

        // 4. Weighted random selection using the board's seeded RNG
        var totalWeight = 0;
        for (i = 0; i < numColors; i++) totalWeight += weights[i];

        var pick       = boardMgr.random.nextFloat32() * totalWeight;
        var cumulative = 0;
        for (i = 0; i < numColors; i++) {
            cumulative += weights[i];
            if (pick < cumulative) return i + 1;
        }
        return numColors;   // fallback (floating-point edge case)
    },

    /**
     * Scan the grid and return a map of { gemType: count }.
     * Only counts standard gem colors in [1, numColors].
     * Uses GridSlot.getType() which returns -1 for empty/blocker slots.
     * @param {BoardMgr} boardMgr
     * @param {number}   numColors
     * @returns {Object}
     */
    _countBoardColors: function (boardMgr, numColors) {
        var counts = {};
        var rows = boardMgr.rows;
        var cols = boardMgr.cols;

        for (var r = 0; r < rows; r++) {
            for (var c = 0; c < cols; c++) {
                var slot = boardMgr.mapGrid[r][c];
                if (!slot || !slot.enable) continue;
                var type = slot.getType();
                if (type >= 1 && type <= numColors) {
                    counts[type] = (counts[type] || 0) + 1;
                }
            }
        }
        return counts;
    }
});
