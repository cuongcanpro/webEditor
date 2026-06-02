/**
 * SideMatchAction - Strategy for side match interactions
 * Part of Match-3 Core Game
 */
var CoreGame = CoreGame || {};
CoreGame.Strategies = CoreGame.Strategies || {};

CoreGame.Strategies.TakeDamageAction = CoreGame.Strategies.NormalAction.extend({
    ctor: function () {
        this._super();
    },

    /**
     * Check if condition is met
     * @param {ElementObject} element - The element instance
     * @param {Object} context - Context data for evaluation
     * @returns {boolean} true if condition is met
     */
    checkCondition: function (element, context) {
        if (!element.canTakeDamage(context.matchColor)) return false;

        // Phase 1 guards — Đèn Lồng aura + Mỏ Neo puOnly.
        // Reuses the existing discriminator: PU damage carries
        // `context.puActivationId` (set by the PU variable-damage system,
        // commit c4c5262b0). Non-PU damage has it undefined.
        // See docs/superpowers/specs/2026-05-26-phase1-blockers-design.md §4.
        var isPU = context && context.puActivationId !== undefined;
        if (isPU) return true;

        var bm = element && element.boardMgr && element.boardMgr.blockerMgr;
        // Use the slot position from context (set by onMatchNearby/matchElement).
        // For multi-cell elements (TentacleBlocker) this is the specific cell being
        // hit, not the anchor/whirlpool position stored in element.position.
        var r = (context && context.row !== undefined) ? context.row : (element.position ? element.position.x : -1);
        var c = (context && context.col !== undefined) ? context.col : (element.position ? element.position.y : -1);

        // Guard 1 — Đèn Lồng aura: non-PU damage on a shielded cell is blocked.
        if (bm && bm.shieldMgr && bm.shieldMgr.isCellShielded(r, c)) {
            bm.shieldMgr.showBlockedFx(r, c);
            return false;
        }

        // Guard 2 — Mỏ Neo (puOnly flag on the action config): blocker is
        // immune to non-PU damage entirely.
        if (this.configData && this.configData.puOnly) {
            if (bm && bm.shieldMgr) bm.shieldMgr.showBlockedFx(r, c);
            return false;
        }

        return true;
    },

    /**
     * Execute action
     * @param {ElementObject} element - The element instance
     * @param {Object} context - Context data for execution
     */
    execute: function (element, context) {
        cc.log("Execute TakeDamageAction === " + context.matchColor);
        var dmg = 1;
        var actId = context.puActivationId;

        if (actId !== undefined) {
            // Deduplicate: every element takes PU damage exactly once per
            // activation, no matter how many cells the PU swept past it.
            // (Monsters previously had this guard; non-monsters need it too
            // because a rocket's sideMatch events fire on each swept neighbor.)
            if (!element._lastPUActivationId) {
                element._lastPUActivationId = {};
            }
            if (element._lastPUActivationId[actId]) {
                return;
            }
            element._lastPUActivationId[actId] = true;

            // Monsters get the designer-configured damage; all other elements
            // (factory blockers, standard blockers) take exactly 1 HP.
            if (element.isMonster()) {
                cc.log("Execute TakeDamageMonster === ", JSON.stringify(context));
                var configured = context.damage;
                if (configured) dmg = configured;
            }
        }

        // Per-match dedup for elements that opt in via _dedupPerMatch (e.g.
        // TentacleBlocker): a single match group may touch several of their cells
        // and should only deal 1 damage total regardless of how many cells it
        // contacts.  Uses matchActivationId added by MatchMgr.processMatchGroup.
        var matchActId = context.matchActivationId;
        if (matchActId !== undefined && element._dedupPerMatch) {
            if (!element._lastMatchActivationId) {
                element._lastMatchActivationId = {};
            }
            if (element._lastMatchActivationId[matchActId]) {
                return;
            }
            element._lastMatchActivationId[matchActId] = true;
        }

        element.takeDamage(dmg, context.matchColor, context.row, context.col);
    }
});

CoreGame.Strategies.QueueTakeDamageAction = CoreGame.Strategies.TakeDamageAction.extend({
    configData: {
        _queueTypeIds: [],
    },

    ctor: function () {
        this._super();
    },

    updateVisual: function (element) {
        element.ui.updateLabelState(JSON.stringify(this.configData._queueTypeIds));
    },

    /**
     * Check if condition is met
     * @param {ElementObject} element - The element instance
     * @param {Object} context - Context data for evaluation
     * @returns {boolean} true if condition is met
     */
    checkCondition: function (element, context) {
        var queueTypeIds = this.configData._queueTypeIds;
        cc.log("Check Condition === " + context.matchColor + " === " + queueTypeIds[0]);
        if (queueTypeIds.length > 0 && context && context.matchColor === queueTypeIds[0]) {
            return true;
        }
        return false;
    },

    /**
     * Execute action
     * @param {ElementObject} element - The element instance
     * @param {Object} context - Context data for execution
     */
    execute: function (element, context) {
        cc.log("Execute === " + context.matchColor);
        this.configData._queueTypeIds.shift();
        if (this.configData._queueTypeIds.length == 0) {
            element.remove();
        }
        else {
            element.updateVisual();
            element.ui.updateLabelState(JSON.stringify(this.configData._queueTypeIds));
        }
    },

    /**
     * Get queue type ids
     */
    getQueueTypeIds: function () {
        return this.configData._queueTypeIds;
    }
});

CoreGame.Strategies.CollectTakeDamageAction = CoreGame.Strategies.TakeDamageAction.extend({
    configData: {
        _requiredTypeIds: [],
    },
    _collectedTypeIds: null,

    ctor: function (requiredTypeIds) {
        this._super();
        this._collectedTypeIds = [];
        this.configData._requiredTypeIds = requiredTypeIds || [];
    },

    updateVisual: function (element) {
        element.ui.updateLabelState(JSON.stringify(this.configData._requiredTypeIds) + "\n" + JSON.stringify(this._collectedTypeIds));
    },

    /**
     * Check if condition is met
     * @param {ElementObject} element - The element instance
     * @param {Object} context - Context data for evaluation
     * @returns {boolean} true if condition is met
     */
    checkCondition: function (element, context) {
        var matchColor = context.matchColor;
        cc.log("Check Condition === " + matchColor + " in " + JSON.stringify(this.configData._requiredTypeIds) + " and not in " + JSON.stringify(this._collectedTypeIds));

        // 1. Check if color is required
        if (this.configData._requiredTypeIds.indexOf(matchColor) === -1) return false;

        // 2. Check if already collected
        if (this._collectedTypeIds.indexOf(matchColor) !== -1) return false;

        // 3. Collect it
        return true;
    },

    /**
     * Execute action
     * @param {ElementObject} element - The element instance
     * @param {Object} context - Context data for execution
     */
    execute: function (element, context) {
        cc.log("CollectTakeDamageAction execute - collecting:", context.matchColor);
        var matchColor = context.matchColor;
        this._collectedTypeIds.push(matchColor);

        // Update Visual - call collectType on UI
        if (element.ui) {
            element.ui.collectType(matchColor);
        }

        // Check Done
        if (this._collectedTypeIds.length >= this.configData._requiredTypeIds.length) {
            cc.log("Collection complete! Destroying element.");
            element.doExplode(context.row, context.col);
        }
        element.ui.updateLabelState(JSON.stringify(this.configData._requiredTypeIds) + "\n" + JSON.stringify(this._collectedTypeIds));
    }
});

/**
 * QueueResetableTakeDamageAction
 * Queue match-in-order with RESET on wrong color. Used by L193 Đá Tượng Hình.
 */
CoreGame.Strategies.QueueResetableTakeDamageAction = CoreGame.Strategies.TakeDamageAction.extend({
    configData: {
        _queueTypeIds: []
    },
    _initialQueue: null,

    ctor: function () {
        this._super();
    },

    setConfigData: function (config) {
        this._super(config);
        if (this.configData && this.configData._queueTypeIds) {
            this._initialQueue = this.configData._queueTypeIds.slice();
        }
    },

    updateVisual: function (element) {
        if (element && element.ui && element.ui.updateLabelState) {
            element.ui.updateLabelState(JSON.stringify(this.configData._queueTypeIds));
        }
    },

    checkCondition: function (element, context) {
        if (context && context.puActivationId !== undefined) return false;
        if (!context || context.matchColor === undefined) return false;
        if (!this.configData._queueTypeIds || this.configData._queueTypeIds.length === 0) return false;
        return true;
    },

    execute: function (element, context) {
        var queue = this.configData._queueTypeIds;
        var head = queue[0];
        if (context.matchColor === head) {
            // Correct color: consume one layer (HP -1) + advance queue.
            // Going through takeDamage routes Box-style damage frames /
            // updateVisual through the engine, so the sprite tier matches HP.
            queue.shift();
            element.takeDamage(1, context.matchColor, context.row, context.col);
            if (element.ui && element.ui.playStepProgressEffect) {
                element.ui.playStepProgressEffect(this._initialQueue.length - queue.length);
            }
            this.updateVisual(element);
        } else {
            // Wrong color: reset the color sequence but keep HP (the
            // player's PROGRESS on layers is preserved — only the colour
            // memory restarts).
            if (this._initialQueue) {
                this.configData._queueTypeIds = this._initialQueue.slice();
            }
            if (element.ui && element.ui.playResetEffect) {
                element.ui.playResetEffect();
            }
            this.updateVisual(element);
        }
    },

    getQueueTypeIds: function () {
        return this.configData._queueTypeIds;
    }
});

/**
 * QueuePUShiftAction - PU bypass for L193: shift queue regardless of color.
 */
CoreGame.Strategies.QueuePUShiftAction = CoreGame.Strategies.NormalAction.extend({
    configData: {
        _shiftSteps: 1
    },

    ctor: function () {
        this._super();
    },

    checkCondition: function (element, context) {
        if (!context) return false;
        // Only fire on PU activations. Match context carries type='powerup'
        // when the source is a PU (set by MatchMgr.processMatchGroup).
        // puActivationId is dead code in this codebase — never assigned.
        if (context.type !== 'powerup') return false;
        if (context.group && element._lastMatchPUGroup === context.group) return false;
        return true;
    },

    execute: function (element, context) {
        if (context.group) element._lastMatchPUGroup = context.group;
        var queueAction = null;
        var sideMatchActions = element.getActions(CoreGame.ElementObject.ACTION_TYPE.SIDE_MATCH) || [];
        for (var i = 0; i < sideMatchActions.length; i++) {
            if (sideMatchActions[i] instanceof CoreGame.Strategies.QueueResetableTakeDamageAction
                || sideMatchActions[i] instanceof CoreGame.Strategies.QueueTakeDamageAction) {
                queueAction = sideMatchActions[i];
                break;
            }
        }
        var hpBefore = element.hitPoints;
        var steps = this.configData._shiftSteps || 1;
        for (var s = 0; s < steps; s++) {
            if (element.hitPoints <= 0) break;
            if (queueAction && queueAction.configData._queueTypeIds.length > 0) {
                queueAction.configData._queueTypeIds.shift();
            }
            element.takeDamage(1, context.matchColor, context.row, context.col);
        }
        cc.log("[QueuePU] act=" + context.puActivationId + " elem=" + element.type
            + " hpBefore=" + hpBefore + " hpAfter=" + element.hitPoints
            + " queueLen=" + (queueAction ? queueAction.configData._queueTypeIds.length : "n/a"));
        if (queueAction && queueAction.updateVisual) queueAction.updateVisual(element);
    }
});

/**
 * NonPUTakeDamageAction
 * Standard sideMatch damage with two safeguards for inversion blockers
 * (L215 Anubis): dedup per match group (so a multi-cell adjacent match
 * doesn't multi-damage) AND deferred apply via a microtask so a sibling
 * heal action firing later in the same tick can mark the group as PU and
 * cancel the damage.
 */
CoreGame.Strategies.NonPUTakeDamageAction = CoreGame.Strategies.TakeDamageAction.extend({
    configData: {
        // Whitelist of PU types that STILL damage this blocker (Anubis:
        // [103] = pure Disco alone — strips magic, deals damage). All
        // other puTypes (rocket/bomb/plane + Disco combos like 306/309/
        // 310/311/305) are absorbed by the InvertedHealOnPUAction sibling.
        _damagePUTypes: []
    },

    ctor: function () {
        this._super();
    },

    /**
     * Fires for normal gem matches (no puType) and for puTypes explicitly
     * listed in _damagePUTypes. All other PU sources are skipped — they
     * route through InvertedHealOnPUAction (heal).
     * `context.puType` is the true PU marker (set by every PU class).
     */
    checkCondition: function (element, context) {
        if (!context || context.matchColor === undefined) return false;
        if (context.puType !== undefined) {
            // PU source — only damage if in whitelist.
            var dmgList = this.configData._damagePUTypes || [];
            if (dmgList.indexOf(context.puType) === -1) return false;
        }
        if (!element.canTakeDamage(context.matchColor)) return false;
        return true;
    }
});

/**
 * InvertedHealOnPUAction
 * PU activation HEALS the blocker. Used by L215 Anubis. Detects PU via
 * context.type==='powerup' (set by MatchMgr for direct PU hits) — works
 * because puActivationId is dead code in this codebase. Dedup per match
 * group ref to avoid multi-heal from multi-cell PU clips.
 */
CoreGame.Strategies.InvertedHealOnPUAction = CoreGame.Strategies.NormalAction.extend({
    configData: {
        _healAmount: 1,
        // Blacklist of PU types that DON'T heal (instead damage via the
        // NonPU sibling). Anubis design: lone Disco (103) is pure color
        // destruction → damages. Every other PU (rocket/bomb/plane) +
        // every COMBO involving Disco (306/309/310/311/305) is elemental
        // magic and heals.
        _damagePUTypes: []
    },

    ctor: function () {
        this._super();
    },

    checkCondition: function (element, context) {
        if (!context) return false;
        if (context.puType === undefined) return false;
        var dmgList = this.configData._damagePUTypes || [];
        if (dmgList.indexOf(context.puType) !== -1) return false;
        if (typeof element.heal !== 'function') return false;
        return true;
    },

    execute: function (element, context) {
        var amount = this.configData._healAmount || 1;
        element.heal(amount, context.matchColor, context.row, context.col);
        cc.log("[Anubis] HEAL +" + amount + " from puType=" + context.puType + " hp=" + element.hitPoints);
    }
});

CoreGame.Strategies.MatchColorTakeDamageAction = CoreGame.Strategies.TakeDamageAction.extend({
    configData: {
        _matchColor: -1,
    },

    ctor: function () {
        this._super();
    },

    /**
     * Check if condition is met
     * @param {ElementObject} element - The element instance
     * @param {Object} context - Context data for evaluation
     * @returns {boolean} true if condition is met
     */
    checkCondition: function (element, context) {
        // PU damage (Bom/Rocket/Rainbow) carries no gem color — it bypasses the
        // color check entirely. puActivationId is set by the PU damage system.
        // Delegating to _super keeps the base PU short-circuit + shield/puOnly
        // guards consistent with every other blocker.
        var isPU = context && context.puActivationId !== undefined;
        if (isPU) {
            return this._super(element, context);
        }
        // Normal match: only the gem color matching this blocker's required
        // color collects it. King Crab rotates its color at runtime via
        // CycleMatchColorAction, which stores the live value on element._matchColor
        // (the shared configData._matchColor stays the authored starting color).
        var required = (element && typeof element._matchColor === 'number')
            ? element._matchColor
            : this.configData._matchColor;
        if (context && context.matchColor === required) {
            return element.canTakeDamage(context.matchColor);
        }
        return false;
    }
});

/**
 * ColorBottleTakeDamageAction — strategy for the 2×2 ColorCabinet (18000).
 *
 * Side-match: if matchColor is a still-alive bottle -> break that bottle.
 *             else -> ui.shakeWrong() feedback, no HP loss.
 * PU hit (context.puActivationId set): break exactly one bottle (smallest
 *             remaining color), deduped per activation.
 * Bottle state lives on the element (ColorCabinet); see entity.breakBottle().
 */
CoreGame.Strategies.ColorBottleTakeDamageAction = CoreGame.Strategies.TakeDamageAction.extend({
    checkCondition: function (element, context) {
        // Must be a ColorCabinet (owns bottle state).
        if (!element || typeof element.getRemainingColors !== 'function') return false;
        // Respect base guards (Đèn Lồng aura shield, puOnly) so a shielded
        // cabinet cell is not breakable; otherwise behave normally.
        return this._super(element, context);
    },

    execute: function (element, context) {
        var remaining = element.getRemainingColors();
        if (!remaining || remaining.length === 0) return;

        var isPU = context && context.puActivationId !== undefined;
        if (isPU) {
            var actId = context.puActivationId;
            if (!element._lastPUActivationId) element._lastPUActivationId = {};
            if (element._lastPUActivationId[actId]) return;
            element._lastPUActivationId[actId] = true;
            // PU Plane truyền context.bottleColor = đúng chai nó bay tới; phá chai
            // đó để chai vỡ khớp với anim. Các PU khác (bom/rocket) không truyền ->
            // phá chai màu nhỏ nhất còn lại như cũ.
            var puColor = (context.bottleColor && remaining.indexOf(context.bottleColor) !== -1)
                ? context.bottleColor : remaining[0];
            element.breakBottle(puColor, context.row, context.col);
            return;
        }

        var color = context.matchColor;
        if (remaining.indexOf(color) !== -1) {
            element.breakBottle(color, context.row, context.col);
        } else if (element.ui && typeof element.ui.shakeWrong === 'function') {
            element.ui.shakeWrong();
        }
    }
});
