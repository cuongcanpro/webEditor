/**
 * SlimeSideMatchAction / SlimeKingSideMatchAction — side-match cell-loss for the
 * Slime family (Hiền 12000, Ác 12001, Chúa/King 12002).
 *
 * On a side match adjacent to the slime, shed exactly ONE cell, deduped per match
 * group (a single match can touch several slime cells but only costs one). The cell
 * removed is the slime cell touching the match that has the FEWEST slime neighbours,
 * so the footprint stays connected — we shed a tip/corner, not a bridge, whenever a
 * choice exists.
 *
 *   Hiền / Ác → SlimeSideMatchAction: any gem color triggers the loss.
 *   Chúa      → SlimeKingSideMatchAction: only when the match color equals the King's
 *               current color (element._matchColor, rotated by CycleMatchColorAction);
 *               a wrong color costs nothing. PU damage runs the normal `match` path.
 *
 * Follows the King-Crab pattern: a dedicated, config-wired side-match action
 * (CoreGame.Strategies[name]) instead of special-casing DynamicBlocker.takeDamage.
 */
var CoreGame = CoreGame || {};
CoreGame.Strategies = CoreGame.Strategies || {};

CoreGame.Strategies.SlimeSideMatchAction = CoreGame.Strategies.TakeDamageAction.extend({
    ctor: function () { this._super(); },

    execute: function (element, context) {
        // PU damage isn't a gem side-match — keep the base path (PU dedup + the
        // swept cell). In practice slimes route PU through their `match` action.
        if (context && context.puActivationId !== undefined) {
            CoreGame.Strategies.TakeDamageAction.prototype.execute.call(this, element, context);
            return;
        }
        // One cell per match group. notifyNearbySlots fires this once per adjacent
        // cell; dedup on MatchMgr's matchActivationId so only the first does work.
        var mId = context ? context.matchActivationId : undefined;
        if (mId !== undefined) {
            if (!element._slimeMatchSeen) element._slimeMatchSeen = {};
            if (element._slimeMatchSeen[mId]) return;
            element._slimeMatchSeen[mId] = true;
        }
        // Color gate (base = any color; King requires its active color).
        if (!this._colorAllows(element, context)) {
            this._onColorBlocked(element, context);
            return;
        }
        var cell = this._pickCell(element, context);
        if (!cell) return;
        element.takeDamage(1, context ? context.matchColor : -1, cell.r, cell.c);
    },

    /** Base: any gem color triggers. King overrides to require its color. */
    _colorAllows: function (element, context) { return true; },
    _onColorBlocked: function (element, context) { },

    /** Of the slime cells touching the match group, pick the one with the fewest
     *  slime neighbours (tie-break: the cell the match actually touched, then the
     *  lowest r/c) so removing it is least likely to split the footprint. */
    _pickCell: function (element, context) {
        var cells = element.cells;
        if (!cells || cells.length === 0) return null;
        var group = (context && context.group) || [];

        var inSlime = {};
        for (var i = 0; i < cells.length; i++) inSlime[cells[i].r + "_" + cells[i].c] = true;

        var cand = [];
        for (var k = 0; k < cells.length; k++) {
            var c = cells[k];
            for (var g = 0; g < group.length; g++) {
                if (Math.abs(group[g].row - c.r) + Math.abs(group[g].col - c.c) === 1) {
                    cand.push(c);
                    break;
                }
            }
        }
        if (cand.length === 0) return null;

        var best = null, bestN = Infinity;
        for (var j = 0; j < cand.length; j++) {
            var cc2 = cand[j];
            var n = (inSlime[(cc2.r + 1) + "_" + cc2.c] ? 1 : 0)
                + (inSlime[(cc2.r - 1) + "_" + cc2.c] ? 1 : 0)
                + (inSlime[cc2.r + "_" + (cc2.c + 1)] ? 1 : 0)
                + (inSlime[cc2.r + "_" + (cc2.c - 1)] ? 1 : 0);
            if (best === null || n < bestN || (n === bestN && this._tiePrefers(cc2, best, context))) {
                best = cc2;
                bestN = n;
            }
        }
        return { r: best.r, c: best.c };
    },

    _tiePrefers: function (c, best, context) {
        var ct = !!(context && c.r === context.row && c.c === context.col);
        var bt = !!(context && best.r === context.row && best.c === context.col);
        if (ct !== bt) return ct;               // prefer the cell the match touched
        if (c.r !== best.r) return c.r < best.r; // else deterministic lowest r, then c
        return c.c < best.c;
    }
});

CoreGame.Strategies.SlimeKingSideMatchAction = CoreGame.Strategies.SlimeSideMatchAction.extend({
    ctor: function () { this._super(); },

    /** King sheds a cell only when the match color equals its active color. The
     *  active color is clamped to the LEVEL's gem palette so the boss never demands
     *  a colour the board can't produce (initialised on first use if unset / off
     *  palette — same idea as KingCrab._requiredColor). */
    _colorAllows: function (element, context) {
        var required = this._requiredColor(element);
        return !!(context && context.matchColor === required);
    },

    /** Level gem palette (boardMgr.gemTypes, ids 1..6). */
    _levelPool: function (element) {
        var bm = element && element.boardMgr;
        var gt = bm && bm.gemTypes;
        var pool = [];
        if (Array.isArray(gt)) {
            for (var i = 0; i < gt.length; i++) {
                var t = gt[i];
                if (t >= 1 && t <= 6 && pool.indexOf(t) < 0) pool.push(t);
            }
        }
        return pool;
    },

    _requiredColor: function (element) {
        var pool = this._levelPool(element);
        var cur = (element && typeof element._matchColor === 'number') ? element._matchColor : null;
        if (cur !== null && (pool.length === 0 || pool.indexOf(cur) >= 0)) return cur;
        var authored = (this.configData && typeof this.configData._matchColor === 'number')
            ? this.configData._matchColor : -1;
        var init = (pool.indexOf(authored) >= 0) ? authored : (pool.length ? pool[0] : authored);
        element._matchColor = init; // remember so the tint + cycle agree
        return init;
    }
});
