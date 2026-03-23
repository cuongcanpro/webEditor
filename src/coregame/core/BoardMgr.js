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
    END_GAME: 5
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
        this.initGrid(mapConfig, testBoxes);
        this.initEventListeners();
        return this;
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
        if (mapConfig && mapConfig.slotMap) {
            slotMap = mapConfig.slotMap;
            cc.log("MapConfig " + JSON.stringify(mapConfig));

            this.targetElements = mapConfig.targetElements || [];
            for (let element of this.targetElements) {
                element.current = element.count;
            }
            cc.log("BoardMgr targetElements", JSON.stringify(this.targetElements));
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
                for (var i = 0; i < mapConfig.elements.length; i++) {
                    var elem = mapConfig.elements[i];
                    // Type 7 = Gem Random: resolve to a color that won't create a match
                    var spawnType = (elem.type === 7)
                        ? this.getValidTypeForPosition(elem.row, elem.col)
                        : elem.type;
                    this.addNewElement(elem.row, elem.col, spawnType, elem.hp, elem.cells || null);
                }
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
            var t1 = this.mapGrid[row][col - 1].getType();
            var t2 = this.mapGrid[row][col - 2].getType();
            if (t1 >= 0 && t1 === t2) {
                var idx = pool.indexOf(t1);
                if (idx !== -1) pool.splice(idx, 1);
            }
        }

        // Check vertical (up 2)
        if (row >= 2) {
            var t1 = this.mapGrid[row - 1][col].getType();
            var t2 = this.mapGrid[row - 2][col].getType();
            if (t1 >= 0 && t1 === t2) {
                var idx = pool.indexOf(t1);
                if (idx !== -1) pool.splice(idx, 1);
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
            + CoreGame.Config.BOARD_OFFSET_X;
        var y = row * CoreGame.Config.CELL_SIZE + CoreGame.Config.CELL_SIZE / 2
            + CoreGame.Config.BOARD_OFFSET_Y;
        return cc.p(x, y);
    },

    /**
     * Convert pixel position to grid position
     */
    pixelToGrid: function (x, y) {
        var col = Math.floor((x - CoreGame.Config.BOARD_OFFSET_X) / CoreGame.Config.CELL_SIZE);
        var row = Math.floor((y - CoreGame.Config.BOARD_OFFSET_Y) / CoreGame.Config.CELL_SIZE);
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
     * Find list of priority targets for power-ups (like planes)
     * Currently returns all non-empty slots with matchable elements
     */
    findListPriorityTarget: function () {
        var targets = [];
        for (var r = 0; r < this.rows; r++) {
            for (var c = 0; c < this.cols; c++) {
                var slot = this.getSlot(r, c);
                if (slot && !slot.isEmpty()) {
                    var element = slot.getMatchableElement();
                    if (element) {
                        targets.push(slot);
                    }
                }
            }
        }
        return targets;
    },

    // ========= Interaction Methods =========

    /**
     * Check if board can accept user input
     */
    canInteract: function () {
        return this.state !== CoreGame.BoardState.END_GAME;
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
        if (this.selectedSlot) {
            this.playerMoved = this.selectedSlot.onActive();
            if (this.playerMoved) this.didPlayerSwap = true;
        }
    },

    /**
     * Try to swap elements in two slots
     */
    trySwapSlots: function (slot1, slot2) {
        this.idleTime = 0;
        this.stopHintTarget();

        if (!this.canInteract()) return;

        this.removedElementTypes = []; // Reset for new action
        this.cascadeCount = 0;         // Reset cascade counter

        var element1 = slot1.getFirstInteractable(CoreGame.ElementObject.Action.SWAP);
        var element2 = slot2.getFirstInteractable(CoreGame.ElementObject.Action.SWAP);

        if (!element1) {
            // No swappable element in source slot
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
                if (element1.ui) element1.ui.playInvalidSwapAnim();
                return;
            }
            // Slot is truly empty — try move-to-empty
            var emptySwap = new CoreGame.MoveToEmptySwap(this);
            this.playerMoved = emptySwap.swap(element1, slot2);
            if (this.playerMoved) this.didPlayerSwap = true;
            return;
        }
        this.state = CoreGame.BoardState.SWAPPING;

        // Determine swap type
        var swapLogic = this.getSwapLogic(element1, element2);
        //
        this.playerMoved = swapLogic.swap(element1, element2);
        if (this.playerMoved) this.didPlayerSwap = true;

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
            if (callback) callback();
            return;
        }

        // 1. Remove logically from current slots
        for (var i = 0; i < gems.length; i++) {
            var g = gems[i];
            var slot = this.getSlot(g.position.x, g.position.y);
            if (slot) slot.removeElement(g);
        }

        // 2. Shuffle gems order (Fisher-Yates with seeded RNG)
        for (var i = gems.length - 1; i > 0; i--) {
            var j = this.random.nextInt32Bound(i + 1);
            var temp = gems[i];
            gems[i] = gems[j];
            gems[j] = temp;
        }

        // 3. Re-add to logic grid at new slots and start visual move
        var duration = 0.5;
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

        // Wait for animation and then check for matches
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

        //Check EndGame
        let isWin = this.targetElements.length > 0;
        for (let element of this.targetElements) {
            cc.log("CHECK ENDGAME:", element.current, element.type);
            if (element.current > 0) {
                isWin = false;
                break;
            }
        }
        if (isWin) {
            this.state = CoreGame.BoardState.END_GAME;
            if (cc.sys.isNative) {
                if (this.gameUI) {
                    this.gameUI.onEndGame();
                }
            }
            else {
                alert("Level Complete!");
            }
        } else {
            // Check for available moves — if no possible moves, shuffle the board
            if (!this.hasPossibleMoves()) {
                cc.log("No possible moves found! Shuffling board...");
                this.shuffleBoard();
            }
        }
    },

    // ========= Update Loop =========

    /**
     * Main update loop (from UML: loopUpdate)
     */
    update: function (dt) {
        // Update timed actions
        CoreGame.TimedActionMgr.update(dt);

        // Only process board logic when elements are idle (prevents race conditions)
        var allIdle = this.areAllElementsIdle();
        var hasPendingActions = CoreGame.TimedActionMgr.hasPendingActions();

        if (allIdle) {
            if (this.requiredRefill) {
                this.refillMap();
            } else if (this.requiredMatching) {
                this.requiredMatching = false;
                this.doMatch();
            }
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
    _isSwapValid: function (slot1, slot2) {
        var element1 = slot1.getFirstInteractable(CoreGame.ElementObject.Action.SWAP);
        var element2 = slot2.getFirstInteractable(CoreGame.ElementObject.Action.SWAP);

        if (!element1 || !element2) return false;

        // Delegate validation to the appropriate swap logic
        var swapLogic = this.getSwapLogic(element1, element2);
        return swapLogic.checkValid(element1, element2);
    }
});
