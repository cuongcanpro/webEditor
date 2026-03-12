/**
 * NormalAction - Base strategy action
 * Part of Match-3 Core Game
 */
var CoreGame = CoreGame || {};
CoreGame.Strategies = CoreGame.Strategies || {};

CoreGame.Strategies.NormalAction = cc.Class.extend({
    configData: null,
    targetElement: null,
    ctor: function () {

    },

    setTargetElement: function (target) {
        this.targetElement = target;
    },

    updateVisual: function (element) {

    },

    setConfigData: function (config) {
        this.configData = config;
    },

    /**
     * Check if condition is met
     * @param {ElementObject} element - The element instance
     * @param {Object} context - Context data for evaluation
     * @returns {boolean} true if condition is met
     */
    checkCondition: function (element, context) {
        return true;
    },

    /**
     * Execute action
     * @param {ElementObject} element - The element instance
     * @param {Object} context - Context data for execution
     */
    execute: function (element, context, time) {
        // Implementation logic here
    }
});
