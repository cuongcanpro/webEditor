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
        colors: [1, 2, 3, 4]
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
        var pool = (this.configData && this.configData.colors) || [];
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
