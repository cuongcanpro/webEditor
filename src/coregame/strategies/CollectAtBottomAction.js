/**
 * CollectAtBottomAction - Collects an element when it reaches the bottom of the board
 * (no valid slot exists directly below it).
 *
 * Attach this action to any blocker that should be collected upon hitting the floor.
 * Triggered by ACTION_TYPE.ON_IDLE — the element must emit this in its setState override.
 *
 * Part of Match-3 Core Game
 */
var CoreGame = CoreGame || {};
CoreGame.Strategies = CoreGame.Strategies || {};

CoreGame.Strategies.CollectAtBottomAction = CoreGame.Strategies.NormalAction.extend({

    /**
     * Condition: no valid slot exists one row below the element.
     * boardMgr.getSlot returns null for out-of-bounds or disabled slots.
     */
    checkCondition: function (element, context) {
        if (!element.boardMgr) return false;
        var belowSlot = element.boardMgr.getSlot(
            element.position.x - 1,
            element.position.y
        );
        return belowSlot === null;
    },

    /**
     * Execute: collect the element → doExplode chains into remove() → removedElement() → objective.
     */
    execute: function (element, context) {
        cc.log("CollectAtBottomAction: collecting type=" + element.type
            + " at (" + element.position.x + "," + element.position.y + ")");
        element.doExplode(element.position.x, element.position.y);
    }
});
