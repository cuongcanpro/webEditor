/**
 * InGameMgr - Manages peripheral game logic and metadata
 * (Costs, session state, bought move turns, etc.)
 */
var InGameMgr = BaseMgr.extend({
    ctor: function () {
        this._super();
        this.boughtMoveTurn = 0;
        this.isChallengeRoom = false;
    },

    init: function () {
        cc.log("InGameMgr initialized");
    },

    /**
     * Reset state for a new level
     */
    reset: function () {
        cc.log("InGameMgr reset");
        this.boughtMoveTurn = 0;
    },

    /**
     * Get the cost for the next "Play On" (Buy Extra Moves)
     * @returns {number} cost in gold
     */
    getPlayOnCost: function () {
        return CurrencyConfig.getExtraMovePrice(this.boughtMoveTurn + 1);
    },

    /**
     * Called when a "Buy Move" is successful
     * @param {number} addedMoves - Number of moves added (default 5)
     */
    onBuyMoveSuccess: function (addedMoves) {
        this.boughtMoveTurn++;
        cc.log("InGameMgr: Buy move success. Attempt:", this.boughtMoveTurn);
    },

    getBoughtMoveTurn: function () {
        return this.boughtMoveTurn;
    },

    setIsChallengeRoom: function (isChallengeRoom) {
        this.isChallengeRoom = isChallengeRoom;
    },

    getIsChallengeRoom: function () {
        return this.isChallengeRoom;
    }
});

InGameMgr._instance = null;
InGameMgr.getInstance = function () {
    if (!InGameMgr._instance) {
        InGameMgr._instance = new InGameMgr();
    }
    return InGameMgr._instance;
};

var inGameMgr = InGameMgr.getInstance();
