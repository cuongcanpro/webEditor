/**
 * ActiveSwap - Swap that activates a power-up
 * Part of Match-3 Core Game
 */
var CoreGame = CoreGame || {};

CoreGame.ActiveSwap = CoreGame.LogicSwap.extend({

    ctor: function (boardMgr) {
        this._super(boardMgr);
    },

    /**
     * Check if this is a power-up activation swap
     */
    canSwap: function (element1, element2) {
        if (!this._super(element1, element2)) return false;

        // At least one must be a power-up
        var isPU1 = element1 instanceof CoreGame.PowerUP;
        var isPU2 = element2 instanceof CoreGame.PowerUP;

        // One power-up and one gem
        return (isPU1 && !isPU2) || (!isPU1 && isPU2);
    },

    /**
     * Perform power-up activation swap
     */
    swap: function (element1, element2) {
        if (!this.canSwap(element1, element2)) {
            return false;
        }

        this.element1 = element1;
        this.element2 = element2;

        // Determine which is the power-up
        var powerUp = element1 instanceof CoreGame.PowerUP ? element1 : element2;
        var targetGem = element1 instanceof CoreGame.PowerUP ? element2 : element1;

        var self = this;
        var duration = CoreGame.Config.SWAP_DURATION;

        // Data Swap
        this.doSwap();

        // Animate Visuals
        var targetPos1 = self.boardMgr.gridToPixel(element1.position.x, element1.position.y);
        var targetPos2 = self.boardMgr.gridToPixel(element2.position.x, element2.position.y);

        element1.visualMoveTo(targetPos1, duration);
        element2.visualMoveTo(targetPos2, duration);

        // Schedule Activation
        CoreGame.TimedActionMgr.addAction(duration, function () {
            // Reset state
            powerUp.setState(CoreGame.ElementState.IDLE);
            targetGem.setState(CoreGame.ElementState.IDLE);

            // Activate the power-up
            powerUp.active(targetGem.type);

            // Remove the power-up
            // powerUp.remove();
        });
        return true;
    }
});
