/**
 * MergeSwap - Swap that merges two power-ups
 * Part of Match-3 Core Game
 */
var CoreGame = CoreGame || {};

CoreGame.MergeSwap = CoreGame.LogicSwap.extend({

    ctor: function (boardMgr) {
        this._super(boardMgr);
    },

    /**
     * Check if this is a power-up merge swap
     */
    canSwap: function (element1, element2) {
        if (!this._super(element1, element2)) return false;

        // Both must be power-ups
        return (element1 instanceof CoreGame.PowerUP) &&
            (element2 instanceof CoreGame.PowerUP);
    },

    /**
     * Perform power-up merge swap
     */
    swap: function (element1, element2) {
        if (!this.canSwap(element1, element2)) {
            return false;
        }

        this.element1 = element1;
        this.element2 = element2;

        var self = this;

        // Update Grid Data (Remove elements from slots as they are merging)
        if (this.boardMgr) {
            this.boardMgr.removeElementFromBoard(element1);
            this.boardMgr.removeElementFromBoard(element2);
        }

        // Animate merge (move both to center)
        var pos2 = this.boardMgr.gridToPixel(element2.position.x, element2.position.y);

        var duration = CoreGame.Config.SWAP_DURATION;

        // Use visualMoveTo to handle position update and animation (center is not a grid slot)
        element1.visualMoveTo(pos2, duration);

        // Schedule Merge Complete
        CoreGame.TimedActionMgr.addAction(duration, function () {
            self.onMergeComplete();
        });
        return true;
    },

    /**
     * Called when merge animation completes
     */
    onMergeComplete: function () {
        // Determine combined effect
        var effect = this.getCombinedEffect(this.element1.type, this.element2.type);

        // Emit combined effect event
        CoreGame.EventMgr.emit('powerUpMerged', {
            type1: this.element1.type,
            type2: this.element2.type,
            combinedEffect: effect,
            row: this.element1.position.x,
            col: this.element1.position.y,
            powerUp1: this.element1,
            powerUp2: this.element2
        });

        // Create corresponding PowerUp to add to Board
        var pRow = this.element2.position.x;
        var pCol = this.element2.position.y;

        var combinedPowerUp = CoreGame.PowerUP.createCombined(this.element1.type, this.element2.type);
        combinedPowerUp.init(pRow, pCol, this.element2.type);
        this.boardMgr.addElement(combinedPowerUp);

        // Active immediately
        combinedPowerUp.active();

        // Remove both power-ups
        this.element1.remove();
        this.element2.remove();
    },

    /**
     * Determine the combined effect of two power-ups
     */
    getCombinedEffect: function (type1, type2) {
        var PU = CoreGame.PowerUPType;

        // Helper functions to check PowerUp categories
        var isMatch4 = function (type) {
            return type === PU.MATCH_4_H || type === PU.MATCH_4_V;
        };

        var isMatchTL = function (type) {
            return type === PU.MATCH_T || type === PU.MATCH_L;
        };

        var isMatchSquare = function (type) {
            return type === PU.MATCH_SQUARE;
        };

        var isMatch5 = function (type) {
            return type === PU.MATCH_5;
        };

        // Match5 + Match5 = clear all board
        if (isMatch5(type1) && isMatch5(type2)) {
            return 'clear_all'; // PU5_PU5
        }

        // Match5 + anything else = rainbow version of that PowerUp
        if (isMatch5(type1) || isMatch5(type2)) {
            var other = isMatch5(type1) ? type2 : type1;
            return 'rainbow_' + this.typeToName(other); // PU5_PU
        }

        // MatchSquare + MatchSquare = super square (big area clear)
        if (isMatchSquare(type1) && isMatchSquare(type2)) {
            return 'square_square'; // PUS_PUS
        }

        // MatchSquare + (Match4 or MatchTL) = flying square spread
        if ((isMatchSquare(type1) && (isMatch4(type2) || isMatchTL(type2))) ||
            ((isMatch4(type1) || isMatchTL(type1)) && isMatchSquare(type2))) {
            var bonus = isMatchSquare(type1) ? type2 : type1;
            return 'square_' + this.typeToName(bonus); // PUS_PU
        }

        // MatchTL + MatchTL = giant bomb
        if (isMatchTL(type1) && isMatchTL(type2)) {
            return 'bomb_bomb'; // PU5TL_PU5TL
        }

        // Match4 + MatchTL = explosive rocket
        if ((isMatch4(type1) && isMatchTL(type2)) || (isMatchTL(type1) && isMatch4(type2))) {
            return 'rocket_bomb'; // PU4_PU5TL
        }

        // Match4 + Match4 = cross clear (both row and column)
        if (isMatch4(type1) && isMatch4(type2)) {
            return 'rocket_rocket'; // PU4_PU4
        }

        return 'default';
    },

    /**
     * Convert power-up type to name string
     */
    typeToName: function (type) {
        var PU = CoreGame.PowerUPType;
        switch (type) {
            case PU.MATCH_4_H:
                return 'rocket_h';
            case PU.MATCH_4_V:
                return 'rocket_v';
            case PU.MATCH_T:
                return 'bomb_t';
            case PU.MATCH_L:
                return 'bomb_l';

            case PU.MATCH_SQUARE:
                return 'square';
            case PU.MATCH_5:
                return 'rainbow';
            default:
                return 'unknown';
        }
    }
});
