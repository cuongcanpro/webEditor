/**
 * PlayAnimationAction - Strategy to play a specific animation on an element
 * Animation name is defined in configData
 */
var CoreGame = CoreGame || {};
CoreGame.Strategies = CoreGame.Strategies || {};

CoreGame.Strategies.PlayAnimationAction = CoreGame.Strategies.NormalAction.extend({
    configData: {
        animationName: ""
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
        var animName = this.configData ? (this.configData.animation || this.configData.animationName) : null;
        if (element.ui && animName) {
            var visualState = (element.customData && element.customData.visualState) ? element.customData.visualState : "";
            element.ui.playAnimation(animName, visualState);
        }
    }
});
