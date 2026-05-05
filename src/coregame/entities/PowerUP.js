/**
 * PowerUP - Special power-up element
 * Part of Match-3 Core Game
 */
var CoreGame = CoreGame || {};

// PowerUp types aligned with CoreGame.Config.ElementType
CoreGame.PowerUPType = {
    MATCH_4_H: 101,      // Horizontal Rocket (4 in a row)
    MATCH_4_V: 106,      // Vertical Rocket (4 in a column)
    MATCH_SQUARE: 102,   // Paper Plane (2x2 square)
    MATCH_5: 103,        // Rainbow (5 in a line)
    MATCH_T: 104,        // Bomb (T-shape)
    MATCH_L: 105,         // Bomb (L-shape)
};

CoreGame.PowerUP = CoreGame.ElementObject.extend({
    configData: {
        maxHP: 1
    },
    ctor: function () {
        this._super();
        this.layerBehavior = CoreGame.LayerBehavior.CONTENT;
    },

    /**
     * Initialize power-up
     */
    init: function (row, col, type) {
        this._super(row, col, type);
        this.combinedEffect = null;
        return this;
    },

    setCombinedEffect: function (effect) {
        this.combinedEffect = effect;
    },

    /**
     * Power-ups can be swapped
     */
    canSwap: function () {
        return this.state === CoreGame.ElementState.IDLE;
    },

    /**
     * Power-ups can be matched (they activate instead)
     */
    canMatch: function () {
        return this.state === CoreGame.ElementState.IDLE;
    },

    /**
     * Activate power-up effect
     */
    active: function (data) {
        CoreGame.BoardUI.getInstance().boardMgr.setDelayRefill(CoreGame.Config.DROP_DELAY_POWER_UP);

        cc.log("Active Size attachments " + this.attachments.length);
        if (this.state == CoreGame.ElementState.REMOVING)
            return;
        if (this.attachments.length > 0) {
            cc.log("State === " + JSON.stringify(this.attachments[0].blockBaseAction));
        }
        if (this.isStopActionByAttachment(CoreGame.ElementObject.Action.ACTIVE)) {
            cc.log("Stop ====================== ");
            return;
        }

        // ── 3-Star scoring: track active-PU lifecycle ───────────────────────
        // Increment the live-PU counter so:
        //   1) elements destroyed while a PU is alive get tagged as 'pu' clears
        //      (read by BoardMgr.getCurrentClearMethod())
        //   2) starting a 2nd-or-later PU mid-chain awards a chain bonus
        // The matching decrement runs in BoardMgr.removedElement when this
        // PowerUp itself is removed, closing the lifecycle.
        var bm = this.boardMgr || (CoreGame.BoardUI.getInstance() && CoreGame.BoardUI.getInstance().boardMgr);
        if (bm) {
            bm._activePUCount = (bm._activePUCount || 0) + 1;
            if (bm.scoreMgr && bm._activePUCount >= 2) {
                bm.scoreMgr.addPUChainEvent(bm._activePUCount);
            }
        }

        this.setState(CoreGame.ElementState.REMOVING);
        this.activeLogic(data);
        this.removeAfterActivate();
    },

    removeAfterActivate: function () {
        CoreGame.TimedActionMgr.addAction(0.2, function () {
            this.remove();
            var mgr = CoreGame.BoardUI.getInstance().boardMgr;
            mgr.state = CoreGame.BoardState.MATCHING;
        }.bind(this));
    },

    activeLogic: function (data) {
        cc.log("activeLogic not implemented for " + this.type);
    },
    /**
     * Create specific avatar instance for PowerUp - Factory Method
     */
    /**
     * Create specific ui instance for PowerUp - Factory Method
     */
    createUIInstance: function () {
        this.ui = new CoreGame.ElementUI(this);
        return this.ui;
    },

    /**
     * Get type name
     */
    getTypeName: function () {
        return 'powerup';
    },

    activateCombined: function () {
        cc.log('Activating Combined Effect: ' + this.combinedEffect);
        // Logic for combined effects can be implemented here or delegated
        CoreGame.EventMgr.emit('activateCombinedPowerUp', {
            powerUp: this,
            effect: this.combinedEffect
        });
    },
    hasAction: function (type) {
        if (type == CoreGame.ElementObject.Action.ACTIVE) {
            if (this.state != CoreGame.ElementState.MATCHING &&
                this.state != CoreGame.ElementState.REMOVING)
                return true;
            return false;
        }
        if (type == CoreGame.ElementObject.Action.MATCH)
            return false;
        return this._super(type);
    },
});

CoreGame.PowerUP.mapCombined = {}
CoreGame.PowerUP.registerCombined = function (type1, type2, cls) {
    if (CoreGame.PowerUP.mapCombined[type1] == undefined)
        CoreGame.PowerUP.mapCombined[type1] = {}
    if (CoreGame.PowerUP.mapCombined[type2] == undefined)
        CoreGame.PowerUP.mapCombined[type2] = {}
    CoreGame.PowerUP.mapCombined[type1][type2] = cls;
    CoreGame.PowerUP.mapCombined[type2][type1] = cls;
}
CoreGame.PowerUP.createCombined = function (type1, type2) {
    if (CoreGame.PowerUP.mapCombined[type1] && CoreGame.PowerUP.mapCombined[type1][type2]) {
        var element = new CoreGame.PowerUP.mapCombined[type1][type2]();
        return element;
    }
    return null;
}