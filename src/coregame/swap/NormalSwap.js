/**
 * NormalSwap - Standard swap between two gems
 * Creates a match if successful, otherwise swaps back
 * Part of Match-3 Core Game
 */
var CoreGame = CoreGame || {};

CoreGame.NormalSwap = CoreGame.LogicSwap.extend({

    ctor: function (boardMgr) {
        this._super(boardMgr);
    },

    /**
     * Dry check if swap results in a match
     */
    checkValid: function (element1, element2) {
        if (!this.canSwap(element1, element2)) return false;
        return CoreGame.PatternFinder._wouldMatch(
            this.boardMgr.mapGrid,
            element1.position.x,
            element1.position.y,
            element2.position.x,
            element2.position.y
        );
    },

    /**
     * Override - perform swap and check for matches
     */
    swap: function (element1, element2) {
        this.element1 = element1;
        this.element2 = element2;

        if (!this.canSwap(element1, element2)) {

            return false;
        }

        var self = this;


        // 1. Swap Data Only
        this.doSwap();

        // 2. Check Matches logic with new data
        var hasMatch1 = CoreGame.PatternFinder.hasMatchAtPos(
            self.boardMgr.mapGrid,
            element1.position.x,
            element1.position.y
        );
        var hasMatch2 = CoreGame.PatternFinder.hasMatchAtPos(
            self.boardMgr.mapGrid,
            element2.position.x,
            element2.position.y
        );

        var duration = CoreGame.Config.SWAP_DURATION;

        if (hasMatch1 || hasMatch2) {
            // Valid swap -> Animate Data to new positions
            var targetPos1 = self.boardMgr.gridToPixel(element1.position.x, element1.position.y);
            var targetPos2 = self.boardMgr.gridToPixel(element2.position.x, element2.position.y);

            element1.visualMoveTo(targetPos1, duration);
            element2.visualMoveTo(targetPos2, duration);

            // Schedule Matching
            CoreGame.TimedActionMgr.addAction(duration, function () {
                element1.setState(CoreGame.ElementState.IDLE);
                element2.setState(CoreGame.ElementState.IDLE);
                self.boardMgr.setMatchingRequired(true);
            });
            return true;
        } else {
            // Invalid swap -> Revert Data immediately
            this.doSwap(); // Swap back data

            // Perform Fake Animation (Swap Out and Back)
            // element1 needs to move to element2's visual pos (and back)
            // element2 needs to move to element1's visual pos (and back)
            // Since we reverted data, element1.position is conceptually 'original' (it wasn't updated in doSwap)
            // But we need the 'target' visual pos (which is where e2 is)

            var pixelPos1 = self.boardMgr.gridToPixel(element1.position.x, element1.position.y);
            var pixelPos2 = self.boardMgr.gridToPixel(element2.position.x, element2.position.y);

            element1.visualSwapBack(pixelPos2, duration);
            element2.visualSwapBack(pixelPos1, duration);
            // Schedule Idle State
            CoreGame.TimedActionMgr.addAction(duration * 2, function () {
                element1.setState(CoreGame.ElementState.IDLE);
                element2.setState(CoreGame.ElementState.IDLE);
                // self.boardMgr.state = CoreGame.BoardState.IDLE;
            });
            self.boardMgr.state = CoreGame.BoardState.IDLE;
            return false;
        }
    }
});
