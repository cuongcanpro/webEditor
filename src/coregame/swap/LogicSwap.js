/**
 * LogicSwap - Base class for swap actions
 * Part of Match-3 Core Game
 */
var CoreGame = CoreGame || {};

CoreGame.LogicSwap = cc.Class.extend({
    boardMgr: null,
    element1: null,
    element2: null,

    ctor: function (boardMgr) {
        this.boardMgr = boardMgr;
    },

    /**
     * Execute swap between two elements
     * @param {ElementObject} element1 
     * @param {ElementObject} element2 
     * @param {function} callback - Called when swap animation completes
     */
    swap: function (element1, element2) {
        this.element1 = element1;
        this.element2 = element2;

        if (!this.canSwap(element1, element2)) {
            if (element1 && element1.canSwap()) {
                element1.playInvalidSwapAnim();
            }
            if (element2 && element2.canSwap()) {
                element2.playInvalidSwapAnim();
            }
            return false;
        }

        this.doSwap();
        return true;
    },

    /**
     * Check if swap is valid
     */
    canSwap: function (element1, element2) {
        if (!element1 || !element2) return false;
        if (!element1.canSwap() || !element2.canSwap()) return false;

        // Check if adjacent
        var rowDiff = Math.abs(element1.position.x - element2.position.x);
        var colDiff = Math.abs(element1.position.y - element2.position.y);

        return (rowDiff === 1 && colDiff === 0) ||
            (rowDiff === 0 && colDiff === 1);
    },

    /**
     * Dry check if swap is productive/valid (for AI or validation)
     */
    checkValid: function (element1, element2) {
        return this.canSwap(element1, element2);
    },

    /**
     * Perform the swap (override in subclasses)
     */
    doSwap: function () {
        // PURE DATA SWAP (No Animation, No Position Update)
        var r1 = this.element1.position.x;
        var c1 = this.element1.position.y;
        var r2 = this.element2.position.x;
        var c2 = this.element2.position.y;

        // Swap Logic position
        this.element1.position.x = r2;
        this.element1.position.y = c2;
        this.element2.position.x = r1;
        this.element2.position.y = c1;

        // Update Grid Slots (silent mode - don't clear UI)
        if (this.boardMgr) {
            this.boardMgr.updateGridForElement(this.element1, r1, c1, true);
            this.boardMgr.updateGridForElement(this.element2, r2, c2, true);
        }
    },

    /**
     * Reverse the swap (swap back)
     */
    reverseSwap: function (callback) {
        this.doSwap(callback);
    }
});
