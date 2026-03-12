/**
 * BoardEditUI - Simplified BoardUI for map editor
 * Extends BoardUI but disables swap operations for EditMapScene
 * Part of Match-3 Core Game Tools
 */
var CoreGame = CoreGame || {};

CoreGame.BoardEditUI = CoreGame.BoardUI.extend({
    /**
     * Constructor
     * @param {Object} mapConfig - Map configuration from EditMapScene
     */
    ctor: function (editMapUI) {
        // Call parent constructor with mapConfig
        // Pass null for testBoxes since we don't need test data
        this._super(null, null, true);
        this.editMapUI = editMapUI;
        cc.log("BoardEditUI initialized with mapConfig");
        return true;
    },

    /**
     * Override touch began - disable swap interactions
     */
    onTouchBegan: function (pos) {
        // Don't allow any touch interaction for swapping
        // Return false to reject touch events
        // Find the grid slot at touch position
        var localPos = this.convertToNodeSpace(pos);
        var gridPos = this.boardMgr.pixelToGrid(localPos.x, localPos.y);
        // Check gridPos is valid  (gridPos.x = row, gridPos.y = col)
        cc.log("on Touch Began ", gridPos.x, gridPos.y, this.boardMgr.rows, this.boardMgr.cols);
        if (gridPos.x < 0 || gridPos.x >= this.boardMgr.rows || gridPos.y < 0 || gridPos.y >= this.boardMgr.cols) {
            return false;
        }
        this.editMapUI.onCellClick(gridPos.x, gridPos.y);
        return true;
    },

    /**
     * Override touch moved - no-op for editor
     */
    onTouchMoved: function (pos) {
        var localPos = this.convertToNodeSpace(pos);
        var gridPos = this.boardMgr.pixelToGrid(localPos.x, localPos.y);
        if (gridPos.x < 0 || gridPos.x >= this.boardMgr.rows || gridPos.y < 0 || gridPos.y >= this.boardMgr.cols) {
            return;
        }
        this.editMapUI.onCellClick(gridPos.x, gridPos.y, true);
    },

    /**
     * Override touch ended - no-op for editor
     */
    onTouchEnd: function (pos) {
        // No touch end handling needed in editor
    },

    /**
     * Override to prevent swipe detection
     */
    getSwipeDirection: function (dx, dy) {
        // Return null to prevent any swipe handling
        return null;
    },

    /**
     * Disable board manager interaction checks
     * Always return false since we don't want gameplay interactions
     */
    canInteract: function () {
        return false;
    },

    /**
     * Update loop - keep parent update for visual updates only
     * This maintains element animations and visual states
     */
    update: function (dt) {
        // Call parent update to maintain visual state
        // if (this.boardMgr) {
        //     // Only update visual aspects, no gameplay logic
        //     // BoardMgr.update handles element animations
        //     this.boardMgr.update(dt);
        // }

        // if (this.efkManager) {
        //     this.efkManager.update();
        // }
    },

    /**
     * Load map configuration into the board
     * Clears current board and initializes with new config
     * @param {Object} mapConfig - Map configuration with slotMap and elements
     */
    loadMapConfig: function (mapConfig) {
        if (!this.boardMgr || !mapConfig) {
            cc.log("Error: BoardMgr or mapConfig is invalid");
            return;
        }

        cc.log("Loading map configuration into BoardEditUI");

        // Clear all elements first
        this.removeAllElements();

        // Load slot map (0=disabled, 1=enabled, 2=enabled+canSpawn)
        if (mapConfig.slotMap) {
            for (var r = 0; r < this.boardMgr.rows; r++) {
                for (var c = 0; c < this.boardMgr.cols; c++) {
                    var val = mapConfig.slotMap[r] ? (mapConfig.slotMap[r][c] || 0) : 0;
                    var enabled = val >= 1;
                    var spawnPoint = val === 2;
                    this.enableSlot(r, c, enabled);
                    var rawSlot = this.boardMgr.mapGrid[r][c];
                    if (rawSlot) {
                        rawSlot.canSpawn = spawnPoint;
                        if (rawSlot.bg) rawSlot.bg.setColor(spawnPoint ? cc.color(100, 220, 255) : cc.color(255, 255, 255));
                    }
                }
            }
        }

        // Load elements
        if (mapConfig.elements) {
            for (var i = 0; i < mapConfig.elements.length; i++) {
                var elem = mapConfig.elements[i];
                // Pass cells for DynamicBlocker
                this.addElement(elem.row, elem.col, elem.type, elem.hp || 1, elem.cells || null);
            }
        }

        this.renderBoardBorder();

        cc.log("Map configuration loaded successfully");
    },

    /**
     * Refresh board display based on mapConfig
     * Useful for real-time preview when editing
     */
    refreshFromMapConfig: function (mapConfig) {
        if (!this.boardMgr || !mapConfig) return;

        cc.log("Refreshing BoardEditUI from updated mapConfig");

        // Clear current board state
        this.boardMgr.clearBoard();

        // Reinitialize from new config
        this.boardMgr.initFromMapConfig(mapConfig);

        // Refresh borders for connected elements
        this.refreshBorders();
    },

    /**
     * Get current board state as mapConfig format
     * Useful for syncing back to EditMapScene
     */
    getMapConfig: function () {
        if (!this.boardMgr) return null;

        var config = {
            slotMap: [],
            elements: []
        };

        // Get slot map (0=disabled, 1=enabled, 2=enabled+canSpawn)
        for (var r = 0; r < this.boardMgr.rows; r++) {
            config.slotMap[r] = [];
            for (var c = 0; c < this.boardMgr.cols; c++) {
                var slot = this.boardMgr.mapGrid[r][c];
                if (!slot || !slot.enable) {
                    config.slotMap[r][c] = 0;
                } else {
                    config.slotMap[r][c] = slot.canSpawn ? 2 : 1;
                }
            }
        }

        // Get elements - track processed elements to avoid duplicates for multi-cell elements
        var processedElements = [];  // Track element instances already added

        for (var r = 0; r < this.boardMgr.rows; r++) {
            for (var c = 0; c < this.boardMgr.cols; c++) {
                var slot = this.boardMgr.mapGrid[r][c];
                if (!slot) continue;

                for (var i = 0; i < slot.listElement.length; i++) {
                    var elem = slot.listElement[i];

                    // Skip if already processed (multi-cell elements appear in multiple slots)
                    if (processedElements.indexOf(elem) !== -1) {
                        continue;
                    }

                    // Mark as processed
                    processedElements.push(elem);

                    // Add element data (use element's position, not current slot position)
                    var elemData = {
                        row: elem.position.x,
                        col: elem.position.y,
                        type: elem.type,
                        hp: elem.hitPoints || 1
                    };
                    // Serialize cells for DynamicBlocker
                    if (elem instanceof CoreGame.DynamicBlocker && elem.cells) {
                        elemData.cells = elem.cells;
                    }
                    config.elements.push(elemData);

                    // Add attachments as separate elements
                    if (elem.attachments && elem.attachments.length > 0) {
                        for (var j = 0; j < elem.attachments.length; j++) {
                            var attachment = elem.attachments[j];

                            // Skip if attachment already processed
                            if (processedElements.indexOf(attachment) !== -1) {
                                continue;
                            }

                            processedElements.push(attachment);

                            config.elements.push({
                                row: attachment.position.x,
                                col: attachment.position.y,
                                type: attachment.type,
                                hp: attachment.hitPoints || 1
                            });
                        }
                    }
                }
            }
        }

        return config;
    },

    removeAt: function (row, col) {
        var slot = this.boardMgr.getSlot(row, col);
        if (!slot) return;

        // Get all elements in slot
        var elements = slot.listElement;
        if (!elements || elements.length === 0) {
            slot.setEnable(false);
            return;
        }

        // Priority order: EXCLUSIVE > OVERLAY > CONTENT > BACKGROUND
        var priorityOrder = [
            CoreGame.LayerBehavior.EXCLUSIVE,  // 4 - Box, Cookie, Cloud
            CoreGame.LayerBehavior.OVERLAY,    // 3 - Chain, Soap
            CoreGame.LayerBehavior.CONTENT,    // 2 - Gems
            CoreGame.LayerBehavior.BACKGROUND  // 1 - Grass
        ];

        // Find element with highest priority
        var elementToRemove = null;
        for (var i = 0; i < priorityOrder.length; i++) {
            var priority = priorityOrder[i];
            for (var j = 0; j < elements.length; j++) {
                var elem = elements[j];
                if (elem.layerBehavior === priority) {
                    elementToRemove = elem;
                    break;
                }
            }
            if (elementToRemove) break;
        }

        // Remove the element
        if (elementToRemove) {
            // Check if element has attachments
            if (elementToRemove.attachments && elementToRemove.attachments.length > 0) {
                // Remove the first attachment instead of the element itself
                var attachmentToRemove = elementToRemove.attachments[0];
                attachmentToRemove.remove();
                cc.log("Removed attachment with type:", attachmentToRemove.type, "from element at", row, col);
            } else {
                // No attachments, remove the element itself
                elementToRemove.remove();
                cc.log("Removed element with LayerBehavior:", elementToRemove.layerBehavior, "at", row, col);
            }
        }
    },

    removeAllElements: function () {
        cc.log("Remove All Border");
        for (let border of this.listBorder) {
            border.removeFromParent(true);
        }
        this.listBorder = [];

        cc.log("Remove All Elemtn");
        for (var r = 0; r < this.boardMgr.rows; r++) {
            for (var c = 0; c < this.boardMgr.cols; c++) {
                // remove all elements at (r, c)
                var slot = this.boardMgr.mapGrid[r][c];
                if (!slot) continue;

                var elements = slot.listElement;
                // if (!elements || elements.length === 0) continue;

                for (var i = 0; i < elements.length; i++) {
                    elements[i].remove();
                }
                slot.setEnable(false);
            }
        }
    },

    enableSlot: function (row, col, enable) {
        var slot = this.boardMgr.mapGrid[row][col];
        slot.setEnable(enable);
    },

    /**
     * Add element to board at given position
     * @param {number} row
     * @param {number} col
     * @param {number} type
     * @param {number} hp
     * @param {Array} [cells] - Optional cells for DynamicBlocker
     * @returns {ElementObject|null} Created element instance
     */
    addElement: function (row, col, type, hp, cells) {
        var slot = this.boardMgr.mapGrid[row][col];
        if (!slot.enable) {
            slot.setEnable(true);
        }

        if (type != null) {
            var element = this.boardMgr.addNewElement(row, col, type, hp, cells);

            // Enable all slots occupied by this element using getGridCells()
            if (element && element.getGridCells) {
                var gridCells = element.getGridCells();
                for (var i = 0; i < gridCells.length; i++) {
                    var cell = gridCells[i];
                    var r = cell.x; // x represents row
                    var c = cell.y; // y represents col

                    if (r >= 0 && r < this.boardMgr.rows && c >= 0 && c < this.boardMgr.cols) {
                        var occupiedSlot = this.boardMgr.mapGrid[r][c];
                        if (!occupiedSlot.enable) {
                            occupiedSlot.setEnable(true);
                        }
                    }
                }
            }
            return element;
        }
        return null;
    },

    onExit: function () {
        cc.Layer.prototype.onExit.call(this);
    }
});
