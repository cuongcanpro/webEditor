/**
 * SetAttributeAction - Strategy to set a specific field on an element
 * fieldName and value are defined in configData
 */
var CoreGame = CoreGame || {};
CoreGame.Strategies = CoreGame.Strategies || {};

CoreGame.Strategies.SetAttributeAction = CoreGame.Strategies.NormalAction.extend({
    configData: {
        fieldName: "",
        value: 0
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
            var value = this.configData.value;
            element.customData[fieldName] = value;
            cc.log("SetAttributeAction: Set element.customData." + fieldName + " to " + value);
        }
    }
});
