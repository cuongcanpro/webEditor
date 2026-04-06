/**
 * AdaptiveTPP.js
 * Dynamic Difficulty Adjustment (DDA) system based on Target Progress Pace.
 *
 * Spec: doc/AdaptiveTPP.md
 *
 * Measures each turn how far the player's actual progress deviates from
 * the expected linear pace, then switches the active spawn strategy to
 * push the player back toward the design line.
 *
 * Formulas:
 *   actual_progress   = targets_cleared / initial_targets
 *   expected_progress = moves_used      / total_moves
 *   deviation         = actual_progress - expected_progress  ∈ [-1, 1]
 *
 * Strategy map (tiered by deviation):
 *   < -EXTREME_THRESHOLD  → yes_pu_l2   (very far behind — maximum assist)
 *   < -TPP_THRESHOLD      → yes_pu_l1   (behind — moderate assist, streak-capped)
 *   [-TPP, +HARD]         → baseline    (normal)
 *   > +HARD_THRESHOLD     → no_pu_l1    (ahead — block immediate PU spawns)
 *   > +EXTREME_THRESHOLD  → no_pu_l2    (very far ahead — block swap-ahead PU too)
 *
 * Safeguards:
 *   MAX_ASSIST_STREAK  = 3   — caps consecutive dominant_boost turns
 *   ADAPTIVE_START_TURN = 5  — ignores the first N turns (early-game stability)
 *
 * Usage:
 *   CoreGame.AdaptiveTPP.init(boardMgr, levelConfig);
 *   // after each turn:
 *   CoreGame.AdaptiveTPP.onTurnEnd(movesUsed, targetsCleared);
 */
var CoreGame = CoreGame || {};

CoreGame.AdaptiveTPP = {

    // ── Configuration ──────────────────────────────────────────────────────

    /** Deviation margin before the system intervenes (±10%). */
    TPP_THRESHOLD:       0.10,

    /** Deviation threshold for no_powerup strategy (player 30% ahead). */
    HARD_THRESHOLD:      0.30,

    /** Deviation threshold for no_powerup_l2 strategy (player 50% ahead). */
    EXTREME_THRESHOLD:   0.50,

    /** Maximum consecutive turns of dominant_boost before forcing baseline. */
    MAX_ASSIST_STREAK:   3,

    /** Turns before the adaptive logic activates (early-game guard). */
    ADAPTIVE_START_TURN: 5,

    /** Floor for the per-level retry mercy factor (50% → 25% max reduction). */
    MIN_RETRY_FACTOR:    0.25,

    // ── Internal state ─────────────────────────────────────────────────────

    _boardMgr:       null,
    _initialTargets: 0,
    _totalMoves:     0,
    _assistStreak:   0,
    _currentName:    "baseline",
    _strategies:     null,

    // ── Metrics state ───────────────────────────────────────────────────────

    /** Deviations recorded each turn (after ADAPTIVE_START_TURN). */
    _deviationLog:   null,

    /** Number of strategy switches per strategy name this level. */
    _triggerCounts:  null,

    /** Number of power-ups created this level. */
    _puCount:        0,

    /** Number of turns elapsed (for PU rate denominator). */
    _turnCount:      0,

    /** How many times init() was called for this level (retry tracking). */
    _retryCount:     0,

    /** Cached level id to detect genuine new level vs retry. */
    _levelId:        null,

    /** Bound PU event handler (kept for cleanup). */
    _puHandler:      null,

    /**
     * Per-level mercy factor. Starts at 1.0; halved on each loss (floor: MIN_RETRY_FACTOR);
     * reset to 1.0 on win. Persisted in storage so it survives app restarts.
     */
    _retryFactor:    1.0,

    // ── Public API ─────────────────────────────────────────────────────────

    /**
     * Initialise for a new level. Creates strategy instances and applies
     * the baseline strategy immediately.
     *
     * @param {BoardMgr} boardMgr
     * @param {Object}   levelConfig  { targetMoves: number, targets: {typeId: count} }
     */
    init: function (boardMgr, levelConfig) {
        this._boardMgr     = boardMgr;
        this._totalMoves   = levelConfig.targetMoves || 25;
        this._assistStreak = 0;
        this._currentName  = "baseline";

        // ── Retry / mercy factor ──────────────────────────────────────────
        var newId = levelConfig.levelId != null ? levelConfig.levelId : null;
        if (newId !== null && newId === this._levelId) {
            this._retryCount++;
            // _retryFactor already updated by the previous onLevelEnd
        } else {
            this._retryCount  = 0;
            this._levelId     = newId;
            this._retryFactor = this._loadRetryFactor(newId);
        }

        // Apply mercy factor: effective targets shrink on repeated losses
        this._initialTargets = this._sumTargets(levelConfig.targets) * this._retryFactor;

        this._deviationLog  = [];
        this._triggerCounts = { baseline: 0, yes_pu_l1: 0, yes_pu_l2: 0, no_pu_l1: 0, no_pu_l2: 0 };
        this._puCount       = 0;
        this._turnCount     = 0;

        // PU creation event listener
        if (this._puHandler && CoreGame.EventMgr) {
            CoreGame.EventMgr.off('powerUpCreated', this._puHandler);
        }
        var self = this;
        this._puHandler = function () { self._puCount++; };
        if (CoreGame.EventMgr) {
            CoreGame.EventMgr.on('powerUpCreated', this._puHandler);
        }

        this._strategies = {
            // Normal spawn
            baseline:   new CoreGame.DropStrategy.RandomSpawnStrategy(),
            // Assist: prefer spawns that let cascade or one swap create a PU
            yes_pu_l1:  new CoreGame.DropStrategy.YesPUSpawnL1(),
            yes_pu_l2:  new CoreGame.DropStrategy.YesPUSpawnL2(),
            // Hard: avoid spawning gems that create PU (increasingly strict)
            no_pu_l1:   new CoreGame.DropStrategy.NoPUSpawnL1v2(),
            no_pu_l2:   new CoreGame.DropStrategy.NoPUSpawnL2v2()
        };

        this._applyStrategy("baseline");
    },

    /**
     * Call after every turn, once cascade resolution is complete.
     * Re-evaluates deviation and switches strategy when necessary.
     *
     * @param {number} movesUsed      Total moves made so far this level
     * @param {number} targetsCleared Total target items destroyed so far
     */
    onTurnEnd: function (movesUsed, targetsCleared) {
        this._turnCount++;

        if (movesUsed < this.ADAPTIVE_START_TURN) return;

        var deviation = this._computeDeviation(movesUsed, targetsCleared);
        this._deviationLog.push(deviation);

        var next = this._selectStrategyName(deviation);
        if (next !== this._currentName) {
            this._applyStrategy(next);
        }
    },

    /**
     * Compute the current TPP deviation without changing any state.
     * Useful for logging or HUD display.
     *
     * @param {number} movesUsed
     * @param {number} targetsCleared
     * @returns {number}  deviation in [-1, 1]
     */
    getDeviation: function (movesUsed, targetsCleared) {
        return this._computeDeviation(movesUsed, targetsCleared);
    },

    /**
     * Name of the strategy currently active.
     * @returns {string}  "baseline" | "yes_pu_l1" | "yes_pu_l2" | "no_pu_l1" | "no_pu_l2"
     */
    getCurrentStrategyName: function () {
        return this._currentName;
    },

    /**
     * Current mercy factor for this level (1.0 = full targets, 0.5 = half, 0.25 = quarter).
     * GameUI can multiply board targetElements counts by this to reduce the actual win condition.
     * @returns {number}
     */
    getRetryFactor: function () {
        return this._retryFactor;
    },

    /**
     * Call when the level ends (win or out-of-moves).
     * Records completion status and move surplus/deficit.
     *
     * @param {number}  movesUsed   Total moves made this level
     * @param {boolean} completed   True if all targets were cleared
     */
    onLevelEnd: function (movesUsed, completed) {
        this._levelCompleted  = completed;
        this._movesUsedFinal  = movesUsed;

        if (CoreGame.EventMgr && this._puHandler) {
            CoreGame.EventMgr.off('powerUpCreated', this._puHandler);
            this._puHandler = null;
        }

        // Update mercy factor: halve on loss (capped at floor), reset on win
        if (!completed) {
            this._retryFactor = Math.max(this.MIN_RETRY_FACTOR, this._retryFactor * 0.5);
        } else {
            this._retryFactor = 1.0;
        }
        this._saveRetryFactor(this._levelId, this._retryFactor);

        var m = this.getMetrics();
        var d = m.deviation_distribution;
        cc.log("[AdaptiveTPP] ── End-of-level metrics ───────────────────────");
        cc.log("[AdaptiveTPP] Deviation  mean=" + d.mean.toFixed(3)
            + "  median=" + d.median.toFixed(3)
            + "  P25="    + d.p25.toFixed(3)
            + "  P75="    + d.p75.toFixed(3));
        cc.log("[AdaptiveTPP] Switches   boost=" + m.boost_switches
            + "  suppress=" + m.suppress_switches
            + "  baseline=" + m.trigger_counts.baseline);
        cc.log("[AdaptiveTPP] Result     " + (completed ? "WIN" : "LOSE")
            + "  surplus=" + m.move_surplus
            + "  pu_rate=" + m.pu_rate.toFixed(3));
        cc.log("[AdaptiveTPP] ────────────────────────────────────────────────");
    },

    /**
     * Returns a snapshot of all collected metrics for this level attempt.
     *
     * @returns {Object}
     *   deviation_distribution: { mean, median, p25, p75 }
     *   trigger_counts:         { baseline, yes_pu_l1, yes_pu_l2, no_pu_l1, no_pu_l2 }
     *   boost_switches:         number — times a boost strategy (yes_pu_*) was applied
     *   suppress_switches:      number — times a suppress strategy (no_pu_*) was applied
     *   completed_in_budget:    boolean — finished within _totalMoves
     *   retry_count:            number  — times init() was called for same levelId
     *   move_surplus:           number  — positive = moves left, negative = over budget
     *   pu_count:               number  — total power-ups created this level
     *   pu_rate:                number  — power-ups per turn (or 0 if no turns)
     */
    getMetrics: function () {
        var log = this._deviationLog || [];
        var sorted = log.slice().sort(function (a, b) { return a - b; });
        var tc = this._triggerCounts || {};

        return {
            deviation_distribution: {
                mean:   this._mean(sorted),
                median: this._percentile(sorted, 50),
                p25:    this._percentile(sorted, 25),
                p75:    this._percentile(sorted, 75)
            },
            trigger_counts:      tc,
            boost_switches:      (tc.yes_pu_l1 || 0) + (tc.yes_pu_l2 || 0),
            suppress_switches:   (tc.no_pu_l1  || 0) + (tc.no_pu_l2  || 0),
            completed_in_budget: !!this._levelCompleted,
            retry_count:         this._retryCount,
            move_surplus:        this._totalMoves - (this._movesUsedFinal || 0),
            pu_count:            this._puCount || 0,
            pu_rate:             this._turnCount > 0 ? this._puCount / this._turnCount : 0,
            retry_factor:        this._retryFactor
        };
    },

    // ── Private helpers ────────────────────────────────────────────────────

    _computeDeviation: function (movesUsed, targetsCleared) {
        if (this._initialTargets === 0 || this._totalMoves === 0) return 0;
        var actual   = targetsCleared / this._initialTargets;
        var expected = movesUsed      / this._totalMoves;
        return actual - expected;
    },

    /**
     * Tiered strategy selection based on deviation magnitude.
     *
     * Behind pace (negative deviation):
     *   < -EXTREME_THRESHOLD → yes_pu_l2  (very far behind — max assist)
     *   < -TPP_THRESHOLD     → yes_pu_l1  (behind — moderate assist, streak-capped)
     *
     * Ahead of pace (positive deviation):
     *   > EXTREME_THRESHOLD  → no_pu_l2   (very far ahead — block swap-ahead PU)
     *   > HARD_THRESHOLD     → no_pu_l1   (well ahead — block immediate PU spawns)
     *
     * Within [-TPP_THRESHOLD, +HARD_THRESHOLD] → baseline
     */
    _selectStrategyName: function (deviation) {
        if (deviation < -this.EXTREME_THRESHOLD) {
            // Very far behind — maximum assist (no streak cap at this tier)
            this._assistStreak = 0;
            return "yes_pu_l2";
        }

        if (deviation < -this.TPP_THRESHOLD) {
            // Behind pace — moderate assist, respect streak cap
            if (this._assistStreak < this.MAX_ASSIST_STREAK) {
                this._assistStreak++;
                return "yes_pu_l1";
            }
            return "baseline"; // streak cap reached
        }

        // On pace or ahead — reset assist streak
        this._assistStreak = 0;

        if (deviation > this.EXTREME_THRESHOLD) {
            return "no_pu_l2";  // very far ahead — extreme difficulty
        }
        if (deviation > this.HARD_THRESHOLD) {
            return "no_pu_l1";  // well ahead — hard
        }

        return "baseline";
    },

    _applyStrategy: function (name) {
        this._currentName = name;
        if (this._triggerCounts && this._triggerCounts.hasOwnProperty(name)) {
            this._triggerCounts[name]++;
        }
        if (this._boardMgr && this._boardMgr.dropMgr) {
            this._boardMgr.dropMgr.setSpawnStrategy(this._strategies[name]);
        }
        cc.log("[AdaptiveTPP] Strategy → " + name);
    },

    /** Average of a sorted (or unsorted) numeric array. Returns 0 for empty. */
    _mean: function (arr) {
        if (!arr || arr.length === 0) return 0;
        var sum = 0;
        for (var i = 0; i < arr.length; i++) sum += arr[i];
        return sum / arr.length;
    },

    /**
     * p-th percentile (0–100) of a pre-sorted numeric array.
     * Uses linear interpolation. Returns 0 for empty arrays.
     */
    _percentile: function (sorted, p) {
        if (!sorted || sorted.length === 0) return 0;
        if (sorted.length === 1)           return sorted[0];
        var idx  = (p / 100) * (sorted.length - 1);
        var lo   = Math.floor(idx);
        var frac = idx - lo;
        if (lo >= sorted.length - 1) return sorted[sorted.length - 1];
        return sorted[lo] + frac * (sorted[lo + 1] - sorted[lo]);
    },

    /** Load the persisted mercy factor for a level from storage. Defaults to 1.0. */
    _loadRetryFactor: function (levelId) {
        if (levelId == null) return 1.0;
        try {
            var raw = fr.UserData.getStringFromKey("tpp_rf_" + levelId, "1");
            var f   = parseFloat(raw);
            return (isNaN(f) || f <= 0 || f > 1) ? 1.0 : f;
        } catch (e) { return 1.0; }
    },

    /** Persist the mercy factor for a level to storage. */
    _saveRetryFactor: function (levelId, factor) {
        if (levelId == null) return;
        try {
            fr.UserData.setStringFromKey("tpp_rf_" + levelId, String(factor));
        } catch (e) {}
    },

    /** Sum all counts in a targets object { typeId: count }. */
    _sumTargets: function (targets) {
        if (!targets) return 0;
        var total = 0;
        for (var k in targets) {
            if (targets.hasOwnProperty(k)) total += (targets[k] || 0);
        }
        return total;
    }
};
