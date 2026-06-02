/**
 * KingCrabTurnAction - endTurn cadence controller for King Crab (11020).
 *
 * Owns the full 3-turn signature behaviour so move and color-rotate never land
 * on the same turn (the spec's "alternate: turn 3 rotate, turn 6 move, turn 9
 * rotate…"):
 *
 *   - Every 3rd turn is an EVENT turn. Events alternate ROTATE / MOVE.
 *   - One turn BEFORE every ROTATE event, fire a warning (crown blink) so the
 *     player always gets 1 turn to prepare — even right after spawn.
 *   - Multi-King desync: each instance picks a parity (0/1) so its rotate turns
 *     land 3 turns apart from a sibling's, avoiding a synced rotate flash.
 *
 * All counters are per-instance fields (action instances are created per blocker
 * in BlockerFactory). They are NOT stored in configData, which is shared across
 * every King Crab via _configCache — writing there would leak cadence/color
 * between instances (same class of bug as the maxHP shared-prototype leak).
 *
 * Color rotate sets element._matchColor at endTurn (after the turn's matches
 * already resolved), so next turn's side-match check naturally uses the new
 * color — the spec's "match queue at turn start = old color, after rotate = new
 * color" falls out of the engine's turn model, no extra deferral needed.
 */
var CoreGame = CoreGame || {};
CoreGame.Strategies = CoreGame.Strategies || {};

/**
 * Color pool for King Crab = the level's available gem colors (boardMgr.gemTypes),
 * kept distinct and filtered to real gem colors (1..6). Empty when unavailable —
 * callers then fall back to the authored config pool. This makes the crab rotate
 * only among colors that actually exist on the current board.
 */
CoreGame.Strategies.kingCrabColorPool = function (element) {
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
};

CoreGame.Strategies.KingCrabTurnAction = CoreGame.Strategies.NormalAction.extend({
    configData: {
        period: 3,            // turns between events
        colors: [1, 2, 3, 4], // color pool to rotate through
        directionType: 0      // movement direction (0 = random 4-way)
    },

    // Per-instance state (own props once written; primitives are safe on the
    // shared prototype until then).
    _turn: 0,
    _parity: -1,
    _mover: null,

    ctor: function () {
        this._super();
    },

    checkCondition: function (element, context) {
        return true;
    },

    execute: function (element, context) {
        if (!element || !element.boardMgr) return;
        var boardMgr = element.boardMgr;
        var cfg = this.configData || {};
        var period = parseInt(cfg.period) || 3;

        // Lazy per-instance parity so sibling Kings desync their rotate turns.
        if (this._parity < 0) {
            this._parity = boardMgr.random.nextInt32Bound(2);
        }

        this._turn = (this._turn || 0) + 1;
        var turn = this._turn;

        // Warning fires the turn before a ROTATE event turn.
        var nextTurn = turn + 1;
        if (this._isEventTurn(nextTurn, period) &&
            this._eventKind(nextTurn, period) === 'rotate') {
            if (element.ui && element.ui.playRotateWarning) {
                element.ui.playRotateWarning();
            }
        }

        if (this._isEventTurn(turn, period)) {
            if (this._eventKind(turn, period) === 'rotate') {
                this._doRotate(element, boardMgr);
            } else {
                this._doMove(element, context);
            }
        }
    },

    _isEventTurn: function (turn, period) {
        return turn > 0 && (turn % period === 0);
    },

    // Event index 1 = first event turn. Alternate rotate/move, shifted by the
    // instance parity so siblings don't rotate on the same turn.
    _eventKind: function (turn, period) {
        var idx = turn / period;            // 1,2,3,4...
        return ((idx + this._parity) % 2 === 1) ? 'rotate' : 'move';
    },

    _doRotate: function (element, boardMgr) {
        // Prefer the level's available colors; fall back to the authored pool.
        var pool = CoreGame.Strategies.kingCrabColorPool(element);
        if (pool.length === 0) pool = (this.configData && this.configData.colors) || [];
        if (!Array.isArray(pool) || pool.length === 0) return;

        var current = (typeof element._matchColor === 'number')
            ? element._matchColor
            : this._initialColor(element);

        var next = current;
        if (pool.length === 1) {
            next = pool[0];
        } else {
            var candidates = [];
            for (var i = 0; i < pool.length; i++) {
                if (pool[i] !== current) candidates.push(pool[i]);
            }
            if (candidates.length === 0) candidates = pool.slice();
            next = candidates[boardMgr.random.nextInt32Bound(candidates.length)];
        }

        element._matchColor = next; // logic: next turn's check uses the new color

        // Visual: 0.5s cross-fade if the King UI provides it, else hard re-tint.
        if (element.ui && element.ui.playColorShift) {
            element.ui.playColorShift(current, next);
        } else if (element.ui && element.ui.refreshMatchColorTint) {
            element.ui.refreshMatchColorTint();
        }
        cc.log("KingCrab rotate color " + current + " -> " + next);
    },

    _doMove: function (element, context) {
        // Reuse MoveAction's robust collision/gravity-refill move. interval=1 so
        // it always attempts; if blocked it just no-ops and the next MOVE event
        // retries (the cadence never advances/stacks — matches "không cộng dồn").
        if (!this._mover) {
            this._mover = new CoreGame.Strategies.MoveAction();
            this._mover.setConfigData({
                directionType: (this.configData && this.configData.directionType) || 0,
                moveInterval: 1
            });
        }
        this._mover.execute(element, context);
    },

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
