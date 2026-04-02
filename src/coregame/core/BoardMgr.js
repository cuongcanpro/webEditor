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
    didPlayerSwap: false,   // true only on real player swaps (not shuffle)

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
        this.splitDropConfig = {
            enabled: false,
            splitCol: 4   // col 0-3: roi xu?ng | col 4-7: n?i l�n
        };
        this.idleTime = 0;
        this.isHinting = false;
        this.hintThreshold = 5.0; // Show hint after 5 seconds of idle
        this.hintElements = []; // Store elements currently showing hint
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
        return this;
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
        for (var r = 0; r < this.rows; r++) {
            this.mapGrid[r] = [];
            for (var c = 0; c < this.cols; c++) {
                // slotMap values: 0=disabled, 1=enabled, 2=enabled+canSpawn
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
     * Initialize board from map configuration (for map editor)
     * @param {Object} mapConfig - {slotMap: [[]], elements: []}
     */
    initFromMapConfig: function (mapConfig) {
        if (!mapConfig) {
            cc.log("Warning: initFromMapConfig called with null mapConfig");
            return;
        }
        //   cc.log("MapConfig " + JSON.stringify(mapConfig.slotMap));
        // Initialize grid with slotMap
        if (mapConfig.slotMap) {
            this.initGrid(null, mapConfig.slotMap);
        } else {
            this.initGrid(null, null);
        }

        // Add elements from map config
        if (mapConfig.elements && mapConfig.elements.length > 0) {
            cc.log("Adding " + mapConfig.elements.length + " elements from map config");
            for (var i = 0; i < mapConfig.elements.length; i++) {
                var elem = mapConfig.elements[i];
                cc.log("Element == " + JSON.stringify(elem));
                // Pass cells array for DynamicBlocker support
                this.addNewElement(elem.row, elem.col, elem.type, elem.hp, elem.cells || null);
            }
        }
    },

    /**
     * Add some blockers for logic verification
     */
    /**
     * Add some blockers for logic verification
     */
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
        for (let targetElement of this.targetElements) {
            if (targetElement.id === element.type) {
                targetElement.current--;
            }
        }

        if (this.gameUI) {
            this.gameUI.onUpdateTargetElement(element);
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

        CoreGame.EventMgr.on('blockerDestroyed', function (blocker) {
            // Handle blocker destruction
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
     * Find priority target slots for PlaneUP.
     * Prioritizes slots containing level target elements that still need to be cleared.
     * Falls back to all matchable slots if no target elements remain.
     */
    findListPriorityTarget: function () {
        // Collect remaining target type IDs
        var remainingTargetTypes = [];
        for (var i = 0; i < this.targetElements.length; i++) {
            if (this.targetElements[i].current > 0) {
                remainingTargetTypes.push(this.targetElements[i].id);
            }
        }

        var priorityTargets = [];
        var fallbackTargets = [];
        for (var r = 0; r < this.rows; r++) {
            for (var c = 0; c < this.cols; c++) {
                var slot = this.getSlot(r, c);
                if (!slot || slot.isEmpty()) continue;

                // Check all elements in the slot for target types
                for (var e = 0; e < slot.listElement.length; e++) {
                    var element = slot.listElement[e];
                    if (remainingTargetTypes.indexOf(element.type) >= 0) {
                        priorityTargets.push(slot);
                        break;
                    }
                }

                var matchable = slot.getMatchableElement();
                if (matchable) {
                    fallbackTargets.push(slot);
                }
            }
        }

        return priorityTargets.length > 0 ? priorityTargets : fallbackTargets;
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
        this.numMove--;
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
            this.playerMoved = this.selectedSlot.onActive();
            if (this.playerMoved) this.didPlayerSwap = true;
            if (this.playerMoved && this.playerMoved instanceof CoreGame.PowerUP) {
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
                return;
            }
            // Slot is truly empty — try move-to-empty
            cc.log("Slot is truly empty — try move-to-empty");
            var emptySwap = new CoreGame.MoveToEmptySwap(this);
            this.playerMoved = emptySwap.swap(element1, slot2);
            if (this.playerMoved) this.didPlayerSwap = true;
            return;
        }
        this.state = CoreGame.BoardState.SWAPPING;

        // Determine swap type
        cc.log("Determine swap type");
        var swapLogic = this.getSwapLogic(element1, element2);
        //
        this.playerMoved = swapLogic.swap(element1, element2);
        if (this.playerMoved) {
            this.didPlayerSwap = true;
            this.useMove();
        }
        // State update handled by swapLogic timers
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
        this.cascadeCount++; // Each doMatch call = one match round
        this.matchMgr.doMatch();
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
        this.dropMgr.refillMap();
    },


    /**
     * Shuffle the board when no moves available
     */
    /**
     * Shuffle elements on the board when no moves are possible.
     */
    shuffleBoard: function (callback) {
        cc.log("Shuffling board - no possible moves");

        // Block interaction during shuffle
        this.state = CoreGame.BoardState.DROPPING;
        this.playerMoved = true;

        var gems = [];
        var slots = [];

        for (var r = 0; r < this.rows; r++) {
            for (var c = 0; c < this.cols; c++) {
                var slot = this.getSlot(r, c);
                if (slot) {
                    var gem = slot.getMatchableElement();
                    // Only shuffle standard gems (1..NUM_GEN)
                    if (gem && gem.type <= CoreGame.Config.NUM_GEN) {
                        gems.push(gem);
                        slots.push({ r: r, c: c });
                    }
                }
            }
        }

        if (gems.length < 2) {
            cc.log("Shuffle: Not enough gems to shuffle");
            this.state = CoreGame.BoardState.IDLE;
            this.playerMoved = false;
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
        let types = [];
        for (let gem of gems) {
            types.push(gem.type);
        }
        if (!shuffleSuccess) {
            cc.log("Shuffle: forcing guaranteed move");
            this._forceValidMove(slots, types);
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
            for (var i = 0; i < gems.length; i++) {
                var gem = gems[i];
                // var target = slots[i];
                // gem.position.x = target.r;
                // gem.position.y = target.c;
                // var targetSlot = this.getSlot(target.r, target.c);
                // if (targetSlot) targetSlot.addElement(gem);
                // gem.type = types[i];
                if (gem.ui) gem.ui.updateType(types[i]);
            }
        }

        // Wait for animation, then resume normal match/turn flow
        var self = this;
        var shuffledGems = gems;
        CoreGame.TimedActionMgr.addAction(duration + 0.1, function () {
            for (var i = 0; i < shuffledGems.length; i++) {
                shuffledGems[i].setState(CoreGame.ElementState.IDLE);
            }
            self.playerMoved = true;
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

            if (isIdle && !hasPendingActions && !this.requiredMatching && !this.requiredRefill) {
                // All animations complete, no more cascaded matches or refills pending
                this.state = CoreGame.BoardState.IDLE;
                this.playerMoved = false;
                this.onFinishTurn();
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

        // Trigger END_TURN actions on all elements
        // This handles behaviors like Cloud spreading, etc.
        // Decrement move count only for real player swaps (not shuffle)
        if (this.didPlayerSwap) {
            this.didPlayerSwap = false;
            var newMove = this.getMove() - 1;
            this.setMove(newMove);
            if (this.gameUI && this.gameUI.onMoveUpdate) {
                this.gameUI.onMoveUpdate(newMove);
            }
        }

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

                    if (element.cooldownSpawn > 0)
                        element.cooldownSpawn--;
                }
            }
        }

        // Emit global event for other systems that need it
        CoreGame.EventMgr.emit('turnFinished', {
            boardMgr: this
        });

        cc.log("Turn finished - triggered END_TURN actions on", processedElements.length, "elements");

        // AdaptiveTPP: track moves and update strategy
        this._tppMovesUsed = (this._tppMovesUsed || 0) + 1;
        if (CoreGame.AdaptiveTPP) {
            var tppCleared = 0;
            for (var ti = 0; ti < this.targetElements.length; ti++) {
                var el     = this.targetElements[ti];
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
            CoreGame.AdaptiveTPP.onTurnEnd(this._tppMovesUsed, tppCleared);
        }

        //Check EndGame
        let isWin = this.targetElements.length > 0;
        for (let element of this.targetElements) {
            cc.log("CHECK ENDGAME:", element.current, element.type);
            if (element.current > 0) {
                isWin = false;
                break;
            }
        }

        if (cc.sys.isNative) {

            if (isWin) {
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
            } else {
                if (this.numMove <= 0) {
                    this.gameEnded = true;
                    this.state = CoreGame.BoardState.END_GAME;
                    if (this.gameUI) {
                        this.gameUI.onEndGame(false, this.targetElements);
                    }
                }
            }
        } else {
             if (isWin) {
                alert("Level Complete!");
            } else {
                if (this.numMove <= 0) {
                    alert("Game Over!");
                }
            }
        }

        // Check for available moves — if no possible moves, shuffle the board
        if (!this.hasPossibleMoves()) {
            cc.log("No possible moves found! Shuffling board...");
            this.shuffleBoard();
        }
    },

    setEndStar: function () {
        let totalMove = this.totalMove;
        let remainMove = this.numMove;
        let usedMove = totalMove - remainMove;
        cc.log("MAIN BOARD set END STAR", totalMove, remainMove, usedMove);

        this.endStar = 1;

        if (this.mapConfig["endStarConfig"]) {

        } else {
            if (usedMove < 25) this.endStar = 2;
            if (usedMove < 20) this.endStar = 3;
        }

        userInfo.setStarByLevel(this.getLevelId(), this.endStar);
    },

    setLevel: function () {
        let playedLevel = parseInt(this.getLevelId());
        let currentLevel = userInfo.getLevel();

        // Only advance level if playing the frontier (current) level
        if (playedLevel >= currentLevel) {
            userInfo.setLevel(currentLevel + 1);
            userInfo.isReplayWin = false;
        } else {
            // Replay: don't advance level
            userInfo.isReplayWin = true;
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
     * Directly instantiates BombPU, PlaneUP, or RocketPU.
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
            this.gameUI.onEndGame(true);
        }
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
                    cc.log("CALL REFILL MAP - From Update");
                    this.refillMap();
                }
            } else if (this.requiredMatching) {
                this.requiredMatching = false;
                this.doMatch();
            }
        // }

        if (this.delayRefill > 0) {
            this.delayRefill -= dt;
        }

        // Check if turn is finished (all element animations complete)
        if (this.playerMoved)
            this.checkFinishTurn();

        // Handle Idle Hint logic
        if (this.canInteract() && allIdle && !this.requiredRefill && !this.requiredMatching && !hasPendingActions) {
            this.idleTime += dt;
            if (this.idleTime >= this.hintThreshold && !this.isHinting) {
                this.showHintTarget();
            }
        } else {
            this.idleTime = 0;
            this.stopHintTarget();
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
        if (this.isHinting) return;

        var moves = this.getAllSwappableMoves();
        if (moves.length > 0) {
            this.isHinting = true;
            // Just hint the first available move
            var move = moves[0];
            var slot1 = this.getSlot(move.position.x, move.position.y);
            var d = { dr: 0, dc: 0 };
            switch (move.moveDirect) {
                case CoreGame.Direction.UP: d.dr = 1; break;
                case CoreGame.Direction.DOWN: d.dr = -1; break;
                case CoreGame.Direction.LEFT: d.dc = -1; break;
                case CoreGame.Direction.RIGHT: d.dc = 1; break;
            }
            var slot2 = this.getSlot(move.position.x + d.dr, move.position.y + d.dc);

            if (slot1 && slot2) {
                var el1 = slot1.getFirstInteractable(CoreGame.ElementObject.Action.SWAP);
                var el2 = slot2.getFirstInteractable(CoreGame.ElementObject.Action.SWAP);

                if (el1 && el1.ui) {
                    el1.ui.playHintAnim();
                    this.hintElements.push(el1);
                }
                if (el2 && el2.ui) {
                    el2.ui.playHintAnim();
                    this.hintElements.push(el2);
                }
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
            }
        }
        this.hintElements = [];
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
     * @param {Array} gems - Type array to modify in-place
     */
    _forceValidMove: function (slots, types) {
        var slotIndex = {};
        for (var i = 0; i < slots.length; i++) {
            slotIndex[slots[i].r + "," + slots[i].c] = i;
        }

        // Try horizontal: find 3 consecutive shuffleable slots in a row
        for (var r = 0; r < this.rows; r++) {
            for (var c = 0; c < this.cols - 2; c++) {
                var k0 = r + "," + c;
                var k1 = r + "," + (c + 1);
                var k2 = r + "," + (c + 2);
                if ((k0 in slotIndex) && (k1 in slotIndex) && (k2 in slotIndex)) {
                    var forceType = types[slotIndex[k0]];
                    types[slotIndex[k0]] = forceType;
                    types[slotIndex[k1]] = forceType;
                    types[slotIndex[k2]] = forceType;
                    cc.log("Forced match-3 at row", r, "cols", c, c + 1, c + 2, "type", forceType);
                    return;
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
                    var forceType = types[slotIndex[k0]];
                    types[slotIndex[k0]] = forceType;
                    types[slotIndex[k1]] = forceType;
                    types[slotIndex[k2]] = forceType;
                    cc.log("Forced match-3 at col", c, "rows", r, r + 1, r + 2, "type", forceType);
                    return;
                }
            }
        }
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
