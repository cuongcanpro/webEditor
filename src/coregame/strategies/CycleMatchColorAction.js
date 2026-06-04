/**
 * CycleMatchColorAction - Strategy to rotate a tintByMatchColor blocker's
 * required match color (King Crab 11020).
 *
 * Instead of swapping in a different blocker per color (ReplaceSelfAction
 * cycling 11010-11015), this mutates a PER-INSTANCE color id on the element
 * and re-tints the single placeholder sprite via setColor. That keeps HP,
 * position and the lone art asset intact across color changes, and — crucially
 * — never writes to the shared `_configCache` rawConfig, so multiple King Crabs
 * (or a respawn) don't leak color into each other.
 *
 * The live color lives at `element._matchColor`:
 *   - MatchColorTakeDamageAction.checkCondition prefers it over configData.
 *   - ElementUI._findMatchColor prefers it so the tint always agrees.
 */
var CoreGame = CoreGame || {};
CoreGame.Strategies = CoreGame.Strategies || {};

CoreGame.Strategies.CycleMatchColorAction = CoreGame.Strategies.NormalAction.extend({
    configData: {
        // Pool of gem color ids to rotate through. Default {1,2,3,4} per the
        // King Crab spec (initial colorId ∈ {1,2,3,4}).
        colors: [1, 2, 3, 4],
        // sequential=true rotates the pool in order (1→2→3→4→1) so the player
        // can learn the boss cadence (Slime Chúa L110). false = random-next
        // (King Crab feel).
        sequential: false
    },

    ctor: function () {
        this._super();
    },

    checkCondition: function (element, context) {
        return true;
    },

    /**
     * @param {ElementObject} element
     * @param {Object} context
     */
    execute: function (element, context) {
        cc.log("CycleMatchColorAction execute");
        if (!element || !element.boardMgr) return;

        var boardMgr = element.boardMgr;
        // Cycle through the LEVEL's gem palette (boardMgr.gemTypes), not a hardcoded
        // set, so the boss never demands a colour the board can't produce. config
        // `colors` is only a fallback when the palette isn't available.
        var pool = this._levelPool(element);
        if (!Array.isArray(pool) || pool.length === 0) return;

        // Current required color: prefer the live per-instance value, else fall
        // back to whatever the side-match damage action was authored with.
        var current = (typeof element._matchColor === 'number')
            ? element._matchColor
            : this._initialColor(element);

        // Pick a new color != current (single-element pool => no change).
        var next = current;
        if (pool.length === 1) {
            next = pool[0];
        } else if (this.configData && this.configData.sequential) {
            // Step to the next color in pool order, wrapping around. If current
            // isn't in the pool (first rotation off the asset tint), start at index 0.
            var idx = pool.indexOf(current);
            next = pool[(idx + 1) % pool.length];
        } else {
            // Draw from the pool excluding the current color so we always rotate.
            var candidates = [];
            for (var i = 0; i < pool.length; i++) {
                if (pool[i] !== current) candidates.push(pool[i]);
            }
            if (candidates.length === 0) candidates = pool.slice();
            next = candidates[boardMgr.random.nextInt32Bound(candidates.length)];
        }

        // 1. Logic: store the new required color on the instance.
        element._matchColor = next;

        // 2. Visual: re-tint the sprite via setColor (no asset swap).
        if (element.ui && element.ui.refreshMatchColorTint) {
            element.ui.refreshMatchColorTint();
        }

        cc.log("CycleMatchColorAction: color " + current + " -> " + next);
    },

    /**
     * The colour pool to rotate through = the level's gem palette
     * (boardMgr.gemTypes, clamped to gem ids 1..6, sorted ascending). Falls back to
     * the authored config `colors` (then {1,2,3,4}) only when no palette is known
     * (e.g. editor / sim with no board).
     * @private
     */
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
        if (pool.length > 0) { pool.sort(function (a, b) { return a - b; }); return pool; }
        var cfg = this.configData && this.configData.colors;
        return (Array.isArray(cfg) && cfg.length > 0) ? cfg.slice() : [1, 2, 3, 4];
    },

    /**
     * Read the authored starting color from the side-match damage action so the
     * first rotation moves away from the asset's initial tint.
     * @private
     */
    _initialColor: function (element) {
        var actions = element.actions;
        if (!actions) return -1;
        var keys = ['sideMatch', 'match'];
        for (var k = 0; k < keys.length; k++) {
            var arr = actions[keys[k]];
            if (!Array.isArray(arr)) continue;
            for (var i = 0; i < arr.length; i++) {
                var a = arr[i];
                if (a && a.configData && typeof a.configData._matchColor === 'number') {
                    return a.configData._matchColor;
                }
            }
        }
        return -1;
    }
});
