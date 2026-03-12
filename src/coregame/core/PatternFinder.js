/**
 * PatternFinder - Find match-3 patterns on the board
 * Part of Match-3 Core Game
 */
var CoreGame = CoreGame || {};

CoreGame.PatternFinder = {

    /**
     * Find all matches on the board
     * @param {Array} mapGrid - 2D array of GridSlots
     * @returns {Array} Array of match groups, each group is array of {row, col}
     */
    matchAll: function (mapGrid) {
        var rows = mapGrid.length;
        var cols = mapGrid[0].length;
        var matches = [];
        var visited = this._createVisitedGrid(rows, cols);

        // Find horizontal matches
        for (var r = 0; r < rows; r++) {
            for (var c = 0; c < cols - 2; c++) {
                if (visited[r][c]) continue;

                var type = mapGrid[r][c].getType();
                if (type < 0) continue;

                var matchGroup = this._findHorizontalMatch(mapGrid, r, c, type);
                if (matchGroup.length >= CoreGame.Config.MIN_MATCH) {
                    matches.push(matchGroup);
                    this._markVisited(visited, matchGroup);
                }
            }
        }

        // Reset visited for vertical check
        visited = this._createVisitedGrid(rows, cols);

        // Find vertical matches
        for (var c = 0; c < cols; c++) {
            for (var r = 0; r < rows - 2; r++) {
                if (visited[r][c]) continue;

                var type = mapGrid[r][c].getType();
                if (type < 0) continue;

                var matchGroup = this._findVerticalMatch(mapGrid, r, c, type);
                if (matchGroup.length >= CoreGame.Config.MIN_MATCH) {
                    matches.push(matchGroup);
                    this._markVisited(visited, matchGroup);
                }
            }
        }

        // Reset visited for square check
        visited = this._createVisitedGrid(rows, cols);

        // Find 2x2 square matches
        for (var r = 0; r < rows - 1; r++) {
            for (var c = 0; c < cols - 1; c++) {
                if (visited[r][c]) continue;

                var type = mapGrid[r][c].getType();
                if (type < 0) continue;

                var matchGroup = this._findSquareMatch(mapGrid, r, c, type);
                if (matchGroup && matchGroup.length === 4) {
                    matches.push(matchGroup);
                    this._markVisited(visited, matchGroup);
                }
            }
        }

        return this._mergeOverlappingMatches(matches);
    },

    /**
     * Check if there's a match at specific position
     * @param {Array} mapGrid - 2D array
     * @param {number} row 
     * @param {number} col 
     * @returns {boolean}
     */
    hasMatchAtPos: function (mapGrid, row, col) {
        var type = mapGrid[row][col].getType();
        if (type < 0) return false;

        // Check horizontal
        var hMatch = this._countInDirection(mapGrid, row, col, 0, -1, type) +
            this._countInDirection(mapGrid, row, col, 0, 1, type) + 1;
        if (hMatch >= CoreGame.Config.MIN_MATCH) return true;

        // Check vertical
        var vMatch = this._countInDirection(mapGrid, row, col, -1, 0, type) +
            this._countInDirection(mapGrid, row, col, 1, 0, type) + 1;
        if (vMatch >= CoreGame.Config.MIN_MATCH) return true;

        // Check 2x2 square patterns (4 possible squares with this position)
        // Top-left corner
        if (this._findSquareMatch(mapGrid, row, col, type)) return true;
        // Top-right corner (this cell is at row, col-1 of square)
        if (col > 0 && this._findSquareMatch(mapGrid, row, col - 1, type)) return true;
        // Bottom-left corner (this cell is at row-1, col of square)
        if (row > 0 && this._findSquareMatch(mapGrid, row - 1, col, type)) return true;
        // Bottom-right corner (this cell is at row-1, col-1 of square)
        if (row > 0 && col > 0 && this._findSquareMatch(mapGrid, row - 1, col - 1, type)) return true;

        return false;
    },

    /**
     * Find match pattern at position and return the matched positions
     * @param {Array} mapGrid 
     * @param {number} row 
     * @param {number} col 
     * @returns {Array} Array of {row, col}
     */
    findMatchPattern: function (mapGrid, row, col) {
        var type = mapGrid[row][col].getType();
        if (type < 0) return [];

        var positions = [];

        // Get horizontal matches
        var hLeft = this._getPositionsInDirection(mapGrid, row, col, 0, -1, type);
        var hRight = this._getPositionsInDirection(mapGrid, row, col, 0, 1, type);
        var hMatch = hLeft.concat([{ row: row, col: col }]).concat(hRight);

        if (hMatch.length >= CoreGame.Config.MIN_MATCH) {
            positions = positions.concat(hMatch);
        }

        // Get vertical matches
        var vUp = this._getPositionsInDirection(mapGrid, row, col, -1, 0, type);
        var vDown = this._getPositionsInDirection(mapGrid, row, col, 1, 0, type);
        var vMatch = vUp.concat([{ row: row, col: col }]).concat(vDown);

        if (vMatch.length >= CoreGame.Config.MIN_MATCH) {
            positions = positions.concat(vMatch);
        }

        // Check 2x2 square patterns (4 possible squares with this position)
        var squarePatterns = [];

        // Top-left corner
        var sq1 = this._findSquareMatch(mapGrid, row, col, type);
        if (sq1) squarePatterns = squarePatterns.concat(sq1);

        // Top-right corner
        if (col > 0) {
            var sq2 = this._findSquareMatch(mapGrid, row, col - 1, type);
            if (sq2) squarePatterns = squarePatterns.concat(sq2);
        }

        // Bottom-left corner
        if (row > 0) {
            var sq3 = this._findSquareMatch(mapGrid, row - 1, col, type);
            if (sq3) squarePatterns = squarePatterns.concat(sq3);
        }

        // Bottom-right corner
        if (row > 0 && col > 0) {
            var sq4 = this._findSquareMatch(mapGrid, row - 1, col - 1, type);
            if (sq4) squarePatterns = squarePatterns.concat(sq4);
        }

        positions = positions.concat(squarePatterns);

        // Remove duplicates
        return this._removeDuplicatePositions(positions);
    },

    /**
     * Check if board has any possible moves
     * @param {Array} mapGrid 
     * @returns {boolean}
     */
    hasPossibleMoves: function (mapGrid) {
        var rows = mapGrid.length;
        var cols = mapGrid[0].length;

        for (var r = 0; r < rows; r++) {
            for (var c = 0; c < cols; c++) {
                // Try swap right
                if (c < cols - 1 && this._wouldMatch(mapGrid, r, c, r, c + 1)) {
                    return true;
                }
                // Try swap down
                if (r < rows - 1 && this._wouldMatch(mapGrid, r, c, r + 1, c)) {
                    return true;
                }
            }
        }
        return false;
    },

    // ========= Private helper methods =========

    _createVisitedGrid: function (rows, cols) {
        var grid = [];
        for (var r = 0; r < rows; r++) {
            grid[r] = [];
            for (var c = 0; c < cols; c++) {
                grid[r][c] = false;
            }
        }
        return grid;
    },

    _markVisited: function (visited, positions) {
        for (var i = 0; i < positions.length; i++) {
            visited[positions[i].row][positions[i].col] = true;
        }
    },

    _findHorizontalMatch: function (mapGrid, row, startCol, type) {
        var matches = [{ row: row, col: startCol }];
        var cols = mapGrid[0].length;

        for (var c = startCol + 1; c < cols; c++) {
            if (mapGrid[row][c].getType() === type) {
                matches.push({ row: row, col: c });
            } else {
                break;
            }
        }
        return matches;
    },

    _findVerticalMatch: function (mapGrid, startRow, col, type) {
        var matches = [{ row: startRow, col: col }];
        var rows = mapGrid.length;

        for (var r = startRow + 1; r < rows; r++) {
            if (mapGrid[r][col].getType() === type) {
                matches.push({ row: r, col: col });
            } else {
                break;
            }
        }
        return matches;
    },

    /**
     * Find 2x2 square match starting from top-left position
     * @param {Array} mapGrid 
     * @param {number} row - Top-left row
     * @param {number} col - Top-left col
     * @param {number} type - Gem type to match
     * @returns {Array|null} Array of 4 positions if square found, null otherwise
     */
    _findSquareMatch: function (mapGrid, row, col, type) {
        var rows = mapGrid.length;
        var cols = mapGrid[0].length;

        // Check bounds for 2x2 square
        if (row + 1 >= rows || col + 1 >= cols) return null;

        // Check if all 4 positions match the type
        if (mapGrid[row][col].getType() === type &&
            mapGrid[row][col + 1].getType() === type &&
            mapGrid[row + 1][col].getType() === type &&
            mapGrid[row + 1][col + 1].getType() === type) {

            return [
                { row: row, col: col },
                { row: row, col: col + 1 },
                { row: row + 1, col: col },
                { row: row + 1, col: col + 1 }
            ];
        }

        return null;
    },

    _countInDirection: function (mapGrid, row, col, dRow, dCol, type) {
        var count = 0;
        var r = row + dRow;
        var c = col + dCol;
        var rows = mapGrid.length;
        var cols = mapGrid[0].length;

        while (r >= 0 && r < rows && c >= 0 && c < cols) {
            if (mapGrid[r][c].getType() === type) {
                count++;
                r += dRow;
                c += dCol;
            } else {
                break;
            }
        }
        return count;
    },

    _getPositionsInDirection: function (mapGrid, row, col, dRow, dCol, type) {
        var positions = [];
        var r = row + dRow;
        var c = col + dCol;
        var rows = mapGrid.length;
        var cols = mapGrid[0].length;

        while (r >= 0 && r < rows && c >= 0 && c < cols) {
            if (mapGrid[r][c].getType() === type) {
                positions.push({ row: r, col: c });
                r += dRow;
                c += dCol;
            } else {
                break;
            }
        }
        return positions;
    },

    _removeDuplicatePositions: function (positions) {
        var unique = [];
        var seen = {};

        for (var i = 0; i < positions.length; i++) {
            var key = positions[i].row + ',' + positions[i].col;
            if (!seen[key]) {
                seen[key] = true;
                unique.push(positions[i]);
            }
        }
        return unique;
    },

    _mergeOverlappingMatches: function (matches) {
        if (matches.length <= 1) return matches;

        var merged = [];
        var used = new Array(matches.length).fill(false);

        cc.log("Matches " + JSON.stringify(matches));
        for (var i = 0; i < matches.length; i++) {
            if (used[i]) continue;

            var group = matches[i].slice();
            used[i] = true;

            // Keep scanning ALL remaining unused groups until no new merge
            // happens. This handles the transitive/cascading case where
            // group grows after merging with matches[j] and then overlaps
            // with matches[k] (k < j) that was already tested against the
            // smaller group and found non-overlapping.
            var didMerge = true;
            while (didMerge) {
                didMerge = false;
                for (var j = 0; j < matches.length; j++) {
                    if (used[j]) continue;

                    if (this._groupsOverlap(group, matches[j])) {
                        group = this._mergeGroups(group, matches[j]);
                        used[j] = true;
                        didMerge = true;
                        cc.log("Merge Group");
                    }
                }
            }

            merged.push(group);
        }

        return merged;
    },

    _groupsOverlap: function (group1, group2) {
        for (var i = 0; i < group1.length; i++) {
            for (var j = 0; j < group2.length; j++) {
                if (group1[i].row === group2[j].row &&
                    group1[i].col === group2[j].col) {
                    return true;
                }
            }
        }
        return false;
    },

    _mergeGroups: function (group1, group2) {
        var merged = group1.slice();
        for (var i = 0; i < group2.length; i++) {
            var found = false;
            for (var j = 0; j < merged.length; j++) {
                if (merged[j].row === group2[i].row &&
                    merged[j].col === group2[i].col) {
                    found = true;
                    break;
                }
            }
            if (!found) {
                merged.push(group2[i]);
            }
        }
        return merged;
    },

    _wouldMatch: function (mapGrid, r1, c1, r2, c2) {
        // Temporarily swap colors and check for match
        var type1 = mapGrid[r1][c1].getType();
        var type2 = mapGrid[r2][c2].getType();

        if (type1 < 0 || type2 < 0) return false;
        if (type1 === type2) return false;

        // Create temp grid for checking
        var tempGetType = function (r, c) {
            if (r === r1 && c === c1) return type2;
            if (r === r2 && c === c2) return type1;
            return mapGrid[r][c].getType();
        };

        // Check if swap would create match at either position
        return this._checkMatchWithGetter(mapGrid, r1, c1, tempGetType) ||
            this._checkMatchWithGetter(mapGrid, r2, c2, tempGetType);
    },

    _checkMatchWithGetter: function (mapGrid, row, col, getType) {
        var type = getType(row, col);
        if (type < 0) return false;

        var rows = mapGrid.length;
        var cols = mapGrid[0].length;

        // Check horizontal
        var hCount = 1;
        for (var c = col - 1; c >= 0 && getType(row, c) === type; c--) hCount++;
        for (var c = col + 1; c < cols && getType(row, c) === type; c++) hCount++;
        if (hCount >= CoreGame.Config.MIN_MATCH) return true;

        // Check vertical
        var vCount = 1;
        for (var r = row - 1; r >= 0 && getType(r, col) === type; r--) vCount++;
        for (var r = row + 1; r < rows && getType(r, col) === type; r++) vCount++;
        if (vCount >= CoreGame.Config.MIN_MATCH) return true;

        return false;
    }
};
