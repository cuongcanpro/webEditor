/**
 * BoardMgr - Main game controller for Match-3
 * Part of Match-3 Core Game
 */
var CoreGame = CoreGame || {};

CoreGame.BoardState = {
    IDLE: 0,
    SWAPPING: 1,
    MATCHING: 2,
    DROPPING: 3,
    REFILLING: 4,
    END_GAME: 5,
    REMAINING_MOVES_BONUS: 6,
    MERGE_PU: 7,
};

CoreGame.Direction = {
    UP: 1,
    DOWN: 2,
    LEFT: 3,
    RIGHT: 4
};

CoreGame.BoardMgr = cc.Class.extend({
    // Properties from UML
    boardUI: null,
    mapGrid: null,          // 2D array of GridSlots
    requiredMatching: false,
    requiredRefill: false,
    playerMoved: false,

    // Additional properties
    rows: 0,
    cols: 0,
    state: 0,

    lastSwapSource: null,
    lastSwapDest: null,

    gameEnded: false,

    delayRefill: 0,

    ctor: function () {
        this.rows = CoreGame.Config.BOARD_ROWS;
        this.cols = CoreGame.Config.BOARD_COLS;
        this.state = CoreGame.BoardState.IDLE;
        this.mapGrid = [];
        this.removedElementTypes = []; // Track removed elements
        this.cascadeCount = 0;         // Track cascade rounds per turn
        this.random = new CoreGame.Random(1);
        CoreGame.TimedActionMgr.clear();
        this.matchMgr = new CoreGame.MatchMgr(this);
        this.dropMgr = new CoreGame.DropMgr(this);
        this.blockerMgr = new CoreGame.BlockerMgr(this);
        this.scoreMgr = new CoreGame.ScoreMgr(this);
        // Number of PowerUps currently in their active() lifecycle (incremented
        // on PowerUP.active(), decremented in removedElement when a PowerUp
        // is removed). Used to:
        //   1) tag concurrent element clears with clearMethod = 'pu'
        //   2) award PU chain bonuses when a PU starts while another is alive
        this._activePUCount = 0;
        this.splitDropConfig = {
            enabled: false,
            splitCol: 4   // col 0-3: roi xu?ng | col 4-7: n?i l�n
        };
        this.pendingRainbowPUs = [];
        this.isAutoMatchBlocked = false;
        this.idleTime = 0;
        this.isHinting = false;
        this.hintThreshold = 4.0; // Show (and re-cycle) hint every 3 seconds of idle
        this._lastHintKey = null; // Last hint move key — used to avoid immediate repeats
        this.hintElements = []; // Store elements currently showing hint
        this.idleCheckEndGameTime = 0;
        this.doEndGame = false;
    },

    /**
     * Initialize the board (call after creating BoardUI)
     * @param {Object} boardUI - Board UI instance
     * @param {Array} testBoxes - Optional test blocker configuration
     * @param {Array} mapConfig - Optional 2D array defining enabled slots (1=enabled, 0=disabled)
     */
    init: function (boardUI, mapConfig, testBoxes) {
        this.boardUI = boardUI;
        this.calculateBoardOffset(mapConfig);
        this.initGrid(mapConfig, testBoxes);
        this.initEventListeners();
        this.gameEnded = false;
        this.idleCheckEndGameTime = 0;
        this.doEndGame = false;
        this._activePUCount = 0;
        if (this.scoreMgr) this.scoreMgr.reset(mapConfig);
        return this;
    },

    // ── 3-Star scoring helpers (read by ScoreMgr) ────────────────────────────

    /**
     * Whether `type` appears in this level's targetElements list (i.e. is an
     * Objective blocker for §3.1 scoring). Picks between the [A] Objective
     * and [B] Secondary score tables.
     */
    isObjectiveType: function (type) {
        if (!this.targetElements) return false;
        for (var i = 0; i < this.targetElements.length; i++) {
            if (this.targetElements[i].id === type) return true;
        }
        return false;
    },

    /**
     * Returns 'pu' if any PowerUp is currently in its active() lifecycle,
     * else 'match'. Used to tag clear events for §3.1/§3.2 column lookup.
     */
    getCurrentClearMethod: function () {
        return (this._activePUCount > 0) ? 'pu' : 'match';
    },

    /**
     * Cascade depth as defined in §3.4 — 0 for the player's direct match,
     * +1 for each cascade wave. cascadeCount internally starts at 1 on the
     * first match wave; subtract 1 to map onto the design's depth values.
     */
    getCurrentCascadeDepth: function () {
        return Math.max(0, (this.cascadeCount || 0) - 1);
    },

    /**
     * Calculate board offset to center the board on screen based on the actual
     * bounding box of active cells in the slotMap (not the full Config grid).
     */
    calculateBoardOffset: function (mapConfig) {
        var slotMap = mapConfig && mapConfig.slotMap;
        var minRow = this.rows, maxRow = 0, minCol = this.cols, maxCol = 0;

        if (slotMap) {
            for (var r = 0; r < slotMap.length; r++) {
                for (var c = 0; c < slotMap[r].length; c++) {
                    if (slotMap[r][c] >= 1) {
                        if (r < minRow) minRow = r;
                        if (r > maxRow) maxRow = r;
                        if (c < minCol) minCol = c;
                        if (c > maxCol) maxCol = c;
                    }
                }
            }
        }

        // Fallback: if no slotMap or no active cells, use full grid
        if (minRow > maxRow) {
            minRow = 0;
            maxRow = this.rows - 1;
            minCol = 0;
            maxCol = this.cols - 1;
        }

        var activeRows = maxRow - minRow + 1;
        var activeCols = maxCol - minCol + 1;
        var cell = CoreGame.Config.CELL_SIZE;
        var boardWidth = activeCols * cell;
        var boardHeight = activeRows * cell;

        this.activeRows = activeRows;
        this.activeCols = activeCols;

        // Offset so the active area is centered on screen
        this.boardOffsetX = Math.round((cc.winSize.width - boardWidth) / 2 - minCol * cell);
        this.boardOffsetY = Math.round((cc.winSize.height - boardHeight) / 2 - minRow * cell);
    },

    /**
     * Initialize the grid with slots and gems
     * @param {Array} testBoxes - Optional test blocker configuration
     * @param {Array} mapConfig - Optional 2D array defining enabled slots (1=enabled, 0=disabled)
     *                          Example: [[1,1,1], [1,0,1], [1,1,1]] for a cross shape
     */
    initGrid: function (mapConfig, testBoxes) {
        var slotMap = null;
        this.targetElements = [];
        this.numMove = 25;
        this.mapConfig = {};
        if (mapConfig) {
            cc.log("MapConfig " + JSON.stringify(mapConfig));

            if (mapConfig["slotMap"]) {
                slotMap = mapConfig["slotMap"];
            }

            this.targetElements = mapConfig["targetElements"] || [];
            for (let element of this.targetElements) {
                element.current = element.count;
            }
            cc.log("BoardMgr targetElements", JSON.stringify(this.targetElements));

            this.numMove = mapConfig["numMove"] || 0;
            this.totalMove = this.numMove;
            this.mapConfig = mapConfig;

            // Build HP-per-type map for AdaptiveTPP boss-progress tracking
            this._tppTargetInitHp = {};
            var initElems = mapConfig["elements"] || [];
            for (var _ei = 0; _ei < initElems.length; _ei++) {
                var _me = initElems[_ei];
                if (_me.hp && _me.hp > 1) {
                    this._tppTargetInitHp[_me.type] = _me.hp;
                }
            }
        }

        // var slotMap = [
        //     //     [1, 1, 1, 1, 1, 1, 1],  // Row 0
        //     //     [1, 1, 1, 1, 1, 1, 1],  // Row 1
        //     //     [1, 1, 1, 1, 1, 1, 1],  // Row 2
        //     //     [1, 1, 1, 0, 1, 1, 1],  // Row 3
        //     //     [0, 1, 1, 1, 1, 1, 1],  // Row 4
        //     //     [1, 1, 1, 1, 1, 1, 1],  // Row 5
        //     //     [1, 1, 1, 1, 1, 1, 1],  // Row 6
        //     //     [0, 1, 1, 1, 1, 1, 1]   // Row 7
        //     // ];

        // Create grid slots
        // slotMap values: 0=disabled, 1=enabled, 2=enabled+canSpawn
        for (var r = 0; r < this.rows; r++) {
            this.mapGrid[r] = [];
            for (var c = 0; c < this.cols; c++) {
                var enabled = true;
                var spawnPoint = false;

                if (slotMap && slotMap[r] && slotMap[r][c] !== undefined) {
                    var val = slotMap[r][c];
                    enabled = val >= 1;
                    spawnPoint = val === 2;
                }

                var slot = new CoreGame.GridSlot(r, c, this, enabled);
                slot.canSpawn = spawnPoint;
                this.mapGrid[r][c] = slot;
            }
        }

        if (mapConfig) {
            // Load gemTypes (IDs of gems that can be randomly spawned)
            this.gemTypes = (mapConfig.gemTypes && mapConfig.gemTypes.length > 0)
                ? mapConfig.gemTypes.slice()
                : null; // null = use default 1..NUM_GEN

            // Add elements from map config
            if (mapConfig.elements && mapConfig.elements.length > 0) {
                cc.log("Adding " + mapConfig.elements.length + " elements from map config");

                // Pre-build a lookup of fixed (non-type-7) neighbor types so that
                // getValidTypeForPosition can see right-side and upper-row neighbors
                // that haven't been placed on the grid yet.
                this._pendingFixedTypes = {};
                for (var pi = 0; pi < mapConfig.elements.length; pi++) {
                    var pe = mapConfig.elements[pi];
                    if (pe.type !== 7) {
                        this._pendingFixedTypes[pe.row + ',' + pe.col] = pe.type;
                    }
                }

                for (var i = 0; i < mapConfig.elements.length; i++) {
                    var elem = mapConfig.elements[i];
                    // Type 7 = Gem Random: resolve to a color that won't create a match
                    var spawnType = (elem.type === 7)
                        ? this.getValidTypeForPosition(elem.row, elem.col)
                        : elem.type;
                    // Record the resolved type so subsequent type-7 elements can see it
                    this._pendingFixedTypes[elem.row + ',' + elem.col] = spawnType;
                    this.addNewElement(elem.row, elem.col, spawnType, elem.hp, elem.cells || null);
                }

                this._pendingFixedTypes = null;
            }
        } else {
            this.fillBoardNoMatches();
        }

        if (this.boardUI) {
            this.boardUI.renderBoardBorder();
        }

        // if (testBoxes)
        //     this.addTestingBlockers(testBoxes);

        // // Create grid slots
        // for (var r = 0; r < this.rows; r++) {
        //     this.mapGrid[r] = [];
        //     for (var c = 0; c < this.cols; c++) {
        //         // Check if this slot should be enabled
        //         var enabled = true;
        //         if (slotMap && slotMap[r] && slotMap[r][c] !== undefined) {
        //             enabled = slotMap[r][c] === 1;
        //         }

        //         var slot = new CoreGame.GridSlot(r, c, this, enabled);
        //         this.mapGrid[r][c] = slot;
        //     }
        // }

        // // Fill with gems (no initial matches)
        // if (!noFill)
        //     this.fillBoardNoMatches();

        // // Add some boxes for testing
        // this.addTestingBlockers(testBoxes);
    },

    /**
     * Add some blockers for logic verification
     */
    addTestingBlockers: function (testBoxes) {
        if (!testBoxes) {
            testBoxes = [
                // { r: 3, c: 3, hp: 2, type: CoreGame.Config.ElementType.BOX },
                // { r: 3, c: 4, hp: 2, type: CoreGame.Config.ElementType.BOX },
                // { r: 2, c: 0, hp: 7, type: CoreGame.Config.ElementType.MILK_CABINET }, // Testing Milk Cabinet
                // { r: 5, c: 0, hp: 1, type: CoreGame.Config.ElementType.SOAP_PUMP }, // Testing Soap Pump
                // { r: 5, c: 3, hp: 3, type: CoreGame.Config.ElementType.TRAFFIC_LIGHT }, // Testing Traffic Light
                // { r: 5, c: 6, hp: 4, type: CoreGame.Config.ElementType.PINWHEEL }, // Testing Pinwheel
                // { r: 4, c: 3, hp: 3, type: CoreGame.Config.ElementType.CHERRY }, // Testing Cherry
                // { r: 4, c: 5, hp: 3, type: CoreGame.Config.ElementType.BUSH }, // Testing Bush
                // { r: 7, c: 3, hp: 5, type: CoreGame.Config.ElementType.BOX },
                // { r: 4, c: 4, hp: 1, type: CoreGame.Config.ElementType.BOX },
                // { r: 2, c: 2, hp: 1, type: CoreGame.Config.ElementType.CLOUD },
                //{ r: 2, c: 5, hp: 1, type: CoreGame.Config.ElementType.CHAIN }, // Testing Chain
                // { r: 0, c: 3, hp: 1, type: CoreGame.Config.ElementType.COOKIE }, // Testing Cookie
                // { r: 0, c: 4, hp: 1, type: CoreGame.PowerUPType.MATCH_4_H },
                // { r: 0, c: 5, hp: 1, type: CoreGame.Config.ElementType.GRASS }, // Testing connected Grass
                //{ r: 3, c: 5, hp: 1, type: 568 }, // Testing connected Grass
            ];
        }


        for (var i = 0; i < testBoxes.length; i++) {
            var data = testBoxes[i];
            this.addNewElement(data.r, data.c, data.type, data.hp);
        }

        // START TEST DYNAMIC BLOCKER

        // Occupies: (2,2), (3,2), (3,3)
        var lShapeOffsets = [{ r: 2, c: 2 }, { r: 3, c: 2 }, { r: 3, c: 3 }];
        var dynamicBlocker = new CoreGame.Cloud();
        dynamicBlocker.init(2, 2, CoreGame.Config.ElementType.CLOUD, 1, lShapeOffsets);

        // Use general add helper but we need to pass instance or handle manual add
        // addNewElement creates new instance. We need to support adding existing instance OR modify addNewElement to support offsets.
        // Current addNewElement: create(row, col, type, hp) -> calls init.
        // We need: create(row, col, type, hp, offsets)

        // Let's modify addNewElement call or just manually add it here for testing.
        dynamicBlocker.boardMgr = this;
        var cells = dynamicBlocker.getGridCells();
        for (var i = 0; i < cells.length; i++) {
            var slot = this.getSlot(cells[i].x, cells[i].y);
            slot.clearElements();
            if (slot) slot.addElement(dynamicBlocker);
        }
        this.boardUI.addElementAvatar(dynamicBlocker);
        dynamicBlocker.updateVisualPosition();
        // END TEST DYNAMIC BLOCKER
    },

    /**
     * Helper to create and add element to board
     */
    /**
     * Add new element to board
     * @param {number} row - Grid row
     * @param {number} col - Grid column
     * @param {number} type - Element type ID
     * @param {number} hp - Hit points
     * @returns {ElementObject} Created element
     */
    /**
     * Add new element to board
     * @param {number} row - Grid row
     * @param {number} col - Grid column
     * @param {number} type - Element type ID
     * @param {number} hp - Hit points
     * @param {Array} [cells] - Optional list of {r,c} positions for DynamicBlocker
     * @returns {ElementObject} Created element
     */
    addNewElement: function (row, col, type, hp, cells) {
        // Check if type is registered in ElementObject.map
        if (CoreGame.ElementObject.map[type]) {
            // Use standard creation for registered types
            // ElementObject.create uses apply() to forward all args including cells
            var element = CoreGame.ElementObject.create(row, col, type, hp, cells);
            this.addElement(element, row, col);
            return element;
        } else {
            // Fallback to BlockerFactory for unregistered types (JSON-based blockers)
            cc.log("Type", type, "not registered, using BlockerFactory");
            var blocker = CoreGame.BlockerFactory.createBlocker(row, col, type, hp);
            this.addElement(blocker, row, col);
            blocker.updateVisualByActions();
            blocker.ui.setVisibleLbState(true);
            return blocker;
        }
    },

    addElement: function (element, row, col) {
        if (element) {
            element.boardMgr = this;

            // Add to logical slots (Handle Multi-slot via getGridCells)
            var cells = element.getGridCells();
            for (var i = 0; i < cells.length; i++) {
                var cell = cells[i];
                var targetSlot = this.getSlot(cell.x, cell.y);

                // Add single instance to multiple slots
                if (targetSlot) {
                    targetSlot.addElement(element);
                }
            }

            // Add avatar (Visual only, once)
            this.boardUI.addElementAvatar(element);

            element.updateVisualPosition(); // Position correctly (now handles 2x2 offset)
        }
    },

    removedElement: function (element) {
        this.idleCheckEndGameTime = 0;
        for (let targetElement of this.targetElements) {
            if (targetElement.id === element.type) {
                targetElement.current--;
            }
        }

        if (this.gameUI) {
            this.gameUI.onUpdateTargetElement(element);
        }

        // ── 3-Star scoring (see ScoreMgr.js) ────────────────────────────────
        // Close out a PU's activation lifecycle by decrementing the live-PU
        // counter; this stops further clears from being tagged as 'pu'.
        if (element instanceof CoreGame.PowerUP) {
            if (this._activePUCount > 0) this._activePUCount--;
        }

        // Per §3.1, score every damage event — not just kills. Multi-HP
        // blockers (Box, Chain, bosses) and tile-based blockers (Cloud) are
        // scored inside their own takeDamage() paths where the per-event
        // amount is known. Here we only score instant-removal entities
        // (regular gems via match) so blocker kills aren't double-counted.
        if (this.scoreMgr
            && element
            && !(element instanceof CoreGame.Blocker)
            && !(element instanceof CoreGame.PowerUP)) {
            this.scoreMgr.addClearEvent({
                elementType: element.type,
                hp: 1,
                isObjective: this.isObjectiveType(element.type),
                clearMethod: this.getCurrentClearMethod(),
                cascadeDepth: this.getCurrentCascadeDepth()
            });
        }
    },

    /**
     * Fill board with gems ensuring no initial matches
     */
    fillBoardNoMatches: function () {
        cc.log("Fill Board No Matches ======= ");
        for (var r = 0; r < this.rows; r++) {
            for (var c = 0; c < this.cols; c++) {
                var slot = this.mapGrid[r][c];
                // Skip disabled slots
                if (!slot.enable) {
                    continue;
                }
                var type = this.getValidTypeForPosition(r, c);
                this.addNewElement(r, c, type);
            }
        }
    },

    /**
     * Get a color that won't create a match at position
     */
    /**
     * Pick a random gem type from this.gemTypes (if set) or 1..NUM_GEN.
     */
    getRandomGemType: function () {
        if (this.gemTypes && this.gemTypes.length > 0) {
            return this.gemTypes[this.random.nextInt32Bound(this.gemTypes.length)];
        }
        return this.random.nextInt32Bound(CoreGame.Config.NUM_GEN) + 1;
    },

    /**
     * Get a type that won't create a match at position
     */
    // Returns the type at (r,c): from the grid if placed, from _pendingFixedTypes if not yet placed.
    _getNeighborType: function (r, c) {
        var t = this.mapGrid[r][c].getType();
        if (t >= 0) return t;
        if (this._pendingFixedTypes) {
            var planned = this._pendingFixedTypes[r + ',' + c];
            return (planned !== undefined) ? planned : -1;
        }
        return -1;
    },

    getValidTypeForPosition: function (row, col) {
        var pool = (this.gemTypes && this.gemTypes.length > 0)
            ? this.gemTypes.slice()
            : (function () {
                var a = [];
                for (var i = 1; i <= CoreGame.Config.NUM_GEN; i++) a.push(i);
                return a;
            })();

        // Check horizontal (left 2)
        if (col >= 2) {
            var t1 = this._getNeighborType(row, col - 1);
            var t2 = this._getNeighborType(row, col - 2);
            if (t1 >= 0 && t1 === t2) {
                var idx = pool.indexOf(t1);
                if (idx !== -1) pool.splice(idx, 1);
            }
        }

        // Check vertical (up 2)
        if (row >= 2) {
            var t1 = this._getNeighborType(row - 1, col);
            var t2 = this._getNeighborType(row - 2, col);
            if (t1 >= 0 && t1 === t2) {
                var idx = pool.indexOf(t1);
                if (idx !== -1) pool.splice(idx, 1);
            }
        }

        // Check horizontal (right 2)
        if (col + 2 < this.cols) {
            var t1 = this._getNeighborType(row, col + 1);
            var t2 = this._getNeighborType(row, col + 2);
            if (t1 >= 0 && t1 === t2) {
                var idx = pool.indexOf(t1);
                if (idx !== -1) pool.splice(idx, 1);
            }
        }

        // Check vertical (down 2)
        if (row + 2 < this.rows) {
            var t1 = this._getNeighborType(row + 1, col);
            var t2 = this._getNeighborType(row + 2, col);
            if (t1 >= 0 && t1 === t2) {
                var idx = pool.indexOf(t1);
                if (idx !== -1) pool.splice(idx, 1);
            }
        }

        // Check middle horizontal (left 1 + right 1)
        if (col >= 1 && col + 1 < this.cols) {
            var t1 = this._getNeighborType(row, col - 1);
            var t2 = this._getNeighborType(row, col + 1);
            if (t1 >= 0 && t1 === t2) {
                var idx = pool.indexOf(t1);
                if (idx !== -1) pool.splice(idx, 1);
            }
        }

        // Check middle vertical (up 1 + down 1)
        if (row >= 1 && row + 1 < this.rows) {
            var t1 = this._getNeighborType(row - 1, col);
            var t2 = this._getNeighborType(row + 1, col);
            if (t1 >= 0 && t1 === t2) {
                var idx = pool.indexOf(t1);
                if (idx !== -1) pool.splice(idx, 1);
            }
        }

        // Check 2x2 square patterns (4 possible squares containing this cell)
        var squareChecks = [
            // This cell is top-left
            [row, col + 1, row + 1, col, row + 1, col + 1],
            // This cell is top-right
            [row, col - 1, row + 1, col - 1, row + 1, col],
            // This cell is bottom-left
            [row - 1, col, row - 1, col + 1, row, col + 1],
            // This cell is bottom-right
            [row - 1, col - 1, row - 1, col, row, col - 1]
        ];
        for (var s = 0; s < squareChecks.length; s++) {
            var sc = squareChecks[s];
            if (sc[0] >= 0 && sc[0] < this.rows && sc[1] >= 0 && sc[1] < this.cols &&
                sc[2] >= 0 && sc[2] < this.rows && sc[3] >= 0 && sc[3] < this.cols &&
                sc[4] >= 0 && sc[4] < this.rows && sc[5] >= 0 && sc[5] < this.cols) {
                var ta = this.mapGrid[sc[0]][sc[1]].getType();
                var tb = this.mapGrid[sc[2]][sc[3]].getType();
                var tc = this.mapGrid[sc[4]][sc[5]].getType();
                if (ta >= 0 && ta === tb && tb === tc) {
                    var idx = pool.indexOf(ta);
                    if (idx !== -1) pool.splice(idx, 1);
                }
            }
        }

        if (pool.length === 0) return this.getRandomGemType(); // fallback
        return pool[this.random.nextInt32Bound(pool.length)];
    },

    /**
     * Initialize event listeners
     */
    initEventListeners: function () {
        var self = this;

        CoreGame.EventMgr.on('elementMatched', function (element) {
            // Handle element match
        }, this);

        CoreGame.EventMgr.on('scoreChanged', function (package) {
            // cc.log("********* SCORING: ", package.score.total);
            // Handle scoreChanged

            if (this.gameUI) {
                this.gameUI.onScoreChanged(package.score.total, this.mapConfig.scoreConfig);
            }
        }, this);

        CoreGame.EventMgr.on(CoreGame.ElementObject.EVENT.REMOVED, function (elementObject) {
            // Handle blocker destruction

            //Also check for end game to stop interaction
            let isWin = this.targetElements.length > 0;
            for (let element of this.targetElements) {
                //cc.log("CHECK ENDGAME:", element.current, element.type);
                if (element.current > 0) {
                    isWin = false;
                    break;
                }
            }

            if (isWin || this.numMove <= 0) {
                this.gameEnded = true;
            }
        }, this);
    },

    // ========= Grid Utility Methods =========

    /**
     * Convert grid position to pixel position
     */
    gridToPixel: function (row, col) {
        var x = col * CoreGame.Config.CELL_SIZE + CoreGame.Config.CELL_SIZE / 2
            + this.boardOffsetX;
        var y = row * CoreGame.Config.CELL_SIZE + CoreGame.Config.CELL_SIZE / 2
            + this.boardOffsetY;
        return cc.p(x, y);
    },

    /**
     * Convert pixel position to grid position
     */
    pixelToGrid: function (x, y) {
        var col = Math.floor((x - this.boardOffsetX) / CoreGame.Config.CELL_SIZE);
        var row = Math.floor((y - this.boardOffsetY) / CoreGame.Config.CELL_SIZE);
        return { x: row, y: col };
    },

    /**
     * Get slot at grid position
     * @returns {GridSlot|null} Slot at position, or null if out of bounds or disabled
     */
    getSlot: function (row, col) {
        if (row < 0 || row >= this.rows || col < 0 || col >= this.cols) {
            return null;
        }
        var slot = this.mapGrid[row][col];
        return (slot && slot.enable) ? slot : null;
    },

    // ========= Grid Utility Methods =========

    /**
     * Update grid slots for an element based on its position and size
     * @param {ElementObject} element - Element to update
     * @param {number} oldRow - Previous row position
     * @param {number} oldCol - Previous column position
     * @param {boolean} silent - If true, skip UI updates (for temporary position changes)
     */
    updateGridForElement: function (element, oldRow, oldCol, silent) {
        if (!element) return;

        // 1. Remove from old slots
        // We need to know *where* it was.
        // If oldRow/Col are provided, we attempt to deduce old grid cells.
        // BUT, getGridCells() relies on CURRENT position.
        // Strategy: Temporarily set position back to oldRow/OldCol to get old cells?
        // Or assume generic Rectangle if old data provided?
        // For DynamicBlocker, shape is relative to Anchor. So logic holds if we temp-move.

        if (typeof oldRow !== 'undefined' && typeof oldCol !== 'undefined') {
            var currentPos = cc.p(element.position.x, element.position.y);

            // Temporary set to old pos to calculate old cells
            element.position.x = oldRow;
            element.position.y = oldCol;
            var oldCells = element.getGridCells();

            // Restore current pos
            element.position.x = currentPos.x;
            element.position.y = currentPos.y;

            for (var i = 0; i < oldCells.length; i++) {
                var cell = oldCells[i];
                var slot = this.getSlot(cell.x, cell.y);
                if (slot) {
                    slot.removeElement(element);
                }
            }
        }

        // 2. Add to new slots (Current Position)
        var newCells = element.getGridCells();
        for (var i = 0; i < newCells.length; i++) {
            var cell = newCells[i];
            var slot = this.getSlot(cell.x, cell.y);
            if (slot) {
                slot.addElement(element, silent);  // Pass silent flag
            }
        }
    },

    /**
     * Remove element from all its occupied slots
     */
    removeElementFromBoard: function (element) {
        if (!element) return;

        // Track removed type for Turn Logic
        if (this.removedElementTypes) {
            this.removedElementTypes.push(element.type);
        }

        var cells = element.getGridCells();
        for (var i = 0; i < cells.length; i++) {
            var cell = cells[i];
            var slot = this.getSlot(cell.x, cell.y);
            if (slot) {
                slot.removeElement(element);
            }
        }
    },

    removeElementAt: function (element, row, col) {
        // Track removed type for Turn Logic
        if (this.removedElementTypes) {
            this.removedElementTypes.push(element.type);
        }
        var slot = this.getSlot(row, col);
        if (slot) {
            slot.removeElement(element);
        }
    },

    removeAllBlocker: function () {

    },

    /**
     * Get all grid slots in a specific row
     */
    getAllGirdInRow: function (row) {
        var list = [];
        for (var c = 0; c < this.cols; c++) {
            var slot = this.getSlot(row, c);
            if (slot) list.push(slot);
        }
        return list;
    },

    /**
     * Get all grid slots in a specific column
     */
    getAllGirdInCol: function (col) {
        var list = [];
        for (var r = 0; r < this.rows; r++) {
            var slot = this.getSlot(r, col);
            if (slot) list.push(slot);
        }
        return list;
    },

    /**
     * Get all grid slots in a specific area
     */
    getAllGridInArea: function (row, col, radius) {
        var list = [];
        for (var r = row - radius; r <= row + radius; r++) {
            for (var c = col - radius; c <= col + radius; c++) {
                var slot = this.getSlot(r, c);
                if (slot) list.push(slot);
            }
        }
        return list;
    },

    /**
     * Group board elements by type
     */
    getElementsByType: function (type) {
        var groups = [];
        var rows = this.rows;
        var cols = this.cols;

        for (var r = 0; r < rows; r++) {
            for (var c = 0; c < cols; c++) {
                var slot = this.getSlot(r, c);
                if (slot) {
                    for (var i = 0; i < slot.listElement.length; i++) {
                        var el = slot.listElement[i];
                        if (el.type === type) {
                            groups.push(el);
                        }
                    }
                }
            }
        }
        return groups;
    },


    /**
     * Find priority target slots for PlanePU.
     *
     * [IMPROVEMENT v2] Two additions vs original:
     *   1. excludeSlots param — slots just hit by launch explosion are excluded.
     *      Reason: matchElement() is visually async; the element stays in listElement
     *      during its death animation, so without exclusion the plane would fly to
     *      an already-dying blocker that was already destroyed by its own launch.
     *   2. Weighted scoring + sort — return list sorted by priority score so
     *      downstream weighted-random picks higher-value targets more often.
     *
     * @param {CoreGame.GridSlot[]} excludeSlots - Slots to skip (just exploded by launch)
     * @returns {CoreGame.GridSlot[]} Priority slots sorted by score desc, then fallback slots
     */
    findListPriorityTarget: function (excludeSlots) {
        excludeSlots = excludeSlots || [];

        // Collect remaining target type IDs (objectives with count > 0)
        var remainingTargetTypes = [];
        for (var i = 0; i < this.targetElements.length; i++) {
            if (this.targetElements[i].current > 0) {
                remainingTargetTypes.push(this.targetElements[i].id);
            }
        }

        var priorityTargets = [];   // [{slot, score}] — contain an objective element
        var fallbackTargets = [];   // [{slot, score}] — any matchable gem

        for (var r = 0; r < this.rows; r++) {
            for (var c = 0; c < this.cols; c++) {
                var slot = this.getSlot(r, c);
                if (!slot || slot.isEmpty()) continue;

                // [IMPROVEMENT] Skip slots just hit by the plane's launch explosion.
                // These elements are dying but not yet removed from listElement.
                if (excludeSlots.indexOf(slot) >= 0) continue;

                var isTarget = false;
                var lowestHP = Infinity; // track HP for score bonus
                var isDonutTarget = false; // Donut needs slot below targeted

                for (var e = 0; e < slot.listElement.length; e++) {
                    var element = slot.listElement[e];
                    if (remainingTargetTypes.indexOf(element.type) >= 0) {
                        isTarget = true;
                        // Track lowest HP in this slot (for "nearly dead" bonus)
                        if (element.hitPoints !== undefined && element.hitPoints < lowestHP) {
                            lowestHP = element.hitPoints;
                        }
                        // Donut is immune to explosions — target slot below so it can fall
                        if (element.type === CoreGame.Config.ElementType.DONUT) {
                            isDonutTarget = true;
                        }
                    }
                    // Also check attachments — ATTACHMENT blockers  are stored as
                    // attachments on the CONTENT gem, not directly in slot.listElement
                    if (element.attachments && element.attachments.length > 0) {
                        for (var a = 0; a < element.attachments.length; a++) {
                            var att = element.attachments[a];
                            if (remainingTargetTypes.indexOf(att.type) >= 0) {
                                isTarget = true;
                                if (att.hitPoints !== undefined && att.hitPoints < lowestHP) {
                                    lowestHP = att.hitPoints;
                                }
                            }
                        }
                    }
                }

                if (isTarget) {
                    var targetSlot = slot;
                    if (isDonutTarget) {
                        // Donut is immune to explosions — we only help by
                        // clearing what's under it so gravity can carry it
                        // toward its port. Walk down to the first slot that
                        // actually has something matchable (and isn't another
                        // donut). If nothing qualifies, don't add this donut
                        // as a priority target — otherwise the plane wastes
                        // its flight landing on the donut cell itself, which
                        // is a no-op.
                        targetSlot = null;
                        var DONUT_TYPE = CoreGame.Config.ElementType.DONUT;
                        for (var rr = r - 1; rr >= 0; rr--) {
                            var s = this.getSlot(rr, c);
                            if (!s) break;
                            if (s.isEmpty()) continue;
                            // Skip stacked donuts — hitting them is also a no-op.
                            var isAnotherDonut = false;
                            for (var e2 = 0; e2 < s.listElement.length; e2++) {
                                if (s.listElement[e2].type === DONUT_TYPE) {
                                    isAnotherDonut = true;
                                    break;
                                }
                            }
                            if (isAnotherDonut) continue;
                            targetSlot = s;
                            break;
                        }
                    }
                    if (targetSlot) {
                        var score = this._calcPlaneTargetScore(targetSlot.row, targetSlot.col, lowestHP);
                        priorityTargets.push({ slot: targetSlot, score: score });
                    }
                }

                var matchable = slot.getMatchableElement();
                if (matchable) {
                    fallbackTargets.push({ slot: slot, score: 1 });
                }
            }
        }

        // Sort priority targets by score descending (highest priority first)
        if (priorityTargets.length > 0) {
            priorityTargets.sort(function (a, b) { return b.score - a.score; });
            return priorityTargets.map(function (item) { return item.slot; });
        }

        // No objectives — fallback to any matchable gem (score=1, no sort needed)
        return fallbackTargets.map(function (item) { return item.slot; });
    },

    _calcPlaneTargetScore: function (row, col, lowestHP) {
        var score = 10; // base

        // Nearly destroyed — plane finishes it off, no wasted HP
        if (lowestHP !== Infinity && lowestHP === 1) score += 50;

        // Edge/corner: harder to clear by natural matching, high-value to hit
        var numRow = this.rows, numCol = this.cols;
        if (row <= 1 || row >= numRow - 2 || col <= 1 || col >= numCol - 2) {
            score += 20;
        }

        return score;
    },

    _weightedRandomIndex: function (scores) {
        if (!scores || scores.length === 0) return 0;
        var total = 0;
        for (var i = 0; i < scores.length; i++) total += scores[i];
        if (total <= 0) return Math.floor(Math.random() * scores.length);
        var rand = Math.random() * total;
        var cumulative = 0;
        for (var i = 0; i < scores.length; i++) {
            cumulative += scores[i];
            if (rand <= cumulative) return i;
        }
        return scores.length - 1;
    },

    // ========= Interaction Methods =========

    /**
     * Check if board can accept user input
     */
    canInteract: function () {
        return this.state !== CoreGame.BoardState.END_GAME &&
            this.state !== CoreGame.BoardState.REMAINING_MOVES_BONUS &&
            !this.gameEnded &&
            this.numMove > 0;
    },

    /**
     * Decrease remaining moves by 1 and update the UI move counter.
     */
    useMove: function () {
        this.playerMoved = true;
        this.numMove--;

        this.idleCheckEndGameTime = 0;

        if (this.gameUI) {
            this.gameUI.onUpdateMove(this.numMove);
        }
    },

    /**
     * Add extra moves (e.g. from buy-move).
     * @param {number} count - Number of moves to add
     */
    addMoves: function (count = 0) {
        this.numMove += count;
        this.gameEnded = false;
        // Also clear the sticky end-game guard. checkEndGame() short-circuits
        // when doEndGame is true, so leaving it set after a buy-move purchase
        // would silently skip the win evaluation if the player clears all
        // targets afterwards — the board would just sit idle with no
        // congrats / end-game UI.
        this.doEndGame = false;
        if (this.gameUI) {
            this.gameUI.onUpdateMove(this.numMove);
        }
        cc.log("BoardMgr addMoves", count, "total now:", this.numMove);
    },

    /**
     * Called by BoardUI when touch begins
     */
    onTouchBegan: function (pos) {
        this.idleTime = 0;
        this.stopHintTarget();

        var slot = this.getSlot(pos.x, pos.y);

        if (slot && !slot.isEmpty()) {
            this.selectedSlot = slot;

            // Show selection highlight
            // var element = slot.getFirstInteractable(CoreGame.ElementObject.Action.ACTIVE);
            // if (element && element.avatar) {
            //     element.avatar.showSelected();
            // }

        }
    },

    /**
     * Handle input direction from UI
     */
    onInputDirection: function (direction) {
        if (!this.selectedSlot) return;

        var targetRow = this.selectedSlot.row;
        var targetCol = this.selectedSlot.col;

        switch (direction) {
            case CoreGame.Direction.UP: targetRow++; break;
            case CoreGame.Direction.DOWN: targetRow--; break;
            case CoreGame.Direction.LEFT: targetCol--; break;
            case CoreGame.Direction.RIGHT: targetCol++; break;
        }

        var targetSlot = this.getSlot(targetRow, targetCol);
        if (targetSlot) {
            this.trySwapSlots(this.selectedSlot, targetSlot);
        }
        this.lastSwapSource = { row: this.selectedSlot.row, col: this.selectedSlot.col };
        this.lastSwapDest = { row: targetRow, col: targetCol };

        // Clear selection after attempt
        this.selectedSlot = null;
    },

    /**
     * Called by BoardUI to select a slot
     */
    onSelectLastGrid: function () {
        if (!this.canInteract()) return;

        if (this.selectedSlot) {
            var elementMove = this.selectedSlot.onActive();
            if (elementMove) this.didPlayerSwap = true;
            if (elementMove && elementMove instanceof CoreGame.PowerUP) {
                this.useMove();
            }
        }
    },

    /**
     * Try to swap elements in two slots
     */
    trySwapSlots: function (slot1, slot2) {
        cc.log("trySwapSlots");
        this.idleTime = 0;
        this.stopHintTarget();

        if (!this.canInteract()) return;

        this.removedElementTypes = []; // Reset for new action
        this.cascadeCount = 0;         // Reset cascade counter

        var element1 = slot1.getFirstInteractable(CoreGame.ElementObject.Action.SWAP);
        var element2 = slot2.getFirstInteractable(CoreGame.ElementObject.Action.SWAP);

        if (!element1) {
            // No swappable element in source slot
            cc.log("No swappable element in source slot");
            return;
        }

        if (!element2) {
            // element2 is null: either slot is truly empty OR has a non-swappable blocker.
            // Check if slot2 has any non-Background element → blocked, play invalid anim.
            var hasBlocker = false;
            for (var i = 0; i < slot2.listElement.length; i++) {
                if (!slot2.listElement[i].isBackground()) {
                    hasBlocker = true;
                    break;
                }
            }

            if (hasBlocker) {
                // Slot has a non-swappable element (blocker) — indicate invalid swap
                cc.log("Slot has a non-swappable element (blocker) — indicate invalid swap");
                if (element1.ui) element1.ui.playInvalidSwapAnim();
                fr.Sound.playSoundEffect(resSound.seed_swap);
                return;
            }

            // Slot is truly empty
            if (element1 instanceof CoreGame.PowerUP) {
                // PowerUp swap to empty slot — move and activate
                cc.log("PowerUp swap to empty — move and activate");
                this.state = CoreGame.BoardState.SWAPPING;
                this.swapPowerUpToEmpty(element1, slot2);
                this.useMove();
                fr.Sound.playSoundEffect(resSound.seed_swap);
            } else {
                // Regular gem — try move-to-empty (match check)
                cc.log("Slot is truly empty — try move-to-empty");
                var emptySwap = new CoreGame.MoveToEmptySwap(this);
                emptySwap.swap(element1, slot2);
                fr.Sound.playSoundEffect(resSound.seed_swap);
                this.useMove();
            }
            return;
        }
        this.state = CoreGame.BoardState.SWAPPING;

        // Determine swap type
        cc.log("Determine swap type");
        var swapLogic = this.getSwapLogic(element1, element2);
        //
        var elementMove = swapLogic.swap(element1, element2);
        if (elementMove) {
            this.useMove();
        }
        // State update handled by swapLogic timers
    },

    /**
     * Swap a PowerUp into an empty adjacent slot, then activate it.
     * @param {CoreGame.PowerUP} powerUp - The power-up element
     * @param {CoreGame.GridSlot} targetSlot - The empty destination slot
     */
    swapPowerUpToEmpty: function (powerUp, targetSlot) {
        var self = this;
        var origRow = powerUp.position.x;
        var origCol = powerUp.position.y;
        var targetRow = targetSlot.row;
        var targetCol = targetSlot.col;
        var duration = CoreGame.Config.SWAP_DURATION;

        // Move data to target slot
        powerUp.position.x = targetRow;
        powerUp.position.y = targetCol;
        this.updateGridForElement(powerUp, origRow, origCol, true);

        // Animate visual to new position
        var targetPixelPos = this.gridToPixel(targetRow, targetCol);
        powerUp.visualMoveTo(targetPixelPos, duration);

        // After move completes, activate the PowerUp
        CoreGame.TimedActionMgr.addAction(duration, function () {
            powerUp.setState(CoreGame.ElementState.IDLE);
            powerUp.active();
        });
    },

    /**
     * Get appropriate swap logic for elements
     */
    getSwapLogic: function (element1, element2) {
        var isPU1 = element1 instanceof CoreGame.PowerUP;
        var isPU2 = element2 instanceof CoreGame.PowerUP;

        if (isPU1 && isPU2) {
            return new CoreGame.MergeSwap(this);
        } else if (isPU1 || isPU2) {
            return new CoreGame.ActiveSwap(this);
        } else {
            return new CoreGame.NormalSwap(this);
        }
    },


    // ========= Match Methods =========

    /**
     * Set remaining move count (XOR-obfuscated storage)
     */
    setMove: function (move) {
        this._move = move ^ 10;
    },

    /**
     * Get remaining move count
     */
    getMove: function () {
        return (this._move || 0) ^ 10;
    },

    /**
     * Set matching required flag
     */
    setMatchingRequired: function (value) {
        this.requiredMatching = value;
    },

    /**
     * Check if matching is required
     */
    matchingRequired: function () {
        return this.requiredMatching;
    },

    /**
     * Perform matching on the board (delegated to MatchMgr)
     */
    doMatch: function () {
        this.idleCheckEndGameTime = 0;
        var hadMatches = this.matchMgr.doMatch();
        if (hadMatches) this.cascadeCount++;
    },

    // ========= Refill Methods =========

    /**
     * Set refill required flag
     */
    setRefillRequired: function (value) {
        this.requiredRefill = value;
    },

    /**
     * Set delayRefill time stamp
     */
    setDelayRefill: function (value) {
        this.delayRefill = value;
    },

    /**
     * Reset the board RNG to a new integer seed.
     * Call this before starting a level to get reproducible gem spawns.
     * @param {number} seed
     */
    setRandomSeed: function (seed) {
        this.random.seed(seed);
    },

    /**
     * Refill the board (drop and spawn new gems)
     */
    refillMap: function () {
        this.idleCheckEndGameTime = 0;
        let hasAction = this.dropMgr.refillMap();
        if (!hasAction && !this.playerMoved) {
            if (!this.gameEnded && this.hasPossibleMoves && !this.hasPossibleMoves()) {
                this.shuffleBoard();
            }
        }
    },


    /**
     * Shuffle the board when no moves available
     */
    /**
     * Check if currently has enough swappable gems to perform shuffle.
     */
    canShuffleBoard: function () {
        var gems = [];
        var slots = [];
        var typeCounts = {};

        for (var r = 0; r < this.rows; r++) {
            for (var c = 0; c < this.cols; c++) {
                var slot = this.getSlot(r, c);
                if (slot) {
                    var matchable = slot.getMatchableElement();
                    if (matchable && matchable instanceof CoreGame.GemObject && matchable.type <= CoreGame.Config.NUM_GEN) {
                        typeCounts[matchable.type] = (typeCounts[matchable.type] || 0) + 1;
                    }

                    var swappable = slot.getFirstInteractable(CoreGame.ElementObject.Action.SWAP);
                    if (swappable && swappable instanceof CoreGame.GemObject && swappable.type <= CoreGame.Config.NUM_GEN) {
                        gems.push(swappable);
                        slots.push({ r: r, c: c });
                    }
                }
            }
        }

        // Condition to have a Match requires having at least one Gem color with quantity >= 3
        var hasSufficientGems = false;
        var minMatch = CoreGame.Config.MIN_MATCH || 3;
        for (var t in typeCounts) {
            if (typeCounts[t] >= minMatch) {
                hasSufficientGems = true;
                break;
            }
        }
        if (!hasSufficientGems) {
            return false;
        }

        if (gems.length < 2) {
            return false;
        }

        var slotIndex = {};
        for (var i = 0; i < slots.length; i++) {
            slotIndex[slots[i].r + "," + slots[i].c] = true;
        }

        // Try horizontal contiguous 3 slots (guarantees _forceValidMove will succeed)
        for (var r = 0; r < this.rows; r++) {
            for (var c = 0; c < this.cols - 2; c++) {
                if (slotIndex[r + "," + c] && slotIndex[r + "," + (c + 1)] && slotIndex[r + "," + (c + 2)]) {
                    return true;
                }
            }
        }

        // Try vertical contiguous 3 slots (guarantees _forceValidMove will succeed)
        for (var c = 0; c < this.cols; c++) {
            for (var r = 0; r < this.rows - 2; r++) {
                if (slotIndex[r + "," + c] && slotIndex[(r + 1) + "," + c] && slotIndex[(r + 2) + "," + c]) {
                    return true;
                }
            }
        }

        // If we can't force a move, simulate shuffles to see if ANY valid configuration exists
        var maxAttempts = 150;
        var tempGems = gems.slice();
        for (var attempt = 0; attempt < maxAttempts; attempt++) {
            for (var i = tempGems.length - 1; i > 0; i--) {
                var j = Math.floor(Math.random() * (i + 1));
                var temp = tempGems[i];
                tempGems[i] = tempGems[j];
                tempGems[j] = temp;
            }
            if (this._shuffleHasPossibleMoves(slots, tempGems)) {
                return true;
            }
        }

        return false;
    },

    /**
     * Shuffle elements on the board when no moves are possible.
     */
    shuffleBoard: function (callback) {
        cc.log("Shuffling board - no possible moves");
        CoreGame.EventMgr.emit('boardShuffled');

        // Block interaction during shuffle
        this.state = CoreGame.BoardState.DROPPING;

        var gems = [];
        var slots = [];

        for (var r = 0; r < this.rows; r++) {
            for (var c = 0; c < this.cols; c++) {
                var slot = this.getSlot(r, c);
                if (slot) {
                    // Only shuffle gems that are swappable (not blocked by overlays like Chain)
                    var swappable = slot.getFirstInteractable(CoreGame.ElementObject.Action.SWAP);
                    if (swappable && swappable instanceof CoreGame.GemObject && swappable.type <= CoreGame.Config.NUM_GEN) {
                        gems.push(swappable);
                        slots.push({ r: r, c: c });
                    }
                }
            }
        }

        if (gems.length < 2) {
            cc.log("Shuffle: Not enough gems to shuffle");
            this.state = CoreGame.BoardState.IDLE;
            if (callback) callback();
            return;
        }

        // 1. Remove logically from current slots
        for (var i = 0; i < gems.length; i++) {
            var g = gems[i];
            var slot = this.getSlot(g.position.x, g.position.y);
            if (slot) slot.removeElement(g);
        }

        // 2. Shuffle types until at least one valid swap exists
        var maxAttempts = 50;
        let shuffleSuccess = false;
        for (var attempt = 0; attempt < maxAttempts; attempt++) {
            // Fisher-Yates shuffle on the type array
            for (var i = gems.length - 1; i > 0; i--) {
                var j = this.random.nextInt32Bound(i + 1);
                var temp = gems[i];
                gems[i] = gems[j];
                gems[j] = temp;
            }

            if (this._shuffleHasPossibleMoves(slots, gems)) {
                cc.log("Shuffle: valid board found on attempt", attempt + 1);
                shuffleSuccess = true;
                break;
            }
        }

        // Last resort: force a guaranteed match-3
        if (!shuffleSuccess) {
            cc.log("Shuffle: forcing guaranteed move");
            shuffleSuccess = this._forceValidMove(slots, gems);
        }

        // 3. Assign shuffled types to gems, re-add to grid, animate
        var duration = 0;
        if (shuffleSuccess) {
            duration = 0.25;
            for (var i = 0; i < gems.length; i++) {
                var gem = gems[i];
                var target = slots[i];

                gem.position.x = target.r;
                gem.position.y = target.c;

                var targetSlot = this.getSlot(target.r, target.c);
                if (targetSlot) {
                    targetSlot.addElement(gem);
                }

                var pixelPos = this.gridToPixel(target.r, target.c);
                gem.visualMoveTo(pixelPos, duration);
            }
        } else {
            cc.log("CRITICAL ERROR: Failed to force a valid move. Restoring gems to avoid broken state.");
            duration = 0;
            // Restore to slots to prevent empty board
            for (var i = 0; i < gems.length; i++) {
                var gem = gems[i];
                var target = slots[i];
                gem.position.x = target.r;
                gem.position.y = target.c;
                var targetSlot = this.getSlot(target.r, target.c);
                if (targetSlot) {
                    targetSlot.addElement(gem);
                }
            }
        }

        // Wait for animation, then resume normal match/turn flow
        var self = this;
        var shuffledGems = gems;
        CoreGame.TimedActionMgr.addAction(duration + 0.1, function () {
            for (var i = 0; i < shuffledGems.length; i++) {
                shuffledGems[i].setState(CoreGame.ElementState.IDLE);
            }
            self.state = CoreGame.BoardState.IDLE;
            self.setMatchingRequired(true);
            if (callback) callback();
        }, this);
    },

    // ========= Turn Management =========

    /**
     * Check if turn is finished (board is idle)
     * Call this to trigger onFinishTurn callback
     */
    /**
     * Check if all elements on board are idle
     */
    areAllElementsIdle: function () {
        for (var r = 0; r < this.rows; r++) {
            for (var c = 0; c < this.cols; c++) {
                var slot = this.mapGrid[r][c];
                if (!slot.isIdle()) {
                    return false;
                }
            }
        }
        return true;
    },

    checkPendingRainbowPUs: function () {
        if (this.pendingRainbowPUs.length > 0) {
            var hasPendingActions = CoreGame.TimedActionMgr.hasPendingActions();
            var isIdle = this.areAllElementsIdle();
            cc.log("checkPendingRainbowPUs " + isIdle + " " + hasPendingActions + " " + this.requiredRefill);
            if (isIdle && !hasPendingActions && !this.requiredRefill) {
                cc.log("Board settled. Firing pending RainbowPUs.");

                var pus = this.pendingRainbowPUs;
                this.pendingRainbowPUs = [];
                var maxDuration = 0;
                for (var i = 0; i < pus.length; i++) {
                    pus[i].firePending();
                    if (pus[i].activeDuration > maxDuration) {
                        maxDuration = pus[i].activeDuration;
                    }
                }

                CoreGame.TimedActionMgr.addAction(maxDuration, function () {
                    this.isAutoMatchBlocked = false; // unblock so matchElement can work
                    this.setMatchingRequired(true);
                }.bind(this));
            }
        }
    },

    /**
     * Check if turn is finished
     * Turn finishes when board is in active state (MATCHING/DROPPING/etc)
     * but all elements have returned to IDLE state
     */
    checkFinishTurn: function () {
        // Only check when board is in active state (not IDLE)
        if (this.state !== CoreGame.BoardState.IDLE) {
            // Check if all elements are idle AND no pending timed actions
            var hasPendingActions = CoreGame.TimedActionMgr.hasPendingActions();
            var isIdle = this.areAllElementsIdle();
            // cc.log("isIdle === ", isIdle);
            // cc.log("hasPendingActions === ", hasPendingActions);
            // cc.log("requiredMatching === ", this.requiredMatching);
            // cc.log("requiredRefill === ", this.requiredRefill);

            if (isIdle && !hasPendingActions && !this.requiredMatching && !this.requiredRefill) {
                // All animations complete, no more cascaded matches or refills pending
                this.state = CoreGame.BoardState.IDLE;
                cc.log("Run here checkFinishTurn");
                this.onFinishTurn();
                this.playerMoved = false;
            }
        }
    },

    /**
     * Called when turn finishes (all animations complete, board is idle)
     * Override this or set as callback
     */
    onFinishTurn: function () {
        // Clear plane claimed targets for next turn
        this._planeClaimCounts = [];

        // Release activation immunity on any PowerUps that were spawned
        // during an ActiveSwap this turn. Holding the flag until here
        // guarantees the swapped PU's full (async) activation chain can no
        // longer consume the freshly-spawned PU — but from the next turn
        // onward it behaves like any other PU.
        if (this.immuneActivationElements && this.immuneActivationElements.length > 0) {
            for (var k = 0; k < this.immuneActivationElements.length; k++) {
                var imm = this.immuneActivationElements[k];
                if (imm) imm._immuneToActivation = false;
            }
            this.immuneActivationElements = [];
        }


        if (this.playerMoved) {
            // Trigger END_TURN actions on all elements via global event
            CoreGame.EventMgr.emit("custom" + CoreGame.ElementObject.ACTION_TYPE.END_TURN, {
                boardMgr: this
            });

            // Track processed elements to avoid duplicates (multi-cell elements like Cloud)
            var processedElements = [];

            for (var r = 0; r < this.rows; r++) {
                for (var c = 0; c < this.cols; c++) {
                    var slot = this.mapGrid[r][c];
                    var elements = slot.listElement;

                    for (var i = 0; i < elements.length; i++) {
                        var element = elements[i];

                        // Skip if already processed (e.g., DynamicBlocker in multiple slots)
                        if (processedElements.indexOf(element) !== -1) {
                            continue;
                        }

                        // Mark as processed
                        processedElements.push(element);
                        element.onFinishTurn();

                        if (element.cooldownSpawn > 0)
                            element.cooldownSpawn--;
                    }
                }
            }

            cc.log("Turn finished - triggered END_TURN actions on", processedElements.length, "elements");

            // Emit global event for other systems that need it
            CoreGame.EventMgr.emit('turnFinished', {
                boardMgr: this
            });
        }


        // AdaptiveTPP: track moves and update strategy
        this._tppMovesUsed = (this._tppMovesUsed || 0) + 1;
        if (CoreGame.AdaptiveTPP) {
            var tppCleared = 0;
            for (var ti = 0; ti < this.targetElements.length; ti++) {
                var el = this.targetElements[ti];
                var initHp = (this._tppTargetInitHp && this._tppTargetInitHp[el.id]) || 1;
                if (initHp > 1) {
                    // HP-weighted: fully dead instances + damage dealt to alive ones
                    tppCleared += Math.max(0, el.count - el.current) * initHp;
                    var alive = this.getElementsByType(el.id);
                    for (var ai = 0; ai < alive.length; ai++) {
                        tppCleared += initHp - (alive[ai].hp || 0);
                    }
                } else {
                    tppCleared += Math.max(0, el.count - el.current);
                }
            }
            var turnInfo = {
                cascadeCount: this.cascadeCount,
                tilesRemoved: this.removedElementTypes.length,
                validMoves: this.getAllSwappableMoves().length
            };
            CoreGame.AdaptiveTPP.onTurnEnd(this._tppMovesUsed, tppCleared, turnInfo);
        }

        //resetMatch count
        this.matchMgr.countedMatch = 0;

        //Check EndGame
        var isEnd = this.checkEndGame();
        cc.log("Turn finished - checkEndGame", isEnd);

        // Check for available moves — if no possible moves, shuffle the board
        if (!isEnd && !this.hasPossibleMoves()) {
            cc.log("No possible moves found! Shuffling board...");
            this.shuffleBoard();
        }
    },

    checkEndGame: function () {
        if (this.doEndGame) return true;
        let isWin = this.targetElements.length > 0;
        for (let element of this.targetElements) {
            //cc.log("CHECK ENDGAME:", element.current, element.type);
            if (element.current > 0) {
                isWin = false;
                break;
            }
        }

        if (cc.sys.isNative) {
            if (isWin) {
                cc.log("checkEndGame GAME WIN");
                this.doEndGame = true;
                this.gameEnded = true;
                this.setEndStar();
                this.setLevel();

                if (this.gameUI) {
                    this.gameUI.showEndGameWinEffect(true);
                }
                let endGameEfxTime = 1.5;

                if (this.numMove > 0) {
                    this.state = CoreGame.BoardState.REMAINING_MOVES_BONUS;
                    setTimeout(function () {
                        this.startRemainingMovesBonus();
                    }.bind(this), endGameEfxTime * 1000);
                } else {
                    this.state = CoreGame.BoardState.END_GAME;
                    setTimeout(function () {
                        if (this.gameUI) {
                            this.gameUI.onEndGame(true);
                        }
                    }.bind(this), endGameEfxTime * 1000);
                }
                return true;
            } else {
                let checkNoMoreMoveAndCantShuffle = !this.hasPossibleMoves() && !this.canShuffleBoard() &&
                    this.areAllElementsIdle() && !CoreGame.TimedActionMgr.hasPendingActions() &&
                    !this.requiredMatching && !this.requiredRefill;

                cc.log("CHECK NO MORE MOVE AND CANT SHUFFLE", checkNoMoreMoveAndCantShuffle);

                if (this.numMove <= 0 || checkNoMoreMoveAndCantShuffle) {
                    this.gameEnded = true;
                    this.state = CoreGame.BoardState.END_GAME;
                    this.doEndGame = true;
                    try {
                        if (this.gameUI) {
                            this.gameUI.onEndGame(false, this.targetElements, checkNoMoreMoveAndCantShuffle);
                        }
                    } catch (e) {
                        cc.log("Error in onEndGame:", e);
                    }
                    return true;
                }
            }
        } else {
            if (isWin) {
                this.doEndGame = true;
                this.gameEnded = true;
                alert("Level Complete!");
                return true;
            } else {
                let checkNoMoreMoveAndCantShuffle = !this.hasPossibleMoves() && !this.canShuffleBoard() &&
                    this.areAllElementsIdle() && !CoreGame.TimedActionMgr.hasPendingActions() &&
                    !this.requiredMatching && !this.requiredRefill;

                if (this.numMove <= 0 || checkNoMoreMoveAndCantShuffle) {
                    this.doEndGame = true;
                    this.gameEnded = true;
                    alert("Game Over!");
                    return true;
                }
            }
        }
        return false;
    },

    setEndStar: function () {
        let totalMove = this.totalMove;
        let remainMove = this.numMove;
        let usedMove = totalMove - remainMove;
        cc.log("MAIN BOARD set END STAR", totalMove, remainMove, usedMove);

        this.endStar = this.scoreMgr.getStar(this.mapConfig.scoreConfig);

        if (this.mapConfig["endStarConfig"]) {

        }

        userMgr.getData().setStarByLevel(this.getLevelId(), this.endStar);
    },

    setLevel: function () {
        let playedLevel = parseInt(this.getLevelId());
        let currentLevel = userMgr.getData().getLevel();

        // Only advance level if playing the frontier (current) level
        if (playedLevel >= currentLevel) {
            userMgr.getData().setLevel(currentLevel + 1);
            this.isReplayWin = false;
        } else {
            // Replay: don't advance level
            this.isReplayWin = true;
        }
    },

    getLevelId: function () {
        return this.mapConfig["levelId"] || -1;
    },

    // ========= Remaining Moves Bonus =========

    /**
     * Start the remaining moves bonus sequence.
     * Converts remaining moves into PowerUps on random gems.
     */
    startRemainingMovesBonus: function () {
        cc.log("START REMAINING MOVES BONUS, remaining moves:", this.numMove);

        var candidates = [];
        for (var r = 0; r < this.rows; r++) {
            for (var c = 0; c < this.cols; c++) {
                var slot = this.getSlot(r, c);
                var gem = slot ? slot.getMatchableElement() : null;
                if (gem && gem instanceof CoreGame.GemObject) {
                    candidates.push({ row: r, col: c });
                }
            }
        }

        // Shuffle candidates (Fisher-Yates)
        for (var i = candidates.length - 1; i > 0; i--) {
            var j = this.random.nextInt32Bound(i + 1);
            var tmp = candidates[i];
            candidates[i] = candidates[j];
            candidates[j] = tmp;
        }

        var count = Math.min(this.numMove, candidates.length);

        // §3.5 — flat +500 per leftover move regardless of whether the spawned
        // PU finds anything to clear. "Lucky Shot!" bonus per the design's
        // edge-case row.
        if (this.scoreMgr) {
            for (var lb = 0; lb < this.numMove; lb++) {
                this.scoreMgr.addLeftoverMoveBonus();
            }
        }

        if (count === 0) {
            this.finishRemainingMovesBonus();
            return;
        }

        var targets = candidates.slice(0, count);
        this._bonusPowerUps = [];
        if (this.gameUI) {
            this.gameUI.playBonusTrailEffect(targets, this);
        }
    },

    /**
     * Transform a gem at (row, col) into a random PowerUp.
     * Directly instantiates BombPU, PlanePU, or RocketPU.
     */
    transformGemToPowerUp: function (row, col) {
        var slot = this.getSlot(row, col);
        if (!slot) return;

        var gem = slot.getMatchableElement();
        if (!gem || !(gem instanceof CoreGame.GemObject)) return;

        // Remove the old gem
        gem.remove();

        // Pick a random PowerUp class and type
        var BONUS_PU_OPTIONS = [
            { cls: CoreGame.BombPU, type: CoreGame.PowerUPType.MATCH_T },
            { cls: CoreGame.RocketPU, type: CoreGame.PowerUPType.MATCH_4_H },
            { cls: CoreGame.RocketPU, type: CoreGame.PowerUPType.MATCH_4_V }
        ];

        var pick = BONUS_PU_OPTIONS[this.random.nextInt32Bound(BONUS_PU_OPTIONS.length)];
        var powerUp = new pick.cls();
        powerUp.init(row, col, pick.type);

        // Add to board (sets boardMgr, adds to slot, creates UI)
        this.addElement(powerUp, row, col);

        this._bonusPowerUps.push(powerUp);
    },

    /**
     * Activate all bonus PowerUps with staggered timing.
     */
    activateBonusPowerUps: function () {
        if (!this._bonusPowerUps || this._bonusPowerUps.length === 0) {
            this.finishRemainingMovesBonus();
            return;
        }

        cc.log("ACTIVATING BONUS POWERUPS:", this._bonusPowerUps.length);

        var self = this;
        var stagger = 0.15;

        for (var i = 0; i < this._bonusPowerUps.length; i++) {
            (function (pu, delay) {
                CoreGame.TimedActionMgr.addAction(delay, function () {
                    if (pu.state === CoreGame.ElementState.IDLE) {
                        pu.active();
                    }
                });
            })(this._bonusPowerUps[i], i * stagger);
        }

        // Start polling for all effects to finish
        this.scheduleBonusCompletionCheck();
    },

    /**
     * Poll until all bonus PowerUp effects have finished.
     */
    scheduleBonusCompletionCheck: function () {
        var self = this;
        CoreGame.TimedActionMgr.addAction(0.5, function () {
            var allIdle = self.areAllElementsIdle();
            var hasPending = CoreGame.TimedActionMgr.hasPendingActions();

            if (allIdle && !hasPending) {
                self.finishRemainingMovesBonus();
            } else {
                cc.log("ACTIVATING BONUS POWERUPS:", CoreGame.TimedActionMgr._actions[0].time);
                self.scheduleBonusCompletionCheck();
            }
        });
    },

    /**
     * Finish the remaining moves bonus and show end game GUI.
     */
    finishRemainingMovesBonus: function () {
        cc.log("FINISH REMAINING MOVES BONUS");
        this._bonusPowerUps = null;
        this.state = CoreGame.BoardState.END_GAME;
        if (this.gameUI) {
            this.gameUI.gameBoardInfoUI.pSkip.setVisible(false);
            this.gameUI.onEndGame(true);
        }
    },

    /**
     * Skip the remaining moves bonus sequence.
     * Cancels all pending timed actions and goes straight to end game.
     */
    skipRemainingMovesBonus: function () {
        if (!this.gameEnded) {
            cc.log("SKIP REMAINING MOVES BONUS CANT", this.state);
            return;
        }
        cc.log("SKIP REMAINING MOVES BONUS");

        CoreGame.TimedActionMgr.clear();

        if (this._bonusPowerUps) {
            for (var i = 0; i < this._bonusPowerUps.length; i++) {
                var pu = this._bonusPowerUps[i];
                if (pu && pu.state === CoreGame.ElementState.IDLE) {
                    pu.remove();
                }
            }
        }

        this.finishRemainingMovesBonus();
    },

    isStateDropAble: function () {
        return this.state !== CoreGame.BoardState.REMAINING_MOVES_BONUS
            && this.state !== CoreGame.BoardState.MERGE_PU;
    },

    // ========= Update Loop =========

    /**
     * Main update loop (from UML: loopUpdate)
     */
    update: function (dt) {
        // Update timed actions
        CoreGame.TimedActionMgr.update(dt);

        // Only process board logic when elements are idle (prevents race conditions)
        // var allIdle = this.areAllElementsIdle();
        // var allIdle = this.areAllElementsIdle();
        var hasPendingActions = CoreGame.TimedActionMgr.hasPendingActions();

        let allIdle = true;
        // if (this.isStateDropAble()) {
        if (this.requiredRefill) {
            if (this.delayRefill <= 0) {
                //cc.log("CALL REFILL MAP - From Update");
                this.refillMap();
            }
        } else if (this.requiredMatching && !this.isAutoMatchBlocked) {
            this.requiredMatching = false;
            this.doMatch();
        }
        // }

        if (this.delayRefill > 0) {
            this.delayRefill -= dt;
        }

        // cc.log("Board state ==============" + this.state);

        this.checkPendingRainbowPUs();

        // Check if turn is finished (all element animations complete)
        if (this.playerMoved)
            this.checkFinishTurn();

        // Handle Idle Hint logic — re-cycles a fresh hint every `hintThreshold` seconds while idle.
        if (this.canInteract() && allIdle && !this.requiredRefill && !this.requiredMatching && !hasPendingActions) {
            this.idleTime += dt;
            if (this.idleTime >= this.hintThreshold) {
                this.idleTime = 0;            // Reset so next window triggers again
                this.showHintTarget();        // Internally stops the prior hint before picking a new one
            }
        } else {
            this.idleTime = 0;
            this._lastHintKey = null;         // Player interacted — clear repeat-avoidance memory
            this.stopHintTarget();
        }

        // check EndGame khi khong co su kien remove element qua lau
        this.idleCheckEndGameTime += dt;
        // cc.log("Idle Check End Game Time: " + this.idleCheckEndGameTime);
        if (this.idleCheckEndGameTime >= 3) {
            this.idleCheckEndGameTime = 0;
            if (this.doEndGame == false) {
                var saveState = this.state;
                var isEnd = this.checkEndGame();
                if (isEnd) {
                    var hasPendingActions = CoreGame.TimedActionMgr.hasPendingActions();
                    var isIdle = this.areAllElementsIdle();
                    var dt = CoreGame.TimedActionMgr.getMinTime();
                    var elementState = "";
                    if (!isIdle) {
                        for (var r = 0; r < this.rows; r++) {
                            for (var c = 0; c < this.cols; c++) {
                                var slot = this.mapGrid[r][c];
                                if (!slot.isIdle()) {
                                    elementState = slot.getSlotState();
                                    break;
                                }
                            }
                        }
                    }

                    logMgr.sendToTelegram({
                        boardState: saveState,
                        isIdle: isIdle,
                        hasPendingActions: hasPendingActions,
                        requiredMatching: this.requiredMatching,
                        requiredRefill: this.requiredRefill,
                        minTime: dt,
                        length: CoreGame.TimedActionMgr._actions.length,
                        elementState: elementState
                    });
                }
            }
        }
    },

    /**
     * Find grid at position (from UML)
     */
    findGrid: function (pos) {
        return this.pixelToGrid(pos.x, pos.y);
    },

    getBoardState: function () {
        var boardData = [];
        for (var r = 0; r < this.rows; r++) {
            boardData[r] = [];
            for (var c = 0; c < this.cols; c++) {
                var gridItem = [0, 0, 0, 0]; // [BACKGROUND, CONTENT, OVERLAY, EXCLUSIVE]
                var slot = this.mapGrid[r][c];
                if (slot && slot.enable) {
                    var elements = slot.listElement;
                    for (var i = 0; i < elements.length; i++) {
                        var el = elements[i];

                        // IMPORTANT: Only record the element at its anchor position
                        // to avoid duplicate creation of multi-slot elements in setBoardState
                        if (el.position.x !== r || el.position.y !== c) continue;

                        var behavior = el.layerBehavior;
                        if (behavior === CoreGame.LayerBehavior.BACKGROUND) {
                            gridItem[0] = el.type;
                        } else if (behavior === CoreGame.LayerBehavior.CONTENT) {
                            gridItem[1] = el.type;
                            // Check for OVERLAY in attachments
                            if (el.attachments) {
                                for (var j = 0; j < el.attachments.length; j++) {
                                    if (el.attachments[j].layerBehavior === CoreGame.LayerBehavior.OVERLAY) {
                                        gridItem[2] = el.attachments[j].type;
                                    }
                                }
                            }
                        } else if (behavior === CoreGame.LayerBehavior.OVERLAY) {
                            gridItem[2] = el.type;
                        } else if (behavior === CoreGame.LayerBehavior.EXCLUSIVE) {
                            gridItem[3] = el.type;
                        }
                    }
                }
                boardData[r][c] = gridItem;
            }
        }
        return boardData;
    },

    setBoardState: function (boardData, seed) {
        if (!boardData) return;
        // 1. Clear current elements from all slots
        for (var r = 0; r < this.rows; r++) {
            for (var c = 0; c < this.cols; c++) {
                var slot = this.mapGrid[r][c];
                //cc.log("Row " + r + " Col " + c);
                if (slot) slot.clearElements();
            }
        }
        this.boardUI.root.removeAllChildren();

        // 2. Set new state based on boardData
        for (var r = 0; r < boardData.length; r++) {
            if (r >= this.rows) break;
            for (var c = 0; c < boardData[r].length; c++) {
                if (c >= this.cols) break;

                var gridItem = boardData[r][c];
                // Iterate from 3 down to 0: EXCLUSIVE -> OVERLAY -> CONTENT -> BACKGROUND
                for (var i = 3; i >= 0; i--) {
                    var type = gridItem[i];
                    if (type > 0) {
                        this.addNewElement(r, c, type);
                    }
                }
            }
        }
    },

    /**
     * Simulate a swap without permanently changing board state.
     * Saves state, executes the swap with fast-forward, captures metrics, then restores state.
     * Used by GreedyBot to evaluate moves.
     * @param {Object} pos - {x: row, y: col}
     * @param {number} dir - CoreGame.Direction value
     * @returns {Object} { removedTypes, tilesRemoved, comboCount }
     */
    simulateSwap: function (pos, dir) {
        var savedState = this.getBoardState();

        this.quickSwap(pos, dir, true);

        var result = {
            removedTypes: this.removedElementTypes.slice(),
            tilesRemoved: this.removedElementTypes.length,
            comboCount: Math.max(0, this.cascadeCount - 1)
        };

        this.setBoardState(savedState);
        return result;
    },

    quickSwap: function (pos, dir, fastForward = false) {
        var slot = this.getSlot(pos.x, pos.y);
        if (slot) {
            this.selectedSlot = slot;
            this.onInputDirection(dir);
            if (fastForward) {
                while (CoreGame.TimedActionMgr.hasPendingActions()) {
                    var dt = CoreGame.TimedActionMgr.getMinTime();
                    // Ensure we always move forward at least a tiny bit if dt is 0
                    // to avoid potential infinite loops with 0-delay actions adding more 0-delay actions
                    this.update(Math.max(dt, 0.016));
                    this.update(Math.max(dt, 0.016));
                }
            }
        }
        return this.removedElementTypes;
    },

    /**
     * List all swappable moves that result in a match or power-up activation
     * @returns {Array} Array of {position: {x, y}, moveDirect}
     */
    getAllSwappableMoves: function () {
        var results = [];
        var directions = [
            { dir: CoreGame.Direction.UP, dr: 1, dc: 0 },
            { dir: CoreGame.Direction.DOWN, dr: -1, dc: 0 },
            { dir: CoreGame.Direction.LEFT, dr: 0, dc: -1 },
            { dir: CoreGame.Direction.RIGHT, dr: 0, dc: 1 }
        ];

        for (var r = 0; r < this.rows; r++) {
            for (var c = 0; c < this.cols; c++) {
                var slot = this.getSlot(r, c);
                if (!slot) continue;

                for (var i = 0; i < directions.length; i++) {
                    var d = directions[i];
                    var tr = r + d.dr;
                    var tc = c + d.dc;
                    var targetSlot = this.getSlot(tr, tc);

                    if (targetSlot && this._isSwapValid(slot, targetSlot)) {
                        results.push({
                            position: { x: r, y: c },
                            moveDirect: d.dir
                        });
                    }
                }
            }
        }
        return results;
    },

    /**
     * Quickly check if ANY swappable moves are available.
     * @returns {boolean} True if at least one valid move exists
     */
    hasPossibleMoves: function () {
        var directions = [
            { dr: 1, dc: 0 },
            { dr: -1, dc: 0 },
            { dr: 0, dc: -1 },
            { dr: 0, dc: 1 }
        ];

        for (var r = 0; r < this.rows; r++) {
            for (var c = 0; c < this.cols; c++) {
                var slot = this.getSlot(r, c);
                if (!slot) continue;

                for (var i = 0; i < directions.length; i++) {
                    var d = directions[i];
                    var tr = r + d.dr;
                    var tc = c + d.dc;
                    var targetSlot = this.getSlot(tr, tc);

                    if (targetSlot && this._isSwapValid(slot, targetSlot)) {
                        return true;
                    }
                }
            }
        }
        return false;
    },

    showHintTarget: function () {
        // Always stop the previous hint first so each cycle picks a fresh move.
        this.stopHintTarget();

        var moves = this.getAllSwappableMoves();
        if (moves.length === 0) return;

        // Direction delta helper
        var dirDelta = function (direct) {
            switch (direct) {
                case CoreGame.Direction.UP: return { dr: 1, dc: 0 };
                case CoreGame.Direction.DOWN: return { dr: -1, dc: 0 };
                case CoreGame.Direction.LEFT: return { dr: 0, dc: -1 };
                case CoreGame.Direction.RIGHT: return { dr: 0, dc: 1 };
            }
            return { dr: 0, dc: 0 };
        };

        // Classify moves: prefer those that create a PowerUp (line-4+/L/T/square).
        var puMoves = [];
        for (var i = 0; i < moves.length; i++) {
            var m = moves[i];
            var d = dirDelta(m.moveDirect);
            if (CoreGame.PatternFinder._wouldCreatePU &&
                CoreGame.PatternFinder._wouldCreatePU(
                    this.mapGrid,
                    m.position.x, m.position.y,
                    m.position.x + d.dr, m.position.y + d.dc)) {
                puMoves.push(m);
            }
        }
        var candidates = puMoves.length > 0 ? puMoves : moves;

        // Avoid immediately repeating the previous hint when another option exists.
        var self = this;
        if (candidates.length > 1 && this._lastHintKey) {
            var filtered = candidates.filter(function (m) {
                return (m.position.x + ',' + m.position.y + ',' + m.moveDirect) !== self._lastHintKey;
            });
            if (filtered.length > 0) candidates = filtered;
        }

        // Random pick within the chosen bucket.
        var pick = candidates[Math.floor(Math.random() * candidates.length)];
        this._lastHintKey = pick.position.x + ',' + pick.position.y + ',' + pick.moveDirect;

        var dd = dirDelta(pick.moveDirect);
        var slot1 = this.getSlot(pick.position.x, pick.position.y);
        var slot2 = this.getSlot(pick.position.x + dd.dr, pick.position.y + dd.dc);
        if (!slot1 || !slot2) return;

        var elA = slot1.getFirstInteractable(CoreGame.ElementObject.Action.SWAP);
        var elB = slot2.getFirstInteractable(CoreGame.ElementObject.Action.SWAP);
        if (!elA || !elA.ui || !elB || !elB.ui) return;

        // Decide which gem actually joins the match after the swap. The
        // hinted gem must be the one that lands where the pattern forms,
        // otherwise the nudge would point at a gem that does not match.
        //
        // After swap: elA lands at (slot2), elB lands at (slot1).
        //   - Pattern at slot2 is formed by elA's type -> elA is the matcher.
        //   - Pattern at slot1 is formed by elB's type -> elB is the matcher.
        // If both sides form a pattern, prefer elA (keeps stable behaviour).
        var r1 = pick.position.x, c1 = pick.position.y;
        var r2 = pick.position.x + dd.dr, c2 = pick.position.y + dd.dc;
        var pf = CoreGame.PatternFinder;

        var patternAtA = (pf.getPatternPositionsAfterSwapAt)
            ? pf.getPatternPositionsAfterSwapAt(this.mapGrid, r1, c1, r2, c2, r2, c2)
            : [];
        var patternAtB = (pf.getPatternPositionsAfterSwapAt)
            ? pf.getPatternPositionsAfterSwapAt(this.mapGrid, r1, c1, r2, c2, r1, c1)
            : [];

        var mover, partner, patternPositions;
        if (patternAtA.length > 0) {
            mover = elA; partner = elB; patternPositions = patternAtA;
        } else if (patternAtB.length > 0) {
            mover = elB; partner = elA; patternPositions = patternAtB;
        } else {
            // No pattern through either endpoint (shouldn't happen for a valid
            // swappable move, but be safe): fall back to elA with no glow.
            mover = elA; partner = elB; patternPositions = [];
        }

        // Nudge the chosen mover toward its partner slot.
        var partnerPos = cc.p(partner.ui.x, partner.ui.y);
        mover.ui.playHintAnim(partnerPos);
        this.hintElements.push(mover);
        this.isHinting = true;

        // Glow every gem matching the mover's type in the resulting pattern,
        // including the mover itself at its destination.
        this.hintGlowElements = this.hintGlowElements || [];
        for (var p = 0; p < patternPositions.length; p++) {
            var pp = patternPositions[p];
            var slotP = this.getSlot(pp.row, pp.col);
            if (!slotP) continue;
            var gem;
            // The mover's destination slot is the partner's current slot; the
            // mover still physically lives in its own slot pre-swap, so pick it
            // up from there when the pattern cell is its destination.
            var partnerR = partner.position ? partner.position.x : -1;
            var partnerC = partner.position ? partner.position.y : -1;
            if (pp.row === partnerR && pp.col === partnerC) {
                gem = mover;
            } else {
                gem = slotP.getFirstInteractable(CoreGame.ElementObject.Action.SWAP);
            }
            if (gem && gem.type === mover.type && gem.ui && gem.ui.playHintGlowAnim) {
                gem.ui.playHintGlowAnim();
                this.hintGlowElements.push(gem);
            }
        }
    },

    stopHintTarget: function () {
        if (!this.isHinting) return;
        this.isHinting = false;

        for (var i = 0; i < this.hintElements.length; i++) {
            var el = this.hintElements[i];
            if (el && el.ui) {
                el.ui.stopHintAnim();
                el.ui.stopHintGlowAnim();
            }
        }
        this.hintElements = [];

        if (this.hintGlowElements) {
            for (var j = 0; j < this.hintGlowElements.length; j++) {
                var ge = this.hintGlowElements[j];
                if (ge && ge.ui && ge.ui.stopHintGlowAnim) {
                    ge.ui.stopHintGlowAnim();
                }
            }
            this.hintGlowElements = [];
        }
    },

    autoPlay: function () {
        var moves = this.getAllSwappableMoves();
        if (moves.length > 0) {
            var randomIndex = Math.floor(Math.random() * moves.length);
            var move = moves[randomIndex];
            cc.log("AutoPlay: swapping", move.position.x, move.position.y, "dir", move.moveDirect);
            this.quickSwap(move.position, move.moveDirect, true);
            return true;
        }
        cc.log("AutoPlay: No moves available");
        return false;
    },

    /**
     * Check if swapping two slots is a valid move
     * @private
     */
    /**
     * Check if a shuffled type assignment produces at least one valid swap.
     * Simulates the board with new types without modifying actual grid.
     * @param {Array} slots - Array of {r, c} for shuffleable positions
     * @param {Array} gems - To get shuffled type array (same length as slots)
     * @returns {boolean}
     */
    _shuffleHasPossibleMoves: function (slots, gems) {
        let types = [];
        for (let gem of gems) {
            types.push(gem.type);
        }

        // Build lookup: "r,c" -> shuffled type
        var typeMap = {};
        for (var i = 0; i < slots.length; i++) {
            typeMap[slots[i].r + "," + slots[i].c] = types[i];
        }

        var self = this;
        var getType = function (r, c) {
            var key = r + "," + c;
            if (key in typeMap) return typeMap[key];
            var slot = self.getSlot(r, c);
            return slot ? slot.getType() : -1;
        };

        // 1. KIỂM TRA KHÔNG ĐƯỢC CÓ MATCH CÓ SẴN (No pre-existing matches)
        for (var r = 0; r < this.rows; r++) {
            for (var c = 0; c < this.cols; c++) {
                var t = getType(r, c);
                if (t >= 0 && this._shuffleCheckMatch(getType, r, c, t)) {
                    // Nếu phát hiện có Match sẵn mà không cần swap -> Loại bỏ bản shuffle này
                    return false;
                }
            }
        }

        // 2. KIỂM TRA CÓ NƯỚC ĐI (POSSIBLE MOVES) BẰNG CÁCH GIẢ LẬP SWAP
        var directions = [{ dr: 1, dc: 0 }, { dr: 0, dc: 1 }];

        for (var r = 0; r < this.rows; r++) {
            for (var c = 0; c < this.cols; c++) {
                var t1 = getType(r, c);
                if (t1 < 0) continue;

                for (var d = 0; d < directions.length; d++) {
                    var tr = r + directions[d].dr;
                    var tc = c + directions[d].dc;
                    if (tr >= this.rows || tc >= this.cols) continue;

                    var t2 = getType(tr, tc);
                    if (t2 < 0 || t1 === t2) continue;

                    // Simulate swap and check both positions
                    var swapGetType = (function (or, oc, otr, otc, ot1, ot2, baseGet) {
                        return function (sr, sc) {
                            if (sr === or && sc === oc) return ot2;
                            if (sr === otr && sc === otc) return ot1;
                            return baseGet(sr, sc);
                        };
                    })(r, c, tr, tc, t1, t2, getType);

                    if (this._shuffleCheckMatch(swapGetType, r, c, t2) ||
                        this._shuffleCheckMatch(swapGetType, tr, tc, t1)) {
                        return true;
                    }
                }
            }
        }
        return false;
    },

    /**
     * Check if position has match-3 using a custom type getter function.
     */
    _shuffleCheckMatch: function (getType, row, col, type) {
        // Horizontal
        var hCount = 1;
        for (var c = col - 1; c >= 0 && getType(row, c) === type; c--) hCount++;
        for (var c = col + 1; c < this.cols && getType(row, c) === type; c++) hCount++;
        if (hCount >= CoreGame.Config.MIN_MATCH) return true;

        // Vertical
        var vCount = 1;
        for (var r = row - 1; r >= 0 && getType(r, col) === type; r--) vCount++;
        for (var r = row + 1; r < this.rows && getType(r, col) === type; r++) vCount++;
        if (vCount >= CoreGame.Config.MIN_MATCH) return true;

        return false;
    },

    /**
     * Force a guaranteed match by placing 3 same-type gems in a line.
     * Only called as last resort if random shuffles all fail.
     * @param {Array} slots - Array of {r, c}
     * @param {Array} gems - Array of GemObject to rearrange in-place
     * @returns {boolean} True if successfully forced a move
     */
    _forceValidMove: function (slots, gems) {
        var slotIndex = {};
        for (var i = 0; i < slots.length; i++) {
            slotIndex[slots[i].r + "," + slots[i].c] = i;
        }

        var typeCounts = {};
        for (var i = 0; i < gems.length; i++) {
            var t = gems[i].type;
            typeCounts[t] = (typeCounts[t] || 0) + 1;
        }
        var targetType = -1;
        for (var t in typeCounts) {
            if (typeCounts[t] >= 3) {
                targetType = parseInt(t);
                break;
            }
        }
        if (targetType === -1) return false;

        var applyForceMatch = function (idx0, idx1, idx2) {
            var pool = gems.slice();
            var targetGems = [];
            // Extract 3 gems of targetType
            for (var i = pool.length - 1; i >= 0; i--) {
                if (pool[i].type === targetType) {
                    targetGems.push(pool.splice(i, 1)[0]);
                    if (targetGems.length === 3) break;
                }
            }
            // Reassign to gems array
            for (var i = 0; i < gems.length; i++) {
                if (i === idx0) {
                    gems[i] = targetGems[0];
                } else if (i === idx1) {
                    gems[i] = targetGems[1];
                } else if (i === idx2) {
                    gems[i] = targetGems[2];
                } else {
                    gems[i] = pool.pop();
                }
            }
            return true;
        };

        // Try horizontal: find 3 consecutive shuffleable slots in a row
        for (var r = 0; r < this.rows; r++) {
            for (var c = 0; c < this.cols - 2; c++) {
                var k0 = r + "," + c;
                var k1 = r + "," + (c + 1);
                var k2 = r + "," + (c + 2);
                if ((k0 in slotIndex) && (k1 in slotIndex) && (k2 in slotIndex)) {
                    if (applyForceMatch(slotIndex[k0], slotIndex[k1], slotIndex[k2])) {
                        cc.log("Forced match-3 at row", r, "cols", c, c + 1, c + 2, "type", targetType);
                        return true;
                    }
                }
            }
        }

        // Try vertical: find 3 consecutive shuffleable slots in a column
        for (var c = 0; c < this.cols; c++) {
            for (var r = 0; r < this.rows - 2; r++) {
                var k0 = r + "," + c;
                var k1 = (r + 1) + "," + c;
                var k2 = (r + 2) + "," + c;
                if ((k0 in slotIndex) && (k1 in slotIndex) && (k2 in slotIndex)) {
                    if (applyForceMatch(slotIndex[k0], slotIndex[k1], slotIndex[k2])) {
                        cc.log("Forced match-3 at col", c, "rows", r, r + 1, r + 2, "type", targetType);
                        return true;
                    }
                }
            }
        }
        return false;
    },

    _isSwapValid: function (slot1, slot2) {
        var element1 = slot1.getFirstInteractable(CoreGame.ElementObject.Action.SWAP);
        var element2 = slot2.getFirstInteractable(CoreGame.ElementObject.Action.SWAP);

        if (!element1 || !element2) return false;

        // Delegate validation to the appropriate swap logic
        var swapLogic = this.getSwapLogic(element1, element2);
        return swapLogic.checkValid(element1, element2);
    }
});
