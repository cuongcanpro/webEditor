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
        if (element.canTakeDamage(context.matchColor)) {
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
        cc.log("Execute TakeDamageAction === " + context.matchColor);
        element.takeDamage(1, context.matchColor, context.row, context.col);
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

    ctor: function () {
        this._super();
        this._collectedTypeIds = [];
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
