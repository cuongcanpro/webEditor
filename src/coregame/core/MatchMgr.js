/**
 * MatchMgr - Handles match detection and processing
 * Part of Match-3 Core Game
 */
var CoreGame = CoreGame || {};

CoreGame.MatchMgr = cc.Class.extend({
    boardMgr: null,

    ctor: function (boardMgr) {
        this.boardMgr = boardMgr;
    },

    /**
     * Perform matching on the board
     * @param {Array} matches - Optional pre-calculated matches array
     */
    doMatch: function (matches) {
        // Use provided matches or calculate new ones
        if (!matches) {
            matches = CoreGame.PatternFinder.matchAll(this.boardMgr.mapGrid);
        }

        if (matches.length === 0) {
            // this.boardMgr.state = CoreGame.BoardState.IDLE;
            return;
        }
        if (this.boardMgr.state == CoreGame.BoardState.IDLE)
            this.boardMgr.state = CoreGame.BoardState.MATCHING;

        var self = this;
        var maxDuration = 0;

        // Process each match group and track max animation time
        for (var i = 0; i < matches.length; i++) {
            var group = matches[i];
            // Find target position if this group contains one of the swap positions
            var targetPos = this.findSwapPositionInGroup(group);
            var duration = this.processMatchGroup(group, targetPos);
            maxDuration = Math.max(maxDuration, duration);
        }

        // Reset swap positions AFTER processing all groups (to support dual PowerUp creation)
        this.boardMgr.lastSwapSource = null;
        this.boardMgr.lastSwapDest = null;
    },

    /**
     * Find swap position in match group
     * Check if group contains lastSwapDest or lastSwapSource
     * @param {Array} group - Array of matched positions
     * @returns {Object|null} The swap position found in group, or null
     */
    findSwapPositionInGroup: function (group) {
        var swapSource = this.boardMgr.lastSwapSource;
        var swapDest = this.boardMgr.lastSwapDest;

        // Check if group contains swapDest (prioritize dest)
        if (swapDest) {
            for (var i = 0; i < group.length; i++) {
                if (group[i].row === swapDest.row && group[i].col === swapDest.col) {
                    return swapDest;
                }
            }
        }

        // Check if group contains swapSource
        if (swapSource) {
            for (var i = 0; i < group.length; i++) {
                if (group[i].row === swapSource.row && group[i].col === swapSource.col) {
                    return swapSource;
                }
            }
        }

        // Not a swap-initiated match (e.g., cascade)
        return null;
    },

    /**
     * Process a single match group
     * @param {Array} group - Array of matched positions
     * @param {Object} targetPos - Target position where PowerUp should spawn
     * @returns {number} Maximum animation duration for this group
     */
    processMatchGroup: function (group, targetPos) {
        var maxAnimDuration = 0;
        var shouldCreatePowerUp = group.length >= 4;
        if (!targetPos) {
            targetPos = {};
            var middleIndex = Math.floor(group.length / 2);
            targetPos.row = group[middleIndex].row;
            targetPos.col = group[middleIndex].col;
        }

        if (targetPos) {
            cc.log("Target pos " + targetPos.row + " " + targetPos.col);
            cc.log("GROUP " + JSON.stringify(group));
        }
        // Determine match color
        var matchColor = -1;
        if (group.length > 0) {
            var firstSlot = this.boardMgr.getSlot(group[0].row, group[0].col);
            if (firstSlot) {
                var el = firstSlot.getMatchableElement();
                if (el) matchColor = el.type;
            }
        }

        // Context for nearby notification
        var nearbyContext = {
            matchColor: matchColor,
            group: group
        };

        // Notify nearby slots
        for (var i = 0; i < group.length; i++) {
            var pos = group[i];
            this.notifyNearbySlots(pos.row, pos.col, nearbyContext);
        }

        // Match ALL elements in group (with different contexts)
        for (var i = 0; i < group.length; i++) {
            var pos = group[i];
            var slot = this.boardMgr.getSlot(pos.row, pos.col);
            if (slot) {
                var element = slot.getMatchableElement();
                var animDuration = element ? (element.getMatchDuration ? element.getMatchDuration() : 0.3) : 0.3;

                // Determine match context
                var matchContext = null;
                if (shouldCreatePowerUp) {
                    // This is the target gem - it should converge/merge into PowerUp
                    matchContext = {
                        type: 'powerup',
                        targetPos: targetPos,
                        group: group,
                        matchColor: matchColor
                    };
                    cc.log("Element State when create PowerUp === " + element.state);
                } else {
                    // Normal match - explode animation
                    matchContext = {
                        type: 'normal',
                        matchColor: matchColor
                    };
                }

                if (targetPos.row == pos.row && targetPos.col == pos.col && shouldCreatePowerUp) {
                    var type = this.detectPowerUpType(group);
                    cc.log("PowerUp Type: " + type + " at (" + targetPos.row + ", " + targetPos.col + ")");
                    element.setRemoveAction(new CoreGame.Strategies.SpawnElementAction(
                        type, pos.row, pos.col
                    ));
                } else if (element && element.setRemoveAction) {
                    element.setRemoveAction(null);
                }

                slot.matchElement(matchContext);
                maxAnimDuration = Math.max(maxAnimDuration, animDuration);
            }
        }


        // Schedule PowerUp creation AFTER match animations complete
        // if (shouldCreatePowerUp) {
        //     var self = this;
        //     CoreGame.TimedActionMgr.addAction(maxAnimDuration - 0.1, function () {
        //         self.createPowerUp(group, targetPos);

        //     });


        //     // Add PowerUp spawn duration to total
        //     maxAnimDuration += 0.4; // PowerUp spawn time
        // }

        return maxAnimDuration;
    },

    /**
     * Notify slots adjacent to a matched position
     */
    notifyNearbySlots: function (row, col, context) {
        var directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];
        // cc.log("CHeck Near by row " + row, " column " + col);
        for (var i = 0; i < directions.length; i++) {
            var nr = row + directions[i][0];
            var nc = col + directions[i][1];
            var slot = this.boardMgr.getSlot(nr, nc);
            // cc.log("Nearby Row " + nr + ", column " + nc);
            if (slot) {
                slot.onMatchNearby(context);
            }
        }
    },

    /**
     * Create power-up based on match pattern
     * @param {Array} group - Array of matched positions
     * @param {Object} targetPos - Target position where PowerUp should spawn
     * @returns {number} Power-up spawn animation duration
     */
    createPowerUp: function (group, targetPos) {
        if (!group || group.length < 4) return 0;

        // Determine spawn position
        // var spawnRow, spawnCol;
        // spawnRow = targetPos.row;
        // spawnCol = targetPos.col;

        // Determine PowerUp type based on pattern
        var type = this.detectPowerUpType(group);

        if (type) {
            // cc.log("PowerUp Type: " + type + " at (" + spawnRow + ", " + spawnCol + ")");

            // // Create PowerUp object using addNewElement
            // var powerUp = this.boardMgr.addNewElement(spawnRow, spawnCol, type);

            // // Play spawn animation if avatar exists
            // if (powerUp && powerUp.avatar) {
            //     powerUp.avatar.playSpawnAnim();
            // }

            // Emit event for other systems
            CoreGame.EventMgr.emit('powerUpCreated', {
                row: spawnRow,
                col: spawnCol,
                type: type,
                matchGroup: group,
                powerUp: powerUp
            });

            return type;
        }

        return 0;
    },

    /**
     * Detect PowerUp type from match group pattern
     * @param {Array} group - Array of matched positions {row, col}
     * @returns {number|null} PowerUp type ID or null
     */
    detectPowerUpType: function (group) {
        if (!group || group.length < 4) return null;

        var len = group.length;

        // Check if it's a line (all same row or all same column)
        var allSameRow = true;
        var allSameCol = true;
        var firstRow = group[0].row;
        var firstCol = group[0].col;

        for (var i = 1; i < len; i++) {
            if (group[i].row !== firstRow) allSameRow = false;
            if (group[i].col !== firstCol) allSameCol = false;
        }

        // Match 4 in a line
        if (len === 4) {
            if (allSameRow) return CoreGame.PowerUPType.MATCH_4_V; // Horizontal rocket
            if (allSameCol) return CoreGame.PowerUPType.MATCH_4_H; // Vertical rocket
            // Check for 2x2 square
            if (this.isSquarePattern(group)) return CoreGame.PowerUPType.MATCH_SQUARE;
            // Default fallback
            return CoreGame.PowerUPType.MATCH_4_H;
        }

        // Match 5+
        if (len >= 5) {
            if (allSameRow || allSameCol) {
                return CoreGame.PowerUPType.MATCH_5; // Rainbow (5 in a line)
            }

            // Group may have been merged with a square or another match.
            // Check if any single row or column in the group has 5+ elements —
            // that means there was a 5-in-a-row that just got extra positions merged.
            var rowCounts = {}, colCounts = {};
            for (var i = 0; i < len; i++) {
                var mr = group[i].row, mc = group[i].col;
                rowCounts[mr] = (rowCounts[mr] || 0) + 1;
                colCounts[mc] = (colCounts[mc] || 0) + 1;
            }
            for (var key in rowCounts) {
                if (rowCounts.hasOwnProperty(key) && rowCounts[key] >= 5)
                    return CoreGame.PowerUPType.MATCH_5;
            }
            for (var key in colCounts) {
                if (colCounts.hasOwnProperty(key) && colCounts[key] >= 5)
                    return CoreGame.PowerUPType.MATCH_5;
            }

            // T or L shape
            return this.detectTLShape(group);
        }

        return null;
    },

    /**
     * Check if group forms a 2x2 square pattern
     * @param {Array} group - Array of 4 positions
     * @returns {boolean}
     */
    isSquarePattern: function (group) {
        if (group.length !== 4) return false;

        // Get all rows and cols
        var rows = group.map(function (p) { return p.row; }).sort(function (a, b) { return a - b; });
        var cols = group.map(function (p) { return p.col; }).sort(function (a, b) { return a - b; });

        // Check if forms 2x2: two consecutive rows, two consecutive cols
        if (rows[0] === rows[1] && rows[2] === rows[3] && rows[2] === rows[0] + 1) {
            if (cols[0] === cols[1] && cols[2] === cols[3] && cols[2] === cols[0] + 1) {
                return true;
            }
        }

        return false;
    },

    /**
     * Detect if pattern is T or L shape
     * @param {Array} group - Array of 5 positions
     * @returns {number} MATCH_T or MATCH_L
     */
    detectTLShape: function (group) {
        // Get bounding box
        var minR = 999, maxR = -1, minC = 999, maxC = -1;
        for (var i = 0; i < group.length; i++) {
            minR = Math.min(minR, group[i].row);
            maxR = Math.max(maxR, group[i].row);
            minC = Math.min(minC, group[i].col);
            maxC = Math.max(maxC, group[i].col);
        }

        var width = maxC - minC + 1;
        var height = maxR - minR + 1;

        // T-shape: 3x3 bounding box with 5 gems
        // L-shape: 3x3 bounding box with 5 gems
        // Distinction: T has center filled, L has corner filled

        // Count gems in each row and column
        var rowCounts = {};
        var colCounts = {};
        for (var i = 0; i < group.length; i++) {
            var r = group[i].row;
            var c = group[i].col;
            rowCounts[r] = (rowCounts[r] || 0) + 1;
            colCounts[c] = (colCounts[c] || 0) + 1;
        }

        // T-shape has one row/col with 3 gems and others with fewer
        // L-shape has max 3 in row AND max 3 in col but different pattern

        // Find max row count (ES5 compatible)
        var maxRowCount = 0;
        for (var row in rowCounts) {
            if (rowCounts.hasOwnProperty(row)) {
                maxRowCount = Math.max(maxRowCount, rowCounts[row]);
            }
        }

        // Find max col count (ES5 compatible)
        var maxColCount = 0;
        for (var col in colCounts) {
            if (colCounts.hasOwnProperty(col)) {
                maxColCount = Math.max(maxColCount, colCounts[col]);
            }
        }

        // If dimensions match 3x2 or 2x3, it's a "fat" match -> Paper Plane (Square)
        if ((maxRowCount === 3 && maxColCount === 2) || (maxRowCount === 2 && maxColCount === 3)) {
            return CoreGame.PowerUPType.MATCH_SQUARE;
        }

        // If both row and col have 3, it's likely T-shape
        if (maxRowCount === 3 && maxColCount === 3) {
            return CoreGame.PowerUPType.MATCH_T;
        }

        // Otherwise L-shape
        return CoreGame.PowerUPType.MATCH_L;
    }
});
