/**
 * NoPUSpawnL2v2.js
 * Improved Level-2 No-PowerUp spawn strategy.
 *
 * Extends NoPUSpawnL1v2 (which includes L/T shape detection).
 *
 * Level 1 (base): Spawned gem won't immediately form a PU pattern (cascade-safe).
 * Level 2 (this): Even swapping the new gem with any adjacent neighbour won't
 *                 create a PU. Player cannot create PU in one move with this gem.
 *
 * Fallback chain: L2-safe → L1-safe → random
 *
 * Usage:
 *   boardMgr.dropMgr.setSpawnStrategy(new CoreGame.DropStrategy.NoPUSpawnL2v2());
 */
var CoreGame = CoreGame || {};
CoreGame.DropStrategy = CoreGame.DropStrategy || {};

CoreGame.DropStrategy.NoPUSpawnL2v2 = CoreGame.DropStrategy.NoPUSpawnL1v2.extend({

    getGemType: function (row, col, boardMgr) {
        var types = this._gemTypes(boardMgr);

        // Step 1: L1-safe types (no immediate PU at spawn position)
        var l1Safe = [];
        for (var i = 0; i < types.length; i++) {
            if (!this._wouldCreatePowerUp(row, col, types[i], boardMgr)) {
                l1Safe.push(types[i]);
            }
        }

        // Step 2: L2-safe types (no PU even after one swap)
        var l2Safe = [];
        for (var j = 0; j < l1Safe.length; j++) {
            if (!this._anySwapCreatesPowerUp(row, col, l1Safe[j], boardMgr)) {
                l2Safe.push(l1Safe[j]);
            }
        }

        // Step 3: pick with fallback
        if (l2Safe.length > 0) {
            return l2Safe[boardMgr.random.nextInt32Bound(l2Safe.length)];
        }
        if (l1Safe.length > 0) {
            return l1Safe[boardMgr.random.nextInt32Bound(l1Safe.length)];
        }
        return types[boardMgr.random.nextInt32Bound(types.length)];
    },

    /**
     * Returns true if swapping the new gem (typeT at row,col) with any of
     * its four adjacent neighbours would create a power-up pattern.
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
