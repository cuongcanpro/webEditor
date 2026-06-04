/**
 * RegenCellAction - Slime cell regeneration (Slime Ác 12001 / Slime Chúa 12002).
 *
 * Runs at endTurn — AFTER gems have dropped/refilled the lost cell. Regen then
 * "đè lên" (overwrites) an adjacent cell: an empty slot, or a basic gem that
 * refilled nearby (eating it). It never grows past the spawn footprint. This
 * gives the spec's "net 0 per hit / slime dịch chỗ" for Slime Ác and the passive
 * "+1 cell / endTurn" auto-heal for Slime Chúa. (Distinct from SpreadAction/Cloud
 * which has no footprint cap and no lost-this-turn gate.)
 *
 * Behaviour is gated by two configData knobs:
 *   - maxCells: the full footprint (4 for 2×2, 9 for 3×3). Regen stops at it,
 *     so a full slime never grows. Defaults to the spawn cell count if 0.
 *   - requireLossThisTurn: when true (Slime Ác), regen only fires the turn a
 *     cell was actually lost. The flag is consumed each attempt, so a hit that
 *     fails to regen (slime walled in by hard cells) leaves the damage
 *     standing — the spec's legitimate "vây để giết" kill path. When false/
 *     absent (Slime Chúa), regen is passive and fires every endTurn while below
 *     maxCells.
 *
 * Lost-cell bookkeeping (`element._lastLostCell`, `element._lostThisTurn`) is
 * written by DynamicBlocker.takeDamage.
 */
var CoreGame = CoreGame || {};
CoreGame.Strategies = CoreGame.Strategies || {};

CoreGame.Strategies.RegenCellAction = CoreGame.Strategies.NormalAction.extend({
    configData: {
        maxCells: 0,
        requireLossThisTurn: false
    },

    ctor: function () {
        this._super();
    },

    checkCondition: function (element, context) {
        if (!element || !element.cells || !element.boardMgr) return false;

        // Never grow past the spawn footprint.
        if (element.cells.length >= this._getMaxCells(element)) return false;

        // Slime Ác: only heal the turn a cell was lost.
        if (this.configData && this.configData.requireLossThisTurn) {
            return !!element._lostThisTurn;
        }
        return true;
    },

    execute: function (element, context) {
        var boardMgr = element.boardMgr;
        if (!boardMgr) return;

        // Consume the loss flag regardless of outcome: a failed regen this turn
        // does NOT carry over to grant a free heal next turn.
        var requireLoss = this.configData && this.configData.requireLossThisTurn;
        if (requireLoss) element._lostThisTurn = false;

        var dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
        var cells = element.getGridCells();
        var candidates = [];
        var preferred = []; // candidates adjacent to the most recent lost cell
        var lost = element._lastLostCell;

        for (var i = 0; i < cells.length; i++) {
            for (var j = 0; j < dirs.length; j++) {
                var nr = cells[i].x + dirs[j][0];
                var nc = cells[i].y + dirs[j][1];
                var slot = boardMgr.getSlot(nr, nc);
                if (!slot || !this._canRegenInto(slot)) continue;

                if (candidates.indexOf(slot) === -1) candidates.push(slot);

                if (lost &&
                    Math.abs(slot.row - lost.r) + Math.abs(slot.col - lost.c) <= 1 &&
                    preferred.indexOf(slot) === -1) {
                    preferred.push(slot);
                }
            }
        }

        var pool = preferred.length > 0 ? preferred : candidates;

        if (pool.length === 0) {
            // Regen FAIL — surrounded by hard cells (other blockers / walls), no
            // empty or basic-gem neighbour to take. Damage stands → "vây để giết".
            if (element.ui && element.ui.playRegenFail) element.ui.playRegenFail();
            return;
        }

        var target = pool[boardMgr.random.nextInt32Bound(pool.length)];
        target.clearElements(); // overwrite: eat the refilled gem (or fill the empty)
        element.addCell({ r: target.row, c: target.col });
        element._lastLostCell = null;

        if (element.ui && element.ui.playRegenFx) {
            element.ui.playRegenFx(target.row, target.col);
        }
        if (typeof resSound !== 'undefined' && resSound.cloud_appear) {
            fr.Sound.playSoundEffect(resSound.cloud_appear, false);
        }
        cc.log("RegenCellAction: +1 cell at", target.row, target.col,
            "(" + element.cells.length + "/" + this._getMaxCells(element) + ")");
    },

    /**
     * A cell the slime may regrow into: an empty slot, OR one holding a basic
     * gem (regen "đè lên" the refilled gem). Slots held by this slime or any
     * other blocker are not basic gems and are skipped.
     */
    _canRegenInto: function (slot) {
        if (slot.isEmpty()) return true;
        var gem = slot.getMatchableElement ? slot.getMatchableElement() : null;
        return !!(gem && gem.type <= CoreGame.Config.NUM_COLORS);
    },

    _getMaxCells: function (element) {
        var cfg = this.configData || {};
        if (cfg.maxCells && cfg.maxCells > 0) return cfg.maxCells;
        // Fallback: lock in the spawn footprint the first time we look.
        if (!element._regenMaxCells) {
            element._regenMaxCells = element.cells ? element.cells.length : 1;
        }
        return element._regenMaxCells;
    }
});
