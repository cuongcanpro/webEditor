/**
 * BoardEditUI - Simplified BoardUI for map editor
 * Extends BoardUI but disables swap operations for EditMapScene
 * Part of Match-3 Core Game Tools
 */
var CoreGame = CoreGame || {};

CoreGame.BoardEditUI = CoreGame.BoardUI.extend({
    _gridDrawNode: null,
    _heatmapContainer: null,
    _heatmapLabels: null,

    /**
     * Constructor
     * @param {Object} mapConfig - Map configuration from EditMapScene
     */
    ctor: function (editMapUI) {
        // Call parent constructor with mapConfig
        // Pass null for testBoxes since we don't need test data
        this._super(null, null, true);
        this.editMapUI = editMapUI;
        this._heatmapContainer = null;
        this._heatmapLabels = null;
        cc.log("BoardEditUI initialized with mapConfig");
        this.drawGrid();
        this.initializeHeatmap();
        return true;
    },

    onEnter: function () {
        this._super();
        
    },

    /**
     * Draw a grid overlay showing all slot positions (enabled & disabled).
     * Enabled slots  → dim blue-white fill + solid border
     * Disabled slots → no fill + dashed-looking dim border
     */
    drawGrid: function () {
        if (this._gridDrawNode) {
            this._gridDrawNode.removeFromParent(true);
        }

        var draw = new cc.DrawNode();
        var cs   = CoreGame.Config.CELL_SIZE;
        var half = cs / 2 - 1;
        var rows = this.boardMgr.rows;
        var cols = this.boardMgr.cols;

        var borderEnabled  = cc.color(180, 200, 255, 160);
        var borderDisabled = cc.color(120, 120, 160, 60);
        var fillDisabled   = cc.color(60,  60,  90,  25);

        for (var r = 0; r < rows; r++) {
            for (var c = 0; c < cols; c++) {
                var pos  = this.boardMgr.gridToPixel(r, c);
                var slot = this.boardMgr.mapGrid[r][c];
                var enabled = slot && slot.enable;

                if (enabled) {
                    // Only draw the border for enabled slots (bg sprite already fills them)
                    draw.drawRect(
                        cc.p(pos.x - half, pos.y - half),
                        cc.p(pos.x + half, pos.y + half),
                        null,
                        1, borderEnabled
                    );
                } else {
                    // Dim fill + dim border for disabled slots so they're visible
                    draw.drawRect(
                        cc.p(pos.x - half, pos.y - half),
                        cc.p(pos.x + half, pos.y + half),
                        fillDisabled,
                        1, borderDisabled
                    );
                }
            }
        }

        this.addChild(draw, 1);
        this._gridDrawNode = draw;
    },

    /**
     * Initialize heatmap container and labels grid (called once in ctor)
     * Creates label nodes for each cell but hides them initially
     */
    initializeHeatmap: function () {
        if (this._heatmapContainer) {
            this._heatmapContainer.removeFromParent(true);
        }

        this._heatmapContainer = new cc.Node();
        this._heatmapContainer.setPosition(0, 0);

        var rows = this.boardMgr.rows;
        var cols = this.boardMgr.cols;

        var cs = CoreGame.Config.CELL_SIZE;
        var bgSize = cs * 0.9;

        // Create 2D array to store labels for quick access
        this._heatmapLabels = [];
        this._heatmapBgs = [];
        for (var r = 0; r < rows; r++) {
            this._heatmapLabels[r] = [];
            this._heatmapBgs[r] = [];
            for (var c = 0; c < cols; c++) {
                var pos = this.boardMgr.gridToPixel(r, c);

                // Background node (LayerColor is more reliable than DrawNode fill in HTML5)
                var bg = new cc.LayerColor(cc.color(0, 0, 0, 160), bgSize, bgSize);
                bg.setAnchorPoint(cc.p(0.5, 0.5));
                bg.setPosition(pos.x - bgSize / 2, pos.y - bgSize / 2);
                bg.setVisible(false);
                this._heatmapContainer.addChild(bg, 0);
                this._heatmapBgs[r][c] = bg;

                // Create label
                var label = null;
                try {
                    label = new cc.LabelTTF("0", "font/BalooPaaji2-Regular.ttf", 28);
                } catch (e) {
                    cc.log("Failed to create LabelTTF for heatmap:", e);
                    continue;
                }

                if (label) {
                    label.setPosition(pos.x, pos.y);
                    label.setColor(cc.color(255, 220, 50));  // Orange-yellow color
                    label.setOpacity(255);
                    label.setVisible(false);  // Hide by default
                    this._heatmapContainer.addChild(label, 1);
                }

                this._heatmapLabels[r][c] = label;
            }
        }

        this.addChild(this._heatmapContainer, 2);
        cc.log("Heatmap initialized: " + rows + "x" + cols + " labels");
    },

    /**
     * Update heatmap with current HP values
     * Modifies existing label text instead of recreating them
     */
    updateHeatmap: function () {
        if (!this._heatmapContainer || !this._heatmapLabels) {
            cc.log("Heatmap not initialized");
            return;
        }

        var rows = this.boardMgr.rows;
        var cols = this.boardMgr.cols;
        var hpMap = {};  // Map to track which elements we've already calculated

        // First pass: identify all elements and their occupied cells
        for (var r = 0; r < rows; r++) {
            for (var c = 0; c < cols; c++) {
                var slot = this.boardMgr.mapGrid[r][c];
                if (!slot || !slot.enable || !slot.listElement) continue;

                // Process each element in the slot
                for (var i = 0; i < slot.listElement.length; i++) {
                    var elem = slot.listElement[i];
                    if (!elem) continue;

                    var elemId = elem.uid || ("elem_" + r + "_" + c + "_" + i);

                    // Skip if already processed
                    if (hpMap[elemId]) continue;

                    // Get element HP and grid cells
                    var hp = elem.hitPoints || elem.hp || 1;
                    var gridCells = [];
                    if (elem.getGridCells) {
                        gridCells = elem.getGridCells();
                    } else {
                        gridCells = [{x: r, y: c}];
                    }
                    var cellCount = gridCells.length || 1;

                    // Store HP information with cell count
                    hpMap[elemId] = {
                        hp: hp,
                        cellCount: cellCount,
                        gridCells: gridCells
                    };
                }
            }
        }

        // Clear all labels and bgs first
        for (var r = 0; r < rows; r++) {
            if (!this._heatmapLabels[r]) continue;
            for (var c = 0; c < cols; c++) {
                var label = this._heatmapLabels[r][c];
                if (label) label.setVisible(false);
                var bg = this._heatmapBgs && this._heatmapBgs[r] && this._heatmapBgs[r][c];
                if (bg) bg.setVisible(false);
            }
        }

        // Second pass: update labels with HP values
        var labelCount = 0;
        for (var elemId in hpMap) {
            var hpInfo = hpMap[elemId];
            var hpPerCell = hpInfo.cellCount > 0 ? Math.ceil(hpInfo.hp / hpInfo.cellCount) : 1;

            for (var j = 0; j < hpInfo.gridCells.length; j++) {
                var cell = hpInfo.gridCells[j];
                var cellR = cell.x;
                var cellC = cell.y;

                // Validate cell position
                if (cellR < 0 || cellR >= rows || cellC < 0 || cellC >= cols) continue;
                if (!this._heatmapLabels[cellR] || !this._heatmapLabels[cellR][cellC]) continue;

                // Update existing label
                var label = this._heatmapLabels[cellR][cellC];
                if (label) {
                    try {
                        if (label.setString) {
                            label.setString(String(hpPerCell));
                        } else if (label.setText) {
                            label.setText(String(hpPerCell));
                        }
                        label.setVisible(true);
                        var bg = this._heatmapBgs && this._heatmapBgs[cellR] && this._heatmapBgs[cellR][cellC];
                        if (bg) {
                            var bgColor = this._hpToColor(hpPerCell);
                            bg.setColor(cc.color(bgColor.r, bgColor.g, bgColor.b));
                            bg.setOpacity(bgColor.a);
                            bg.setVisible(true);
                        }
                        labelCount++;
                    } catch (e) {
                        cc.log("Failed to update label at " + cellR + "," + cellC + ":", e);
                    }
                }
            }
        }

        cc.log("Heatmap updated: " + labelCount + " labels visible");
    },

    /**
     * Return a LayerColor-compatible color based on HP value (Max HP = 4)
     * 1 → green, 2 → yellow, 3 → orange, 4 → red
     */
    _hpToColor: function (hp) {
        var MAX_HP = 4;
        var clamped = Math.max(1, Math.min(hp, MAX_HP));
        var palette = [
            cc.color(50,  200,  50, 200),   // HP 1 - green
            cc.color(200, 200,  50, 200),   // HP 2 - yellow
            cc.color(220, 120,  30, 200),   // HP 3 - orange
            cc.color(220,  50,  50, 200)    // HP 4 - red
        ];
        return palette[clamped - 1];
    },

    /**
     * Refresh heatmap display (call after element changes)
     */
    refreshHeatmap: function () {
        this.updateHeatmap();
    },

    /**
     * Draw a heatmap showing HP values of elements occupying each slot.
     * For multi-cell elements, divides HP equally among occupied cells.
     */
    drawHeatmap: function () {
        // This method is kept for backward compatibility
        // Use initializeHeatmap() and updateHeatmap() instead
        this.initializeHeatmap();
        this.updateHeatmap();
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
        this.refreshGrid();
        this.refreshHeatmap();

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
            // this.refreshHeatmap();
        }
    },

    removeAllElements: function () {
        cc.log("Remove All Border");
        // for (let border of this.listBorder) {
        //     border.removeFromParent(true);
        // }
        // this.listBorder = [];

        // Clear Grass/Cloud connected borders (GridBorderMgr)
        // if (this.gridBorderMgr) {
        //     this.gridBorderMgr.clearAll();
        // }

        cc.log("Remove All Elements");
        for (var r = 0; r < this.boardMgr.rows; r++) {
            for (var c = 0; c < this.boardMgr.cols; c++) {
                var slot = this.boardMgr.mapGrid[r][c];
                if (!slot) continue;

                var elements = slot.listElement.slice(); // copy to avoid mutation during iteration
                for (var i = 0; i < elements.length; i++) {
                    elements[i].remove();
                }
                slot.setEnable(false);
            }
        }

        // this.refreshHeatmap();
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
            // this.refreshHeatmap();
            return element;
        }
        return null;
    },

    onExit: function () {
        cc.Layer.prototype.onExit.call(this);
    }
});
