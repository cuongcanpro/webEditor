/**
 * CheckAttributeAction - Strategy to check a field and trigger an action if it reaches a value
 */
var CoreGame = CoreGame || {};
CoreGame.Strategies = CoreGame.Strategies || {};

CoreGame.Strategies.CheckAttributeAction = CoreGame.Strategies.NormalAction.extend({
    configData: {
        fieldName: "",
        targetValue: 0,
        actionKey: ""
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
        if (this.configData && this.configData.fieldName && this.configData.actionKey) {
            var fieldName = this.configData.fieldName;
            var targetValue = this.configData.targetValue;
            var actionKey = this.configData.actionKey;

            if (element.customData[fieldName] !== undefined && element.customData[fieldName] == targetValue) {
                cc.log("CheckAttributeAction: customData '" + fieldName + "' reached " + targetValue + ". Triggering action: " + actionKey);
                element.doActionsType(actionKey, context);
            }
        }
    }
});

CoreGame.Strategies.CheckAttributeAction1 = CoreGame.Strategies.CheckAttributeAction.extend({
    ctor: function () {
        this._super();
    }
});

CoreGame.Strategies.CheckAttributeAction2 = CoreGame.Strategies.CheckAttributeAction.extend({
    ctor: function () {
        this._super();
    }
});

CoreGame.Strategies.CheckAttributeAction3 = CoreGame.Strategies.CheckAttributeAction.extend({
    ctor: function () {
        this._super();
    }
});