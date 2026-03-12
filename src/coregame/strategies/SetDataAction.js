/**
 * MatchAction - Strategy for match interactions
 * Part of Match-3 Core Game
 */
var CoreGame = CoreGame || {};
CoreGame.Strategies = CoreGame.Strategies || {};

CoreGame.Strategies.SetDataAction = CoreGame.Strategies.NormalAction.extend({
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
        return true;
    },

    /**
     * Execute action
     * @param {ElementObject} element - The element instance
     * @param {Object} matchContext - Context data for execution
     */
    execute: function (element, matchContext) {
        if (!this.configData) {
            return;
        }

        // Iterate through all keys in configData
        for (var key in this.configData) {
            if (this.configData.hasOwnProperty(key)) {
                // Get value from configData
                var value = this.configData[key];

                // Assign to corresponding element property
                element[key] = value;

                cc.log("SetDataAction: Set element." + key + " =", value);
                cc.log("value " + element.cooldownSpawn);
            }
        }
    }
});
