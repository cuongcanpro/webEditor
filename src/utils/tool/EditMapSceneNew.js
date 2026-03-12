/**
 * EditMapSceneNew - Map editor tool using EditMapUINew.json layout
 *
 * JSON panel structure:
 *  Root (960x640)
 *  ├── pTop    (top bar, full width, h~50)
 *  │   ├── pFunction   : btnNew, btnLoad, btnSave, btnPlay, btnPlayTest
 *  │   └── pNameLevel  : lbLevel, bgLevel, tfLevelName
 *  ├── pTool   (top-left, w~200, h~50): btnDelete, btnSpawn, btnSlot
 *  ├── pRight  (top-right, w~200, h~200): lbMove, bgMove, tfMoves
 *  └── pBottom (bottom bar, full width, h~120)
 *      ├── pTarget   : target list + +Add button
 *      ├── pMapNote  : map name text field + notes
 *      └── pMetric   : active cells, spawners, blockers, total HP
 *
 * The center board area is between pTool/pRight and pBottom, offset from left edge of pRight.
 * The left sidebar (ElementSelector) is injected into pTool's area (extended downward).
 */
var EditMapSceneNew = cc.Layer.extend({

    // ─── State ───────────────────────────────────────────────────────────────
    selectedType: null,
    selectedHP: 1,
    deleteMode: false,
    spawnMode: false,
    slotMode: false,
    activeDynamicBlocker: null,

    // ─── UI refs ─────────────────────────────────────────────────────────────
    rootNode: null,
    boardUI: null,
    boardInfoUI: null,
    levelSelector: null,
    elementSelector: null,

    // Panel refs
    pTop: null,
    pTool: null,
    pRight: null,
    pBottom: null,
    pTarget: null,
    pMapNote: null,
    pMetric: null,

    // Control refs
    tfLevelName: null,
    tfMoves: null,
    _btnDelete: null,
    _btnSpawn: null,
    _btnSlot: null,

    // Metrics labels
    _lblActiveCells: null,
    _lblSpawners: null,
    _lblBlockers: null,
    _lblTotalHP: null,

    // Undo / Redo history (snapshot-based, max MAX_UNDO_STEPS)
    MAX_UNDO_STEPS: 30,
    _undoStack: null,
    _redoStack: null,

    // Target entries: [{id, count}]
    _targetEntries: [],
    _targetListContainer: null,

    // ─────────────────────────────────────────────────────────────────────────
    ctor: function () {
        this._super();
        this._targetEntries = [];
        this._undoStack = [];
        this._redoStack = [];
        this.initUI();
    },

    // ─────────────────────────────────────────────────────────────────────────
    // Init
    // ─────────────────────────────────────────────────────────────────────────
    initUI: function () {
        var self = this;
        // Switch to landscape (editor) resolution
        this._applyResolution(true);

        // Ensure blocker configs are preloaded before building UI; this avoids
        // cases where createBlocker() is called but _configCache is still empty.
        CoreGame.BlockerFactory.ensurePreloaded(function (failed) {
            if (failed && failed.length > 0) {
                cc.log("EditMapSceneNew: BlockerFactory preload had failures:", JSON.stringify(failed));
            }

            var loaded = ccs.load("res/tool/EditMapUINew.json");
            if (!loaded || !loaded.node) {
                cc.log("ERROR: EditMapUINew.json not found!");
                return;
            }

            self.rootNode = loaded.node;
            // Resize to actual winSize so percentage-anchored panels (pTop, pBottom, etc.) position correctly
            self.rootNode.setPosition(0, 0);
            self.rootNode.setContentSize(cc.winSize);
            self.pRight = self.rootNode.getChildByName("pRight");
            cc.log("PRight luc nay " + self.pRight.getContentSize().width);
            self.addChild(self.rootNode);
            ccui.helper.doLayout(self.rootNode); // resolve % positions BEFORE reading panel sizes

            // Cache panel refs
            self.pTop = self.rootNode.getChildByName("pTop");
            self.pTool = self.rootNode.getChildByName("pTool");
            self.pRight = self.rootNode.getChildByName("pRight");
            self.pBottom = self.rootNode.getChildByName("pBottom");

            if (self.pBottom) {
                self.pTarget = self.pBottom.getChildByName("pTarget");
                self.pMapNote = self.pBottom.getChildByName("pMapNote");
                self.pMetric = self.pBottom.getChildByName("pMetric");
            }

            // Compute board offset from panel geometry
            self.computeLayout();

            // Build board (BOARD_OFFSET stays unchanged — shared with other scenes)
            self.boardUI = new CoreGame.BoardEditUI(self);
            self.addChild(self.boardUI, 1);
            self.fitBoardToCenter(); // scale + position the layer to fit center area

            // Wire up all sections
            self.setupToolbar();
            self.setupToolPanel();
            self.setupRightPanel();
            self.setupBottomBar();
            self.setupElementSelector();
            self.setupLevelSelector();
        });
    },

    /**
     * computeLayout is intentionally a no-op here.
     * BOARD_OFFSET_X/Y is shared config used by other scenes — we do NOT modify it.
     * Board positioning is handled entirely by fitBoardToCenter() via layer transform.
     */
    computeLayout: function () { },

    /**
     * Scale and position boardUI so the board content fits snugly inside:
     *   left:   right edge of pTool
     *   right:  left  edge of pRight
     *   bottom: top   edge of pBottom
     *   top:    bottom edge of pTop
     */
    fitBoardToCenter: function () {
        if (!this.boardUI) return;

        var winW = cc.winSize.width;
        var winH = cc.winSize.height;
        var rows = CoreGame.Config.BOARD_ROWS || 10;
        var cols = CoreGame.Config.BOARD_COLS || 9;
        var cell = CoreGame.Config.CELL_SIZE || 57;
        // BOARD_OFFSET: where board cells start inside the boardUI layer (read-only here)
        var offX = CoreGame.Config.BOARD_OFFSET_X || 0;
        var offY = CoreGame.Config.BOARD_OFFSET_Y || 0;

        // Panel geometry (resolved after doLayout)
        var topH = this.pTop ? this.pTop.getContentSize().height : 50;
        var toolW = this.pTool ? this.pTool.getContentSize().width : 200;
        var rightW = this.pRight ? this.pRight.getContentSize().width : 200;
        var botH = this.pBottom ? this.pBottom.getContentSize().height : 120;
        cc.log("Right Width === " + rightW);

        // Available center rectangle (screen coords)
        var areaX = toolW;
        var areaY = botH;
        var areaW = (winW - rightW) - toolW;
        var areaH = (winH - topH) - botH;

        // Natural board pixel size (at scale 1)
        var boardW = cols * cell;
        var boardH = rows * cell;

        // Uniform scale to fit with padding
        var PADDING = 28;
        var scale = Math.min(
            (areaW - PADDING * 2) / boardW,
            (areaH - PADDING * 2) / boardH
        );

        // The board cells start at (offX, offY) inside the layer.
        // After setScale(S), that point maps to world: layerPos + (offX*S, offY*S).
        // We want the board centered in the area, so:
        //   layerPos.x = areaX + (areaW - boardW*S)/2  -  offX*S
        //   layerPos.y = areaY + (areaH - boardH*S)/2  -  offY*S
        var posX = areaX + (areaW - boardW * scale) / 2 - offX * scale;
        var posY = areaY + (areaH - boardH * scale) / 2 - offY * scale;

        this.boardUI.setAnchorPoint(cc.p(0, 0));
        this.boardUI.setScale(scale);
        this.boardUI.setPosition(posX, posY);

        cc.log("[EditMapSceneNew] fitBoardToCenter scale=" + scale.toFixed(3) +
            " pos=(" + posX.toFixed(0) + "," + posY.toFixed(0) + ")" +
            " area=(" + areaW.toFixed(0) + "x" + areaH.toFixed(0) + ")" +
            " boardOffset=(" + offX + "," + offY + ")");
    },


    // ─────────────────────────────────────────────────────────────────────────
    // pTop — toolbar buttons + level name
    // ─────────────────────────────────────────────────────────────────────────
    setupToolbar: function () {
        var self = this;

        if (!this.pTop) return;

        var pFunc = this.pTop.getChildByName("pFunction");
        if (pFunc) {
            var btnNew = UIUtils.seekWidgetByName(pFunc, "btnNew");
            var btnLoad = UIUtils.seekWidgetByName(pFunc, "btnLoad");
            var btnSave = UIUtils.seekWidgetByName(pFunc, "btnSave");
            var btnPlay = UIUtils.seekWidgetByName(pFunc, "btnPlay");
            var btnPlayTest = UIUtils.seekWidgetByName(pFunc, "btnPlayTest");

            if (btnNew) {
                btnNew.addTouchEventListener(function (sender, type) {
                    if (type === ccui.Widget.TOUCH_ENDED) {
                        self.boardUI.removeAllElements();
                        self._targetEntries = [];
                        self._refreshTargetList();
                        self.updateMetrics();
                        cc.log("New map");
                    }
                });
            }

            if (btnLoad) {
                btnLoad.addTouchEventListener(function (sender, type) {
                    if (type === ccui.Widget.TOUCH_ENDED) {
                        if (self.levelSelector) self.levelSelector.show();
                    }
                });
            }

            if (btnSave) {
                btnSave.addTouchEventListener(function (sender, type) {
                    if (type === ccui.Widget.TOUCH_ENDED) {
                        self.saveMap();
                    }
                });
            }

            if (btnPlay) {
                btnPlay.addTouchEventListener(function (sender, type) {
                    if (type === ccui.Widget.TOUCH_ENDED) {
                        self.testMap();
                    }
                });
            }

            if (btnPlayTest) {
                btnPlayTest.addTouchEventListener(function (sender, type) {
                    if (type === ccui.Widget.TOUCH_ENDED) {
                        self.runDifficultyTest();
                    }
                });
            }

            var btnUndo = UIUtils.seekWidgetByName(pFunc, "btnUndo");
            var btnRedo = UIUtils.seekWidgetByName(pFunc, "btnRedo");

            if (btnUndo) {
                btnUndo.addTouchEventListener(function (sender, type) {
                    if (type === ccui.Widget.TOUCH_ENDED) self.undo();
                });
            }
            if (btnRedo) {
                btnRedo.addTouchEventListener(function (sender, type) {
                    if (type === ccui.Widget.TOUCH_ENDED) self.redo();
                });
            }
        }

        var pName = this.pTop.getChildByName("pNameLevel");
        if (pName) {
            this.tfLevelName = UIUtils.seekWidgetByName(pName, "tfLevelName");
        }
    },

    // ─────────────────────────────────────────────────────────────────────────
    // pTool — editing mode buttons (Delete / Spawn / Slot)
    //         + injected ElementSelector ScrollView below
    // ─────────────────────────────────────────────────────────────────────────
    setupToolPanel: function () {
        var self = this;
        if (!this.pTool) return;

        var btnDelete = UIUtils.seekWidgetByName(this.pTool, "btnDelete");
        var btnSpawn = UIUtils.seekWidgetByName(this.pTool, "btnSpawn");
        var btnSlot = UIUtils.seekWidgetByName(this.pTool, "btnSlot");

        this._btnDelete = btnDelete;
        this._btnSpawn = btnSpawn;
        this._btnSlot = btnSlot;

        if (btnDelete) {
            this._updateBtnColor(btnDelete, false);
            btnDelete.addTouchEventListener(function (sender, type) {
                if (type === ccui.Widget.TOUCH_ENDED) {
                    self.deleteMode = !self.deleteMode;
                    if (self.deleteMode) {
                        self.spawnMode = false;
                        self.slotMode = false;
                        self.selectedType = null;
                        if (self.elementSelector) self.elementSelector.clearSelection();
                    }
                    self._syncModeButtons();
                }
            });
        }

        if (btnSpawn) {
            this._updateBtnColor(btnSpawn, false);
            btnSpawn.addTouchEventListener(function (sender, type) {
                if (type === ccui.Widget.TOUCH_ENDED) {
                    self.spawnMode = !self.spawnMode;
                    if (self.spawnMode) {
                        self.deleteMode = false;
                        self.slotMode = false;
                    }
                    self._syncModeButtons();
                }
            });
        }

        if (btnSlot) {
            this._updateBtnColor(btnSlot, false);
            btnSlot.addTouchEventListener(function (sender, type) {
                if (type === ccui.Widget.TOUCH_ENDED) {
                    self.slotMode = !self.slotMode;
                    if (self.slotMode) {
                        self.deleteMode = false;
                        self.spawnMode = false;
                    }
                    self._syncModeButtons();
                }
            });
        }
    },

    _syncModeButtons: function () {
        this._updateBtnColor(this._btnDelete, this.deleteMode);
        this._updateBtnColor(this._btnSpawn, this.spawnMode);
        this._updateBtnColor(this._btnSlot, this.slotMode);
    },

    _updateBtnColor: function (btn, active) {
        if (!btn) return;
        btn.setColor(active ? cc.color(100, 220, 100) : cc.color(255, 255, 255));
    },

    // ─────────────────────────────────────────────────────────────────────────
    // pRight — level info (Moves + more via BoardInfoUI overlay)
    // ─────────────────────────────────────────────────────────────────────────
    setupRightPanel: function () {
        if (!this.pRight) return;

        // tfMoves is already in JSON
        this.tfMoves = UIUtils.seekWidgetByName(this.pRight, "tfMoves");
        if (this.tfMoves) this.tfMoves.setString("30");

        // Create BoardInfoUI as an overlay popup (still needed for targets etc.)
        this.boardInfoUI = new BoardInfoUI(null);
        this.addChild(this.boardInfoUI, 101);

        // ── Play Test count row ──────────────────────────────────────────
        var pRightSize = this.pRight.getContentSize();
        var W = pRightSize.width;

        // tfNumTest is defined in JSON (pLevelInfo > lbNumTest > tfNumTest)
        this.pLevelInfo = UIUtils.seekWidgetByName(this.pRight, "pLevelInfo");
        this._tfPlayTest = UIUtils.seekWidgetByName(this.pRight, "tfNumTest");
        if (this._tfPlayTest) this._tfPlayTest.setString("1");

    },

    // ─────────────────────────────────────────────────────────────────────────
    // pBottom — 3 panels: pTarget, pMapNote, pMetric
    // ─────────────────────────────────────────────────────────────────────────
    setupBottomBar: function () {
        this._setupTargetPanel();
        this._setupMapNotePanel();
        this._setupMetricPanel();
    },

    // ─────────────────────────────────────────────────────────────────────────
    // pBottom > pTarget — delegated to TargetListUI
    // ─────────────────────────────────────────────────────────────────────────
    _setupTargetPanel: function () {
        if (!this.pTarget) return;
        // TargetListUI injects itself into pTarget and manages its own layout
        this.targetListUI = new TargetListUI(this.pTarget);
    },

    _setupMapNotePanel: function () {
        if (!this.pMapNote) return;
        var size = this.pMapNote.getContentSize();
        var W = size.width;
        var H = size.height;

        // ── Header ────────────────────────────────────────────────────────
        var lbHeader = new cc.LabelTTF("MAP NAME / NOTES", "font/BalooPaaji2-Regular.ttf", 11);
        lbHeader.setColor(cc.color(160, 180, 220));
        lbHeader.setAnchorPoint(cc.p(0, 1));
        lbHeader.setPosition(5, H - 2);
        this.pMapNote.addChild(lbHeader, 1);

        // ── Map Name ──────────────────────────────────────────────────────
        var bgTfName = new ccui.Scale9Sprite("res/tool/res/bgTf.png");
        bgTfName.setContentSize(W - 10, 22);
        bgTfName.setAnchorPoint(cc.p(0, 0.5));
        bgTfName.setPosition(5, H - 24);
        this.pMapNote.addChild(bgTfName, 0);

        var tfMapName = new ccui.TextField("level_xxx", "font/BalooPaaji2-Regular.ttf", 13);
        tfMapName.setContentSize(W - 10, 22);
        tfMapName.setAnchorPoint(cc.p(0, 0.5));
        tfMapName.setPosition(5, H - 24);
        this.pMapNote.addChild(tfMapName, 1);
        this._tfMapName = tfMapName;

        // ── Notes (remaining height) ──────────────────────────────────────
        var noteH = H - 50;
        var bgTfNotes = new ccui.Scale9Sprite("res/tool/res/bgTf.png");
        bgTfNotes.setContentSize(W - 10, noteH);
        bgTfNotes.setAnchorPoint(cc.p(0, 0));
        bgTfNotes.setPosition(5, 4);
        this.pMapNote.addChild(bgTfNotes, 0);

        var tfNotes = new ccui.TextField("Designer notes about this map...", "font/BalooPaaji2-Regular.ttf", 12);
        tfNotes.setContentSize(W - 10, noteH);
        tfNotes.setAnchorPoint(cc.p(0, 0));
        tfNotes.setPosition(5, 4);
        this.pMapNote.addChild(tfNotes, 1);
        this._tfNotes = tfNotes;
    },




    _setupMetricPanel: function () {
        if (!this.pMetric) return;
        var size = this.pMetric.getContentSize();

        var lbHeader = new cc.LabelTTF("METRICS", "font/BalooPaaji2-Regular.ttf", 13);
        lbHeader.setColor(cc.color(200, 200, 200));
        lbHeader.setAnchorPoint(cc.p(0, 1));
        lbHeader.setPosition(5, size.height - 3);
        this.pMetric.addChild(lbHeader, 1);

        var lines = [
            { key: "_lblActiveCells", label: "Active Cells:" },
            { key: "_lblSpawners", label: "Spawners:" },
            { key: "_lblBlockers", label: "Blockers:" },
            { key: "_lblTotalHP", label: "Total HP:" }
        ];

        for (var i = 0; i < lines.length; i++) {
            var yPos = size.height - 28 - i * 22;

            var lbKey = new cc.LabelTTF(lines[i].label, "font/BalooPaaji2-Regular.ttf", 12);
            lbKey.setColor(cc.color(170, 170, 170));
            lbKey.setAnchorPoint(cc.p(0, 0.5));
            lbKey.setPosition(5, yPos);
            this.pMetric.addChild(lbKey, 1);

            var lbVal = new cc.LabelTTF("0", "font/BalooPaaji2-Regular.ttf", 12);
            lbVal.setColor(cc.color(255, 220, 100));
            lbVal.setAnchorPoint(cc.p(1, 0.5));
            lbVal.setPosition(size.width - 5, yPos);
            this.pMetric.addChild(lbVal, 1);

            this[lines[i].key] = lbVal;
        }

        this.updateMetrics();
    },

    // ─────────────────────────────────────────────────────────────────────────
    // Element Selector — injected into a new ScrollView below pTool
    // ─────────────────────────────────────────────────────────────────────────
    setupElementSelector: function () {
        var self = this;
        if (!this.pTool) return;

        var toolW = this.pTool.getContentSize().width;
        var toolPos = this.pTool.getPosition(); // in rootNode local coords
        var botH = this.pBottom ? this.pBottom.getContentSize().height : 120;
        var topH = this.pTop ? this.pTop.getContentSize().height : 50;
        var toolTopY = toolPos.y;                // top of pTool
        var selectorH = toolTopY - botH - topH;         // available height below pTool top

        var containerSize = cc.size(toolW, selectorH);

        this.elementSelector = new ElementSelectorUI(
            containerSize,
            function (type, name) {
                self.selectedType = type;
                self.selectedHP = 1;
                self.activeDynamicBlocker = null;
                self.deleteMode = false;
                self.spawnMode = false;
                self.slotMode = false;
                self._syncModeButtons();
                cc.log("Selected:", name, "type:", type);
            }
        );

        // Position: left edge, from bottom of pTool downward
        var selectorY = botH; // bottom of selector aligns to top of pBottom
        this.elementSelector.setPosition(0, selectorY);
        this.elementSelector.setAnchorPoint(cc.p(0, 0));
        this.rootNode.addChild(this.elementSelector, 5);
    },

    // ─────────────────────────────────────────────────────────────────────────
    // Level Selector popup
    // ─────────────────────────────────────────────────────────────────────────
    setupLevelSelector: function () {
        var self = this;
        this.levelSelector = new LevelSelectorUI(function (levelName) {
            self.loadMapByName(levelName);
        });
        this.levelSelector.setVisible(false);
        this.addChild(this.levelSelector, 100);
    },

    // ─────────────────────────────────────────────────────────────────────────
    // Board interaction callbacks (delegated from BoardEditUI)
    // ─────────────────────────────────────────────────────────────────────────
    // ───────────────────────────────────────────────────────────────────────────────
    // Undo / Redo
    // ───────────────────────────────────────────────────────────────────────────────
    /**
     * Push the current board state onto the undo stack.
     * Clears the redo stack (any new edit invalidates redo history).
     * Caps the stack at MAX_UNDO_STEPS to protect memory.
     */
    pushUndoState: function () {
        if (!this.boardUI) return;
        var snapshot = JSON.stringify(this.boardUI.getMapConfig());
        this._undoStack.push(snapshot);
        if (this._undoStack.length > this.MAX_UNDO_STEPS) {
            this._undoStack.shift(); // drop oldest
        }
        this._redoStack = [];   // new edit invalidates redo branch
    },

    /** Undo the last board change. */
    undo: function () {
        if (!this._undoStack || this._undoStack.length === 0) {
            cc.log("Undo: nothing to undo");
            return;
        }
        // Save current state to redo stack
        var current = JSON.stringify(this.boardUI.getMapConfig());
        this._redoStack.push(current);

        var prev = this._undoStack.pop();
        this.boardUI.loadMapConfig(JSON.parse(prev));
        this.updateMetrics();
        cc.log("Undo applied. Stack size:", this._undoStack.length);
    },

    /** Redo the last undone board change. */
    redo: function () {
        if (!this._redoStack || this._redoStack.length === 0) {
            cc.log("Redo: nothing to redo");
            return;
        }
        // Save current state back to undo stack
        var current = JSON.stringify(this.boardUI.getMapConfig());
        this._undoStack.push(current);
        if (this._undoStack.length > this.MAX_UNDO_STEPS) {
            this._undoStack.shift();
        }

        var next = this._redoStack.pop();
        this.boardUI.loadMapConfig(JSON.parse(next));
        this.updateMetrics();
        cc.log("Redo applied. Stack size:", this._redoStack.length);
    },

    onCellClick: function (row, col, isMove) {
        // Snapshot board state before the FIRST touch on any cell (not drag repeats)
        if (!isMove) {
            this.pushUndoState();
        }

        if (this.spawnMode) {
            if (isMove && row === this.lastRow && col === this.lastCol) return;
            this.lastRow = row; this.lastCol = col;
            var rawSlot = this.boardUI.boardMgr.mapGrid[row] &&
                this.boardUI.boardMgr.mapGrid[row][col];
            if (rawSlot && rawSlot.enable) {
                rawSlot.canSpawn = !rawSlot.canSpawn;
                if (rawSlot.bg) rawSlot.bg.setColor(rawSlot.canSpawn ? cc.color(100, 220, 255) : cc.color(255, 255, 255));
                if (rawSlot.bg2) rawSlot.bg2.setColor(rawSlot.canSpawn ? cc.color(100, 220, 255) : cc.color(255, 255, 255));
            }
            this.updateMetrics();
            return;
        }

        if (this.slotMode) {
            if (isMove && row === this.lastRow && col === this.lastCol) return;
            this.lastRow = row; this.lastCol = col;
            var rawSlot2 = this.boardUI.boardMgr.mapGrid[row] &&
                this.boardUI.boardMgr.mapGrid[row][col];
            if (rawSlot2) {
                this.boardUI.enableSlot(row, col, !rawSlot2.enable);
            }
            this.updateMetrics();
            return;
        }

        if (this.deleteMode) {
            if (isMove && row === this.lastRow && col === this.lastCol) return;
            this.lastRow = row; this.lastCol = col;
            this.boardUI.removeAt(row, col);
            this.activeDynamicBlocker = null;
            this.updateMetrics();
            return;
        }

        if (this.selectedType !== null && this.selectedType !== undefined) {
            if (this._isDynamicBlockerType(this.selectedType)) {
                this._handleDynamicBlockerClick(row, col);
            } else {
                if (this._canPlaceElement(row, col, this.selectedType)) {
                    this.boardUI.addElement(row, col, this.selectedType, this.selectedHP);
                }
            }
            this.updateMetrics();
        }
    },


    _isDynamicBlockerType: function (type) {
        if (type === null || type === undefined) return false;
        var Cls = CoreGame.ElementObject.map[type];
        if (!Cls) return false;
        var proto = Cls.prototype;
        while (proto) {
            if (proto === CoreGame.DynamicBlocker.prototype) return true;
            proto = Object.getPrototypeOf(proto);
        }
        return false;
    },

    _handleDynamicBlockerClick: function (row, col) {
        var slot = this.boardUI.boardMgr.getSlot(row, col);
        if (!slot) {
            var rawSlot = this.boardUI.boardMgr.mapGrid[row] &&
                this.boardUI.boardMgr.mapGrid[row][col];
            if (!rawSlot) return;
            this.boardUI.enableSlot(row, col, true);
            slot = this.boardUI.boardMgr.getSlot(row, col);
            if (!slot) return;
        }
        for (var i = 0; i < slot.listElement.length; i++) {
            if (slot.listElement[i].type === this.selectedType) return;
        }
        if (this.activeDynamicBlocker && this.activeDynamicBlocker.type === this.selectedType) {
            slot.clearElements();
            this.activeDynamicBlocker.addCell({ r: row, c: col });
            this.boardUI.enableSlot(row, col, true);
        } else {
            this.activeDynamicBlocker = this.boardUI.addElement(row, col, this.selectedType, this.selectedHP);
        }
    },

    _canPlaceElement: function (row, col, type) {
        if (type === null || type === undefined) return true;

        var slot = this.boardUI.boardMgr.mapGrid[row] &&
            this.boardUI.boardMgr.mapGrid[row][col];
        if (slot) {
            for (var i = 0; i < slot.listElement.length; i++) {
                if (slot.listElement[i].type === type &&
                    slot.listElement[i].hp === this.selectedHP) return false;
            }
        }

        // Check size bounds
        var preview = null;
        try {
            if (CoreGame.ElementObject.map[type]) {
                preview = CoreGame.ElementObject.create(0, 0, type, 1);
            } else {
                preview = CoreGame.BlockerFactory.createBlocker(0, 0, type, 1);
            }
        } catch (e) { }

        if (preview) {
            var sz = preview.size || cc.size(1, 1);
            if (row + sz.height > this.boardUI.boardMgr.rows ||
                col + sz.width > this.boardUI.boardMgr.cols) return false;
        }
        return true;
    },

    // ─────────────────────────────────────────────────────────────────────────
    // Metrics
    // ─────────────────────────────────────────────────────────────────────────
    updateMetrics: function () {
        if (!this.boardUI || !this.boardUI.boardMgr) return;

        var bm = this.boardUI.boardMgr;
        var active = 0, spawners = 0, blockers = 0, totalHP = 0;

        for (var r = 0; r < bm.rows; r++) {
            for (var c = 0; c < bm.cols; c++) {
                var slot = bm.mapGrid[r] && bm.mapGrid[r][c];
                if (!slot || !slot.enable) continue;
                active++;
                if (slot.canSpawn) spawners++;
                for (var ei = 0; ei < slot.listElement.length; ei++) {
                    var el = slot.listElement[ei];
                    if (el && el.type > 7) {
                        blockers++;
                        totalHP += (el.hp || 1);
                    }
                }
            }
        }

        if (this._lblActiveCells) this._lblActiveCells.setString("" + active);
        if (this._lblSpawners) this._lblSpawners.setString("" + spawners);
        if (this._lblBlockers) this._lblBlockers.setString("" + blockers);
        if (this._lblTotalHP) this._lblTotalHP.setString("" + totalHP);
    },

    // ─────────────────────────────────────────────────────────────────────────
    // Save / Load / Test
    // ─────────────────────────────────────────────────────────────────────────
    saveMap: function () {
        var mapName = this._tfMapName ? this._tfMapName.getString().trim() : "";
        if (!mapName || mapName === "level_xxx") {
            mapName = "map_" + Date.now();
        }

        var mapData = this.boardUI.getMapConfig();

        // Attach moves from pRight
        var moves = parseInt(this.tfMoves ? this.tfMoves.getString() : "30") || 30;
        mapData.numMove = moves;
        mapData.targetElements = this.targetListUI ? this.targetListUI.getEntries() : [];

        // Short description + notes
        mapData.description = this._tfShortDesc ? this._tfShortDesc.getString() : "";
        mapData.notes = this._tfNotes ? this._tfNotes.getString() : "";

        // numTest from pRight Play Test field
        mapData.numTest = parseInt(this._tfPlayTest ? this._tfPlayTest.getString() : "1") || 1;

        var jsonStr = JSON.stringify(mapData, null, 4);
        var filePath = "res/maps/" + mapName + ".json";
        cc.log("SAVE_MAP_DATA: " + filePath + "\n" + jsonStr);

        if (typeof jsb !== "undefined" && jsb.fileUtils) {
            if (jsb.fileUtils.writeStringToFile(jsonStr, filePath)) {
                cc.log("SUCCESS: Saved -> " + filePath);
                this._addMapToList(mapName);
            } else {
                cc.log("ERROR: Failed to save -> " + filePath);
            }
        }
    },

    _addMapToList: function (mapName) {
        var listPath = "res/maps/ListMap.json";
        cc.loader.loadJson(listPath, function (err, mapList) {
            if (err || !mapList) mapList = [];
            if (mapList.indexOf(mapName) === -1) {
                mapList.push(mapName);
                mapList.sort();
                var listStr = JSON.stringify(mapList, null, 4);
                if (typeof jsb !== "undefined" && jsb.fileUtils) {
                    jsb.fileUtils.writeStringToFile(listStr, listPath);
                }
            }
        });
    },

    loadMapByName: function (levelName) {
        var self = this;
        if (this._tfMapName) this._tfMapName.setString(levelName);

        cc.loader.loadJson("res/maps/" + levelName + ".json", function (err, data) {
            if (err || !data) { cc.log("Error loading map:", err); return; }

            self.boardUI.loadMapConfig(data);

            // Restore moves
            if (self.tfMoves && data.numMove !== undefined) {
                self.tfMoves.setString("" + data.numMove);
            }

            // Restore targets
            if (self.targetListUI) self.targetListUI.setEntries(data.targetElements || []);

            // Restore description + notes
            if (self._tfNotes) self._tfNotes.setString(data.notes || "");

            // Restore numTest
            if (self._tfPlayTest) self._tfPlayTest.setString("" + (data.numTest || 1));
            // Restore boardInfoUI
            if (self.boardInfoUI) {
                self.boardInfoUI.setInfo({
                    numMove: data.numMove || 30,
                    targetElements: data.targetElements || [],
                    numTest: data.numTest || 1
                });
            }

            self.updateMetrics();
            cc.log("Loaded map:", levelName);
        });
    },

    testMap: function () {
        var mapData = this.boardUI.getMapConfig();
        var moves = parseInt(this.tfMoves ? this.tfMoves.getString() : "30") || 30;
        mapData.numMove = moves;
        mapData.targetElements = this.targetListUI ? this.targetListUI.getEntries() : [];
        mapData.levelId = 0;
        mapData.reward = 100;

        mapData.numTest = parseInt(this._tfPlayTest ? this._tfPlayTest.getString() : "1") || 1;

        // Switch to portrait (game) resolution before running GameUI
        this._applyResolution(false);

        var scene = new cc.Scene();
        CoreGame.BoardUI.instance = null;
        scene.addChild(new CoreGame.GameUI({ mapConfig: mapData }));
        cc.director.runScene(scene);
    },

    /**
     * Apply landscape (editor) or portrait (game) resolution.
     * Editor uses swapped width↔height (landscape).
     * Game uses normal portrait dimensions.
     * @param {boolean} landscape
     */
    _applyResolution: function (landscape) {
        var cfg = fr.ClientConfig.getInstance();
        var designSize = cfg.getDesignResolutionSize();
        var frameSize = cc.view.getFrameSize();
        var tabletRatio = 1.34;

        var policy = cc.ResolutionPolicy.FIXED_WIDTH;
        if (frameSize.height / frameSize.width < tabletRatio) {
            policy = cc.ResolutionPolicy.FIXED_HEIGHT;
        }

        if (landscape) {
            // Landscape: swap width ↔ height so the wider dimension is horizontal
            cc.view.setDesignResolutionSize(designSize.height, designSize.width, policy);
        } else {
            // Portrait: use standard game resolution (taller than wide)
            cc.view.setDesignResolutionSize(designSize.width, designSize.height, policy);
        }

        cfg.detectResourceFromScreenSize();
        cc.director.setContentScaleFactor(cfg.getResourceScale());
        cfg.updateResourceSearchPath();

        cc.log("[Resolution] " + (landscape ? "Landscape" : "Portrait") +
            " -> " + cc.winSize.width.toFixed(0) + "x" + cc.winSize.height.toFixed(0));
    },

    runDifficultyTest: function () {
        if (!this.boardInfoUI) return;
        var info = this.boardInfoUI.getInfo();

        var boardMgr = this.boardUI && this.boardUI.boardMgr;
        if (!boardMgr) { cc.log("[DiffCalc] No boardMgr"); return; }

        CoreGame.DifficultyCalc.NUM_EPISODES = info.numTest || 5;
        var targets = {};
        (info.targetElements || []).forEach(function (t) { targets[t.id] = t.count; });

        var self = this;
        CoreGame.FakeUI.start();
        CoreGame.DifficultyCalc.calculate(
            boardMgr,
            { maxMoves: info.numMove || 30, targets: targets },
            null,
            function (report) {
                CoreGame.FakeUI.restore();
                var dialog = new BenchDiffDialog(report);
                self.addChild(dialog, 1000);
                dialog.show();
            }
        );
    },

    // ─────────────────────────────────────────────────────────────────────────
    // Lifecycle
    // ─────────────────────────────────────────────────────────────────────────
    onExit: function () {
        this._super();
        EditMapSceneNew.instance = null;
    }
});

EditMapSceneNew.instance = null;
EditMapSceneNew.getInstance = function () {
    if (!EditMapSceneNew.instance) {
        EditMapSceneNew.instance = new EditMapSceneNew();
        EditMapSceneNew.instance.retain();
    } else if (EditMapSceneNew.instance.getParent()) {
        EditMapSceneNew.instance.removeFromParent(false);
    }
    return EditMapSceneNew.instance;
};
