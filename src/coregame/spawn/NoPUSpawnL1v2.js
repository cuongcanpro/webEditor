/**
 * NoPUSpawnL1v2.js
 * Improved Level-1 No-PowerUp spawn strategy.
 *
 * Fixes from original NoPowerUpSpawnStrategy:
 *   - Added L-shape / T-shape detection (3h + 3v intersection = PU)
 *
 * Power-up patterns detected:
 *   1. Horizontal or vertical run of 4+ same-color gems (Stripe)
 *   2. 2×2 square of same-color gems (Bomb)
 *   3. L/T shape: ≥3 horizontal AND ≥3 vertical through same cell (Bomb/Wrap)
 *
 * Effect: Cascade will NOT create power-ups. Player must spend moves to create PU.
 *
 * Usage:
 *   boardMgr.dropMgr.setSpawnStrategy(new CoreGame.DropStrategy.NoPUSpawnL1v2());
 */
var CoreGame = CoreGame || {};
CoreGame.DropStrategy = CoreGame.DropStrategy || {};

CoreGame.DropStrategy.NoPUSpawnL1v2 = CoreGame.DropStrategy.SpawnStrategy.extend({

    getGemType: function (row, col, boardMgr) {
        var numColors = CoreGame.Config.NUM_COLORS;
        var safe = [];

        for (var t = 1; t <= numColors; t++) {
            if (!this._wouldCreatePowerUp(row, col, t, boardMgr)) {
                safe.push(t);
            }
        }

        if (safe.length === 0) {
            return boardMgr.random.nextInt32Bound(numColors) + 1;
        }
        return safe[boardMgr.random.nextInt32Bound(safe.length)];
    },

    /**
     * Returns true if placing `type` at (row, col) would create any PU pattern.
     * Checks: 4+ line, 2×2 square, L/T shape (3h ∩ 3v).
     */
    _wouldCreatePowerUp: function (row, col, type, boardMgr) {
        var grid = boardMgr.mapGrid;
        var rows = boardMgr.rows;
        var cols = boardMgr.cols;

        var getType = function (r, c) {
            if (r < 0 || r >= rows || c < 0 || c >= cols) return -1;
            if (r === row && c === col) return type;
            var slot = grid[r][c];
            return (slot && slot.enable) ? slot.getType() : -1;
        };

        var countDir = function (dr, dc) {
            var n = 0;
            var r = row + dr, c = col + dc;
            while (r >= 0 && r < rows && c >= 0 && c < cols && getType(r, c) === type) {
                n++; r += dr; c += dc;
            }
            return n;
        };

        var hRun = countDir(0, -1) + countDir(0, 1) + 1;  // horizontal count
        var vRun = countDir(-1, 0) + countDir(1, 0) + 1;   // vertical count

        // Check 1: 4+ in a line (Stripe / Color Bomb)
        if (hRun >= 4) return true;
        if (vRun >= 4) return true;

        // Check 2: L/T shape — both axes ≥ 3 at intersection (Bomb/Wrap)
        if (hRun >= 3 && vRun >= 3) return true;

        // Check 3: 2×2 square (Bomb)
        var squareOffsets = [
            [[0, 0], [0, 1], [1, 0], [1, 1]],
            [[0, -1], [0, 0], [1, -1], [1, 0]],
            [[-1, 0], [-1, 1], [0, 0], [0, 1]],
            [[-1, -1], [-1, 0], [0, -1], [0, 0]]
        ];
        for (var s = 0; s < squareOffsets.length; s++) {
            var offsets = squareOffsets[s];
            var allMatch = true;
            for (var k = 0; k < 4; k++) {
                if (getType(row + offsets[k][0], col + offsets[k][1]) !== type) {
                    allMatch = false; break;
                }
            }
            if (allMatch) return true;
        }

        return false;
    }
});
