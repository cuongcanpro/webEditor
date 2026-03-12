/**
 * ChangeAttributeAction - Strategy to increment or decrement a field on an element
 * fieldName, delta, and defaultValue are defined in configData
 */
var CoreGame = CoreGame || {};
CoreGame.Strategies = CoreGame.Strategies || {};

CoreGame.Strategies.ChangeAttributeAction = CoreGame.Strategies.NormalAction.extend({
    configData: {
        fieldName: "",
        delta: 1,
        defaultValue: 0
    },

    ctor: function () {
        this._super();
    },

    /**
     * Execute action
     * @param {ElementObject} element - The element instance
     * @param {Object} context - Context data for execution
     */
    execute: function (element, context) {
        if (this.configData && this.configData.fieldName) {
            var fieldName = this.configData.fieldName;
            var delta = this.configData.delta || 0;

            if (element.customData[fieldName] === undefined) {
                element.customData[fieldName] = (this.configData.defaultValue || 0);
            }

            element.customData[fieldName] += delta;
            cc.log("ChangeAttributeAction: Updated element.customData." + fieldName + " by " + delta + ". New value = " + element.customData[fieldName]);
        }
    }
});
