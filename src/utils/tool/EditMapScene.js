/**
 * EditMapScene - Map editor tool for designing game levels
 * Simplified version with unified ElementSelectorUI
 */
var EditMapScene = cc.Layer.extend({
    rootNode: null,
    gridCells: [],          // Visual representation of grid cells

    // Editor state
    currentLayer: 'ELEMENT', // 'SLOT' or 'ELEMENT' - current editing layer
    selectedType: null,      // null = no element selected, number = gem/blocker type
    selectedHP: 1,
    deleteMode: false,       // true = delete mode active
    spawnMode: false,        // true = clicking a slot toggles canSpawn
    activeDynamicBlocker: null, // DynamicBlocker instance currently being "painted"

    // UI Components
    elementSelector: null,   // ElementSelectorUI instance
    elementConfigUI: null,   // SetElementConfigUI instance
    currentElementPreview: null, // Visual preview of selected element type
    levelSelector: null,     // LevelSelectorUI instance
    boardInfoUI: null,       // BoardInfoUI instance

    ctor: function () {
        this._super();

        // Load UI (User will create this JSON file)
        this.initUI();
    },

    initUI: function () {
        var loaded = ccs.load("tool/EditMapUI.json");
        if (loaded && loaded.node) {
            this.rootNode = loaded.node;
            this.addChild(this.rootNode);

            // Compute BOARD_OFFSET_X/Y from pTop/pBottom panel positions
            // Must run before boardUI creation so slots are placed correctly
            this.computeLayout();

            //this.setupGridUI();
            this.setupElementSelector();
            this.setupMapControls();
            this.setupLevelSelector();
            this.setupBoardInfoUI();
            this.boardUI = new CoreGame.BoardEditUI(this);
            this.addChild(this.boardUI, 1);

            // Apply the layout offsets to the boardUI instead of modifying Config
            if (this._boardTargetX !== undefined && this._boardTargetY !== undefined) {
                var dx = this._boardTargetX - (CoreGame.Config.BOARD_OFFSET_X || 0);
                var dy = this._boardTargetY - (CoreGame.Config.BOARD_OFFSET_Y || 0);
                this.boardUI.setPosition(dx, dy);
                if (this.boardInfoUI) {
                    this.boardInfoUI.setPosition(dx, dy);
                }
            }

            ccui.helper.doLayout(this);
            // Create container for current element preview
            this.setupCurrentElementPreview();
        } else {
            cc.log("ERROR: EditMapScene.json not found. Please create this UI file in Cocos Studio.");
            cc.log("Required UI components: pBoard, MapControls");

            // Create fallback simple UI
            this.createFallbackUI();
        }
    },

    /**
     * Compute board offset and element-selector area from pTop/pBottom positions.
     * Must be called after rootNode is added but before BoardEditUI is created.
     * Stores results in:
     *   CoreGame.Config.BOARD_OFFSET_X / BOARD_OFFSET_Y
     *   this._selectorArea  { centerY, height }  (in rootNode local coords)
     */
    computeLayout: function () {
        var winW = cc.winSize.width;
        var rows = CoreGame.Config.BOARD_ROWS || 10;
        var cols = CoreGame.Config.BOARD_COLS || 9;
        var cellSize = CoreGame.Config.CELL_SIZE || 57;
        var boardW = cols * cellSize;
        var boardH = rows * cellSize;
        var pad = 30;

        var pTop = this.rootNode.getChildByName("pTop");
        var pBottom = this.rootNode.getChildByName("pBottom");

        if (!pTop || !pBottom) {
            // Fallback: original centering
            CoreGame.Config.BOARD_OFFSET_X = (winW - boardW) / 2;
            CoreGame.Config.BOARD_OFFSET_Y = (cc.winSize.height - boardH) / 2;
            this._selectorArea = { centerY: 60, height: 120 };
            return;
        }

        // Panel positions are in rootNode local space.
        // rootNode may have a non-zero position in scene; use convertToWorldSpace to be safe.
        var pTopPos = pTop.getPosition();
        var pTopSize = pTop.getContentSize();
        var pTopAnchorY = pTop.getAnchorPoint().y;
        // Bottom edge of pTop in rootNode local coords
        var pTopBottomLocal = pTopPos.y - pTopSize.height * pTopAnchorY - pad;

        var pBotPos = pBottom.getPosition();
        var pBotSize = pBottom.getContentSize();
        var pBotAnchorY = pBottom.getAnchorPoint().y;
        // Top edge of pBottom in rootNode local coords
        var pBotTopLocal = pBotPos.y + pBotSize.height * (1 - pBotAnchorY);

        // Board: top = pTopBottom, horizontally centered
        this._boardTargetY = pTopBottomLocal - boardH;
        this._boardTargetX = (winW - boardW) / 2;

        // ElementSelector area: gap between board bottom and pBottom top
        var boardBottomLocal = this._boardTargetY - pad; // = pTopBottomLocal - boardH
        var gapH = boardBottomLocal - pBotTopLocal;
        var gapCenterY = pBotTopLocal + gapH / 2;

        cc.log("[Layout] pTopBottom=" + pTopBottomLocal + " pBotTop=" + pBotTopLocal +
            " _boardTargetY=" + this._boardTargetY + " gapH=" + gapH);

        this._selectorArea = { centerY: gapCenterY, height: Math.max(gapH, 60) };
    },

    /**
     * Setup grid UI cells (8x8 clickable buttons)
     */
    setupGridUI: function () {
        var gridContainer = this.rootNode.getChildByName("pBoard");
        if (!gridContainer) {
            cc.log("Warning: pBoard not found in UI");
            return;
        }

        this.gridCells = [];

        // Calculate center offset
        var cellSize = CoreGame.Config.CELL_SIZE || 80;
        var gridWidth = CoreGame.Config.BOARD_ROWS * cellSize;
        var gridHeight = CoreGame.Config.BOARD_COLS * cellSize;
        var containerSize = gridContainer.getContentSize();
        var offsetX = (containerSize.width - gridWidth) / 2;
        var offsetY = (containerSize.height - gridHeight) / 2;

        // Create 8x8 grid of buttons
        for (var r = 0; r < CoreGame.Config.BOARD_ROWS; r++) {
            this.gridCells[r] = [];
            for (var c = 0; c < CoreGame.Config.BOARD_COLS; c++) {
                var cell = this.createGridCell(r, c, offsetX, offsetY);
                if (cell) {
                    gridContainer.addChild(cell);
                    this.gridCells[r][c] = cell;
                }
            }
        }

    },

    /**
     * Create a single grid cell button
     */
    createGridCell: function (row, col, offsetX, offsetY) {
        var cellSize = CoreGame.Config.CELL_SIZE || 80;

        // Create button
        var btn = new ccui.Button();
        btn.loadTextureNormal("res/tool/res/bgCell.png");
        btn.setScale9Enabled(true);
        btn.setContentSize(cellSize - 4, cellSize - 4);
        // Position with center offset
        var x = offsetX + col * cellSize + cellSize / 2;
        var y = offsetY + row * cellSize + cellSize / 2;
        btn.setPosition(x, y);

        // Store position
        btn.gridRow = row;
        btn.gridCol = col;

        // Add click handler
        var self = this;
        btn.addTouchEventListener(function (sender, type) {
            if (type === ccui.Widget.TOUCH_ENDED) {
                self.onCellClick(sender.gridRow, sender.gridCol);
            }
        });

        return btn;
    },

    /**
     * Setup element selector UI (combined gems + blockers)
     */
    setupElementSelector: function () {
        var self = this;
        var area = this._selectorArea || { centerY: 100, height: 120 };
        var containerSize = cc.size(cc.winSize.width, area.height);

        // Create element selector
        this.elementSelector = new ElementSelectorUI(
            containerSize,
            function (type, name) {
                // Callback when element is selected
                self.selectedType = type;
                self.selectedHP = 1;
                self.activeDynamicBlocker = null; // Reset paint state when type changes
                self.spawnMode = false;           // Exit spawn mode when selecting element
                self.deleteMode = false;          // Exit delete mode when selecting element
                self.updateCurrentElementPreview(type);

                // Update element config UI
                if (self.elementConfigUI) {
                    self.elementConfigUI.setElement(type);
                }

                cc.log("Element selected:", name, "Type:", type);
            }
        );
        // Position at the center of the gap between board bottom and pBottom top
        this.elementSelector.setPosition(cc.winSize.width / 2, area.centerY);
        this.elementSelector.setAnchorPoint(cc.p(0.5, 0.5));
        this.rootNode.addChild(this.elementSelector);

        // Create element config UI
        this.setupElementConfigUI();
    },

    /**
     * Setup element config UI for HP input
     */
    setupElementConfigUI: function () {
        var self = this;
        this.elementConfigUI = new SetElementConfigUI(function (hp) {
            self.selectedHP = hp;
            cc.log("HP set to:", hp);
        });

        // Position near element selector
        this.elementConfigUI.setPosition(cc.winSize.width * 0.5 - this.elementConfigUI.getContentSize().width * 0.5, cc.winSize.height * 0.5);
        this.addChild(this.elementConfigUI, 5);
    },

    /**
     * Setup preview display for currently selected element
     */
    setupCurrentElementPreview: function () {
        // Create a container for the preview
        var previewContainer = new cc.Node();
        previewContainer.setPosition(this.btnCurElement.getPosition());
        this.pTop.addChild(previewContainer, 10);
        this.previewContainer = previewContainer;

        // Add label
        var label = new cc.LabelTTF("Current:", "Arial", 18);
        label.setPosition(0, 60);
        label.setColor(cc.color(255, 255, 255));
        previewContainer.addChild(label);
        this.updateCurrentElementPreview(1);
    },

    /**
     * Update the visual preview of currently selected element
     */
    updateCurrentElementPreview: function (type) {
        // Remove previous preview if exists
        if (this.currentElementPreview) {
            this.currentElementPreview.ui.removeFromParent();
            this.currentElementPreview = null;
        }

        if (type === null || type === undefined) {
            return;
        }
        this.selectedType = type;

        // Create new element preview
        var elementObject;
        if (CoreGame.ElementObject.map[type]) {
            elementObject = CoreGame.ElementObject.create(0, 0, type, 1);
        } else {
            elementObject = CoreGame.BlockerFactory.createBlocker(0, 0, type, 1);
        }

        if (elementObject) {
            this.currentElementPreview = elementObject;
            elementObject.createUI(this.previewContainer);
            if (elementObject.ui) {
                elementObject.ui.setPosition(0, 0);
                var scale = elementObject.getScaleToFit(90, 90);
                elementObject.ui.setScale(scale);
                //  elementObject.ui.setScale(1.2); // Make it slightly bigger for visibility
            }
        }
    },

    /**
     * Setup level selector popup
     */
    setupLevelSelector: function () {
        var self = this;
        this.levelSelector = new LevelSelectorUI(function (levelName) {
            self.loadMapByName(levelName);
        });
        this.levelSelector.setVisible(false);
        this.addChild(this.levelSelector, 100); // High z-order for popup
    },

    /**
     * Setup BoardInfoUI popup for level parameters
     */
    setupBoardInfoUI: function () {
        this.boardInfoUI = new BoardInfoUI(null); // callback not needed; we read via getInfo()
        this.addChild(this.boardInfoUI, 101);
    },

    /**
     * Setup map management controls (Save/Load/Test/Fill/Clear)
     */
    setupMapControls: function () {
        var self = this;

        // Get pTop and pBottom containers
        var pTop = this.rootNode.getChildByName("pTop");
        var pBottom = this.rootNode.getChildByName("pBottom");
        this.pTop = pTop;

        if (!pTop) cc.log("Warning: pTop container not found");
        if (!pBottom) cc.log("Warning: pBottom container not found");

        // Delete Mode Toggle Button (in pTop)
        var btnDelete = pTop ? UIUtils.seekWidgetByName(pTop, "btnDelete") : null;
        if (btnDelete) {
            // Set initial visual state
            self._btnDelete = btnDelete;
            this.updateDeleteButtonVisual(btnDelete);

            btnDelete.addTouchEventListener(function (sender, type) {
                if (type === ccui.Widget.TOUCH_ENDED) {
                    // Toggle delete mode
                    self.deleteMode = !self.deleteMode;

                    // Clear selection when entering delete mode
                    if (self.deleteMode) {
                        self.selectedType = null;
                        if (self.elementSelector) {
                            self.elementSelector.clearSelection();
                        }
                        // Turn off spawnMode
                        self.spawnMode = false;
                        if (self._btnSpawnPoint) self._btnSpawnPoint.setColor(cc.color(255, 255, 255));
                    }

                    // Update button visual
                    self.updateDeleteButtonVisual(sender);

                    cc.log("Delete mode:", self.deleteMode ? "ON" : "OFF");
                }
            });
        }

        // Clear All button (in pTop)
        var btnClearAll = pTop ? UIUtils.seekWidgetByName(pTop, "btnClearAll") : null;
        if (btnClearAll) {
            btnClearAll.addTouchEventListener(function (sender, type) {
                if (type === ccui.Widget.TOUCH_ENDED) {
                    self.boardUI.removeAllElements();
                    // if (self.mapData.elements.length == 0) {
                    //     self.clearAllElements();
                    // }
                    // else {
                    //     self.clearAllSlots();
                    // }
                }
            });
        }

        // btnCurrentElement
        var btnCurElement = pTop ? UIUtils.seekWidgetByName(pTop, "btnCurElement") : null;
        if (btnCurElement) {
            btnCurElement.addTouchEventListener(function (sender, type) {
                if (type === ccui.Widget.TOUCH_ENDED) {
                    // Turn off deleteMode and spawnMode
                    self.deleteMode = false;
                    self.updateDeleteButtonVisual(self._btnDelete);
                    self.spawnMode = false;
                    if (self._btnSpawnPoint) self._btnSpawnPoint.setColor(cc.color(255, 255, 255));
                    // show-hide element selector
                    self.elementSelector.setVisible(!self.elementSelector.isVisible());
                }
            });
        }
        this.btnCurElement = btnCurElement;

        // Board Info button (in pBottom) — opens BoardInfoUI popup
        var btnBoardInfo = pTop ? UIUtils.seekWidgetByName(pTop, "btnBoardInfo") : null;
        if (btnBoardInfo) {
            btnBoardInfo.addTouchEventListener(function (sender, type) {
                if (type === ccui.Widget.TOUCH_ENDED) {
                    cc.log("BoardInfo button clicked");
                    if (self.boardInfoUI) {
                        cc.log("Show boardInfoUI");
                        self.boardInfoUI.show();
                    }
                }
            });
        }

        // Spawn Point toggle button — marks slots as gem spawn origins
        var btnSpawnPoint = pTop ? UIUtils.seekWidgetByName(pTop, "btnSpawn") : null;
        if (btnSpawnPoint) {
            self._btnSpawnPoint = btnSpawnPoint;
            btnSpawnPoint.addTouchEventListener(function (sender, type) {
                if (type === ccui.Widget.TOUCH_ENDED) {
                    self.spawnMode = !self.spawnMode;
                    // Turn off deleteMode when enabling spawnMode
                    if (self.spawnMode) {
                        self.deleteMode = false;
                        self.updateDeleteButtonVisual(self._btnDelete);
                    }
                    sender.setColor(self.spawnMode ? cc.color(100, 220, 255) : cc.color(255, 255, 255));
                    cc.log("Spawn mode:", self.spawnMode ? "ON" : "OFF");
                }
            });
        }

        // Save button (in pBottom)
        var btnSave = pBottom ? UIUtils.seekWidgetByName(pBottom, "btnSave") : null;
        if (btnSave) {
            btnSave.addTouchEventListener(function (sender, type) {
                if (type === ccui.Widget.TOUCH_ENDED) {
                    self.saveMap();
                }
            });
        }

        // Load button (in pBottom)
        var btnLoad = pBottom ? UIUtils.seekWidgetByName(pBottom, "btnLoad") : null;
        if (btnLoad) {
            btnLoad.addTouchEventListener(function (sender, type) {
                if (type === ccui.Widget.TOUCH_ENDED) {
                    // Show level selector popup
                    if (self.levelSelector) {
                        self.levelSelector.show();
                    }
                }
            });
        }

        // Test button (in pBottom)
        var btnPlay = pBottom ? UIUtils.seekWidgetByName(pBottom, "btnPlay") : null;
        if (btnPlay) {
            btnPlay.addTouchEventListener(function (sender, type) {
                if (type === ccui.Widget.TOUCH_ENDED) {
                    self.testMap();
                }
            });
        }

        // PlayTest button (in pBottom)
        var btnPlayTest = pBottom ? UIUtils.seekWidgetByName(pBottom, "btnPlayTest") : null;
        if (btnPlayTest) {
            btnPlayTest.addTouchEventListener(function (sender, type) {
                if (type === ccui.Widget.TOUCH_ENDED) {
                    var info = self.boardInfoUI.getInfo();
                    self.runDifficultyTest(info);
                }
            });
        }

        // Back button (in pBottom)
        var btnBack = pBottom ? UIUtils.seekWidgetByName(pBottom, "btnBack") : null;
        if (btnBack) {
            btnBack.addTouchEventListener(function (sender, type) {
                if (type === ccui.Widget.TOUCH_ENDED) {
                    var toolScene = new cc.Scene();
                    toolScene.addChild(new BlockCreatorUI());
                    cc.director.runScene(toolScene);
                }
            });
        }
    },

    /**
     * Smoke-test the difficulty calculator.
     * Uses a small episode count (5) for speed.
     */
    runDifficultyTest: function (info) {
        // info: {"numMove":30,"targetElements":[{"id":0,"count":10}],"numTest":10}

        // var editScene = this.boardUI;
        var boardUI = this.boardUI;
        var boardMgr = boardUI && boardUI.boardMgr;

        // var boardUI = CoreGame.BoardUI.getInstance();
        // var boardMgr = boardUI && boardUI.boardMgr;
        if (!boardMgr) {
            CoreGame.RemoteLog.error("[DiffCalc] boardMgr not accessible");
            return;
        }

        CoreGame.RemoteLog.log("=== DIFFICULTY CALCULATOR TEST ===");
        CoreGame.RemoteLog.log("Board: " + boardMgr.rows + "x" + boardMgr.cols +
            " | Colors: " + CoreGame.Config.NUM_COLORS);

        CoreGame.DifficultyCalc.NUM_EPISODES = info.numTest || 5; // Use small episode count for quick test
        var targets = {};
        if (info.targetElements && info.targetElements.length > 0) {
            info.targetElements.forEach(function (target) {
                targets[target.id] = target.count;
            });
        } else {
            target = { 1: 10 }; // Default target if not provided
        }

        var config = {
            maxMoves: info.numMove || 30,
            targets: targets
        };
        var self = this;
        CoreGame.FakeUI.start();
        CoreGame.DifficultyCalc.calculate(
            boardMgr,
            config,
            function (step, total, state) {
                var msg;
                if (state.phase === "start") {
                    msg = "Starting (" + state.numEpisodes + " episodes each bot)";
                } else if (state.phase === "episode") {
                    var movesInfo = state.win
                        ? "WIN in " + state.movesWin + " moves"
                        : "lose (" + state.movesUsed + " moves)";
                    msg = state.bot + " ep " + state.episode + "/" + state.numEpisodes +
                        " — " + movesInfo;
                } else {
                    msg = "Done.";
                }
                CoreGame.RemoteLog.log("[" + step + "/" + total + "] " + msg);
            },
            function (report) {
                CoreGame.RemoteLog.log("=== RESULTS ===");
                CoreGame.RemoteLog.log("Difficulty       : " + report.difficulty.toFixed(3));
                CoreGame.RemoteLog.log("Greedy win rate  : " + (report.greedy_win_rate * 100).toFixed(1) + "%");
                CoreGame.RemoteLog.log("Random win rate  : " + (report.random_win_rate * 100).toFixed(1) + "%");
                CoreGame.RemoteLog.log("Skill gap        : " + report.skill_gap.toFixed(3));
                CoreGame.RemoteLog.log("RNG penalty      : " + report.rng_penalty.toFixed(3));
                CoreGame.RemoteLog.log("Avg fail turn    : " + report.avg_fail_turn.toFixed(1));
                CoreGame.RemoteLog.log("Avg win moves (G): " + (report.avg_win_moves_greedy > 0 ? report.avg_win_moves_greedy.toFixed(1) : "-"));
                CoreGame.RemoteLog.log("Avg win moves (R): " + (report.avg_win_moves_random > 0 ? report.avg_win_moves_random.toFixed(1) : "-"));
                CoreGame.RemoteLog.log("Flags            : " + (report.flags.length > 0 ? report.flags.join(", ") : "NONE"));
                CoreGame.RemoteLog.log("=== END ===");
                CoreGame.FakeUI.restore();
                self._showDifficultyResultPopup(report);
            }
        );
    },

    /**
     * Update delete button visual state
     */
    updateDeleteButtonVisual: function (btn) {
        if (!btn) return;

        if (this.deleteMode) {
            btn.setColor(cc.color(255, 100, 100)); // Red for delete mode
            btn.setBright(true);
        } else {
            btn.setColor(cc.color(255, 255, 255)); // White for normal
            btn.setBright(false);
        }
    },

    /**
     * Handle grid cell click
     * - If delete mode: remove element or disable slot
     * - Otherwise: toggle slot or place/remove element based on layer
     */
    onCellClick: function (row, col, isMove = false) {
        cc.log("Cell clicked:", row, col, "Layer:", this.currentLayer, "Delete mode:", this.deleteMode, "Selected type:", this.selectedType);

        // Spawn point mode: toggle canSpawn on the slot
        if (this.spawnMode) {
            if (isMove && row === this.lastRow && col === this.lastCol) return;
            this.lastRow = row; this.lastCol = col;
            var rawSlot = this.boardUI.boardMgr.mapGrid[row] && this.boardUI.boardMgr.mapGrid[row][col];
            if (rawSlot && rawSlot.enable) {
                rawSlot.canSpawn = !rawSlot.canSpawn;
                // Visual feedback: cyan tint for spawn slots
                if (rawSlot.bg) rawSlot.bg.setColor(rawSlot.canSpawn ? cc.color(100, 220, 255) : cc.color(255, 255, 255));
                cc.log("Slot", row, col, "canSpawn =", rawSlot.canSpawn);
            }
            return;
        }

        if (this.deleteMode) {
            if (isMove && row === this.lastRow && col === this.lastCol) return;
            this.lastRow = row; this.lastCol = col;
            this.boardUI.removeAt(row, col);
            this.activeDynamicBlocker = null; // Reset paint state when deleting
        } else {
            // DynamicBlocker types use a special paint mechanic
            if (this.isDynamicBlockerType(this.selectedType)) {
                this.handleDynamicBlockerClick(row, col);
            } else {
                // Check if element can be placed at this position
                if (this.canPlaceElement(row, col, this.selectedType)) {
                    this.boardUI.addElement(row, col, this.selectedType, this.selectedHP);
                } else {
                    cc.log("Cannot place element: insufficient space or out of bounds");
                    LogLayer.show("Cannot place element: insufficient space or out of bounds");
                }
            }
        }
    },

    /**
     * Check if the given type is a DynamicBlocker subclass
     * @param {number} type - Element type ID
     * @returns {boolean}
     */
    isDynamicBlockerType: function (type) {
        if (type === null || type === undefined) return false;
        var Cls = CoreGame.ElementObject.map[type];
        if (!Cls) return false;
        // Walk prototype chain to check if Cls is a subclass of DynamicBlocker
        var proto = Cls.prototype;
        while (proto) {
            if (proto === CoreGame.DynamicBlocker.prototype) return true;
            proto = Object.getPrototypeOf(proto);
        }
        return false;
    },

    /**
     * Handle click on a cell when a DynamicBlocker type is selected.
     * Uses "paint" model:
     *   - First click: creates a new DynamicBlocker, sets it as activeDynamicBlocker
     *   - Subsequent clicks: adds the cell to the active DynamicBlocker
     *   - Clicking a cell that already has this type: no-op
     * @param {number} row
     * @param {number} col
     */
    handleDynamicBlockerClick: function (row, col) {
        var slot = this.boardUI.boardMgr.getSlot(row, col);
        if (!slot) {
            // Slot disabled or out of bounds — enable it first
            var rawSlot = this.boardUI.boardMgr.mapGrid[row] && this.boardUI.boardMgr.mapGrid[row][col];
            if (!rawSlot) return;
            this.boardUI.enableSlot(row, col, true);
            slot = this.boardUI.boardMgr.getSlot(row, col);
            if (!slot) return;
        }

        // Skip if this cell already belongs to a DynamicBlocker of the same type
        for (var i = 0; i < slot.listElement.length; i++) {
            if (slot.listElement[i].type === this.selectedType) {
                cc.log("Cell", row, col, "already occupied by DynamicBlocker type", this.selectedType);
                return;
            }
        }

        if (this.activeDynamicBlocker && this.activeDynamicBlocker.type === this.selectedType) {
            // Add this cell to the existing active DynamicBlocker
            cc.log("DynamicBlocker paint: addCell", row, col, "to existing blocker");
            slot.clearElements();
            this.activeDynamicBlocker.addCell({ r: row, c: col });
            // Ensure slot is enabled
            this.boardUI.enableSlot(row, col, true);
        } else {
            // Create a new DynamicBlocker starting at this cell
            cc.log("DynamicBlocker paint: create new at", row, col);
            this.activeDynamicBlocker = this.boardUI.addElement(
                row, col, this.selectedType, this.selectedHP
            );
        }
    },

    /**
     * Check if an element can be placed at the given position
     * @param {number} row - Row position
     * @param {number} col - Column position
     * @param {number} type - Element type
     * @returns {boolean} True if element can be placed
     */
    canPlaceElement: function (row, col, type) {
        if (type === null || type === undefined) {
            return true; // No element selected, allow click
        }

        // Use currentElementPreview instead of creating a new temporary element
        if (!this.currentElementPreview) {
            return false;
        }

        // Don't re-place if the slot already has an element of the same type
        var slot = this.boardUI.boardMgr.mapGrid[row] && this.boardUI.boardMgr.mapGrid[row][col];
        if (slot) {
            for (var i = 0; i < slot.listElement.length; i++) {
                if (slot.listElement[i].type === type && slot.listElement[i].hp === this.selectedHP) {
                    return false;
                }
            }
        }

        var elementSize = this.currentElementPreview.size || cc.size(1, 1);
        var width = elementSize.width;
        var height = elementSize.height;

        // Check if element fits within board boundaries
        var boardRows = this.boardUI.boardMgr.rows;
        var boardCols = this.boardUI.boardMgr.cols;

        if (row + height > boardRows || col + width > boardCols) {
            cc.log("Element size:", width, "x", height, "exceeds board at position", row, col);
            return false;
        }

        return true;
    },

    /**
     * Get element at grid position (backwards compatibility - returns first element)
     * @deprecated Use getElementsAt instead
     */
    getElementAt: function (row, col) {
        var elements = this.getElementsAt(row, col);
        return elements.length > 0 ? elements[0] : null;
    },

    /**
     * Remove specific element at position based on LayerBehavior
     * Removes element with same LayerBehavior as the currently selected type
     * @param {number} row - Row index
     * @param {number} col - Column index  
     */
    removeElementAt: function (row, col) {
        this.boardUI.removeElement(row, col);
    },

    /**
     * Get LayerBehavior for element type
     * @param {number} type - Element type ID
     * @returns {number} LayerBehavior value
     */
    getLayerBehaviorForType: function (type) {
        // Gems (1-7) are always CONTENT  (7 = Gem Random)
        if (type >= 1 && type <= 7) {
            return CoreGame.LayerBehavior.CONTENT;
        }

        // For blockers, check if config is cached
        var config = CoreGame.BlockerFactory._configCache[type];
        if (config && config.layerBehavior) {
            var layerBehaviorMap = {
                "CONTENT": CoreGame.LayerBehavior.CONTENT,
                "OVERLAY": CoreGame.LayerBehavior.OVERLAY,
                "EXCLUSIVE": CoreGame.LayerBehavior.EXCLUSIVE,
                "BACKGROUND": CoreGame.LayerBehavior.BACKGROUND
            };
            return layerBehaviorMap[config.layerBehavior] || CoreGame.LayerBehavior.CONTENT;
        }

        // Default to CONTENT if config not found
        return CoreGame.LayerBehavior.CONTENT;
    },

    /**
     * Get display name for element type
     */
    getElementDisplayName: function (element) {
        if (element.type >= 1 && element.type <= 7) {
            return element.type === 7 ? "G?" : "G" + element.type; // Gem (7 = Random)
        } else {
            return "B" + element.type; // Blocker
        }
    },

    /**
     * Get display name for multiple elements
     * Shows count if > 1, otherwise shows single element name
     */
    getElementsDisplayName: function (elements) {
        if (elements.length === 0) return "";
        if (elements.length === 1) return this.getElementDisplayName(elements[0]);

        // Show count + first element type
        var first = this.getElementDisplayName(elements[0]);
        return first + " (+" + (elements.length - 1) + ")";
    },

    /**
     * Save map to JSON file
     */
    saveMap: function () {
        var mapNameInput = UIUtils.seekWidgetByName(this.rootNode, "tfMapName");
        var mapName = mapNameInput ? mapNameInput.getString() : "untitled";

        if (!mapName || mapName === "") {
            mapName = "map_" + Date.now();
        }

        var self = this;

        // Get data from boardUI instead of this.mapData
        var mapDataToSave = this.boardUI.getMapConfig();

        // Attach level info from BoardInfoUI
        if (this.boardInfoUI) {
            var info = this.boardInfoUI.getInfo();
            mapDataToSave.numMove = info.numMove;
            mapDataToSave.targetElements = info.targetElements;
            mapDataToSave.numTest = info.numTest;
        }

        var jsonStr = JSON.stringify(mapDataToSave, null, 4);
        var filePath = "res/maps/" + mapName + ".json";

        cc.log("SAVE_MAP_DATA: " + filePath + "\n" + jsonStr);

        if (typeof jsb !== "undefined" && jsb.fileUtils) {
            if (jsb.fileUtils.writeStringToFile(jsonStr, filePath)) {
                cc.log("SUCCESS: Saved map to:", filePath);

                // Update ListMap.json to include this map
                this.addMapToList(mapName);
            } else {
                cc.log("ERROR: Failed to save map to:", filePath);
            }
        } else {
            cc.log("Map data ready. Copy the log above to save manually.");
        }
    },

    /**
     * Add map name to ListMap.json if not already present
     */
    addMapToList: function (mapName) {
        var listPath = "res/maps/ListMap.json";

        cc.loader.loadJson(listPath, function (err, mapList) {
            if (err || !mapList) {
                // If file doesn't exist or error, create new list
                mapList = [];
            }

            // Check if map name already exists
            if (mapList.indexOf(mapName) === -1) {
                mapList.push(mapName);

                // Sort alphabetically
                mapList.sort();

                // Save updated list
                var listStr = JSON.stringify(mapList, null, 4);
                if (typeof jsb !== "undefined" && jsb.fileUtils) {
                    if (jsb.fileUtils.writeStringToFile(listStr, listPath)) {
                        cc.log("Updated ListMap.json with:", mapName);
                    } else {
                        cc.log("ERROR: Failed to update ListMap.json");
                    }
                }
            }
        });
    },

    /**
     * Load map by level name (called from level selector)
     */
    loadMapByName: function (levelName) {
        var self = this;
        var filePath = "res/maps/" + levelName + ".json";
        // update map name
        var mapNameInput = UIUtils.seekWidgetByName(this.rootNode, "tfMapName");
        if (mapNameInput) {
            mapNameInput.setString(levelName);
        }
        cc.loader.loadJson(filePath, function (err, data) {
            if (err) {
                cc.log("Error loading map:", err);
                return;
            }

            if (data) {
                self.boardUI.loadMapConfig(data);
                // Restore level info into BoardInfoUI if present in saved data
                if (self.boardInfoUI && (data.numMove !== undefined || data.targetElements || data.numTest !== undefined)) {
                    self.boardInfoUI.setInfo({
                        numMove: data.numMove || 30,
                        targetElements: data.targetElements || [],
                        numTest: data.numTest || 1
                    });
                }
                else {
                    self.boardInfoUI.setInfo({
                        numMove: 30,
                        targetElements: [],
                        numTest: 1
                    });
                }
                cc.log("Loaded map from:", filePath);
            }
        });
    },

    /**
     * Load map from JSON file
     */
    loadMap: function () {
        var mapNameInput = UIUtils.seekWidgetByName(this.rootNode, "tfMapName");
        var mapName = mapNameInput ? mapNameInput.getString() : "";

        if (!mapName) {
            cc.log("Please enter a map name to load");
            return;
        }

        var self = this;
        var filePath = "res/maps/" + mapName + ".json";

        cc.loader.loadJson(filePath, function (err, data) {
            if (err) {
                cc.log("Error loading map:", err);
                return;
            }

            if (data) {
                self.boardUI.loadMapConfig(data);
                cc.log("Loaded map from:", filePath);
            }
        });
    },

    /**
     * Test current map in game
     */
    testMap: function () {
        cc.log("Testing map with config:", this.mapData);
        var mapDataToSave = this.boardUI.getMapConfig();
        var info = null;

        // Attach level info from BoardInfoUI if available
        if (this.boardInfoUI) {
            info = this.boardInfoUI.getInfo();
            mapDataToSave.numMove = info.numMove;
            mapDataToSave.targetElements = info.targetElements;
            mapDataToSave.numTest = info.numTest;

            mapDataToSave.levelId = 0;
            mapDataToSave.reward = 100;
        }

        var scene = new cc.Scene();
        CoreGame.BoardUI.instance = null;
        var layer = new CoreGame.GameUI({ mapConfig: mapDataToSave });
        // var layer = CoreGame.BoardUI.getInstance(mapDataToSave);
        scene.addChild(layer);
        cc.director.runScene(scene);
        return info;
    },

    /**
     * Create fallback UI if JSON not found
     */
    createFallbackUI: function () {
        var label = new cc.LabelTTF(
            "EditMapUI.json not found!\nPlease create this file in Cocos Studio.",
            "Arial",
            24
        );
        label.setPosition(cc.winSize.width / 2, cc.winSize.height / 2);
        label.setColor(cc.color(255, 0, 0));
        this.addChild(label);

        var backBtn = new ccui.Button("res/tool/res/btn_green_2.png");
        backBtn.setTitleText("Back to Tools");
        backBtn.setPosition(cc.winSize.width / 2, 100);
        backBtn.addTouchEventListener(function (sender, type) {
            if (type === ccui.Widget.TOUCH_ENDED) {
                var toolScene = new cc.Scene();
                toolScene.addChild(new BlockCreatorUI());
                cc.director.runScene(toolScene);
            }
        });
        this.addChild(backBtn);
    },

    onSlotSelected: function (row, col) {
        cc.log("Slot selected:", row, col);
    },

    /**
     * Show the BenchDiffDialog popup with the DifficultyCalc report.
     * @param {Object} report
     */
    _showDifficultyResultPopup: function (report) {
        var dialog = new BenchDiffDialog(report);
        this.addChild(dialog, 1000);
        dialog.show();
    }
});

EditMapScene.instance = null;
EditMapScene.getInstance = function () {
    if (!EditMapScene.instance) {
        EditMapScene.instance = new EditMapScene();
        // Retain instance to avoid it being automatically destroyed
        EditMapScene.instance.retain();
    } else if (EditMapScene.instance.getParent()) {
        // If it was already in another scene, we need to detach it before returning
        EditMapScene.instance.removeFromParent(false);
    }
    return EditMapScene.instance;
};
