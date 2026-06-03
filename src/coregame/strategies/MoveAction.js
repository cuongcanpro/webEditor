/**
 * MoveAction - Strategy to move element to a neighbor, removing any swapable elements in the way
 * Part of Match-3 Core Game
 */
var CoreGame = CoreGame || {};
CoreGame.Strategies = CoreGame.Strategies || {};

CoreGame.Strategies.MoveAction = CoreGame.Strategies.NormalAction.extend({
    /**
     * Constructor
     */
    configData:
    {
        directionType: 0, // 0: random, 1: UP, 2: DOWN, 3: LEFT, 4: RIGHT
        moveInterval: 1   // move once every N turns (1 = every turn). e.g. ColorCrab uses 2.
    },

    // Per-instance turn counter for moveInterval gating. Declared here (not in
    // configData) so it never aliases the shared-prototype config object.
    _turnsSinceMove: 0,

    ctor: function () {
        this._super();
    },

    /**
     * Execute action
     * @param {ElementObject} element - The element instance that initiates the move
     * @param {Object} context - Context data for execution
     */
    execute: function (element, context) {
        cc.log("MoveAction execute");
        var boardMgr = element.boardMgr;
        if (!boardMgr) return;

        var config = this.configData || {};

        // Cadence gate: only actually move every `moveInterval` turns. A turn
        // where the gate blocks counts as "đứng yên" — matches the ColorCrab
        // "1 ô / 2 turn" spec while leaving every-turn movers (interval 1)
        // untouched.
        // The counter only resets on a SUCCESSFUL move (see _performMove). A turn
        // where the destination is blocked does NOT reset it, so the crab keeps
        // retrying the next turn instead of waiting another full interval —
        // matches "invalid → skip turn này, retry turn sau".
        var interval = parseInt(config.moveInterval) || 1;
        if (interval > 1) {
            this._turnsSinceMove = (this._turnsSinceMove || 0) + 1;
            if (this._turnsSinceMove < interval) {
                cc.log("MoveAction: skip move (" + this._turnsSinceMove + "/" + interval + ")");
                return;
            }
        }

        var dirType = parseInt(config.directionType); // 0: random, 1-4: specific

        var allDirs = [
            { dir: CoreGame.Direction.UP, dr: 1, dc: 0 },
            { dir: CoreGame.Direction.DOWN, dr: -1, dc: 0 },
            { dir: CoreGame.Direction.LEFT, dr: 0, dc: -1 },
            { dir: CoreGame.Direction.RIGHT, dr: 0, dc: 1 }
        ];

        var testDirs = [];
        if (dirType === 0) {
            // Use all directions in random order
            testDirs = allDirs.slice();
            for (var i = testDirs.length - 1; i > 0; i--) {
                var j = boardMgr.random.nextInt32Bound(i + 1);
                var temp = testDirs[i];
                testDirs[i] = testDirs[j];
                testDirs[j] = temp;
            }
        } else {
            // Only use the specified direction
            for (var i = 0; i < allDirs.length; i++) {
                if (allDirs[i].dir === dirType) {
                    testDirs.push(allDirs[i]);
                    break;
                }
            }
        }

        if (testDirs.length === 0) return;

        var cells = element.getGridCells();
        for (var d = 0; d < testDirs.length; d++) {
            var dirInfo = testDirs[d];
            var potentialTargetsToRemove = [];
            var canMove = true;

            for (var i = 0; i < cells.length; i++) {
                var cell = cells[i];
                var targetRow = cell.x + dirInfo.dr;
                var targetCol = cell.y + dirInfo.dc;
                var targetSlot = boardMgr.getSlot(targetRow, targetCol);

                if (!targetSlot) {
                    canMove = false;
                    break;
                }

                // Check elements in this slot
                var elementsInSlot = targetSlot.listElement;
                for (var j = 0; j < elementsInSlot.length; j++) {
                    var target = elementsInSlot[j];
                    if (target === element) continue;

                    // If target grid is Gem or PowerUp then remove it
                    if (target instanceof CoreGame.GemObject || target instanceof CoreGame.PowerUP) {
                        if (potentialTargetsToRemove.indexOf(target) === -1) {
                            potentialTargetsToRemove.push(target);
                        }
                    } else if (!target.isBackground()) {
                        // There's a non-swapable, non-background element blocking the path
                        canMove = false;
                        break;
                    }
                }
                if (!canMove) break;
            }

            if (canMove) {
                // Perform movement
                this._turnsSinceMove = 0; // moved this turn — restart the cadence
                this._performMove(boardMgr, element, dirInfo.dr, dirInfo.dc, potentialTargetsToRemove);
                return; // Stop after successful move
            }
        }
    },

    /**
     * Internal helper to perform movement
     * @param {BoardMgr} boardMgr 
     * @param {ElementObject} element 
     * @param {number} dr - delta row
     * @param {number} dc - delta col
     * @param {Array} targetsToRemove 
     */
    _performMove: function (boardMgr, element, dr, dc, targetsToRemove) {
        var duration = CoreGame.Config.SWAP_DURATION || 0.2;

        // 1. Remove targets (gems/PUs the monster is stepping onto — it eats them)
        for (var i = 0; i < targetsToRemove.length; i++) {
            targetsToRemove[i].doExplode();
        }

        // 2. Move current element
        var oldRow = element.position.x;
        var oldCol = element.position.y;
        var newRow = oldRow + dr;
        var newCol = oldCol + dc;

        element.position.x = newRow;
        element.position.y = newCol;

        boardMgr.updateGridForElement(element, oldRow, oldCol, true);

        // 3. Leave the vacated cells EMPTY on purpose. The monster "eats" whatever
        // it steps onto (destination gems were exploded in step 2) and leaves a
        // hole behind it. We deliberately do NOT spawn a placeholder gem in the
        // left-behind slots: leaving them empty lets the drop/refill pipeline
        // pull gems down from above by gravity — same as a normal match clear —
        // instead of the monster appearing to hide a block and reveal it on exit.
        // updateGridForElement already removed the mover from the old slots, so
        // they read empty; flag a refill to fill them (and any destination hole
        // when the move ate no gem to trigger one itself).
        boardMgr.setRefillRequired(true);

        // 4. Animate Visuals
        var targetPixelPos = boardMgr.gridToPixel(newRow, newCol);

        // Handle size offset for visual position if multi-cell
        if (element.size && (element.size.width > 1 || element.size.height > 1)) {
            var offsetX = (element.size.width - 1) * CoreGame.Config.CELL_SIZE / 2;
            var offsetY = (element.size.height - 1) * CoreGame.Config.CELL_SIZE / 2;
            targetPixelPos.x += offsetX;
            targetPixelPos.y += offsetY;
        }

        if (element.visualMoveTo) {
            element.visualMoveTo(targetPixelPos, duration);
        }

        cc.log("Perform Move =============== ");
        // 5. Cleanup/State management
        CoreGame.TimedActionMgr.addAction(duration, function () {
            if (element.setState) element.setState(CoreGame.ElementState.IDLE);
            cc.log("MoveAction completed. Element at (" + newRow + "," + newCol + ")" + " board state updated." + boardMgr.state);
            boardMgr.setMatchingRequired(true);
            // Check for available moves after immediate spawn
            // if (!boardMgr.gameEnded && boardMgr.hasPossibleMoves && !boardMgr.hasPossibleMoves()) {
            //     cc.log("No possible moves after spawn! Shuffling board...");
            //     boardMgr.shuffleBoard();
            // }
        });
    }
});
