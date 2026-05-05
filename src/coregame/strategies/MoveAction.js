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
        directionType: 0 // 0: random, 1: UP, 2: DOWN, 3: LEFT, 4: RIGHT
    },

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

        // 1. Identify slots that will be left behind
        var oldCells = element.getGridCells();

        // 2. Remove targets
        for (var i = 0; i < targetsToRemove.length; i++) {
            targetsToRemove[i].doExplode();
        }

        // 3. Move current element
        var oldRow = element.position.x;
        var oldCol = element.position.y;
        var newRow = oldRow + dr;
        var newCol = oldCol + dc;

        element.position.x = newRow;
        element.position.y = newCol;

        boardMgr.updateGridForElement(element, oldRow, oldCol, true);

        // 4. Identify slots truly left behind (not occupied by the new position)
        var newCells = element.getGridCells();
        var leftBehind = oldCells.filter(function (oc) {
            return !newCells.some(function (nc) {
                return nc.x === oc.x && nc.y === oc.y;
            });
        });

        // 5. Fill left behind slots with new elements (no immediate matches).
        // Use hasContentElement() instead of isEmpty(): a slot may still hold
        // background-layer elements (e.g. Grass) after the mover vacates, and
        // we still want a playable gem on top. isEmpty() would skip those and
        // leave the slot without a swappable gem until the next refill wave.
        for (var i = 0; i < leftBehind.length; i++) {
            var cell = leftBehind[i];
            var slot = boardMgr.getSlot(cell.x, cell.y);
            if (slot && !slot.hasContentElement()) {
                var type = this._getNoMatchColor(boardMgr, cell.x, cell.y);
                boardMgr.addNewElement(cell.x, cell.y, type);
            }
        }

        // 6. Animate Visuals
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
        // 7. Cleanup/State management
        CoreGame.TimedActionMgr.addAction(duration, function () {
            if (element.setState) element.setState(CoreGame.ElementState.IDLE);
            cc.log("MoveAction completed. Element at (" + newRow + "," + newCol + ")" + " board state updated." + boardMgr.state);
            boardMgr.setMatchingRequired(true);
            // Check for available moves after immediate spawn
            if (!boardMgr.gameEnded && boardMgr.hasPossibleMoves && !boardMgr.hasPossibleMoves()) {
                cc.log("No possible moves after spawn! Shuffling board...");
                boardMgr.shuffleBoard();
            }
        });
    },

    /**
     * Get a color that is different from immediate neighbors
     * @private
     */
    _getNoMatchColor: function (boardMgr, row, col) {
        if (boardMgr.getValidTypeForPosition) {
            return boardMgr.getValidTypeForPosition(row, col);
        }

        // Fallback: pick from gemTypes or 1..NUM_GEN avoiding nearby matches
        var pool = (boardMgr.gemTypes && boardMgr.gemTypes.length > 0)
            ? boardMgr.gemTypes.slice()
            : (function () {
                var a = [];
                for (var i = 1; i <= CoreGame.Config.NUM_GEN; i++) a.push(i);
                return a;
            }());

        var nearbyTypes = [];
        var dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
        for (var i = 0; i < dirs.length; i++) {
            var r = row + dirs[i][0];
            var c = col + dirs[i][1];
            var slot = boardMgr.getSlot(r, c);
            if (slot) {
                var type = slot.getType();
                if (nearbyTypes.indexOf(type) === -1) nearbyTypes.push(type);
            }
        }

        var availableTypes = pool.filter(function (t) {
            return nearbyTypes.indexOf(t) === -1;
        });

        if (availableTypes.length === 0) return pool[boardMgr.random.nextInt32Bound(pool.length)];
        return availableTypes[boardMgr.random.nextInt32Bound(availableTypes.length)];
    }
});
