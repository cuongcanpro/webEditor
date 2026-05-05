/**
 * ScoreMgr - In-game score calculator for the 3-Star Scoring System.
 * See doc/DesignDoc_3StarSystem.md for the full design.
 *
 * Scope of this implementation (intentionally narrow):
 *   - Compute the running ObjectiveScore + BonusScore as the player plays.
 *   - Bookkeep a breakdown for end-screen / debugging.
 *   - Emit a 'scoreChanged' EventMgr event on every score change.
 *   - NO threshold logic, NO star count derivation, NO UI.
 *
 * Hooks (called from elsewhere):
 *   - addClearEvent(ctx)         per damage / removal event:
 *       Blocker.takeDamage / DynamicBlocker.takeDamage / QueueBlocker.takeDamage
 *         → score per damage call (multi-HP blockers, bosses, tiles)
 *       BoardMgr.removedElement
 *         → score gems (non-Blocker, non-PowerUP) at their final removal
 *   - addPUCreatedEvent(puType)  whenever a PowerUp is spawned by a match
 *   - addPUChainEvent(depth)     when a PU's activation triggers another PU
 *   - addLeftoverMoveBonus()     once per leftover-move PU detonation
 *
 * Decisions captured from design Q&A (chat 2026-04-29..30):
 *   - Score is paid out PER DAMAGE EVENT (not just on removal). Multi-HP
 *     blockers (Box, Chain, bosses) and tile-based blockers (Cloud) earn
 *     `baseValue × damageAmount` per hit. Single-HP entities (gems) score
 *     once at removal time.
 *   - Bosses/Monsters ARE scored — using their §3.1 "per HP" entries.
 *   - PU itself when destroyed does NOT score; its score comes from what it
 *     removes around it.
 *   - PU clear (via PU explosion) takes the `pu` value column; secondary
 *     gem hit by PU splash gets no cascade multiplier.
 *   - Cascade depth uses BoardMgr.cascadeCount with the existing
 *     `Math.max(0, cascadeCount - 1)` mapping (player swap = depth 0).
 *   - PU chain depth tracked by a live counter of currently-active PUs;
 *     2nd active PU = +800, 3rd+ = +1200 each.
 */
var CoreGame = CoreGame || {};

CoreGame.ScoreMgr = cc.Class.extend({
    boardMgr: null,

    // Running totals
    score: 0,
    objectiveScore: 0,
    secondaryScore: 0,
    cascadeBonus: 0,    // accumulated cascade-multiplier "bonus" portion only
    puCreationBonus: 0,
    puChainBonus: 0,
    leftoverBonus: 0,

    // Optional history for end-screen / debugging
    eventLog: null,
    eventLogEnabled: false,

    ctor: function (boardMgr) {
        this.boardMgr = boardMgr;
        this.eventLog = [];
        this.reset();
    },

    /**
     * Reset all running totals. Called from BoardMgr.init when a level starts.
     * Emits 'scoreChanged' with kind='reset' so listeners (progress bar, etc.)
     * can clear themselves.
     */
    reset: function () {
        this.score = 0;
        this.objectiveScore = 0;
        this.secondaryScore = 0;
        this.cascadeBonus = 0;
        this.puCreationBonus = 0;
        this.puChainBonus = 0;
        this.leftoverBonus = 0;
        if (this.eventLog) this.eventLog.length = 0;
        this._emitChanged(0, { kind: 'reset', earned: 0 });
    },

    // ─── Event entry points ──────────────────────────────────────────────────

    /**
     * Score a single damage / removal event.
     *
     * @param {Object} ctx
     * @param {number} ctx.elementType   - ElementType id of the damaged element
     * @param {number} [ctx.hp]          - Damage amount (HP removed by THIS
     *                                     event); for tile-based / instant
     *                                     removal pass 1. Defaults to 1.
     * @param {boolean} [ctx.isObjective]- Whether the element type is in
     *                                     the level's targetElements
     * @param {string} [ctx.clearMethod] - 'match' (default) | 'pu'
     * @param {number} [ctx.cascadeDepth]- 0 for player's direct match,
     *                                     +1 each cascade wave
     * @returns {number} score awarded by this event
     */
    addClearEvent: function (ctx) {
        if (!ctx) return 0;
        var type = ctx.elementType;
        if (typeof type !== 'number') return 0;
        // PowerUps don't score their own destruction; their score comes from
        // what they remove around them (§3.3 "PU Activated +0").
        if (CoreGame.ScoreMgr._isPowerUpType(type)) return 0;

        var hp = Math.max(1, ctx.hp || 1);
        var byMethod = (ctx.clearMethod === 'pu') ? 'pu' : 'match';
        var cascadeDepth = Math.max(0, ctx.cascadeDepth || 0);

        var entry, base, allowCascadeMult;
        if (ctx.isObjective) {
            entry = CoreGame.ScoreMgr.BLOCKER_BASE_VALUES[type];
            if (!entry) return 0;
            base = (entry[byMethod] != null) ? entry[byMethod] : entry.match;
            // Objective clears get the cascade multiplier when the clear is a
            // cascade-driven match (not a PU splash). Per §3.4 the multiplier
            // applies to the match path only.
            allowCascadeMult = (byMethod === 'match');
        } else {
            entry = CoreGame.ScoreMgr.SECONDARY_BASE_VALUES[type]
                || CoreGame.ScoreMgr.SECONDARY_BASE_VALUES._regularGem;
            base = (byMethod === 'pu')
                ? ((entry.pu != null) ? entry.pu : entry.match)
                : entry.match;
            // §3.2: cascade mult applies only to entries flagged cascadeMult
            // AND only on the match path; a PU splash never gets the mult.
            allowCascadeMult = (byMethod === 'match') && (entry.cascadeMult !== false);
        }

        var raw = base * hp;
        var mult = 1;
        if (allowCascadeMult) {
            mult = CoreGame.ScoreMgr.getCascadeMultiplier(cascadeDepth);
        }
        var earned = Math.round(raw * mult);

        if (ctx.isObjective) this.objectiveScore += earned;
        else this.secondaryScore += earned;

        if (mult > 1) {
            // Track the multiplier portion separately so the end screen can
            // display "Cascade Bonus" cleanly without re-doing math.
            this.cascadeBonus += (earned - raw);
        }

        this.score += earned;

        var details = {
            kind: 'clear',
            type: type, hp: hp,
            isObjective: !!ctx.isObjective,
            method: byMethod,
            cascadeDepth: cascadeDepth,
            base: base, mult: mult, earned: earned
        };
        if (this.eventLogEnabled) this.eventLog.push(details);
        this._emitChanged(earned, details);
        return earned;
    },

    /**
     * Score the creation of a PowerUp (§3.3).
     * @param {number} puType - CoreGame.PowerUPType.*
     * @returns {number} score awarded
     */
    addPUCreatedEvent: function (puType) {
        var T = CoreGame.PowerUPType || {};
        var bonus = 0;
        if (puType === T.MATCH_4_H || puType === T.MATCH_4_V) bonus = 300;
        else if (puType === T.MATCH_T || puType === T.MATCH_L || puType === T.MATCH_SQUARE) bonus = 400;
        else if (puType === T.MATCH_5) bonus = 600;
        if (bonus === 0) return 0;

        this.puCreationBonus += bonus;
        this.score += bonus;
        var details = { kind: 'pu_created', puType: puType, bonus: bonus, earned: bonus };
        if (this.eventLogEnabled) this.eventLog.push(details);
        this._emitChanged(bonus, details);
        return bonus;
    },

    /**
     * Score a PU chain activation. The first active PU does NOT earn a chain
     * bonus — only the 2nd (+800) and 3rd+ (+1200 each).
     *
     * @param {number} chainDepth - 1-indexed count of currently-active PUs at
     *                              the moment this PU started activating.
     * @returns {number} score awarded
     */
    addPUChainEvent: function (chainDepth) {
        if (!chainDepth || chainDepth < 2) return 0;
        var bonus = (chainDepth === 2) ? 800 : 1200;
        this.puChainBonus += bonus;
        this.score += bonus;
        var details = { kind: 'pu_chain', depth: chainDepth, bonus: bonus, earned: bonus };
        if (this.eventLogEnabled) this.eventLog.push(details);
        this._emitChanged(bonus, details);
        return bonus;
    },

    /**
     * Flat +500 bonus per leftover move at end of level (§3.5).
     * Called once per move-converted-to-bonus-PU, regardless of whether the
     * resulting PU finds anything to clear ("Lucky Shot!" still pays out).
     * @returns {number} score awarded (always 500)
     */
    addLeftoverMoveBonus: function () {
        var bonus = 500;
        this.leftoverBonus += bonus;
        this.score += bonus;
        var details = { kind: 'leftover', bonus: bonus, earned: bonus };
        if (this.eventLogEnabled) this.eventLog.push(details);
        this._emitChanged(bonus, details);
        return bonus;
    },

    // ─── Read-only views ─────────────────────────────────────────────────────

    /**
     * Snapshot of the current scoring breakdown.
     */
    getScore: function () {
        var bonus = this.secondaryScore + this.cascadeBonus
            + this.puCreationBonus + this.puChainBonus + this.leftoverBonus;
        return {
            total: this.score,
            objective: this.objectiveScore,
            secondary: this.secondaryScore,
            cascadeBonus: this.cascadeBonus,
            puCreation: this.puCreationBonus,
            puChain: this.puChainBonus,
            leftover: this.leftoverBonus,
            bonus: bonus
        };
    },

    getStar: function (scoreConfig) {
        let score = this.score;
        let star = 0;

        for (let i = 0; i < 3; i++) {
            let mileStone = scoreConfig["star" + (i + 1) + "Threshold"];
            if (score < mileStone) {
                break;
            }
            star++;
        }

        return star;
    },

    /**
     * Internal helper: fire the 'scoreChanged' event whenever any accumulator
     * changes. Single payload shape across all kinds:
     *
     *   { delta: number,           // points awarded by this event (0 on reset)
     *     details: {kind, earned, ...kind-specific},
     *     score: { ... full snapshot ... },
     *     boardMgr: BoardMgr }
     */
    _emitChanged: function (delta, details) {
        if (!CoreGame.EventMgr || typeof CoreGame.EventMgr.emit !== 'function') return;
        CoreGame.EventMgr.emit('scoreChanged', {
            delta: delta,
            details: details,
            score: this.getScore(),
            boardMgr: this.boardMgr
        });
    }
});

// ─── Static config (tables straight from §3 of the design doc) ───────────────

/**
 * §3.1 — Blocker base values. Score awarded `baseValue × damageAmount` per
 * damage event (Blocker.takeDamage / DynamicBlocker.takeDamage /
 * QueueBlocker.takeDamage), keyed by element type id.
 */
CoreGame.ScoreMgr.BLOCKER_BASE_VALUES = {
    // Generic blockers
    700:   { match: 200, pu: 320 },   // Box (per HP)
    500:   { match: 120, pu: 180 },   // Grass (per tile)
    600:   { match: 250, pu: 400 },   // Chain (per HP)
    5000:  { match: 300, pu: 480 },   // FabergeEgg
    1000:  { match: 180, pu: 280 },   // Donut
    900:   { match: 150, pu: 150 },   // Cloud — design says non-objective only,
                                      // but defensive value if it ever appears
                                      // in targetElements.
    // Bosses / monsters (per HP)
    10000: { match: 500, pu: 700 },   // BossKong
    15000: { match: 500, pu: 700 },   // BossBunny
    16000: { match: 600, pu: 850 },   // BossBunnyElite
    17000: { match: 700, pu: 1000 }   // BossElite
};

/**
 * §3.2 — Secondary clear values (when the element is NOT in targetElements).
 * `cascadeMult: false` means no multiplier even on the match path (Cloud).
 *
 * `_regularGem` is a sentinel for any gem type without its own entry
 * (regular GemObject types 1..NUM_GEN).
 */
CoreGame.ScoreMgr.SECONDARY_BASE_VALUES = {
    _regularGem: { match: 40, pu: 80, cascadeMult: true },
    700: { match: 150, pu: 150, cascadeMult: true },
    500: { match: 90,  pu: 90,  cascadeMult: true },
    900: { match: 100, pu: 100, cascadeMult: false },
    600: { match: 200, pu: 200, cascadeMult: true }
};

/**
 * §3.4 — Cascade multiplier table. Index = cascade depth (0 = direct match,
 * capped at length-1 = 4+).
 */
CoreGame.ScoreMgr.CASCADE_MULTIPLIER = [1.0, 1.2, 1.5, 1.8, 2.5];

CoreGame.ScoreMgr.getCascadeMultiplier = function (depth) {
    var table = CoreGame.ScoreMgr.CASCADE_MULTIPLIER;
    var d = Math.max(0, depth || 0);
    return table[Math.min(d, table.length - 1)];
};

/**
 * Detect whether a type id is a registered PowerUp. Used to skip self-scoring
 * when a PU is destroyed (its score comes from what it removes, not itself).
 */
CoreGame.ScoreMgr._isPowerUpType = function (type) {
    var T = CoreGame.PowerUPType;
    if (!T) return false;
    for (var k in T) {
        if (T.hasOwnProperty(k) && T[k] === type) return true;
    }
    return false;
};
