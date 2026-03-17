/**
 * YesPUSpawnL2.js
 * Level-2 Yes-PowerUp spawn strategy — maximizes PU creation opportunity.
 *
 * Level 1 (base): spawn gem that immediately creates PU from cascade.
 * Level 2 (this): additionally prefer gems that let the player create PU
 *                 with a single swap (one move ahead).
 *
 * Priority chain:
 *   1. L1-PU colors  (immediate cascade PU — strongest effect)
 *   2. L2-PU colors  (player can create PU with one swap)
 *   3. Random fallback
 *
 * Effect: Board is saturated with PU opportunities.
 *         Both cascade and player moves generate more power-ups.
 *
 * Usage:
 *   boardMgr.dropMgr.setSpawnStrategy(new CoreGame.DropStrategy.YesPUSpawnL2());
 */
var CoreGame = CoreGame || {};
CoreGame.DropStrategy = CoreGame.DropStrategy || {};

CoreGame.DropStrategy.YesPUSpawnL2 = CoreGame.DropStrategy.YesPUSpawnL1.extend({

    getGemType: function (row, col, boardMgr) {
        var numColors = CoreGame.Config.NUM_COLORS;
        var l1PU = [];    // immediate cascade PU
        var l2PU = [];    // one-swap PU (but not immediate)
        var neutral = []; // neither

        for (var t = 1; t <= numColors; t++) {
            if (this._wouldCreatePowerUp(row, col, t, boardMgr)) {
                l1PU.push(t);
            } else if (this._anySwapCreatesPowerUp(row, col, t, boardMgr)) {
                l2PU.push(t);
            } else {
                neutral.push(t);
            }
        }

        // Priority: L1 PU > L2 PU > neutral > random
        if (l1PU.length > 0) {
            return l1PU[boardMgr.random.nextInt32Bound(l1PU.length)];
        }
        if (l2PU.length > 0) {
            return l2PU[boardMgr.random.nextInt32Bound(l2PU.length)];
        }
        if (neutral.length > 0) {
            return neutral[boardMgr.random.nextInt32Bound(neutral.length)];
        }
        return boardMgr.random.nextInt32Bound(numColors) + 1;
    },

    /**
     * Returns true if swapping typeT at (row,col) with any adjacent neighbour
     * would create a PU pattern at either swapped position.
     */
    _anySwapCreatesPowerUp: function (row, col, typeT, boardMgr) {
        var grid = boardMgr.mapGrid;
        var rows = boardMgr.rows;
        var cols = boardMgr.cols;
        var dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];

        for (var d = 0; d < dirs.length; d++) {
            var nr = row + dirs[d][0];
            var nc = col + dirs[d][1];
            if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
            var nSlot = grid[nr][nc];
            if (!nSlot || !nSlot.enable) continue;
            var typeN = nSlot.getType();
            if (typeN < 0) continue;

            if (this._swapCreatesPowerUp(row, col, typeT, nr, nc, typeN, boardMgr)) {
                return true;
            }
        }
        return false;
    },

    /**
     * Simulates swap: T lands at (nr,nc), N lands at (row,col).
     * Returns true if either position forms a PU pattern.
     */
    _swapCreatesPowerUp: function (row, col, typeT, nr, nc, typeN, boardMgr) {
        var grid = boardMgr.mapGrid;
        var rows = boardMgr.rows;
        var cols = boardMgr.cols;

        var getType = function (r, c) {
            if (r < 0 || r >= rows || c < 0 || c >= cols) return -1;
            if (r === nr && c === nc)   return typeT;
            if (r === row && c === col) return typeN;
            var slot = grid[r][c];
            return (slot && slot.enable) ? slot.getType() : -1;
        };

        return this._checkPowerUpAt(nr, nc, typeT, getType, rows, cols) ||
               this._checkPowerUpAt(row, col, typeN, getType, rows, cols);
    },

    /**
     * Returns true if `type` at (r,c) forms a PU pattern.
     * Checks: 4+ line, L/T shape (3h ∩ 3v), 2×2 square.
     */
    _checkPowerUpAt: function (r, c, type, getType, rows, cols) {
        var countDir = function (dr, dc) {
            var n = 0, rr = r + dr, cc = c + dc;
            while (rr >= 0 && rr < rows && cc >= 0 && cc < cols && getType(rr, cc) === type) {
                n++; rr += dr; cc += dc;
            }
            return n;
        };

        var hRun = countDir(0, -1) + countDir(0, 1) + 1;
        var vRun = countDir(-1, 0) + countDir(1, 0) + 1;

        if (hRun >= 4) return true;
        if (vRun >= 4) return true;
        if (hRun >= 3 && vRun >= 3) return true;

        var squares = [
            [[0, 0], [0, 1], [1, 0], [1, 1]],
            [[0, -1], [0, 0], [1, -1], [1, 0]],
            [[-1, 0], [-1, 1], [0, 0], [0, 1]],
            [[-1, -1], [-1, 0], [0, -1], [0, 0]]
        ];
        for (var s = 0; s < squares.length; s++) {
            var sq = squares[s];
            var allMatch = true;
            for (var k = 0; k < 4; k++) {
                if (getType(r + sq[k][0], c + sq[k][1]) !== type) {
                    allMatch = false; break;
                }
            }
            if (allMatch) return true;
        }
        return false;
    }
});
