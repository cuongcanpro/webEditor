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
    _btnHeatMap: null,
    _heatmapOn: false,

    // Metrics labels
    _lblActiveCells: null,
    _lblSpawners: null,
    _lblBlockers: null,
    _lblTotalHP: null,
    _lblDensity: null,

    // Right-panel game config fields
    _tfTPP: null,
    _spawnStrategyKey: "RandomSpawnStrategy",
    _btnSpawnStrategy: null,
    _tfTargetMove: null,
    _agentKey: "GreedyBot",
    _btnAgent: null,
    _tfSaveName: null,

    // Gem color selector
    _gemColorActive: null,   // [bool x6] — which gem types (1-6) are allowed to spawn
    _colorButtons: null,     // [ccui.Button x6]
    _GEM_COLORS: [
        cc.color(220, 60,  60),   // 1 Red
        cc.color(60,  120, 220),  // 2 Blue
        cc.color(60,  200, 80),   // 3 Green
        cc.color(220, 200, 50),   // 4 Yellow
        cc.color(160, 60,  220),  // 5 Purple
        cc.color(220, 130, 40),   // 6 Orange
    ],

    // Max moves used in the difficulty simulation (fixed safety cap)
    MAX_SIM_MOVES: 100,

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

    /**
     * Reload or rebuild the element selector list.
     * - If the ElementSelectorUI provides a reload/reloadElements API, call it.
     * - Otherwise destroy and recreate the selector via setupElementSelector().
     */
    reloadElementSelector: function () {
        try {
            if (this.elementSelector) {
                if (typeof this.elementSelector.reload === 'function') {
                    this.elementSelector.reload();
                    return;
                }
                if (typeof this.elementSelector.reloadElements === 'function') {
                    this.elementSelector.reloadElements();
                    return;
                }
                // Fallback: remove and recreate
                this.elementSelector.removeFromParent(true);
                this.elementSelector = null;
            }
        } catch (e) {
            cc.log("reloadElementSelector error:", e);
        }
        // Rebuild selector UI
        this.setupElementSelector();
    },

    onEnter: function () {
        this._super();
        this._applyResolution(true);
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

            // pBottom removed — all sections now live in pRight (built programmatically)

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
        var offX = this.boardUI.boardMgr ? this.boardUI.boardMgr.boardOffsetX : 0;
        var offY = this.boardUI.boardMgr ? this.boardUI.boardMgr.boardOffsetY : 0;
        this.saveOffsetX = offX;
        this.saveOffsetY = offY;
        // Panel geometry (resolved after doLayout)
        var topH = this.pTop ? this.pTop.getContentSize().height : 50;
        var toolW = this.pTool ? this.pTool.getContentSize().width : 200;
        var rightW = this.pRight ? this.pRight.getContentSize().width : 200;
        var botH = this.pBottom ? this.pBottom.getContentSize().height : 0;
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
    // pTop — toolbar: title + New/Import/Export/Undo/Redo/Heatmap/Index/Play Test
    // ─────────────────────────────────────────────────────────────────────────
    setupToolbar: function () {
        var self = this;
        if (!this.pTop) return;

        // "M3 Editor v2.3" title label on left
        // var topH = this.pTop.getContentSize().height;
        // var title = new ccui.Text("M3 Editor v2.3", "font/BalooPaaji2-Regular.ttf", 13);
        // title.setColor(cc.color(160, 180, 220));
        // title.setAnchorPoint(cc.p(0, 0.5));
        // title.setPosition(8, topH / 2);
        // this.pTop.addChild(title, 3);

        var pFunc = this.pTop.getChildByName("pFunction");
        if (pFunc) {
            var btnNew = UIUtils.seekWidgetByName(pFunc, "btnNew");
            var btnLoad = UIUtils.seekWidgetByName(pFunc, "btnLoad");
            var btnSave = UIUtils.seekWidgetByName(pFunc, "btnSave");
            var btnPlay = UIUtils.seekWidgetByName(pFunc, "btnPlay");
            var btnHeatMap = UIUtils.seekWidgetByName(pFunc, "btnHeatMap");
            var btnUndo = UIUtils.seekWidgetByName(pFunc, "btnUndo");
            var btnRedo = UIUtils.seekWidgetByName(pFunc, "btnRedo");

            // Visual styling
            if (btnSave) { btnSave.setColor(cc.color(40, 110, 220)); }
            if (btnPlay) { btnPlay.setColor(cc.color(35, 170, 75)); }

            // Handlers
            if (btnNew) {
                btnNew.addTouchEventListener(function (sender, type) {
                    if (type === ccui.Widget.TOUCH_ENDED) {
                        self.boardUI.removeAllElements();
                        self._targetEntries = [];
                        if (self.targetListUI) self.targetListUI.setEntries([]);
                        self.updateMetrics();
                    }
                });
            }
            if (btnLoad) {
                btnLoad.addTouchEventListener(function (sender, type) {
                    if (type === ccui.Widget.TOUCH_ENDED) {
                        if (!cc.sys.isNative) {
                            self.loadMapFromFile();
                        } else if (self.levelSelector) {
                            self.levelSelector.show();
                        }
                    }
                });
            }
            if (btnSave) {
                btnSave.addTouchEventListener(function (sender, type) {
                    if (type === ccui.Widget.TOUCH_ENDED) { self.saveMap(); }
                });
            }
            if (btnPlay) {
                btnPlay.addTouchEventListener(function (sender, type) {
                    if (type === ccui.Widget.TOUCH_ENDED) { self.testMap(); }
                });
            }
            if (btnHeatMap) {
                self._btnHeatMap = btnHeatMap;
                btnHeatMap.addTouchEventListener(function (sender, type) {
                    if (type === ccui.Widget.TOUCH_ENDED) { self.showHeatmap(); }
                });
            }
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

            // "Index" button — programmatic, placed after btnRedo
            var redoPos = btnRedo ? btnRedo.getPosition() : cc.p(544, 25);
            var btnIndex = new ccui.Button();
            btnIndex.setScale9Enabled(true);
            btnIndex.setContentSize(80, 50);
            btnIndex.setTitleText("Index");
            btnIndex.setTitleFontSize(14);
            btnIndex.setTitleColor(cc.color(209, 209, 217));
            btnIndex.setPosition(redoPos.x + 84, redoPos.y);
            btnIndex.addTouchEventListener(function (sender, type) {
                if (type === ccui.Widget.TOUCH_ENDED) {
                    if (self.levelSelector) self.levelSelector.show();
                }
            });
            pFunc.addChild(btnIndex);
        }

        var pName = this.pTop.getChildByName("pNameLevel");
        if (pName) {
            this.tfLevelName = UIUtils.seekWidgetByName(pName, "tfLevelName");
        }
    },

    showHeatmap: function () {
        if (!this.boardUI) return;

        this._heatmapOn = !this._heatmapOn;

        if (this._heatmapOn) {
            this.boardUI.refreshHeatmap();
            if (this.boardUI._heatmapContainer) {
                this.boardUI._heatmapContainer.setVisible(true);
            }
        } else {
            if (this.boardUI._heatmapContainer) {
                this.boardUI._heatmapContainer.setVisible(false);
            }
        }

        if (this._btnHeatMap) {
            this._btnHeatMap.setColor(this._heatmapOn ? cc.color(255, 200, 40) : cc.color(255, 255, 255));
        }
        cc.log("[EditMap] Heatmap " + (this._heatmapOn ? "ON" : "OFF"));
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
    // pRight — full sidebar with 6 stacked sections (built programmatically)
    // ─────────────────────────────────────────────────────────────────────────
    setupRightPanel: function () {
        if (!this.pRight) return;

        // Drop JSON-defined children and rebuild from scratch
        this.pRight.removeAllChildren();

        var W = this.pRight.getContentSize().width;
        var H = this.pRight.getContentSize().height;
        // pTop overlaps the top ~50px of pRight (higher z-order), so reserve that space
        var topH = this.pTop ? this.pTop.getContentSize().height : 50;
        var curY = H - topH; // start sections just below pTop

        // ── 1. OBJECTIVE ─────────────────────────────────────────────────
        var objH = 100;
        curY -= objH;
        var pObj = this._makeRightPanel(W, objH, curY);
        this.pRight.addChild(pObj);
        this.targetListUI = new TargetListUI(pObj);

        // ── 2. GEM COLORS ─────────────────────────────────────────────────
        var gemH = 76;
        curY -= gemH;
        var pGem = this._makeRightPanel(W, gemH, curY, cc.color(22, 30, 55));
        this.pRight.addChild(pGem);
        this._buildGemColorSection(pGem);

        // ── 3. GAME CONFIG (Turn / TPP / Spawn / TargetMove) ─────────────
        var cfgH = 118;
        curY -= cfgH;
        var pCfg = this._makeRightPanel(W, cfgH, curY, cc.color(25, 32, 58));
        this.pRight.addChild(pCfg);
        cc.log("Build game config section at y=" + curY);
        this._buildGameConfigSection(pCfg);
        cc.log("Build game config section done");

        // ── 3. METRICS ────────────────────────────────────────────────────
        var metH = 106;
        curY -= metH;
        var pMet = this._makeRightPanel(W, metH, curY);
        this.pRight.addChild(pMet);
        this._buildMetricsSection(pMet);

        // ── 4. RUN TEST ───────────────────────────────────────────────────
        var runH = 114;
        curY -= runH;
        var pRun = this._makeRightPanel(W, runH, curY);
        this.pRight.addChild(pRun);
        this._buildRunTestSection(pRun);

        // ── 5. MAP NAME / NOTES ───────────────────────────────────────────
        var noteH = 88;
        curY -= noteH;
        var pNote = this._makeRightPanel(W, noteH, curY, cc.color(25, 32, 58));
        this.pRight.addChild(pNote);
        this._buildMapNoteSection(pNote);

        // ── 6. SAVE LEVEL ─────────────────────────────────────────────────
        var saveH = 76;
        curY -= saveH;
        var pSave = this._makeRightPanel(W, saveH, curY, cc.color(25, 32, 58));
        this.pRight.addChild(pSave);
        this._buildSaveLevelSection(pSave);

        // BoardInfoUI overlay kept for compatibility
        this.boardInfoUI = new BoardInfoUI(null);
        this.addChild(this.boardInfoUI, 101);
    },

    _makeRightPanel: function (w, h, y, bgColor) {
        var panel = new ccui.Layout();
        panel.setBackGroundColorType(ccui.Layout.BG_COLOR_SOLID);
        panel.setBackGroundColor(bgColor || cc.color(21, 28, 53));
        panel.setContentSize(w, h);
        panel.setAnchorPoint(cc.p(0, 0));
        panel.setPosition(0, y);
        return panel;
    },

    _makeSectionHeader: function (parent, title) {
        var W = parent.getContentSize().width;
        var HDR_H = 22;
        var hdr = new ccui.Layout();
        hdr.setBackGroundColorType(ccui.Layout.BG_COLOR_SOLID);
        hdr.setBackGroundColor(cc.color(28, 35, 60));
        hdr.setContentSize(W, HDR_H);
        hdr.setAnchorPoint(cc.p(0, 1));
        hdr.setPosition(0, parent.getContentSize().height);
        parent.addChild(hdr, 1);

        var lb = new ccui.Text(title, "font/BalooPaaji2-Regular.ttf", 11);
        lb.setColor(cc.color(160, 180, 220));
        lb.setAnchorPoint(cc.p(0, 0.5));
        lb.setPosition(6, HDR_H / 2);
        hdr.addChild(lb);
        return hdr;
    },

    _makeField: function (parent, placeholder, x, y, w, h) {
        h = h || 20;
        var bg = new ccui.Scale9Sprite("res/tool/res/bgTf.png");
        bg.setContentSize(w, h);
        bg.setAnchorPoint(cc.p(0, 0.5));
        bg.setPosition(x, y);
        parent.addChild(bg, 0);

        var tf = new ccui.TextField(placeholder, "font/BalooPaaji2-Regular.ttf", 12);
        tf.setContentSize(w, h);
        tf.setAnchorPoint(cc.p(0, 0.5));
        tf.setPosition(x, y);
        parent.addChild(tf, 1);
        return tf;
    },

    _buildGameConfigSection: function (panel) {
        var W = panel.getContentSize().width;
        var H = panel.getContentSize().height;
        var HDR_H = 22;
        var LBL_W = 52;
        var TF_X = LBL_W + 6;
        var TF_W = W - TF_X - 6;
        var ROW = 21;

        this._makeSectionHeader(panel, "GAME CONFIG");

        // Turn
        var y1 = H - HDR_H - 13;
        var lb1 = new ccui.Text("Turn:", "font/BalooPaaji2-Regular.ttf", 12);
        lb1.setColor(cc.color(170, 170, 190)); lb1.setAnchorPoint(cc.p(0, 0.5));
        lb1.setPosition(6, y1); panel.addChild(lb1, 1);
        this.tfMoves = this._makeField(panel, "30", TF_X, y1, TF_W, ROW);
        this.tfMoves.setString("30");

        // TPP
        var y2 = y1 - ROW - 5;
        var lb2 = new ccui.Text("TPP:", "font/BalooPaaji2-Regular.ttf", 12);
        lb2.setColor(cc.color(170, 170, 190)); lb2.setAnchorPoint(cc.p(0, 0.5));
        lb2.setPosition(6, y2); panel.addChild(lb2, 1);
        this._tfTPP = this._makeField(panel, "1.0", TF_X, y2, TF_W, ROW);
        this._tfTPP.setString("1.0");

        // TargetMove (hidden difficulty metric — not shown to players)
        var y3 = y2 - ROW - 5;
        var lb3tm = new ccui.Text("TgtMove:", "font/BalooPaaji2-Regular.ttf", 12);
        lb3tm.setColor(cc.color(150, 150, 120)); lb3tm.setAnchorPoint(cc.p(0, 0.5));
        lb3tm.setPosition(6, y3); panel.addChild(lb3tm, 1);
        this._tfTargetMove = this._makeField(panel, "0", TF_X, y3, TF_W, ROW);
        this._tfTargetMove.setString("0");

        // Spawn
        var y4 = y3 - ROW - 5;
        var lb3 = new ccui.Text("Spawn:", "font/BalooPaaji2-Regular.ttf", 12);
        lb3.setColor(cc.color(170, 170, 190)); lb3.setAnchorPoint(cc.p(0, 0.5));
        lb3.setPosition(6, y4); panel.addChild(lb3, 1);
        this._btnSpawnStrategy = new ccui.Button();
        this._btnSpawnStrategy.loadTextureNormal("res/tool/res/bgTf.png");
        this._btnSpawnStrategy.setScale9Enabled(true);
        this._btnSpawnStrategy.setContentSize(TF_W, ROW);
        this._btnSpawnStrategy.setAnchorPoint(cc.p(0, 0.5));
        this._btnSpawnStrategy.setPosition(TF_X, y4);
        this._btnSpawnStrategy.setTitleText(this._spawnStrategyKey);
        this._btnSpawnStrategy.setTitleFontSize(11);
        this._btnSpawnStrategy.setTitleColor(cc.color(220, 220, 255));
        // this._btnSpawnStrategy.setTitleAlignment(cc.TEXT_ALIGNMENT_LEFT);
        panel.addChild(this._btnSpawnStrategy, 1);
        var self = this;
        this._btnSpawnStrategy.addTouchEventListener(function (sender, type) {
            if (type !== ccui.Widget.TOUCH_ENDED) return;
            var dialog = new DifficultyDialog(function (key) {
                self._spawnStrategyKey = key;
                self._btnSpawnStrategy.setTitleText(key);
            });
            cc.director.getRunningScene().addChild(dialog, 999);
            dialog.show();
        });
    },

    _buildGemColorSection: function (panel) {
        var W = panel.getContentSize().width;
        var H = panel.getContentSize().height;
        var HDR_H = 22;
        var PAD = 6;
        var GAP = 3;
        var btnSize = Math.floor((W - PAD * 2 - GAP * 5) / 6);
        var imgScale = (btnSize - 4) / 64; // gem sprites are ~64px natural size

        this._makeSectionHeader(panel, "GEM COLORS");
        this._gemColorActive = [true, true, true, true, true, true];
        this._colorButtons = [];

        var btnY = H - HDR_H - PAD - btnSize / 2;
        var self = this;

        for (var i = 0; i < 6; i++) {
            // Background panel — green = active, dark = inactive
            var bg = new ccui.Layout();
            bg.setBackGroundColorType(ccui.Layout.BG_COLOR_SOLID);
            bg.setBackGroundColor(cc.color(30, 120, 30));
            bg.setContentSize(btnSize, btnSize);
            bg.setAnchorPoint(cc.p(0, 0.5));
            bg.setPosition(PAD + i * (btnSize + GAP), btnY);
            panel.addChild(bg, 1);
            this._colorButtons.push(bg);

            // Gem image
            var gemSprite = new cc.Sprite("res/high/game/element/" + (i + 1) + ".png");
            if (gemSprite) {
                gemSprite.setScale(imgScale);
                gemSprite.setPosition(btnSize / 2, btnSize / 2);
                bg.addChild(gemSprite, 1);
            }

            // Touch listener
            (function (idx, bgNode) {
                var listener = cc.EventListener.create({
                    event: cc.EventListener.TOUCH_ONE_BY_ONE,
                    swallowTouches: true,
                    onTouchBegan: function (touch, event) {
                        var loc = bgNode.convertToNodeSpace(touch.getLocation());
                        var sz = bgNode.getContentSize();
                        return cc.rectContainsPoint(cc.rect(0, 0, sz.width, sz.height), loc);
                    },
                    onTouchEnded: function (touch, event) {
                        self._gemColorActive[idx] = !self._gemColorActive[idx];
                        self._updateGemColorBtn(bgNode, self._gemColorActive[idx]);
                    }
                });
                cc.eventManager.addListener(listener, bgNode);
            })(i, bg);
        }

        // Count label "X/6" at bottom-right
        this._lblGemCount = new ccui.Text("6/6", "font/BalooPaaji2-Regular.ttf", 10);
        this._lblGemCount.setColor(cc.color(160, 180, 220));
        this._lblGemCount.setAnchorPoint(cc.p(1, 0.5));
        this._lblGemCount.setPosition(W - 4, 8);
        panel.addChild(this._lblGemCount, 1);
    },

    _updateGemColorBtn: function (bgNode, active) {
        bgNode.setBackGroundColor(active ? cc.color(30, 120, 30) : cc.color(30, 30, 30));
        // Dim gem sprite inside
        var children = bgNode.getChildren();
        for (var k = 0; k < children.length; k++) {
            children[k].setOpacity(active ? 255 : 70);
        }
        // Update count label
        if (this._gemColorActive && this._lblGemCount) {
            var count = 0;
            for (var i = 0; i < this._gemColorActive.length; i++) {
                if (this._gemColorActive[i]) count++;
            }
            this._lblGemCount.setString(count + "/6");
        }
    },

    _buildMetricsSection: function (panel) {
        var W = panel.getContentSize().width;
        var H = panel.getContentSize().height;
        var HDR_H = 22;
        var ROW = 18;

        this._makeSectionHeader(panel, "METRICS");

        var lines = [
            { key: "_lblActiveCells", label: "Cells:", yellow: false },
            { key: "_lblBlockers", label: "Blockers:", yellow: false },
            { key: "_lblTotalHP", label: "Total HP:", yellow: false },
            { key: "_lblDensity", label: "Density:", yellow: true }
        ];

        for (var i = 0; i < lines.length; i++) {
            var yPos = H - HDR_H - 14 - i * (ROW + 3);

            var lbKey = new ccui.Text(lines[i].label, "font/BalooPaaji2-Regular.ttf", 12);
            lbKey.setColor(cc.color(170, 170, 180));
            lbKey.setAnchorPoint(cc.p(0, 0.5));
            lbKey.setPosition(6, yPos);
            panel.addChild(lbKey, 1);

            var lbVal = new ccui.Text("0", "font/BalooPaaji2-Regular.ttf", 12);
            lbVal.setColor(lines[i].yellow ? cc.color(255, 215, 70) : cc.color(255, 220, 100));
            lbVal.setAnchorPoint(cc.p(1, 0.5));
            lbVal.setPosition(W - 5, yPos);
            panel.addChild(lbVal, 1);

            this[lines[i].key] = lbVal;
        }
        this._lblSpawners = null; // not shown in new layout
        this.updateMetrics();
    },

    _buildMapNoteSection: function (panel) {
        var W = panel.getContentSize().width;
        var H = panel.getContentSize().height;
        var HDR_H = 22;
        var TF_W = W - 10;

        this._makeSectionHeader(panel, "MAP NAME / NOTES");

        var y1 = H - HDR_H - 13;
        this._tfMapName = this._makeField(panel, "level_xxx", 5, y1, TF_W, 20);

        var noteH = H - HDR_H - 38;
        var bgNotes = new ccui.Scale9Sprite("res/tool/res/bgTf.png");
        bgNotes.setContentSize(TF_W, noteH);
        bgNotes.setAnchorPoint(cc.p(0, 0));
        bgNotes.setPosition(5, 4);
        panel.addChild(bgNotes, 0);

        var tfNotes = new ccui.TextField("Designer notes...", "font/BalooPaaji2-Regular.ttf", 11);
        tfNotes.setContentSize(TF_W, noteH);
        tfNotes.setAnchorPoint(cc.p(0, 0));
        tfNotes.setPosition(5, 4);
        panel.addChild(tfNotes, 1);
        this._tfNotes = tfNotes;
    },

    _buildRunTestSection: function (panel) {
        var self = this;
        var W = panel.getContentSize().width;
        var H = panel.getContentSize().height;
        var HDR_H = 22;
        var LBL_W = 58;
        var TF_X = LBL_W + 6;
        var TF_W = W - TF_X - 6;
        var ROW = 21;
        var BTN_H = 26;

        this._makeSectionHeader(panel, "RUN TEST");

        // Agent
        var AGENT_KEYS = Object.keys(CoreGame.Bots || {});
        var y1 = H - HDR_H - 13;
        var lb1 = new ccui.Text("Agent:", "font/BalooPaaji2-Regular.ttf", 12);
        lb1.setColor(cc.color(170, 170, 190)); lb1.setAnchorPoint(cc.p(0, 0.5));
        lb1.setPosition(6, y1); panel.addChild(lb1, 1);
        this._btnAgent = new ccui.Button();
        this._btnAgent.loadTextureNormal("res/tool/res/bgTf.png");
        this._btnAgent.setScale9Enabled(true);
        this._btnAgent.setContentSize(TF_W, ROW);
        this._btnAgent.setAnchorPoint(cc.p(0, 0.5));
        this._btnAgent.setPosition(TF_X, y1);
        this._btnAgent.setTitleText(this._agentKey);
        this._btnAgent.setTitleFontSize(11);
        this._btnAgent.setTitleColor(cc.color(220, 220, 255));
        panel.addChild(this._btnAgent, 1);
        this._btnAgent.addTouchEventListener(function (sender, type) {
            if (type !== ccui.Widget.TOUCH_ENDED) return;
            var dialog = new SelectDialog("Select Agent", AGENT_KEYS, function (key) {
                self._agentKey = key;
                self._btnAgent.setTitleText(key);
            });
            cc.director.getRunningScene().addChild(dialog, 999);
            dialog.show();
        });

        // Episodes
        var y2 = y1 - ROW - 5;
        var lb2 = new ccui.Text("Episodes:", "font/BalooPaaji2-Regular.ttf", 12);
        lb2.setColor(cc.color(170, 170, 190)); lb2.setAnchorPoint(cc.p(0, 0.5));
        lb2.setPosition(6, y2); panel.addChild(lb2, 1);
        this._tfPlayTest = this._makeField(panel, "1", TF_X, y2, TF_W, ROW);
        this._tfPlayTest.setString("1");

        // Run Test button
        var btnY = y2 - ROW / 2 - BTN_H / 2 - 4;
        var btnRun = new ccui.Button();
        btnRun.setScale9Enabled(true);
        btnRun.setContentSize(W - 12, BTN_H);
        btnRun.setTitleText("Run Test");
        btnRun.setTitleFontSize(13);
        btnRun.setColor(cc.color(40, 100, 210));
        btnRun.setAnchorPoint(cc.p(0, 0.5));
        btnRun.setPosition(6, btnY);
        btnRun.addTouchEventListener(function (sender, type) {
            if (type === ccui.Widget.TOUCH_ENDED) self.runDifficultyTest();
        });
        panel.addChild(btnRun, 1);
    },

    _buildSaveLevelSection: function (panel) {
        var self = this;
        var W = panel.getContentSize().width;
        var H = panel.getContentSize().height;
        var HDR_H = 22;
        var BTN_H = 26;

        this._makeSectionHeader(panel, "SAVE LEVEL");

        // Filename + ".json" label
        var jsonW = 36;
        var tfW = W - 10 - jsonW - 2;
        var y1 = H - HDR_H - 13;
        this._tfSaveName = this._makeField(panel, "level_xxx", 5, y1, tfW, 20);

        var lbJson = new ccui.Text(".json", "font/BalooPaaji2-Regular.ttf", 11);
        lbJson.setColor(cc.color(140, 145, 160));
        lbJson.setAnchorPoint(cc.p(0, 0.5));
        lbJson.setPosition(5 + tfW + 3, y1);
        panel.addChild(lbJson, 1);

        // Save button
        var btnSave = new ccui.Button();
        btnSave.setScale9Enabled(true);
        btnSave.setContentSize(W - 12, BTN_H);
        btnSave.setTitleText("Save to .json");
        btnSave.setTitleFontSize(13);
        btnSave.setColor(cc.color(40, 100, 210));
        btnSave.setAnchorPoint(cc.p(0, 0.5));
        btnSave.setPosition(6, BTN_H / 2 + 3);
        btnSave.addTouchEventListener(function (sender, type) {
            if (type === ccui.Widget.TOUCH_ENDED) self.saveMap();
        });
        panel.addChild(btnSave, 1);
    },

    // pBottom removed — all sections now live in pRight (see setupRightPanel)
    setupBottomBar: function () { },
    _setupTargetPanel: function () { },
    _setupMapNotePanel: function () { },
    _setupMetricPanel: function () { },

    // ─────────────────────────────────────────────────────────────────────────
    // Element Selector — injected into a new ScrollView below pTool
    // ─────────────────────────────────────────────────────────────────────────
    setupElementSelector: function () {
        var self = this;
        if (!this.pTool) return;

        var toolW = this.pTool.getContentSize().width;
        var toolPos = this.pTool.getPosition();
        var botH = 0; // no bottom panel
        var topH = this.pTop ? this.pTop.getContentSize().height : 50;
        var CREATE_BTN_H = 38;
        var toolTopY = toolPos.y;
        var selectorH = toolTopY - botH - topH - CREATE_BTN_H;

        var containerSize = cc.size(toolW, selectorH);

        // SetElementConfigUI popup
        this.setElementConfigUI = new SetElementConfigUI(function (hp) {
            self.selectedHP = hp;
            cc.log("HP changed to:", hp);
        });
        this.setElementConfigUI.setPosition(cc.winSize.width / 2, cc.winSize.height / 2);
        this.setElementConfigUI.setAnchorPoint(cc.p(0.5, 0.5));
        this.addChild(this.setElementConfigUI, 1000);

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
                if (self.setElementConfigUI) {
                    self.setElementConfigUI.setElement(type);
                }
            }
        );

        var selectorY = botH + CREATE_BTN_H;
        this.elementSelector.setPosition(0, selectorY);
        this.elementSelector.setAnchorPoint(cc.p(0, 0));
        this.rootNode.addChild(this.elementSelector, 5);

        // "+ Create Blocker / Monster" fixed button at bottom of left sidebar
        var btnCreate = new ccui.Button();
        btnCreate.setScale9Enabled(true);
        btnCreate.setContentSize(toolW - 4, CREATE_BTN_H - 6);
        btnCreate.setTitleText("+ Create Blocker / Monster");
        btnCreate.setTitleFontSize(11);
        btnCreate.setColor(cc.color(160, 35, 35));
        btnCreate.setAnchorPoint(cc.p(0, 0));
        btnCreate.setPosition(2, botH + 3);
        btnCreate.addTouchEventListener(function (sender, type) {
            if (type === ccui.Widget.TOUCH_ENDED) {
                GeminiDialog.show(function () {
                    // Called when the dialog is closed (X or Manual Tool button)
                    self.reloadElementSelector();
                });
            }
        });
        this.rootNode.addChild(btnCreate, 5);

        // Refresh button to reload element list (useful after adding new blockers/elements)
        var btnRefresh = new ccui.Button();
        btnRefresh.setScale9Enabled(true);
        btnRefresh.setContentSize(80, CREATE_BTN_H - 6);
        btnRefresh.setTitleText("Refresh");
        btnRefresh.setTitleFontSize(11);
        btnRefresh.setColor(cc.color(100, 200, 120));
        btnRefresh.setAnchorPoint(cc.p(0, 0));
        btnRefresh.setPosition(20 + (toolW - 4) - 80, botH + 3);
        btnRefresh.addTouchEventListener(function (sender, type) {
            if (type === ccui.Widget.TOUCH_ENDED) {
                self.reloadElementSelector();
            }
        });
        this.rootNode.addChild(btnRefresh, 5);
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
                //this.boardUI.refreshGrid();
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
          //  this.boardUI.refreshGrid();
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
           // this.boardUI.refreshGrid();
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

            // OVERLAY elements (e.g. Chain) must be placed on a slot that has a CONTENT element (GEM)
            if (preview.layerBehavior === CoreGame.LayerBehavior.OVERLAY) {
                var contentElement = null;
                if (slot && slot.enable) {
                    for (var i = 0; i < slot.listElement.length; i++) {
                        var lb = (typeof slot.listElement[i].layerBehavior !== 'undefined') ?
                            slot.listElement[i].layerBehavior : CoreGame.LayerBehavior.CONTENT;
                        if (lb === CoreGame.LayerBehavior.CONTENT) {
                            contentElement = slot.listElement[i];
                            break;
                        }
                    }
                }
                // No GEM in slot → cannot place OVERLAY
                if (!contentElement) return false;
                // Already has same OVERLAY type attached → cannot place another
                for (var j = 0; j < contentElement.attachments.length; j++) {
                    if (contentElement.attachments[j].type === type) return false;
                }
            }
        }
        return true;
    },

    // ─────────────────────────────────────────────────────────────────────────
    // Metrics
    // ─────────────────────────────────────────────────────────────────────────
    updateMetrics: function () {
        if (!this.boardUI || !this.boardUI.boardMgr) return;

        var bm = this.boardUI.boardMgr;
        var active = 0, blockers = 0, totalHP = 0;

        for (var r = 0; r < bm.rows; r++) {
            for (var c = 0; c < bm.cols; c++) {
                var slot = bm.mapGrid[r] && bm.mapGrid[r][c];
                if (!slot || !slot.enable) continue;
                active++;
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
        if (this._lblBlockers) this._lblBlockers.setString("" + blockers);
        if (this._lblTotalHP) this._lblTotalHP.setString("" + totalHP);
        if (this._lblDensity) {
            var density = active > 0 ? (totalHP / active).toFixed(1) : "0";
            this._lblDensity.setString(totalHP + " (" + density + "/cell)");
        }
    },

    // ─────────────────────────────────────────────────────────────────────────
    // Save / Load / Test
    // ─────────────────────────────────────────────────────────────────────────
    saveMap: function () {
        var mapName = this._tfSaveName ? this._tfSaveName.getString().trim() : "";
        if (!mapName || mapName === "level_xxx") {
            mapName = this._tfMapName ? this._tfMapName.getString().trim() : "";
        }
        if (!mapName || mapName === "level_xxx") {
            mapName = "map_" + Date.now();
        }

        var mapData = this.boardUI.getMapConfig();

        var moves = parseInt(this.tfMoves ? this.tfMoves.getString() : "30") || 30;
        mapData.numMove = moves;
        mapData.targetElements = this.targetListUI ? this.targetListUI.getEntries() : [];
        mapData.notes = this._tfNotes ? this._tfNotes.getString() : "";
        mapData.numTest = parseInt(this._tfPlayTest ? this._tfPlayTest.getString() : "50") || 50;
        mapData.tpp = parseFloat(this._tfTPP ? this._tfTPP.getString() : "1.0") || 1.0;
        mapData.targetMove = parseInt(this._tfTargetMove ? this._tfTargetMove.getString() : "0") || 0;
        mapData.spawnStrategy = this._spawnStrategyKey || "";
        mapData.agentType = this._agentKey || "GreedyBot";
        var gemTypes = [];
        if (this._gemColorActive) {
            for (var gi = 0; gi < this._gemColorActive.length; gi++) {
                if (this._gemColorActive[gi]) gemTypes.push(gi + 1);
            }
        }
        mapData.gemTypes = gemTypes.length > 0 ? gemTypes : [1, 2, 3, 4, 5, 6];

        var jsonStr = JSON.stringify(mapData, null, 4);
        var filePath = "res/maps/" + mapName + ".json";
        cc.log("SAVE_MAP_DATA: " + filePath + "\n" + jsonStr);

        if (!cc.sys.isNative) {
            // Web: Trigger file download
            var url = "data:application/json;charset=utf-8," + encodeURIComponent(jsonStr);
            var a = document.createElement("a");
            a.style.display = "none";
            a.href = url;
            a.download = mapName + ".json";
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            cc.log("SUCCESS: Download triggered for " + mapName + ".json");
        } else if (typeof jsb !== "undefined" && jsb.fileUtils) {
            // Native: Save to file system
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
        cc.loader.loadJson("res/maps/" + levelName + ".json", function (err, data) {
            if (err || !data) { cc.log("Error loading map:", err); return; }
            self._applyMapContent(data, levelName);
        });
    },

    /**
     * Load map from a local JSON file (Web only)
     */
    loadMapFromFile: function () {
        var self = this;
        if (cc.sys.isNative) return;

        var input = document.createElement("input");
        input.type = "file";
        input.accept = ".json";
        input.onchange = function (event) {
            var file = event.target.files[0];
            if (!file) return;

            var reader = new FileReader();
            reader.onload = function (e) {
                var content = e.target.result;
                try {
                    var data = JSON.parse(content);
                    var mapName = file.name.replace(".json", "");
                    self._applyMapContent(data, mapName);
                    cc.log("SUCCESS: Loaded " + file.name);
                } catch (err) {
                    cc.log("ERROR: Invalid JSON file");
                }
            };
            reader.readAsText(file);
        };
        input.click();
    },

    /**
     * Private helper to apply loaded map data to the UI
     */
    _applyMapContent: function (data, mapName) {
        if (!data) return;

        if (this._tfMapName) this._tfMapName.setString(mapName);
        if (this._tfSaveName) this._tfSaveName.setString(mapName);

        this.boardUI.loadMapConfig(data);

        if (this.tfMoves && data.numMove !== undefined) {
            this.tfMoves.setString("" + data.numMove);
        }
        if (this.targetListUI) this.targetListUI.setEntries(data.targetElements || []);
        if (this._tfNotes) this._tfNotes.setString(data.notes || "");
        if (this._tfPlayTest) this._tfPlayTest.setString("" + (data.numTest || 50));
        if (this._tfTPP && data.tpp !== undefined) this._tfTPP.setString("" + data.tpp);
        if (this._tfTargetMove) this._tfTargetMove.setString("" + (data.targetMove || 0));
        if (data.spawnStrategy) {
            this._spawnStrategyKey = data.spawnStrategy;
            if (this._btnSpawnStrategy) this._btnSpawnStrategy.setTitleText(data.spawnStrategy);
        }
        if (data.agentType) {
            this._agentKey = data.agentType;
            if (this._btnAgent) this._btnAgent.setTitleText(data.agentType);
        }
        if (this._gemColorActive) {
            // Prefer explicit gemTypes from the loaded JSON; fall back to boardUI config
            var srcGemTypes = data.gemTypes;
            if ((!srcGemTypes || srcGemTypes.length === 0) && this.boardUI && this.boardUI.getMapConfig) {
                try {
                    var bm = this.boardUI.getMapConfig() || {};
                    if (bm.gemTypes && bm.gemTypes.length > 0) srcGemTypes = bm.gemTypes;
                } catch (e) { /* ignore */ }
            }

            // Normalize to numbers and build active set (defaults to all active)
            var activeSet = {};
            if (srcGemTypes && srcGemTypes.length > 0) {
                for (var gi = 0; gi < srcGemTypes.length; gi++) {
                    var gval = parseInt(srcGemTypes[gi], 10);
                    if (!isNaN(gval) && gval >= 1 && gval <= 6) activeSet[gval] = true;
                }
            } else {
                for (var gi2 = 1; gi2 <= 6; gi2++) activeSet[gi2] = true;
            }

            for (var ci = 0; ci < 6; ci++) {
                var active = !!activeSet[ci + 1];
                this._gemColorActive[ci] = active;
                if (this._colorButtons && this._colorButtons[ci]) {
                    this._updateGemColorBtn(this._colorButtons[ci], active);
                }
            }
        }

        if (this.boardInfoUI) {
            this.boardInfoUI.setInfo({
                numMove: data.numMove || 30,
                targetElements: data.targetElements || [],
                numTest: data.numTest || 50
            });
        }

        this.updateMetrics();
        cc.log("Applied map content:", mapName);
    },

    testMap: function () {
        var mapData = this.boardUI.getMapConfig();
        var moves = parseInt(this.tfMoves ? this.tfMoves.getString() : "30") || 30;
        mapData.numMove = moves;
        mapData.targetElements = this.targetListUI ? this.targetListUI.getEntries() : [];
        mapData.levelId = 0;
        mapData.reward = 100;
        mapData.spawnStrategy = this._spawnStrategyKey || "RandomSpawnStrategy";
        mapData.numTest = parseInt(this._tfPlayTest ? this._tfPlayTest.getString() : "1") || 1;

        var gemTypes = [];
        if (this._gemColorActive) {
            for (var gi = 0; gi < this._gemColorActive.length; gi++) {
                if (this._gemColorActive[gi]) gemTypes.push(gi + 1);
            }
        }
        mapData.gemTypes = gemTypes.length > 0 ? gemTypes : [1, 2, 3, 4, 5, 6];

        // Switch to portrait (game) resolution before running GameUI
        this._applyResolution(false);

        var scene = new cc.Scene();
        CoreGame.BoardUI.instance = null;
        let gui = new CoreGame.GameUI({ mapConfig: mapData });
        scene.addChild(gui);
        gui.startNow();
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
        cc.log("Original design resolution:", designSize.width, "x", designSize.height);
        cc.log("Original frame size:", frameSize.width, "x", frameSize.height);

        // Tính kích thước mục tiêu theo orientation
        var w = designSize.height > designSize.width ? designSize.height : designSize.width;
        var h = designSize.height > designSize.width ? designSize.width : designSize.height;

        if (!cc.sys.isNative) {
            if (landscape) {
                // Landscape: swap width ↔ height so the wider dimension is horizontal
                cc.log("Applying landscape design resolution (swapped):", designSize.height, "x", designSize.width);
                cc.view.setDesignResolutionSize(designSize.height, designSize.width, cc.ResolutionPolicy.FIXED_HEIGHT);
            } else {
                // Portrait: use standard game resolution (taller than wide)
                cc.view.setDesignResolutionSize(designSize.width, designSize.height, cc.ResolutionPolicy.FIXED_HEIGHT);
            }
            CoreGame.Config.BOARD_OFFSET_X = this.saveOffsetX || 0;
            CoreGame.Config.BOARD_OFFSET_Y = this.saveOffsetY || 0;
            return;
        }
        var targetW = landscape ? w : h;
        var targetH = landscape ? h : w;

        // Set lại FrameSize — hoạt động trên cả Simulator (Win32) và Web
        // (tương đương chọn kích thước trong menu View > Device của Simulator)
        cc.view.setFrameSize(targetW, targetH);

        // Tính policy dựa trên frameSize mới (sau khi đã setFrameSize)
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
        var boardMgr = this.boardUI && this.boardUI.boardMgr;
        if (!boardMgr) { cc.log("[DiffCalc] No boardMgr"); return; }

        var stratKey = this._spawnStrategyKey || "RandomSpawnStrategy";
        if (CoreGame.DropStrategy[stratKey] && boardMgr.dropMgr) {
            boardMgr.dropMgr.setSpawnStrategy(new CoreGame.DropStrategy[stratKey]());
        }

        var bot = (CoreGame.Bots && CoreGame.Bots[this._agentKey])
            ? CoreGame.Bots[this._agentKey]
            : CoreGame.Bots.GreedyBot;

        var numTest = parseInt(this._tfPlayTest ? this._tfPlayTest.getString() : "50") || 50;
        var targetEntries = this.targetListUI ? this.targetListUI.getEntries() : [];

        var gemTypes = [];
        if (this._gemColorActive) {
            for (var gi = 0; gi < this._gemColorActive.length; gi++) {
                if (this._gemColorActive[gi]) gemTypes.push(gi + 1);
            }
        }
        if (gemTypes.length > 0) boardMgr.gemTypes = gemTypes;

        CoreGame.DifficultyCalc.NUM_EPISODES = numTest;
        var targets = {};
        targetEntries.forEach(function (t) { targets[t.id] = t.count; });

        var self = this;
        var mapName = (this._tfSaveName && this._tfSaveName.getString().trim()) ||
                      (this._tfMapName  && this._tfMapName.getString().trim())  || "map";
        var title = "Run Test — " + this._agentKey + " / " + mapName;
        var progressDlg = new TestProgressDialog(title);
        this.addChild(progressDlg, 1000);
        progressDlg.show();
        progressDlg.updateProgress(0, numTest);

        var savedState = boardMgr.getBoardState();
        CoreGame.FakeUI.start();
        CoreGame.DifficultyCalc.calculate(
            boardMgr,
            { maxMoves: self.MAX_SIM_MOVES, targets: targets },
            bot,
            function (step, total, state) {
                if (state && state.phase === "episode") {
                    progressDlg.updateProgress(state.episode, state.numEpisodes);
                }
            },
            function (report) {
                CoreGame.FakeUI.restore();
                boardMgr.setBoardState(savedState);
                progressDlg.hide();
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
        // EditMapSceneNew.instance.removeFromParent(true);
    }
});

EditMapSceneNew.instance = null;
EditMapSceneNew.getInstance = function () {
    if (!EditMapSceneNew.instance) {
        // Only create a new instance when there isn't one yet
        EditMapSceneNew.instance = new EditMapSceneNew();
        EditMapSceneNew.instance.retain();
    }

    // Do NOT call removeFromParent here — calling getInstance() while the scene
    // is live (e.g. from TargetListUI) would silently detach the whole editor.
    return EditMapSceneNew.instance;
};
