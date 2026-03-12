/**
 * DropMgr - Handles element dropping and board refilling logic
 * Part of Match-3 Core Game
 *
 * Split-Drop Mode:
 *   boardMgr.splitDropConfig = { enabled: true, splitCol: 4 }
 *   - col < splitCol  : normal drop (top → bottom, spawn above)
 *   - col >= splitCol : reverse drop (bottom → top, spawn below)
 */
var CoreGame = CoreGame || {};

CoreGame.DropMgr = cc.Class.extend({
    boardMgr: null,
    spawnStrategy: null,

    ctor: function (boardMgr) {
        this.boardMgr = boardMgr;
        this.spawnStrategy = new CoreGame.DropStrategy.RandomSpawnStrategy();
    },

    /**
     * Replace the active spawn strategy.
     * @param {CoreGame.SpawnStrategy} strategy
     */
    setSpawnStrategy: function (strategy) {
        this.spawnStrategy = strategy;
    },

    // ─── Split-drop helper ───────────────────────────────────────────────────

    /**
     * Returns true if column `c` should use reverse-drop (bottom → top).
     * Requires boardMgr.splitDropConfig = { enabled: true, splitCol: N }
     */
    isReverseCol: function (c) {
        var cfg = this.boardMgr.splitDropConfig;
        return cfg && cfg.enabled && c >= cfg.splitCol;
    },

    // ─── Refill entry point ──────────────────────────────────────────────────

    /**
     * Refill the board (drop and spawn new gems)
     */
    refillMap: function () {
        cc.log("Refill Map ");
        this.boardMgr.state = CoreGame.BoardState.DROPPING;
        this.boardMgr.requiredRefill = false;

        this.dropDelayCol = [];
        for (let i = 0; i < this.boardMgr.cols; i++) {
            this.dropDelayCol.push(0);
        }

        var hasDrop = this.dropElements();
        var hasSpawn = this.spawnNewGems();

        if (hasDrop || hasSpawn) {
            var self = this;
            CoreGame.TimedActionMgr.addAction(0.5, function () {
                self.boardMgr.setMatchingRequired(true);
            }, this);
        }
    },

    // ─── Drop logic ──────────────────────────────────────────────────────────

    /**
     * Drop gems to fill empty spaces.
     * Normal columns  : elements fall downward  (row 0 = bottom)
     * Reverse columns : elements rise upward     (row rows-1 = bottom)
     */
    dropElements: function () {
        var hasDrop = false;
        var cols = this.boardMgr.cols;
        var rows = this.boardMgr.rows;
        var splitCol = this.boardMgr.splitDropConfig.splitCol;

        // 1. Build snapshot grid
        //    grid[r][c]      = movable element or null
        //    isBlocked[r][c] = true if slot is disabled OR has immovable content
        var grid = [];
        var isBlocked = [];

        // 1a. Collect unique multi-cell elements (size > 1x1)
        var multiCellElems = [];

        for (var r = 0; r < rows; r++) {
            grid[r] = [];
            isBlocked[r] = [];
            for (var c = 0; c < cols; c++) {
                var slot = this.boardMgr.mapGrid[r][c];
                if (!slot.enable) {
                    grid[r][c] = null;
                    isBlocked[r][c] = true;
                    continue;
                }
                var elem = slot.getFirstInteractable(CoreGame.ElementObject.Action.DROP);
                grid[r][c] = elem;
                isBlocked[r][c] = (elem == null && !slot.isEmptyToDrop());

                // Track multi-cell elements (deduplicated)
                if (elem && elem.size && (elem.size.width > 1 || elem.size.height > 1)) {
                    if (multiCellElems.indexOf(elem) === -1) {
                        multiCellElems.push(elem);
                    }
                }
            }
        }

        // Helper: check if an element is multi-cell
        var _isMultiCell = function (elem) {
            return elem && elem.size && (elem.size.width > 1 || elem.size.height > 1);
        };

        // Helper: find the bottom-left position of a multi-cell element in the grid
        var _findElemBottomLeft = function (elem) {
            for (var rr = 0; rr < rows; rr++) {
                for (var cc = 0; cc < cols; cc++) {
                    if (grid[rr][cc] === elem) {
                        return { r: rr, c: cc };
                    }
                }
            }
            return null;
        };

        // 2. Simulation loop: repeat until no more moves
        var changed = true;
        var maxIterations = rows * cols;
        var iteration = 0;

        while (changed && iteration < maxIterations) {
            changed = false;
            iteration++;

            // 2a. Multi-cell rigid-body gravity: drop each multi-cell elem by 1 row if possible
            for (var mi = 0; mi < multiCellElems.length; mi++) {
                var mElem = multiCellElems[mi];
                var pos = _findElemBottomLeft(mElem);
                if (!pos) continue;

                var w = mElem.size.width;
                var h = mElem.size.height;
                var baseR = pos.r;  // bottom-left row
                var baseC = pos.c;  // bottom-left col

                // Check if all cells directly below the bottom row are empty
                if (baseR - 1 < 0) continue; // already at floor
                var canDrop = true;
                for (var cOff = 0; cOff < w; cOff++) {
                    var checkC = baseC + cOff;
                    var checkR = baseR - 1;
                    if (checkC >= cols || isBlocked[checkR][checkC] ||
                        (grid[checkR][checkC] != null && grid[checkR][checkC] !== mElem)) {
                        canDrop = false;
                        break;
                    }
                }

                if (canDrop) {
                    // Move entire block down by 1 row in the grid snapshot
                    // Clear old top row cells
                    var topR = baseR + h - 1;
                    for (var cOff = 0; cOff < w; cOff++) {
                        grid[topR][baseC + cOff] = null;
                    }
                    // Set new bottom row cells
                    for (var cOff = 0; cOff < w; cOff++) {
                        grid[baseR - 1][baseC + cOff] = mElem;
                    }
                    changed = true;
                    cc.log("DropMgr: change drop multi-cell element");
                }
            }

            cc.log("DropMgr: dropElements: changed = " + changed);
            // 2b. Per-column sweep for 1x1 elements
            for (var c = 0; c < cols; c++) {
                if (this.isReverseCol(c)) {
                    // ── Reverse column: elements rise (row rows-1 is the "floor") ──
                    for (var r = rows - 1; r > 0; r--) {
                        if (isBlocked[r][c]) continue;
                        if (grid[r][c] != null) continue;

                        var foundVertical = false;
                        var verticalBlocked = false;
                        for (var rr = r - 1; rr >= 0; rr--) {
                            if (isBlocked[rr][c]) {
                                verticalBlocked = true;
                                break;
                            }
                            if (grid[rr][c] != null) {
                                // Skip multi-cell elements — they handle themselves
                                if (_isMultiCell(grid[rr][c])) {
                                    verticalBlocked = true;
                                    break;
                                }
                                grid[r][c] = grid[rr][c];
                                grid[rr][c] = null;
                                changed = true;
                                foundVertical = true;
                                break;
                            }
                            var scanSlot = this.boardMgr.mapGrid[rr][c];
                            if (scanSlot.canSpawn) {
                                foundVertical = true;
                                break;
                            }
                        }

                        // Diagonal: only pull 1x1 elements
                        if (!foundVertical && verticalBlocked && r - 1 >= 0) {
                            if (c - 1 >= 0 && grid[r - 1][c - 1] != null && !_isMultiCell(grid[r - 1][c - 1])) {
                                grid[r][c] = grid[r - 1][c - 1];
                                grid[r - 1][c - 1] = null;
                                changed = true;
                            } else if (c + 1 < cols && grid[r - 1][c + 1] != null && !_isMultiCell(grid[r - 1][c + 1])) {
                                grid[r][c] = grid[r - 1][c + 1];
                                grid[r - 1][c + 1] = null;
                                changed = true;
                            }
                        }
                    }
                } else {
                    // ── Normal column: elements fall (row 0 is the "floor") ──
                    for (var r = 0; r < rows - 1; r++) {
                        if (isBlocked[r][c]) continue;
                        if (grid[r][c] != null) continue;

                        var foundVertical = false;
                        var verticalBlocked = false;
                        cc.log("Check vertical " + r + " " + c);
                        for (var rr = r + 1; rr < rows; rr++) {
                            if (isBlocked[rr][c]) {
                                verticalBlocked = true;
                                cc.log("Vertical blocked " + rr + " " + c);
                                break;
                            }
                            if (grid[rr][c] != null) {
                                // Skip multi-cell elements — they handle themselves
                                if (_isMultiCell(grid[rr][c])) {
                                    verticalBlocked = true;
                                    cc.log("Vertical blocked (multi-cell) " + rr + " " + c);
                                    break;
                                }
                                grid[r][c] = grid[rr][c];
                                grid[rr][c] = null;
                                changed = true;
                                foundVertical = true;
                                cc.log("Vertical found " + rr + " " + c);
                                break;
                            }
                            var scanSlot = this.boardMgr.mapGrid[rr][c];
                            if (scanSlot.canSpawn) {
                                foundVertical = true;
                                cc.log("Vertical found spawn " + rr + " " + c);
                                break;
                            }
                        }

                        // Diagonal: only pull 1x1 elements
                        if (!foundVertical && verticalBlocked && r + 1 < rows) {
                            cc.log("Check diagonal " + r + " " + c);
                            if (c - 1 >= 0 && grid[r + 1][c - 1] != null && !_isMultiCell(grid[r + 1][c - 1])) {
                                grid[r][c] = grid[r + 1][c - 1];
                                grid[r + 1][c - 1] = null;
                                changed = true;
                            } else if (c + 1 < cols && grid[r + 1][c + 1] != null && !_isMultiCell(grid[r + 1][c + 1])) {
                                grid[r][c] = grid[r + 1][c + 1];
                                grid[r + 1][c + 1] = null;
                                changed = true;
                            }
                        }
                    }
                }
            }
        }

        // 3. Apply moves — compare final grid positions with original element positions
        //    Use droppedElements to deduplicate multi-cell elements (same elem in multiple cells)
        //    For multi-cell elements, always add to droppedElements at first encounter (bottom-left
        //    due to iteration order r=0→, c=0→), then only call dropGemToSlot if position changed.
        var droppedElements = [];

        if (this.boardMgr.splitDropConfig.enabled) {
            for (var r = 0; r < rows; r++) {
                for (var c = 0; c < splitCol; c++) {
                    var element = grid[r][c];
                    if (!element || droppedElements.indexOf(element) !== -1) continue;
                    droppedElements.push(element);
                    if (element.position.x !== r || element.position.y !== c) {
                        hasDrop = true;
                        cc.log("Drop gem (normal) to slot r=" + r + " c=" + c);
                        this.dropGemToSlot(
                            element,
                            this.boardMgr.mapGrid[r][c],
                            this.dropDelayCol[c] + CoreGame.Config.DROP_DELTA_DELAY_COL * c
                        );
                        this.dropDelayCol[c] += CoreGame.Config.DROP_DELTA_DELAY;
                    }
                }
            }
            for (var r = rows - 1; r >= 0; r--) {
                for (var c = splitCol; c < cols; c++) {
                    var element = grid[r][c];
                    if (!element || droppedElements.indexOf(element) !== -1) continue;
                    droppedElements.push(element);
                    if (element.position.x !== r || element.position.y !== c) {
                        hasDrop = true;
                        cc.log("Drop gem (reverse) to slot r=" + r + " c=" + c);
                        this.dropGemToSlot(
                            element,
                            this.boardMgr.mapGrid[r][c],
                            this.dropDelayCol[c] + CoreGame.Config.DROP_DELTA_DELAY_COL * c
                        );
                        this.dropDelayCol[c] += CoreGame.Config.DROP_DELTA_DELAY;
                    }
                }
            }
        }
        else {
            for (var r = 0; r < rows; r++) {
                for (var c = 0; c < cols; c++) {
                    var element = grid[r][c];
                    if (!element || droppedElements.indexOf(element) !== -1) continue;
                    droppedElements.push(element);
                    if (element.position.x !== r || element.position.y !== c) {
                        hasDrop = true;
                        cc.log("Drop gem (normal) to slot r=" + r + " c=" + c + " Element " + element.getTypeName());
                        this.dropGemToSlot(
                            element,
                            this.boardMgr.mapGrid[r][c],
                            this.dropDelayCol[c] + CoreGame.Config.DROP_DELTA_DELAY_COL * c
                        );
                        this.dropDelayCol[c] += CoreGame.Config.DROP_DELTA_DELAY;
                    }
                }
            }
        }

        return hasDrop;
    },

    // ─── Animation ───────────────────────────────────────────────────────────

    /**
     * Drop a gem to target slot (works for both normal and reverse columns)
     */
    dropGemToSlot: function (gem, targetSlot, delayTime = 0, speed = CoreGame.Config.DROP_SPEED) {
        // cc.log("dropGemToSlot row " + targetSlot.row + " col " + targetSlot.col);
        var targetPixelPos = this.boardMgr.gridToPixel(targetSlot.row, targetSlot.col);
        var currentPixelPos = this.boardMgr.gridToPixel(gem.position.x, gem.position.y);

        // Adjust for multi-cell element visual offset
        if (gem.size && (gem.size.width > 1 || gem.size.height > 1)) {
            var offsetX = (gem.size.width - 1) * CoreGame.Config.CELL_SIZE / 2;
            var offsetY = (gem.size.height - 1) * CoreGame.Config.CELL_SIZE / 2;
            targetPixelPos.x += offsetX;
            targetPixelPos.y += offsetY;
            currentPixelPos.x += offsetX;
            currentPixelPos.y += offsetY;
        }

        var distance = Math.abs(currentPixelPos.y - targetPixelPos.y);
        var duration = distance / speed;
        // duration = 0.2;

        gem.setState(CoreGame.ElementState.DROPPING);
        gem.dropTo(targetSlot.row, targetSlot.col, duration, delayTime);

        CoreGame.TimedActionMgr.addAction(duration, function () {
            gem.setState(CoreGame.ElementState.IDLE);
            // if (gem.ui) {
            //     gem.ui.playBounceAnim();
            // }
            this.boardMgr.setMatchingRequired(true);
            this.boardMgr.setRefillRequired(true);
        }.bind(this));

        return duration;
    },

    spawnGemFadeIn: function (gem, duration = 0, delayTime = 0) {
        if (gem.ui) {
            gem.ui.playFadeInAnim(duration, delayTime);
        }
    },

    // ─── Spawn logic ─────────────────────────────────────────────────────────

    /**
     * Spawn new gems to fill empty slots after dropping.
     * Normal columns  : spawn above the board (row >= rows), fall down.
     * Reverse columns : spawn below the board (row < 0),    rise up.
     */
    spawnNewGems: function () {
        var hasSpawn = false;

        for (var c = 0; c < this.boardMgr.cols; c++) {
            if (this.isReverseCol(c)) {
                hasSpawn = this._spawnReverseCol(c) || hasSpawn;
            } else {
                hasSpawn = this._spawnNormalCol(c) || hasSpawn;
            }
        }

        return hasSpawn;
    },

    /**
     * Spawn for normal column: count empty slots from row 0 upward,
     * spawn above the board and let them fall down.
     */
    _spawnNormalCol: function (c) {
        var hasSpawn = false;
        var rows = this.boardMgr.rows;

        // Process each canSpawn source from top to bottom.
        // Each source fills contiguous empty slots below it (including itself).
        for (var spawnR = rows - 1; spawnR >= 0; spawnR--) {
            var spawnSlot = this.boardMgr.mapGrid[spawnR][c];
            if (!spawnSlot || !spawnSlot.enable || !spawnSlot.canSpawn) continue;

            // Collect contiguous empty slots from spawnR downward
            var emptyTargets = [];
            for (var r = spawnR; r >= 0; r--) {
                var slot = this.boardMgr.mapGrid[r][c];
                if (!slot.enable) {
                    if (emptyTargets.length > 0) break;
                    continue;
                }
                if (slot.isEmptyToDrop()) {
                    emptyTargets.push(r);
                } else {
                    break;
                }
            }

            if (emptyTargets.length === 0) continue;

            // Calculate Speed
            let count = 0;
            let maxDisRow = 0;
            for (var i = emptyTargets.length - 1; i >= 0; i--) {
                let desRow = emptyTargets[i];
                let startRow = this.boardMgr.rows + count;
                maxDisRow = Math.max(Math.abs(desRow - startRow), maxDisRow);
            }
            let speedMul = Math.max(1, maxDisRow / 5);
            cc.log("SPEED MUL", maxDisRow, speedMul);

            // Spawn gems: visual start above the spawn source
            count = 0;
            for (var i = emptyTargets.length - 1; i >= 0; i--) {
                var targetSlot = this.boardMgr.mapGrid[emptyTargets[i]][c];
                var type = this.spawnStrategy.getGemType(r, c, this.boardMgr);
                var gem = this.boardMgr.addNewElement(this.boardMgr.rows + count, c, type);
                let delayTime = this.dropDelayCol[c] + CoreGame.Config.DROP_DELTA_DELAY_COL * c;

                let duration = this.dropGemToSlot(
                    gem,
                    targetSlot,
                    delayTime,
                    CoreGame.Config.DROP_SPEED * speedMul
                );
                this.spawnGemFadeIn(gem, duration, delayTime);

                this.dropDelayCol[c] += CoreGame.Config.DROP_DELTA_DELAY;
                count++;
                hasSpawn = true;
            }
        }

        return hasSpawn;
    },

    /**
     * Spawn for reverse column: count empty slots from row rows-1 downward,
     * spawn below the board (negative rows) and let them rise up.
     */
    _spawnReverseCol: function (c) {
        var hasSpawn = false;
        var rows = this.boardMgr.rows;

        // Process each canSpawn source from bottom to top.
        // Each source fills contiguous empty slots above it (including itself).
        for (var spawnR = 0; spawnR < rows; spawnR++) {
            var spawnSlot = this.boardMgr.mapGrid[spawnR][c];
            if (!spawnSlot || !spawnSlot.enable || !spawnSlot.canSpawn) continue;

            // Collect contiguous empty slots from spawnR upward
            var emptyTargets = [];
            for (var r = spawnR; r < rows; r++) {
                var slot = this.boardMgr.mapGrid[r][c];
                if (!slot.enable) {
                    if (emptyTargets.length > 0) break;
                    continue;
                }
                if (slot.isEmptyToDrop()) {
                    emptyTargets.push(r);
                } else {
                    break;
                }
            }

            if (emptyTargets.length === 0) continue;

            // Spawn gems: visual start below the spawn source (negative rows)
            var visualRow = spawnR - emptyTargets.length;
            for (var i = 0; i < emptyTargets.length; i++) {
                var targetSlot = this.boardMgr.mapGrid[emptyTargets[i]][c];
                var type = this.spawnStrategy.getGemType(r, c, this.boardMgr);
                var gem = this.boardMgr.addNewElement(visualRow, c, type);
                this.dropGemToSlot(gem, targetSlot);
                visualRow++;
                hasSpawn = true;
            }
        }

        return hasSpawn;
    }
});
