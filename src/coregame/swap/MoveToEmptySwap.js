/**
 * MoveToEmptySwap - Move an element into an empty adjacent slot.
 * If the move creates a match → keep; otherwise animate back.
 * Part of Match-3 Core Game
 */
var CoreGame = CoreGame || {};

CoreGame.MoveToEmptySwap = CoreGame.LogicSwap.extend({

    /**
     * @param {CoreGame.ElementObject} element1 - The element to move
     * @param {CoreGame.GridSlot}      targetSlot - The empty destination slot
     * @returns {boolean} true if the move resulted in a valid match
     */
    swap: function (element1, targetSlot) {
        var self = this;
        var origRow = element1.position.x;
        var origCol = element1.position.y;
        var targetRow = targetSlot.row;
        var targetCol = targetSlot.col;
        var duration = CoreGame.Config.SWAP_DURATION;

        // Adjacency guard (must be exactly 1 step away)
        var rowDiff = Math.abs(origRow - targetRow);
        var colDiff = Math.abs(origCol - targetCol);
        if (!((rowDiff === 1 && colDiff === 0) || (rowDiff === 0 && colDiff === 1))) {
            return false;
        }

        // -- 1. Move data to target slot -----------------------------------------
        element1.position.x = targetRow;
        element1.position.y = targetCol;
        this.boardMgr.updateGridForElement(element1, origRow, origCol, true);

        // -- 2. Check for match at new position ----------------------------------
        var hasMatch = CoreGame.PatternFinder.hasMatchAtPos(
            this.boardMgr.mapGrid, targetRow, targetCol
        );

        if (hasMatch) {
            // Valid move — animate element to new position
            var targetPixelPos = this.boardMgr.gridToPixel(targetRow, targetCol);
            element1.visualMoveTo(targetPixelPos, duration);

            CoreGame.TimedActionMgr.addAction(duration, function () {
                element1.setState(CoreGame.ElementState.IDLE);
                self.boardMgr.setMatchingRequired(true);
            });
            return true;

        } else {
            // No match — revert data immediately, animate back
            element1.position.x = origRow;
            element1.position.y = origCol;
            this.boardMgr.updateGridForElement(element1, targetRow, targetCol, true);

            // Animate: nudge to target slot and bounce back
            var targetPixelPos = this.boardMgr.gridToPixel(targetRow, targetCol);
            element1.visualSwapBack(targetPixelPos, duration);

            CoreGame.TimedActionMgr.addAction(duration * 2, function () {
                element1.setState(CoreGame.ElementState.IDLE);
            });
            this.boardMgr.state = CoreGame.BoardState.IDLE;
            return false;
        }
    }
});
