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
        if (context && context.matchColor === this.configData._matchColor) {
            return element.canTakeDamage(context.matchColor);
        }
        return false;
    }
});
