/**
 * KingCrabSideMatchAction - side-match handler for King Crab (11020).
 *
 * Extends MatchColorTakeDamageAction but engages on EVERY non-PU side match so
 * it can give "wrong color" feedback (the base action silently returns false):
 *
 *   - PU hit  -> bypass color check, deal damage (delegates to base PU path).
 *   - Right color -> -1 HP, reset the wrong-color streak.
 *   - Wrong color -> no HP loss, float a grey "CHẶN" label. After 3 wrong
 *     matches in a row, show the aura hint once per level.
 *
 * The required color is read from the live per-instance element._matchColor
 * (rotated by KingCrabTurnAction), falling back to the authored config value.
 */
var CoreGame = CoreGame || {};
CoreGame.Strategies = CoreGame.Strategies || {};

CoreGame.Strategies.KingCrabSideMatchAction = CoreGame.Strategies.MatchColorTakeDamageAction.extend({
    ctor: function () {
        this._super();
    },

    checkCondition: function (element, context) {
        if (!element || element.hitPoints <= 0) return false;
        var isPU = context && context.puActivationId !== undefined;
        if (isPU) {
            // PU path: keep the base canTakeDamage / dedup guards.
            return CoreGame.Strategies.MatchColorTakeDamageAction.prototype
                .checkCondition.call(this, element, context);
        }
        // Non-PU: always engage so execute can branch damage vs "CHẶN".
        return true;
    },

    execute: function (element, context) {
        var isPU = context && context.puActivationId !== undefined;

        if (!isPU) {
            // Dedup per match group: a 3x3 King can be touched on several cells
            // by one match — count/feedback only once.
            var mId = context.matchActivationId;
            if (mId !== undefined) {
                if (!element._kingMatchSeen) element._kingMatchSeen = {};
                if (element._kingMatchSeen[mId]) return;
                element._kingMatchSeen[mId] = true;
            }

            var required = this._requiredColor(element);

            if (context.matchColor !== required) {
                // Wrong color: block, no damage.
                if (element.ui && element.ui.showBlockText) {
                    element.ui.showBlockText();
                }
                element._wrongStreak = (element._wrongStreak || 0) + 1;
                if (element._wrongStreak >= 3 && !element._colorHintShown &&
                    element.ui && element.ui.showColorHint) {
                    element.ui.showColorHint();
                    element._colorHintShown = true;
                }
                return;
            }
            // Correct color: damage, reset streak.
            element._wrongStreak = 0;
        }

        // Right color or PU: deal damage via the base take-damage path
        // (handles PU dedup + element.takeDamage).
        CoreGame.Strategies.TakeDamageAction.prototype.execute.call(this, element, context);
    },

    /**
     * The color the crab currently requires, clamped to the level's available
     * colors. If the live _matchColor is unset or off-palette (e.g. the authored
     * start color isn't in this level), initialise it to a valid palette color so
     * the crab never demands a color the board can't produce.
     */
    _requiredColor: function (element) {
        var pool = CoreGame.Strategies.kingCrabColorPool(element);
        if (pool.length === 0) {
            return (typeof element._matchColor === 'number')
                ? element._matchColor
                : this.configData._matchColor;
        }
        if (typeof element._matchColor === 'number' && pool.indexOf(element._matchColor) >= 0) {
            return element._matchColor;
        }
        var authored = this.configData._matchColor;
        var init = (pool.indexOf(authored) >= 0) ? authored : pool[0];
        element._matchColor = init;
        return init;
    }
});
