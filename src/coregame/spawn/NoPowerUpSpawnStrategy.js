/**
 * NoPowerUpSpawnStrategy.js
 * Spawn strategy that avoids placing a gem color that would immediately
 * create a power-up pattern with its neighbours.
 *
 * Power-up patterns (as defined by PatternFinder / MatchMgr):
 *   - Horizontal or vertical run of 4+ same-color gems
 *   - 2×2 square of same-color gems
 *
 * Algorithm:
 *   For each color in [1, NUM_COLORS], check whether placing it at
 *   (row, col) would form one of those patterns with the current board
 *   state.  Collect "safe" colors that do not trigger a power-up, then
 *   pick uniformly at random from that set.
 *   If every color would trigger a power-up (pathological board), fall
 *   back to a plain random color.
 *
 * Usage:
 *   boardMgr.dropMgr.setSpawnStrategy(new CoreGame.NoPowerUpSpawnStrategy());
 */
var CoreGame = CoreGame || {};
CoreGame.DropStrategy = CoreGame.DropStrategy || {};
CoreGame.DropStrategy.NoPowerUpSpawnStrategy = CoreGame.DropStrategy.SpawnStrategy.extend({

    /**
     * Return a gem type that will not form a power-up pattern at (row, col).
     * @param {number}   row
     * @param {number}   col
     * @param {BoardMgr} boardMgr
     * @returns {number} Gem type in [1, NUM_COLORS]
     */
    getGemType: function (row, col, boardMgr) {
        var numColors = CoreGame.Config.NUM_COLORS;
        var safe = [];

        for (var t = 1; t <= numColors; t++) {
            if (!this._wouldCreatePowerUp(row, col, t, boardMgr)) {
                safe.push(t);
            }
        }

        if (safe.length === 0) {
            // Every color would make a power-up — fall back to random
            return boardMgr.random.nextInt32Bound(numColors) + 1;
        }

        return safe[boardMgr.random.nextInt32Bound(safe.length)];
    },

    /**
     * Returns true if placing `type` at (row, col) would create a
     * 4-in-a-line or 2×2 square pattern (power-up triggers).
     */
    _wouldCreatePowerUp: function (row, col, type, boardMgr) {
        var grid = boardMgr.mapGrid;
        var rows = boardMgr.rows;
        var cols = boardMgr.cols;

        // Treat (row, col) as the candidate type; read real board elsewhere
        var getType = function (r, c) {
            if (r < 0 || r >= rows || c < 0 || c >= cols) return -1;
            if (r === row && c === col) return type;
            var slot = grid[r][c];
            return (slot && slot.enable) ? slot.getType() : -1;
        };

        // Count consecutive same-type in one direction
        var countDir = function (dr, dc) {
            var n = 0;
            var r = row + dr, c = col + dc;
            while (r >= 0 && r < rows && c >= 0 && c < cols && getType(r, c) === type) {
                n++;
                r += dr;
                c += dc;
            }
            return n;
        };

        // Horizontal run
        if (countDir(0, -1) + countDir(0, 1) + 1 >= 4) return true;

        // Vertical run
        if (countDir(-1, 0) + countDir(1, 0) + 1 >= 4) return true;

        // 2×2 square — check all four squares that include (row, col)
        var squareOffsets = [
            [[0, 0], [0, 1], [1, 0], [1, 1]],   // (row,col) is top-left
            [[0, -1], [0, 0], [1, -1], [1, 0]],  // (row,col) is top-right
            [[-1, 0], [-1, 1], [0, 0], [0, 1]],  // (row,col) is bottom-left
            [[-1, -1], [-1, 0], [0, -1], [0, 0]] // (row,col) is bottom-right
        ];

        for (var s = 0; s < squareOffsets.length; s++) {
            var offsets = squareOffsets[s];
            var allMatch = true;
            for (var k = 0; k < 4; k++) {
                if (getType(row + offsets[k][0], col + offsets[k][1]) !== type) {
                    allMatch = false;
                    break;
                }
            }
            if (allMatch) return true;
        }

        return false;
    }
});
