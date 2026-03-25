/**
 * YesPUSpawnL1.js
 * Level-1 Yes-PowerUp spawn strategy — encourages PU creation from cascade.
 *
 * Algorithm:
 *   1. For each color, check if placing it at (row, col) would immediately
 *      create a power-up pattern (4+ line, L/T shape, 2×2 square).
 *   2. Prefer colors that create PU (pick randomly among them).
 *   3. If none creates PU, fall back to random.
 *
 * Effect: Cascade is MORE LIKELY to generate power-ups naturally.
 *         Player benefits from "free" PU drops without spending moves.
 *
 * Usage:
 *   boardMgr.dropMgr.setSpawnStrategy(new CoreGame.DropStrategy.YesPUSpawnL1());
 */
var CoreGame = CoreGame || {};
CoreGame.DropStrategy = CoreGame.DropStrategy || {};

CoreGame.DropStrategy.YesPUSpawnL1 = CoreGame.DropStrategy.SpawnStrategy.extend({

    getGemType: function (row, col, boardMgr) {
        var types = this._gemTypes(boardMgr);
        var puTypes  = [];  // types that immediately form PU
        var safeTypes = []; // types that don't

        for (var i = 0; i < types.length; i++) {
            if (this._wouldCreatePowerUp(row, col, types[i], boardMgr)) {
                puTypes.push(types[i]);
            } else {
                safeTypes.push(types[i]);
            }
        }

        // Prefer PU-creating types
        if (puTypes.length > 0) {
            return puTypes[boardMgr.random.nextInt32Bound(puTypes.length)];
        }
        // Fallback: random from safe
        if (safeTypes.length > 0) {
            return safeTypes[boardMgr.random.nextInt32Bound(safeTypes.length)];
        }
        return types[boardMgr.random.nextInt32Bound(types.length)];
    },

    /**
     * Returns true if placing `type` at (row, col) would create any PU pattern.
     * Checks: 4+ line, L/T shape (3h ∩ 3v), 2×2 square.
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

        var hRun = countDir(0, -1) + countDir(0, 1) + 1;
        var vRun = countDir(-1, 0) + countDir(1, 0) + 1;

        if (hRun >= 4) return true;
        if (vRun >= 4) return true;
        if (hRun >= 3 && vRun >= 3) return true;

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
