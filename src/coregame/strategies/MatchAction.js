/**
 * MatchAction - Strategy for match interactions
 * Part of Match-3 Core Game
 */
var CoreGame = CoreGame || {};
CoreGame.Strategies = CoreGame.Strategies || {};

CoreGame.Strategies.MatchAction = CoreGame.Strategies.NormalAction.extend({
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
        // Match logic to be implemented
        element.setState(CoreGame.ElementState.MATCHING);

        if (!matchContext || matchContext.type === 'normal') {
            // Normal match - play explode animation
            element.doExplode(element.position.x, element.position.y);
        } else if (matchContext.type === 'powerup') {
            // PowerUp match - play converge animation to targetPos
            element.playConvergeAnimation(matchContext.targetPos);
        }

        CoreGame.EventMgr.emit('elementMatched', element);
    }
});
