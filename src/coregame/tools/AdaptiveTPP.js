/**
 * AdaptiveTPP.js  v2
 * Dynamic Difficulty Adjustment (DDA) system based on Target Progress Pace.
 *
 * Spec: doc/AdaptiveTPP.md
 *
 * Measures each turn how far the player's actual progress deviates from
 * the expected pace, then switches the active spawn strategy to push the
 * player back toward the design line.
 *
 * v2 improvements:
 *   1. HP-based fractional progress for boss / multi-HP elements
 *   2. Post-cap dead-zone fix (uncapped expected, early-return on win)
 *   3. EMA deviation smoothing
 *   4. Non-linear (back-loaded) pace curve
 *   5. Assist streak cooldown instead of hard cap oscillation
 *
 * Formulas (v2):
 *   count_progress = targets_cleared / initial_targets
 *   hp_progress    = objective_damage_dealt / objective_total_hp
 *   actual         = min(max(hp_progress, count_progress), 1)
 *   expected       = pow(moves_used / total_moves, PACE_CURVE_EXP)
 *   raw_deviation  = clamp(actual - expected, -1, 1)
 *   smoothed       = ALPHA * raw + (1 - ALPHA) * prev_smoothed
 *
 * Strategy map (tiered by smoothed deviation):
 *   < -EXTREME_THRESHOLD  -> yes_pu_l2   (very far behind -- maximum assist)
 *   < -TPP_THRESHOLD      -> yes_pu_l1   (behind -- moderate assist, streak-capped)
 *   [-TPP, +HARD]         -> baseline    (normal)
 *   > +HARD_THRESHOLD     -> no_pu_l1    (ahead -- block immediate PU spawns)
 *   > +EXTREME_THRESHOLD  -> no_pu_l2    (very far ahead -- block swap-ahead PU too)
 *
 * Usage:
 *   CoreGame.AdaptiveTPP.init(boardMgr, levelConfig);
 *   // after each turn:
 *   CoreGame.AdaptiveTPP.onTurnEnd(movesUsed, targetsCleared);
 */
var CoreGame = CoreGame || {};

CoreGame.AdaptiveTPP = {

    // ── Configuration ──────────────────────────────────────────────────────

    /** Deviation margin before the system intervenes (+-10%). */
    TPP_THRESHOLD:       0.10,

    /** Deviation threshold for no_powerup strategy (player 30% ahead). */
    HARD_THRESHOLD:      0.30,

    /** Deviation threshold for no_powerup_l2 strategy (player 50% ahead). */
    EXTREME_THRESHOLD:   0.50,

    /** Maximum consecutive turns of yes_pu_l1 before cooldown kicks in. */
    MAX_ASSIST_STREAK:   3,

    /** Forced baseline turns after assist streak hits MAX_ASSIST_STREAK. */
    ASSIST_COOLDOWN:     1,

    /** Turns before the adaptive logic activates (0 = from first move). */
    ADAPTIVE_START_TURN: 0,

    /** Floor for the per-level retry mercy factor (50% -> 25% max reduction). */
    MIN_RETRY_FACTOR:    0.25,

    /** EMA weight for new raw deviation (0.3 = 30% new, 70% old). */
    SMOOTHING_ALPHA:     0.3,

    /** Pace curve exponent. >1.0 = back-loaded (expects less early, more late). */
    PACE_CURVE_EXP:      1.4,

    // ── Internal state ─────────────────────────────────────────────────────

    _boardMgr:       null,
    _initialTargets: 0,
    _totalMoves:     0,
    _assistStreak:   0,
    _currentName:    "baseline",
    _strategies:     null,

    // ── v2: HP-based progress (Improvement 1) ──────────────────────────────

    _objectiveDamageDealt: 0,
    _objectiveTotalHp:     0,
    _scoreChangedHandler:  null,

    // ── v2: Smoothing state (Improvement 3) ────────────────────────────────

    _smoothedDeviation:  0,
    _rawDeviationLog:    null,

    // ── v2: Assist cooldown state (Improvement 5) ──────────────────────────

    _assistCooldownLeft:  0,
    _assistCooldownCount: 0,

    // ── Metrics state ───────────────────────────────────────────────────────

    /** Smoothed deviations recorded each turn. */
    _deviationLog:   null,

    /** Number of strategy switches per strategy name this level. */
    _triggerCounts:  null,

    /** Number of power-ups created this level. */
    _puCount:        0,

    /** Power-up counts by category: rockets, bombs, rainbows, planes. */
    _puRockets:      0,
    _puBombs:        0,
    _puRainbows:     0,
    _puPlanes:       0,

    /** Cascade (combo) stats per level. */
    _cascadeSum:     0,
    _cascadeMax:     0,

    /** Tiles removed sum (for avg_tiles_per_move). */
    _tilesRemovedSum: 0,

    /** Board shuffle count (no valid moves). */
    _shuffleCount:   0,

    /** Minimum valid-move count seen across turns. */
    _minValidMoves:  Infinity,

    /** Number of turns elapsed (for PU rate denominator). */
    _turnCount:      0,

    /** How many times init() was called for this level (retry tracking). */
    _retryCount:     0,

    /** Cached level id to detect genuine new level vs retry. */
    _levelId:        null,

    /** Bound PU event handler (kept for cleanup). */
    _puHandler:      null,

    /**
     * Per-level mercy factor applied to targetMoves. Starts at 1.0; halved on each loss
     * (floor: MIN_RETRY_FACTOR); reset to 1.0 on win. Persisted in storage.
     * Lower value -> system thinks pace should be faster -> deviation goes negative -> boost spawns.
     */
    _retryFactor:    1.0,

    // ── Public API ─────────────────────────────────────────────────────────

    /**
     * Initialise for a new level. Creates strategy instances and applies
     * the baseline strategy immediately.
     *
     * @param {BoardMgr} boardMgr
     * @param {Object}   levelConfig  { targetMoves, targets, levelId, objectiveTotalHp }
     */
    init: function (boardMgr, levelConfig) {
        this._boardMgr     = boardMgr;
        this._assistStreak = 0;
        this._currentName  = "baseline";

        // ── Retry / mercy factor ──────────────────────────────────────────
        var newId = levelConfig.levelId != null ? levelConfig.levelId : null;
        if (newId !== null && newId === this._levelId) {
            this._retryCount++;
            // _retryFactor already updated by the previous onLevelEnd
        } else {
            this._levelId     = newId;
            var data = this._loadRetryData(newId);
            this._retryFactor = data.factor;
            this._retryCount  = data.count;
        }

        // Apply mercy factor to targetMoves (pace target):
        var baseMoves = levelConfig.targetMoves || 25;
        this._totalMoves     = Math.max(1, Math.round(baseMoves * this._retryFactor));
        this._initialTargets = this._sumTargets(levelConfig.targets);

        cc.log("[AdaptiveTPP] init level=" + this._levelId
            + "  retry_count=" + this._retryCount
            + "  retry_factor=" + this._retryFactor
            + "  targetMoves=" + baseMoves + " -> " + this._totalMoves
            + "  targets=" + this._initialTargets
            + "  totalHp=" + (levelConfig.objectiveTotalHp || 0)
            + "  curve=" + this.PACE_CURVE_EXP
            + "  alpha=" + this.SMOOTHING_ALPHA);

        // ── Reset metrics ─────────────────────────────────────────────────
        this._deviationLog    = [];
        this._rawDeviationLog = [];
        this._triggerCounts   = { baseline: 0, yes_pu_l1: 0, yes_pu_l2: 0, no_pu_l1: 0, no_pu_l2: 0 };
        this._puCount         = 0;
        this._puRockets       = 0;
        this._puBombs         = 0;
        this._puRainbows      = 0;
        this._puPlanes        = 0;
        this._cascadeSum      = 0;
        this._cascadeMax      = 0;
        this._tilesRemovedSum = 0;
        this._shuffleCount    = 0;
        this._minValidMoves   = Infinity;
        this._turnCount       = 0;
        this._levelCompleted  = false;
        this._movesUsedFinal  = 0;

        // v2: HP-based progress
        this._objectiveDamageDealt = 0;
        this._objectiveTotalHp     = levelConfig.objectiveTotalHp || 0;

        // v2: Smoothing
        this._smoothedDeviation = 0;

        // v2: Assist cooldown
        this._assistCooldownLeft  = 0;
        this._assistCooldownCount = 0;

        // ── Event listeners ───────────────────────────────────────────────
        var self = this;

        // PU creation event listener
        if (this._puHandler && CoreGame.EventMgr) {
            CoreGame.EventMgr.off('powerUpCreated', this._puHandler);
        }
        this._puHandler = function (evt) {
            self._puCount++;
            var PT = CoreGame.PowerUPType;
            if (evt && evt.type != null && PT) {
                switch (evt.type) {
                    case PT.MATCH_4_H: case PT.MATCH_4_V:
                        self._puRockets++; break;
                    case PT.MATCH_T: case PT.MATCH_L:
                        self._puBombs++; break;
                    case PT.MATCH_5:
                        self._puRainbows++; break;
                    case PT.MATCH_SQUARE:
                        self._puPlanes++; break;
                }
            }
        };
        if (CoreGame.EventMgr) {
            CoreGame.EventMgr.on('powerUpCreated', this._puHandler);
        }

        // Shuffle event listener
        if (this._shuffleHandler && CoreGame.EventMgr) {
            CoreGame.EventMgr.off('boardShuffled', this._shuffleHandler);
        }
        this._shuffleHandler = function () { self._shuffleCount++; };
        if (CoreGame.EventMgr) {
            CoreGame.EventMgr.on('boardShuffled', this._shuffleHandler);
        }

        // v2: scoreChanged listener for HP-based progress tracking
        if (this._scoreChangedHandler && CoreGame.EventMgr) {
            CoreGame.EventMgr.off('scoreChanged', this._scoreChangedHandler);
        }
        this._scoreChangedHandler = function (evt) {
            if (!evt || !evt.details) return;
            var d = evt.details;
            if (d.kind === 'clear' && d.isObjective && d.hp > 0) {
                self._objectiveDamageDealt += d.hp;
            }
        };
        if (CoreGame.EventMgr) {
            CoreGame.EventMgr.on('scoreChanged', this._scoreChangedHandler);
        }

        // ── Strategy setup ────────────────────────────────────────────────
        this._strategies = {
            baseline:   new CoreGame.DropStrategy.RandomSpawnStrategy(),
            yes_pu_l1:  new CoreGame.DropStrategy.YesPUSpawnL1(),
            yes_pu_l2:  new CoreGame.DropStrategy.YesPUSpawnL2(),
            no_pu_l1:   new CoreGame.DropStrategy.NoPUSpawnL1v2(),
            no_pu_l2:   new CoreGame.DropStrategy.NoPUSpawnL2v2()
        };

        // Apply baseline directly (don't inflate trigger count on init)
        this._currentName = "baseline";
        if (this._boardMgr && this._boardMgr.dropMgr) {
            this._boardMgr.dropMgr.setSpawnStrategy(this._strategies["baseline"]);
        }
    },

    /**
     * Call after every turn, once cascade resolution is complete.
     *
     * @param {number} movesUsed      Total moves made so far this level
     * @param {number} targetsCleared  Total target items destroyed so far
     * @param {Object} [turnInfo]      Optional per-turn stats from BoardMgr
     */
    onTurnEnd: function (movesUsed, targetsCleared, turnInfo) {
        this._turnCount++;

        // Accumulate per-turn board stats
        if (turnInfo) {
            var cc2 = turnInfo.cascadeCount || 0;
            this._cascadeSum += cc2;
            if (cc2 > this._cascadeMax) this._cascadeMax = cc2;
            this._tilesRemovedSum += (turnInfo.tilesRemoved || 0);
            var vm = turnInfo.validMoves;
            if (vm != null && vm < this._minValidMoves) this._minValidMoves = vm;
        }

        if (movesUsed < this.ADAPTIVE_START_TURN) return;

        // ── Early exit: all targets cleared ─────────────────────────────
        if (targetsCleared >= this._initialTargets && this._initialTargets > 0) {
            if (this._currentName !== "baseline") {
                this._applyStrategy("baseline", 0);
            }
            this._deviationLog.push(0);
            this._rawDeviationLog.push(0);
            this._smoothedDeviation = this.SMOOTHING_ALPHA * 0
                                    + (1 - this.SMOOTHING_ALPHA) * this._smoothedDeviation;
            cc.log("[AdaptiveTPP] turn=" + movesUsed + "/" + this._totalMoves
                + "  ALL TARGETS CLEARED  strat=baseline");
            return;
        }

        // ── Compute deviation (v2: hybrid actual + pace curve) ──────────
        var rawDev = this._computeDeviation(movesUsed, targetsCleared);

        // ── EMA smoothing (Improvement 3) ───────────────────────────────
        this._smoothedDeviation = this.SMOOTHING_ALPHA * rawDev
                                + (1 - this.SMOOTHING_ALPHA) * this._smoothedDeviation;
        this._rawDeviationLog.push(rawDev);
        this._deviationLog.push(this._smoothedDeviation);

        var deviation = this._smoothedDeviation;

        // ── Per-turn log ────────────────────────────────────────────────
        var countProg = (this._initialTargets > 0) ? (targetsCleared / this._initialTargets) : 0;
        var hpProg    = (this._objectiveTotalHp > 0) ? (this._objectiveDamageDealt / this._objectiveTotalHp) : 0;
        var actual    = Math.min(Math.max(hpProg, countProg), 1);
        var t         = (this._totalMoves > 0) ? (movesUsed / this._totalMoves) : 0;
        var expected  = Math.pow(t, this.PACE_CURVE_EXP);

        cc.log("[AdaptiveTPP] turn=" + movesUsed + "/" + this._totalMoves
            + "  cleared=" + targetsCleared + "/" + this._initialTargets
            + "  dmg=" + this._objectiveDamageDealt + "/" + this._objectiveTotalHp
            + "  actual=" + (actual * 100).toFixed(1) + "%(hp:" + (hpProg * 100).toFixed(1) + "%)"
            + "  expected=" + (expected * 100).toFixed(1) + "%"
            + "  raw=" + (rawDev >= 0 ? "+" : "") + rawDev.toFixed(3)
            + "  smooth=" + (deviation >= 0 ? "+" : "") + deviation.toFixed(3)
            + "  strat=" + this._currentName);

        // ── Strategy selection (uses smoothed deviation) ────────────────
        var next = this._selectStrategyName(deviation);
        if (next !== this._currentName) {
            this._applyStrategy(next, deviation);
        }
    },

    /**
     * Returns the current smoothed deviation.
     * @returns {number}  smoothed deviation in [-1, 1]
     */
    getDeviation: function () {
        return this._smoothedDeviation;
    },

    /**
     * Name of the strategy currently active.
     * @returns {string}
     */
    getCurrentStrategyName: function () {
        return this._currentName;
    },

    /**
     * Current mercy factor for this level.
     * @returns {number}
     */
    getRetryFactor: function () {
        return this._retryFactor;
    },

    /**
     * Call when the level ends (win or out-of-moves).
     *
     * @param {number}  movesUsed   Total moves made this level
     * @param {boolean} completed   True if all targets were cleared
     */
    onLevelEnd: function (movesUsed, completed) {
        this._levelCompleted  = completed;
        this._movesUsedFinal  = movesUsed;

        // Cleanup event listeners
        if (CoreGame.EventMgr && this._puHandler) {
            CoreGame.EventMgr.off('powerUpCreated', this._puHandler);
            this._puHandler = null;
        }
        if (CoreGame.EventMgr && this._shuffleHandler) {
            CoreGame.EventMgr.off('boardShuffled', this._shuffleHandler);
            this._shuffleHandler = null;
        }
        if (CoreGame.EventMgr && this._scoreChangedHandler) {
            CoreGame.EventMgr.off('scoreChanged', this._scoreChangedHandler);
            this._scoreChangedHandler = null;
        }

        // Update mercy factor: halve on loss (capped at floor), reset on win
        var prevRf = this._retryFactor;
        if (!completed) {
            this._retryFactor = Math.max(this.MIN_RETRY_FACTOR, this._retryFactor * 0.5);
        } else {
            this._retryFactor = 1.0;
            this._retryCount  = 0;
        }
        cc.log("[AdaptiveTPP] " + (completed ? "WIN" : "LOSE")
            + "  retry_count=" + this._retryCount
            + "  retry_factor " + prevRf + " -> " + this._retryFactor);
        this._saveRetryData(this._levelId, this._retryFactor, this._retryCount);

        var m = this.getMetrics();
        var d = m.deviation_distribution;
        cc.log("[AdaptiveTPP] ── End-of-level metrics ───────────────────────");
        cc.log("[AdaptiveTPP] Deviation  smooth_mean=" + d.mean.toFixed(3)
            + "  raw_mean=" + m.raw_dev_mean.toFixed(3)
            + "  median=" + d.median.toFixed(3)
            + "  P25=" + d.p25.toFixed(3)
            + "  P75=" + d.p75.toFixed(3));
        cc.log("[AdaptiveTPP] Switches   boost=" + m.boost_switches
            + "  suppress=" + m.suppress_switches
            + "  baseline=" + m.trigger_counts.baseline
            + "  cooldowns=" + m.assist_cooldowns);
        cc.log("[AdaptiveTPP] HP         dmg=" + m.objective_damage_dealt + "/" + m.objective_total_hp
            + "  hp_progress=" + (m.hp_progress_final >= 0 ? m.hp_progress_final.toFixed(3) : "N/A")
            + "  curve=" + m.curve_exponent);
        cc.log("[AdaptiveTPP] Result     " + (completed ? "WIN" : "LOSE")
            + "  surplus=" + m.move_surplus
            + "  pu_rate=" + m.pu_rate.toFixed(3));
        cc.log("[AdaptiveTPP] ────────────────────────────────────────────────");
    },

    /**
     * Returns a snapshot of all collected metrics for this level attempt.
     */
    getMetrics: function () {
        var log = this._deviationLog || [];
        var rawLog = this._rawDeviationLog || [];
        var sorted = log.slice().sort(function (a, b) { return a - b; });
        var rawSorted = rawLog.slice().sort(function (a, b) { return a - b; });
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
            pu_rockets:          this._puRockets || 0,
            pu_bombs:            this._puBombs || 0,
            pu_rainbows:         this._puRainbows || 0,
            pu_planes:           this._puPlanes || 0,
            pu_rate:             (this._movesUsedFinal > 0) ? this._puCount / this._movesUsedFinal
                                 : (this._turnCount   > 0) ? this._puCount / this._turnCount
                                 : 0,
            cascade_avg:         (this._turnCount > 0) ? this._cascadeSum / this._turnCount : 0,
            cascade_max:         this._cascadeMax || 0,
            avg_tiles_per_move:  (this._movesUsedFinal > 0) ? this._tilesRemovedSum / this._movesUsedFinal
                                 : (this._turnCount > 0)    ? this._tilesRemovedSum / this._turnCount
                                 : 0,
            shuffle_count:       this._shuffleCount || 0,
            min_valid_moves:     (this._minValidMoves === Infinity) ? -1 : this._minValidMoves,
            moves_used:          this._movesUsedFinal || 0,
            total_moves:         this._totalMoves || 0,
            retry_factor:        this._retryFactor,

            // ── v2 metrics ──────────────────────────────────────────────
            hp_progress_final:      (this._objectiveTotalHp > 0)
                                    ? this._objectiveDamageDealt / this._objectiveTotalHp
                                    : -1,
            smoothed_dev_mean:      this._mean(sorted),
            raw_dev_mean:           this._mean(rawSorted),
            assist_cooldowns:       this._assistCooldownCount || 0,
            curve_exponent:         this.PACE_CURVE_EXP,
            objective_total_hp:     this._objectiveTotalHp || 0,
            objective_damage_dealt: this._objectiveDamageDealt || 0
        };
    },

    // ── Private helpers ────────────────────────────────────────────────────

    /**
     * v2: Hybrid actual (HP + count), non-linear expected, clamped output.
     */
    _computeDeviation: function (movesUsed, targetsCleared) {
        if (this._initialTargets === 0 || this._totalMoves === 0) return 0;

        // Hybrid actual: max of HP-based and count-based progress
        var countProg = targetsCleared / this._initialTargets;
        var hpProg    = (this._objectiveTotalHp > 0)
                      ? this._objectiveDamageDealt / this._objectiveTotalHp
                      : 0;
        var actual = Math.min(Math.max(hpProg, countProg), 1);

        // Non-linear pace curve (back-loaded): expected uncapped
        var t = movesUsed / this._totalMoves;
        var expected = Math.pow(t, this.PACE_CURVE_EXP);

        // Clamp deviation to [-1, 1]
        var raw = actual - expected;
        return Math.max(-1, Math.min(1, raw));
    },

    /**
     * v2: Tiered strategy selection with assist cooldown.
     *
     * Cooldown: after MAX_ASSIST_STREAK consecutive yes_pu_l1 turns,
     * force ASSIST_COOLDOWN turns of baseline before allowing assist again.
     * yes_pu_l2 (extreme assist) bypasses streak/cooldown entirely.
     */
    _selectStrategyName: function (deviation) {
        // ── Cooldown: forced baseline ───────────────────────────────────
        if (this._assistCooldownLeft > 0) {
            this._assistCooldownLeft--;
            this._assistStreak = 0;
            return "baseline";
        }

        // ── Very far behind: max assist (no streak cap for L2) ─────────
        if (deviation < -this.EXTREME_THRESHOLD) {
            this._assistStreak = 0;
            return "yes_pu_l2";
        }

        // ── Behind pace: moderate assist, streak-capped with cooldown ──
        if (deviation < -this.TPP_THRESHOLD) {
            this._assistStreak++;
            if (this._assistStreak > this.MAX_ASSIST_STREAK) {
                this._assistCooldownLeft = this.ASSIST_COOLDOWN;
                this._assistCooldownCount++;
                this._assistStreak = 0;
                return "baseline";
            }
            return "yes_pu_l1";
        }

        // ── On pace or ahead: reset streak ─────────────────────────────
        this._assistStreak = 0;

        if (deviation > this.EXTREME_THRESHOLD) {
            return "no_pu_l2";
        }
        if (deviation > this.HARD_THRESHOLD) {
            return "no_pu_l1";
        }

        return "baseline";
    },

    _applyStrategy: function (name, deviation) {
        var prev = this._currentName;
        this._currentName = name;
        if (this._triggerCounts && this._triggerCounts.hasOwnProperty(name)) {
            this._triggerCounts[name]++;
        }
        if (this._boardMgr && this._boardMgr.dropMgr) {
            this._boardMgr.dropMgr.setSpawnStrategy(this._strategies[name]);
        }
        var reason = "";
        if (deviation != null) {
            var dStr = (deviation >= 0 ? "+" : "") + deviation.toFixed(3);
            if (name === "yes_pu_l2")
                reason = " (smooth=" + dStr + " < -" + this.EXTREME_THRESHOLD + ", max assist)";
            else if (name === "yes_pu_l1")
                reason = " (smooth=" + dStr + " < -" + this.TPP_THRESHOLD
                       + ", streak=" + this._assistStreak + "/" + this.MAX_ASSIST_STREAK + ")";
            else if (name === "no_pu_l2")
                reason = " (smooth=" + dStr + " > +" + this.EXTREME_THRESHOLD + ", max suppress)";
            else if (name === "no_pu_l1")
                reason = " (smooth=" + dStr + " > +" + this.HARD_THRESHOLD + ", suppress)";
            else if (this._assistCooldownLeft > 0 || this._assistCooldownCount > 0)
                reason = " (smooth=" + dStr + ", cooldown)";
            else
                reason = " (smooth=" + dStr + ", normal)";
        }
        cc.log("[AdaptiveTPP] Strategy " + prev + " -> " + name + reason);
    },

    /** Average of a numeric array. Returns 0 for empty. */
    _mean: function (arr) {
        if (!arr || arr.length === 0) return 0;
        var sum = 0;
        for (var i = 0; i < arr.length; i++) sum += arr[i];
        return sum / arr.length;
    },

    /**
     * p-th percentile (0-100) of a pre-sorted numeric array.
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

    _retryFactorKey: function (levelId) {
        var uid = "";
        try { uid = userMgr.getData().uId || ""; } catch (e) {}
        return "tpp_rf_" + uid + "_" + levelId;
    },

    /** Load persisted retry data for a level. Returns { factor, count }. */
    _loadRetryData: function (levelId) {
        if (levelId == null) return { factor: 1.0, count: 0 };
        try {
            var raw = fr.UserData.getStringFromKey(this._retryFactorKey(levelId), "1");
            if (raw.charAt(0) === '{') {
                var obj = JSON.parse(raw);
                var f = obj.f, c = obj.c || 0;
                return { factor: (isNaN(f) || f <= 0 || f > 1) ? 1.0 : f, count: c };
            }
            var f = parseFloat(raw);
            return { factor: (isNaN(f) || f <= 0 || f > 1) ? 1.0 : f, count: 0 };
        } catch (e) { return { factor: 1.0, count: 0 }; }
    },

    /** Persist retry data for a level to storage. */
    _saveRetryData: function (levelId, factor, count) {
        if (levelId == null) return;
        try {
            fr.UserData.setStringFromKey(this._retryFactorKey(levelId), JSON.stringify({ f: factor, c: count }));
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
