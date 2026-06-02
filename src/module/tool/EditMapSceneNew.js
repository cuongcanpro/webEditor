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

    // ─── Gist config ─────────────────────────────────────────────────────────
    _GIST_TOKEN1: "ghp",
    _GIST_TOKEN2: "_ijvzi5kmjJ29CKS1HhnbOuwvp896kZ2e",
    _GIST_TOKEN3: "AJ7c",
    _GIST_INDEX_ID: "8da94f03df123c5271d940bb61c06eae", // ID của Gist dùng làm registry (map_index.json)
    TOKEN: "",

    // ─── State ───────────────────────────────────────────────────────────────
    _gistIds: null,   // { mapName: gistId } — tracks Gist ID per map in this session
    selectedType: null,
    selectedHP: 1,
    deleteMode: false,
    spawnMode: false,
    slotMode: false,
    activeDynamicBlocker: null,
    _lastBlockType: null,  // last block selected from the palette — restored by the "v" shortcut
    _lastBlockHP: 1,
    KINGCRAB_TYPE: 11020,  // palette-bound color crab; its rotate pool follows gemTypes

    // Right-click context menu refs
    _ctxMenu: null,                 // full-screen overlay holding the menu
    _ctxMenuItems: null,            // [{ node, action, hoverColor, idleColor }]
    _ctxMenuTouchListener: null,
    _ctxMenuHoverListener: null,
    _ctxMenuListener: null,         // board right-click opener
    _ctxMouseBtnHooked: false,      // DOM mousedown capture installed?
    _lastMouseButton: -1,           // last mouse button (web) — distinguishes right-click

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
        cc.color(220, 60, 60),   // 1 Red
        cc.color(60, 120, 220),  // 2 Blue
        cc.color(60, 200, 80),   // 3 Green
        cc.color(220, 200, 50),   // 4 Yellow
        cc.color(160, 60, 220),  // 5 Purple
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
        this._gistIds = {};
        this.initUI();
        this.TOKEN = this._GIST_TOKEN1 + this._GIST_TOKEN2 + this._GIST_TOKEN3;
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
        // The engine defaults to a 3D perspective projection (PROJECTION_DEFAULT = 3D),
        // which keystones flat UI quads — visible as a position-dependent tilt on the
        // context menu (leans opposite on the left vs right of the screen). Force 2D
        // (orthographic) projection so editor UI renders perfectly flat.
        if (cc.director.setProjection) {
            cc.director.setProjection(cc.Director.PROJECTION_2D);
        }
        this._applyResolution(true);
        this._refreshBoardVisuals();
        this._setupKeyboardShortcuts();
    },

    // ─────────────────────────────────────────────────────────────────────────
    // Keyboard shortcuts — Ctrl+Z = Undo, Ctrl+Y / Ctrl+Shift+Z = Redo
    // (Ctrl state is tracked manually since cocos keyboard events don't carry modifiers)
    // ─────────────────────────────────────────────────────────────────────────
    _setupKeyboardShortcuts: function () {
        if (this._keyboardListener) return; // avoid duplicate listeners on re-enter
        var self = this;
        this._ctrlDown = false;
        this._shiftDown = false;

        this._keyboardListener = cc.EventListener.create({
            event: cc.EventListener.KEYBOARD,
            onKeyPressed: function (keyCode, event) {
                if (keyCode === cc.KEY.ctrl) { self._ctrlDown = true; return; }
                if (keyCode === cc.KEY.shift) { self._shiftDown = true; return; }

                // Tool shortcuts (no Ctrl): z=Delete, x=Slot, c=Spawn, v=pick block.
                // Guarded by _ctrlDown so Ctrl+Z/Ctrl+Y (undo/redo) below still win.
                if (!self._ctrlDown) {
                    if (keyCode === cc.KEY.z) { self._setMode("delete"); return; }
                    if (keyCode === cc.KEY.x) { self._setMode("slot"); return; }
                    if (keyCode === cc.KEY.c) { self._setMode("spawn"); return; }
                    if (keyCode === cc.KEY.v) { self._selectLastOrFirstBlock(); return; }
                }

                if (!self._ctrlDown) return;

                if (keyCode === cc.KEY.z) {
                    if (self._shiftDown) self.redo(); // Ctrl+Shift+Z
                    else self.undo();                 // Ctrl+Z
                } else if (keyCode === cc.KEY.y) {
                    self.redo();                      // Ctrl+Y
                }
            },
            onKeyReleased: function (keyCode, event) {
                if (keyCode === cc.KEY.ctrl) self._ctrlDown = false;
                else if (keyCode === cc.KEY.shift) self._shiftDown = false;
            }
        });
        cc.eventManager.addListener(this._keyboardListener, this);
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
            self.pLeft = self.rootNode.getChildByName("pLeft");
            cc.log("width left " + self.pLeft.getContentSize().width);
            cc.log("width pTool " + self.pTool.getContentSize().width);
            self.pLeft.setContentSize(self.pTool.getContentSize().width, self.pLeft.getContentSize().height);

            // pBottom removed — all sections now live in pRight (built programmatically)

            // Compute board offset from panel geometry
            self.computeLayout();

            // Build board (BOARD_OFFSET stays unchanged — shared with other scenes)
            self.boardUI = new CoreGame.BoardEditUI(self);
            self.boardUI.renderDebugLabels();
            self.addChild(self.boardUI, 1);
            self.fitBoardToCenter(); // scale + position the layer to fit center area

            // Reset / Fill gem buttons ngay phía trên board
            self._setupBoardTopButtons();

            // Right-click context menu on board cells (Delete / Slot / Spawn)
            self._setupBoardContextMenu();


            // Wire up all sections
            self.setupToolbar();
            self.setupToolPanel();
            self.setupRightPanel();
            self.setupBottomBar();

            self.setupElementSelector();
            self.setupLevelSelector();

            // Default starting layout: 4 gem colors (1-4) + top row marked
            // as spawn source (seeds drop from there).
            self._applyDefaultLevelLayout();
        });
    },

    /**
     * Apply the "default first level" baseline a designer expects when they
     * open the editor or hit New:
     *   - gem colors 1-4 active (5,6 disabled)
     *   - top row of slots marked canSpawn (blue tint)
     * Idempotent — called from onEnter init and btnNew handler.
     */
    _applyDefaultLevelLayout: function () {
        cc.log("[default-layout] applying: 4 colors + top spawn row + fill 1-4");
        if (this.boardUI && typeof this.boardUI.removeAllElements === "function") {
            this.boardUI.removeAllElements();
        }
        // Gem colors 1-4 only.
        if (this._gemColorActive && this._colorButtons) {
            for (var i = 0; i < this._gemColorActive.length; i++) {
                var want = i < 4;
                this._gemColorActive[i] = want;
                if (this._colorButtons[i]) {
                    this._updateGemColorBtn(this._colorButtons[i], want);
                }
            }
        }
        if (!this.boardUI || !this.boardUI.boardMgr) {
            cc.log("[default-layout] WARN: boardUI/boardMgr not ready");
            return;
        }
        var bm = this.boardUI.boardMgr;
        var topRow = bm.rows - 1;

        // Top row → spawn source (blue tint).
        var marked = 0;
        for (var c = 0; c < bm.cols; c++) {
            var slot = bm.mapGrid && bm.mapGrid[topRow] ? bm.mapGrid[topRow][c] : null;
            if (!slot) continue;
            if (typeof this.boardUI.enableSlot === "function") {
                this.boardUI.enableSlot(topRow, c, true);
            }
            slot.canSpawn = true;
            if (slot.bg) slot.bg.setColor(cc.color(100, 220, 255));
            marked++;
        }
        cc.log("[default-layout] topRow=" + topRow + " spawn slots marked=" + marked);

        // Fill every enabled cell with a random gem from colors 1-4.
        // Avoid match-3 at spawn by rejecting colors that would create a
        // horizontal or vertical triple with already-placed neighbours.
        var placed = 0;
        var typedGrid = [];
        for (var r = 0; r < bm.rows; r++) {
            typedGrid[r] = [];
            for (var cc2 = 0; cc2 < bm.cols; cc2++) {
                var s = bm.mapGrid && bm.mapGrid[r] ? bm.mapGrid[r][cc2] : null;
                if (!s) continue;
                var palette = [1, 2, 3, 4];
                // Forbid matching the two cells immediately below / left to
                // prevent an instant 3-in-a-row.
                var below1 = r >= 1 ? typedGrid[r - 1][cc2] : null;
                var below2 = r >= 2 ? typedGrid[r - 2][cc2] : null;
                var left1 = cc2 >= 1 ? typedGrid[r][cc2 - 1] : null;
                var left2 = cc2 >= 2 ? typedGrid[r][cc2 - 2] : null;
                var forbidden = {};
                if (below1 && below1 === below2) forbidden[below1] = true;
                if (left1 && left1 === left2) forbidden[left1] = true;
                var pick = palette.filter(function (t) { return !forbidden[t]; });
                if (pick.length === 0) pick = palette;
                var t = pick[Math.floor(Math.random() * pick.length)];
                this.boardUI.addElement(r, cc2, t, 1);
                typedGrid[r][cc2] = t;
                placed++;
            }
        }
        cc.log("[default-layout] filled gems placed=" + placed);
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

        // Giữ nút Reset / Fill gem bám theo board khi layout đổi (resize).
        this._layoutBoardButtons();
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
            // if (btnSave) { btnSave.setColor(cc.color(40, 110, 220)); }
            // if (btnPlay) { btnPlay.setColor(cc.color(35, 170, 75)); }

            // Handlers
            if (btnNew) {
                btnNew.addTouchEventListener(function (sender, type) {
                    if (type === ccui.Widget.TOUCH_ENDED) {
                        self.boardUI.removeAllElements();
                        self._targetEntries = [];
                        if (self.targetListUI) self.targetListUI.setEntries([]);
                        if (self._tfSaveName) {
                            cc.log("Clearing save name field");
                            self._tfSaveName.setString("");
                        }
                        self._mapDifficulty = "Easy";
                        if (self._btnDifficulty) {
                            self._btnDifficulty.setTitleText("Easy");
                        }
                        self.updateMetrics();
                        // Re-apply default starting layout (4 colors + top spawn row).
                        self._applyDefaultLevelLayout();
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
            btnIndex.setTitleFontName("font/BalooPaaji2-Medium.ttf");
            btnIndex.setTitleFontSize(17);
            btnIndex.setTitleColor(cc.color(209, 209, 217));
            btnIndex.setPosition(redoPos.x + 84, redoPos.y);
            btnIndex.addTouchEventListener(function (sender, type) {
                if (type === ccui.Widget.TOUCH_ENDED) {
                    if (self.levelSelector) self.levelSelector.show();
                }
            });
            pFunc.addChild(btnIndex);

            // "Load Gist" button — load map from GitHub Gist ID (works across machines)
            var btnLoadGist = new ccui.Button();
            btnLoadGist.setScale9Enabled(true);
            btnLoadGist.setContentSize(90, 50);
            btnLoadGist.setTitleFontName("font/BalooPaaji2-Medium.ttf");
            btnLoadGist.setTitleText("Load Cloud");
            btnLoadGist.setTitleFontSize(17);
            btnLoadGist.setTitleColor(cc.color(209, 209, 217));
            // btnLoadGist.setColor(cc.color(40, 140, 80));
            btnLoadGist.setPosition(redoPos.x + 84 + 94, redoPos.y);
            btnLoadGist.addTouchEventListener(function (sender, type) {
                if (type === ccui.Widget.TOUCH_ENDED) self._loadFromGist();
            });
            pFunc.addChild(btnLoadGist);
            // btnLoadGist.setVisible(false);
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

        // Two-line labels make each tool's job explicit.
        if (btnDelete) { btnDelete.setTitleText("Xóa\nBlock"); btnDelete.setTitleFontSize(12); }
        if (btnSlot)   { btnSlot.setTitleText("Bật/Tắt\nSlot");  btnSlot.setTitleFontSize(12); }
        if (btnSpawn)  { btnSpawn.setTitleText("Bật/Tắt\nSpawn"); btnSpawn.setTitleFontSize(12); }

        // Each button SELECTS its mode (and deselects the others + clears the block
        // palette). Clicking the already-active button is a no-op — never toggles off.
        if (btnDelete) {
            this._updateBtnColor(btnDelete, false);
            btnDelete.addTouchEventListener(function (sender, type) {
                if (type === ccui.Widget.TOUCH_ENDED) self._setMode("delete");
            });
        }

        if (btnSpawn) {
            this._updateBtnColor(btnSpawn, false);
            btnSpawn.addTouchEventListener(function (sender, type) {
                if (type === ccui.Widget.TOUCH_ENDED) self._setMode("spawn");
            });
        }

        if (btnSlot) {
            this._updateBtnColor(btnSlot, false);
            btnSlot.addTouchEventListener(function (sender, type) {
                if (type === ccui.Widget.TOUCH_ENDED) self._setMode("slot");
            });
        }
    },

    /**
     * Activate exactly one editing tool ("delete" | "slot" | "spawn"), or clear all
     * tools when mode is falsy. Selecting a tool clears the block palette selection;
     * the last painted block is remembered so the "v" shortcut can restore it.
     */
    _setMode: function (mode) {
        if (this.selectedType !== null && this.selectedType !== undefined) {
            this._lastBlockType = this.selectedType;
            this._lastBlockHP = this.selectedHP;
        }
        this.deleteMode = (mode === "delete");
        this.slotMode = (mode === "slot");
        this.spawnMode = (mode === "spawn");
        this.selectedType = null;
        this.activeDynamicBlocker = null;
        if (this.elementSelector) this.elementSelector.clearSelection();
        this._syncModeButtons();
    },

    /** "v" shortcut — re-select the last painted block, or the first one in the list. */
    _selectLastOrFirstBlock: function () {
        if (!this.elementSelector) return;
        var els = this.elementSelector.elements;
        if (!els || els.length === 0) return;
        var target = null;
        for (var i = 0; i < els.length; i++) {
            if (els[i].type === this._lastBlockType) { target = els[i]; break; }
        }
        if (!target) target = els[0];
        this.elementSelector.selectElement(target.type, target.name);
    },

    _syncModeButtons: function () {
        this._updateBtnColor(this._btnDelete, this.deleteMode);
        this._updateBtnColor(this._btnSpawn, this.spawnMode);
        this._updateBtnColor(this._btnSlot, this.slotMode);
    },

    _updateBtnColor: function (btn, active) {
        if (!btn) return;
        if (active) {
            // Selected mode: tint the whole button green + dark title for clear contrast
            btn.setColor(cc.color(100, 220, 100));
            btn.setTitleColor(cc.color(20, 45, 20));
        } else {
            btn.setColor(cc.color(255, 255, 255));
            btn.setTitleColor(cc.color(255, 255, 255));
        }
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
        var objH = 130;
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
        var cfgH = 132;
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

        // ── 4. MAP DIFFICULTY ─────────────────────────────────────────────
        var diffH = 80;
        curY -= diffH;
        var pDiff = this._makeRightPanel(W, diffH, curY, cc.color(25, 32, 58));
        this.pRight.addChild(pDiff);
        this._buildDifficultySection(pDiff);

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
        //panel.setBackGroundColorType(ccui.Layout.BG_COLOR_SOLID);
        //panel.setBackGroundColor(bgColor || cc.color(21, 28, 53));
        panel.setBackGroundImageScale9Enabled(true);
        panel.setBackGroundImage("res/tool/res/bgWhite.png");
        panel.setColor(cc.color("#191E2F"));
        panel.setContentSize(w, h);
        panel.setAnchorPoint(cc.p(0, 0));
        panel.setPosition(2, y);
        // load texture for 9-slice scaling (optional)

        return panel;
    },

    _makeSectionHeader: function (parent, title) {
        var W = parent.getContentSize().width;
        var HDR_H = 22;
        var hdr = new ccui.Layout();
        // hdr.setBackGroundColorType(ccui.Layout.BG_COLOR_SOLID);
        // hdr.setBackGroundColor(cc.color(28, 35, 60));

        hdr.setBackGroundImageScale9Enabled(true);
        hdr.setBackGroundImage("res/tool/res/bgWhite.png");
        hdr.setColor(cc.color(28, 35, 60));
        hdr.setColor(cc.color("#282e44"));

        hdr.setContentSize(W, HDR_H);
        hdr.setAnchorPoint(cc.p(0, 1));
        hdr.setPosition(0, parent.getContentSize().height);
        parent.addChild(hdr, 1);

        var lb = new ccui.Text(title, "res/font/BalooPaaji2-Bold.ttf", 11);
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
        lb1.setColor(cc.color(200, 200, 220)); lb1.setAnchorPoint(cc.p(0, 0.5));
        lb1.setPosition(6, y1); panel.addChild(lb1, 1);
        this.tfMoves = this._makeField(panel, "30", TF_X, y1, TF_W, ROW);
        this.tfMoves.setString("30");

        // TPP
        var y2 = y1 - ROW - 5;
        var lb2 = new ccui.Text("TPP:", "font/BalooPaaji2-Regular.ttf", 12);
        lb2.setColor(cc.color(200, 200, 220)); lb2.setAnchorPoint(cc.p(0, 0.5));
        lb2.setPosition(6, y2); panel.addChild(lb2, 1);
        this._tfTPP = this._makeField(panel, "1.0", TF_X, y2, TF_W, ROW);
        this._tfTPP.setString("1.0");

        // TargetMove (hidden difficulty metric — not shown to players)
        var y3 = y2 - ROW - 5;
        var lb3tm = new ccui.Text("TgtMove:", "font/BalooPaaji2-Regular.ttf", 12);
        lb3tm.setColor(cc.color(200, 200, 220)); lb3tm.setAnchorPoint(cc.p(0, 0.5));
        lb3tm.setPosition(6, y3); panel.addChild(lb3tm, 1);
        this._tfTargetMove = this._makeField(panel, "0", TF_X, y3, TF_W, ROW);
        this._tfTargetMove.setString("0");

        // Spawn
        var y4 = y3 - ROW - 5;
        var lb3 = new ccui.Text("Spawn:", "font/BalooPaaji2-Regular.ttf", 12);
        lb3.setColor(cc.color(200, 200, 220)); lb3.setAnchorPoint(cc.p(0, 0.5));
        lb3.setPosition(6, y4); panel.addChild(lb3, 1);
        this._btnSpawnStrategy = new ccui.Button();
        this._btnSpawnStrategy.loadTextureNormal("res/tool/res/btnGrey.png");
        this._btnSpawnStrategy.setScale9Enabled(true);
        this._btnSpawnStrategy.setContentSize(TF_W, ROW);
        this._btnSpawnStrategy.setAnchorPoint(cc.p(0, 0.5));
        this._btnSpawnStrategy.setPosition(TF_X, y4);
        this._btnSpawnStrategy.setTitleText(this._spawnStrategyKey);
        this._btnSpawnStrategy.setTitleFontSize(11);
        this._btnSpawnStrategy.setTitleColor(cc.color(220, 220, 255));
        this._btnSpawnStrategy.setTitleFontName("font/BalooPaaji2-Regular.ttf");
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
        // Default to 4 active colors (1..4) instead of all 6
        this._gemColorActive = [true, true, true, true, false, false];
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
            var gemSprite = new cc.Sprite("res/modules/game/element/" + (i + 1) + ".png");
            if (gemSprite) {
                gemSprite.setScale(imgScale);
                gemSprite.setPosition(btnSize / 2, btnSize / 2);
                bg.addChild(gemSprite, 1);
            }

            // Apply initial active/inactive visual to match _gemColorActive
            this._updateGemColorBtn(bg, this._gemColorActive[i]);

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
                        self._onGemPaletteChanged();
                    }
                });
                cc.eventManager.addListener(listener, bgNode);
            })(i, bg);
        }

        // Count label "X/6" at bottom-right — reflect current active count
        var activeCount = 0;
        for (var gc = 0; gc < this._gemColorActive.length; gc++) {
            if (this._gemColorActive[gc]) activeCount++;
        }
        this._lblGemCount = new ccui.Text(activeCount + "/6", "font/BalooPaaji2-Regular.ttf", 10);
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

    _buildDifficultySection: function (panel) {
        var self = this;
        var W = panel.getContentSize().width;
        var H = panel.getContentSize().height;
        var HDR_H = 22;
        var LBL_W = 58;
        var TF_X = LBL_W + 6;
        var TF_W = W - TF_X - 6;
        var ROW = 21;

        this._makeSectionHeader(panel, "MAP DIFFICULTY");

        var DIFFICULTIES = ["Easy", "Medium", "Hard"];
        if (!this._mapDifficulty) this._mapDifficulty = "Easy";

        var y1 = H - HDR_H - 13;
        var lb1 = new ccui.Text("Difficulty:", "font/BalooPaaji2-Regular.ttf", 12);
        lb1.setColor(cc.color(200, 200, 220));
        lb1.setAnchorPoint(cc.p(0, 0.5));
        lb1.setPosition(6, y1);
        panel.addChild(lb1, 1);

        this._btnDifficulty = new ccui.Button();
        this._btnDifficulty.loadTextureNormal("res/tool/res/btnGrey.png");
        this._btnDifficulty.setScale9Enabled(true);
        this._btnDifficulty.setContentSize(TF_W, ROW);
        this._btnDifficulty.setAnchorPoint(cc.p(0, 0.5));
        this._btnDifficulty.setPosition(TF_X, y1);
        this._btnDifficulty.setTitleText(this._mapDifficulty);
        this._btnDifficulty.setTitleFontSize(11);
        this._btnDifficulty.setTitleColor(cc.color(220, 220, 255));
        this._btnDifficulty.setTitleFontName("font/BalooPaaji2-Regular.ttf");
        panel.addChild(this._btnDifficulty, 1);

        this._btnDifficulty.addTouchEventListener(function (sender, type) {
            if (type !== ccui.Widget.TOUCH_ENDED) return;
            var dialog = new SelectDialog("Select Difficulty", DIFFICULTIES, function (key) {
                self._mapDifficulty = key;
                self._btnDifficulty.setTitleText(key);
            });
            cc.director.getRunningScene().addChild(dialog, 999);
            dialog.show();
        });
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
        var btnSave = new ccui.Button("res/tool/res/btnGreen.png", "res/tool/res/btnGreen.png", "res/tool/res/btnGreen.png");
        btnSave.setScale9Enabled(true);
        btnSave.setContentSize(W - 12, BTN_H);
        btnSave.setTitleText("Save to .json");
        btnSave.setTitleFontSize(13);
        btnSave.setTitleFontName("font/BalooPaaji2-Regular.ttf");
        // btnSave.setColor(cc.color(40, 100, 210));
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
        CREATE_BTN_H = 0;
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
                self.selectedHP = (type === 30200) ? 5 : 1;
                self._lastBlockType = type;  // remembered for the "v" shortcut
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
        btnCreate.setVisible(false);

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
        btnRefresh.setVisible(false);
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

    /**
     * Tạo 2 nút Reset / Fill gem nổi ngay phía trên board (vùng trống giữa
     * toolbar và board). Vị trí được tính theo board trong _layoutBoardButtons
     * nên bám theo board khi scale/resize.
     */
    _setupBoardTopButtons: function () {
        var self = this;
        var mk = function (title, color, handler) {
            var b = new ccui.Button();
            b.setScale9Enabled(true);
            b.setContentSize(100, 40);
            b.setTitleFontName("font/BalooPaaji2-Medium.ttf");
            b.setTitleText(title);
            b.setTitleFontSize(18);
            b.setTitleColor(cc.color(255, 255, 255));
            b.setColor(color);
            b.addTouchEventListener(function (sender, type) {
                if (type === ccui.Widget.TOUCH_ENDED) handler();
            });
            self.addChild(b, 5);
            return b;
        };
        this._btnReset = mk("Reset", cc.color(210, 120, 60), function () { self.resetMap(); });
        this._btnFillGem = mk("Fill gem", cc.color(60, 160, 110), function () { self.fillGem(); });
        this._layoutBoardButtons();
    },

    /** Căn 2 nút Reset / Fill gem nằm giữa, ngay phía trên cạnh trên của board. */
    _layoutBoardButtons: function () {
        if (!this.boardUI || !this._btnReset || !this._btnFillGem) return;
        var rows = CoreGame.Config.BOARD_ROWS || 10;
        var cols = CoreGame.Config.BOARD_COLS || 9;
        var cell = CoreGame.Config.CELL_SIZE || 57;
        var bm = this.boardUI.boardMgr;
        var offX = bm ? bm.boardOffsetX : 0;
        var offY = bm ? bm.boardOffsetY : 0;
        var S = this.boardUI.getScale();
        var pos = this.boardUI.getPosition();
        var boardW = cols * cell, boardH = rows * cell;

        var boardTopY = pos.y + (offY + boardH) * S;       // cạnh trên board (screen)
        var boardCenterX = pos.x + (offX + boardW / 2) * S; // tâm ngang board
        var topH = this.pTop ? this.pTop.getContentSize().height : 50;
        var pTopBottomY = cc.winSize.height - topH;         // cạnh dưới toolbar
        var btnY = (boardTopY + pTopBottomY) / 2;           // giữa vùng trống

        // Hai nút cạnh nhau, căn giữa theo board.
        this._btnReset.setPosition(boardCenterX - 55, btnY);
        this._btnFillGem.setPosition(boardCenterX + 55, btnY);
    },

    /**
     * Build the gem-type list (1..6) from the currently-enabled GEM COLORS panel.
     * Falls back to all 6 if somehow nothing is active.
     */
    _getActiveGemTypes: function () {
        var gemTypes = [];
        if (this._gemColorActive) {
            for (var gi = 0; gi < this._gemColorActive.length; gi++) {
                if (this._gemColorActive[gi]) gemTypes.push(gi + 1);
            }
        }
        return gemTypes.length > 0 ? gemTypes : [1, 2, 3, 4, 5, 6];
    },

    /**
     * Called when the designer toggles the active gem colors. Syncs the live
     * boardMgr.gemTypes immediately, then refreshes already-placed palette-bound
     * blockers (ColorCabinet bottles, KingCrab rotate color) so their colors track
     * the new palette without needing a reload.
     */
    _onGemPaletteChanged: function () {
        if (!this.boardUI || !this.boardUI.boardMgr) return;
        var bm = this.boardUI.boardMgr;
        this.pushUndoState(); // re-roll + blocker recolor are one undoable step
        bm.gemTypes = this._getActiveGemTypes().slice();
        this._refreshPlacedBlockerColors(bm);
        this._regenBoardGems(bm, bm.gemTypes);
        this.updateMetrics();
    },

    /**
     * Re-roll every plain gem (color types 1..6) on the board to a random color
     * from the new palette, so the board reflects exactly the active gem colors —
     * both dropping colors that were turned off and introducing ones turned on.
     * Blockers and non-color elements are left untouched (a gem layered under a
     * box/grass is still re-rolled; the overlay stays).
     */
    _regenBoardGems: function (bm, gemTypes) {
        if (!this.boardUI || !gemTypes || gemTypes.length === 0) return 0;
        var n = 0;
        for (var r = 0; r < bm.rows; r++) {
            for (var c = 0; c < bm.cols; c++) {
                var slot = bm.mapGrid[r] && bm.mapGrid[r][c];
                if (!slot || !slot.enable || !slot.listElement) continue;
                var gem = null;
                for (var i = 0; i < slot.listElement.length; i++) {
                    var el = slot.listElement[i];
                    if (el && el.type >= 1 && el.type <= 6) { gem = el; break; }
                }
                if (!gem) continue;
                // Pick before removing; left/up neighbours are already re-rolled this
                // pass, so reading them avoids a fresh 3-in-a-row or 2x2 square.
                var newType = this._pickGemAvoidingMatch(gemTypes,
                    this._gemColorAt(bm, r, c - 1), this._gemColorAt(bm, r, c - 2),
                    this._gemColorAt(bm, r - 1, c), this._gemColorAt(bm, r - 2, c),
                    this._gemColorAt(bm, r - 1, c - 1));
                gem.remove();
                this.boardUI.addElement(r, c, newType, 1);
                n++;
            }
        }
        cc.log("Regen board gems: re-rolled " + n + " gems to palette " + JSON.stringify(gemTypes));
        return n;
    },

    /** Matchable gem color (type 1..6) at a cell, or 0 if none / out of bounds.
     *  Holes & blocker-only cells return 0 so they break match runs (correct:
     *  gems either side of a hole aren't adjacent in play). */
    _gemColorAt: function (bm, r, c) {
        if (r < 0 || c < 0 || r >= bm.rows || c >= bm.cols) return 0;
        var slot = bm.mapGrid[r] && bm.mapGrid[r][c];
        if (!slot || !slot.listElement) return 0;
        for (var i = 0; i < slot.listElement.length; i++) {
            var el = slot.listElement[i];
            if (el && el.type >= 1 && el.type <= 6) return el.type;
        }
        return 0;
    },

    /** Pick a random gem from gemTypes that won't complete a 3-in-a-row OR a 2x2
     *  same-color square, given the two left neighbours (l1=nearest), two up
     *  neighbours (u1=nearest) and the up-left diagonal (ul). Filling row-major,
     *  (r,c) is the bottom-right corner of the only square it can complete, so
     *  banning when left==up==up-left covers all 2x2s. Falls back to the full
     *  palette if every color is banned (e.g. < 3 colors active). */
    _pickGemAvoidingMatch: function (gemTypes, l1, l2, u1, u2, ul) {
        var banH = (l1 && l1 === l2) ? l1 : 0;
        var banV = (u1 && u1 === u2) ? u1 : 0;
        var banSq = (l1 && l1 === u1 && l1 === ul) ? l1 : 0;
        var filtered = [];
        for (var k = 0; k < gemTypes.length; k++) {
            var t = gemTypes[k];
            if (t !== banH && t !== banV && t !== banSq) filtered.push(t);
        }
        if (filtered.length === 0) filtered = gemTypes;
        return filtered[Math.floor(Math.random() * filtered.length)];
    },

    _refreshPlacedBlockerColors: function (bm) {
        var seen = [];
        for (var r = 0; r < bm.rows; r++) {
            for (var c = 0; c < bm.cols; c++) {
                var slot = bm.mapGrid[r] && bm.mapGrid[r][c];
                if (!slot || !slot.listElement) continue;
                for (var i = 0; i < slot.listElement.length; i++) {
                    var el = slot.listElement[i];
                    if (!el || seen.indexOf(el) >= 0) continue;
                    seen.push(el); // multi-cell blockers appear in several slots
                    if (typeof el.refreshPalette === 'function') {
                        el.refreshPalette();                 // ColorCabinet
                    } else if (el.type === this.KINGCRAB_TYPE) {
                        this._refreshKingCrabColor(el);      // KingCrab
                    }
                }
            }
        }
    },

    /** Re-pin a KingCrab's match color into the palette if it fell out of it. */
    _refreshKingCrabColor: function (el) {
        if (!CoreGame.Strategies || typeof CoreGame.Strategies.kingCrabColorPool !== 'function') return;
        var pool = CoreGame.Strategies.kingCrabColorPool(el);
        if (pool.length === 0) return;
        var cur = el._matchColor;
        if (typeof cur === 'number' && pool.indexOf(cur) >= 0) return; // still valid
        var next = pool[0];
        el._matchColor = next;
        if (el.ui && typeof el.ui.playColorShift === 'function') {
            el.ui.playColorShift(typeof cur === 'number' ? cur : -1, next);
        } else if (el.ui && typeof el.ui.refreshMatchColorTint === 'function') {
            el.ui.refreshMatchColorTint();
        }
    },

    /**
     * Fill gem ngẫu nhiên vào TẤT CẢ ô đang bật (enabled) mà đang trống
     * (chưa có element nào). Dùng đúng số màu đang bật ở panel GEM COLORS.
     * Snapshot trước để Undo lại được.
     */
    fillGem: function () {
        if (!this.boardUI || !this.boardUI.boardMgr) return;
        this.pushUndoState();
        var bm = this.boardUI.boardMgr;
        var gemTypes = this._getActiveGemTypes();
        bm.gemTypes = gemTypes.slice(); // sync board với số màu mới được enable
        var filled = 0;
        for (var r = 0; r < bm.rows; r++) {
            for (var c = 0; c < bm.cols; c++) {
                var slot = bm.mapGrid[r][c];
                if (!slot || !slot.enable) continue;
                if (slot.listElement && slot.listElement.length > 0) continue; // bỏ ô đã có gì đó
                // Avoid forming a 3-in-a-row OR a 2x2 square with neighbours already
                // on the board.
                var t = this._pickGemAvoidingMatch(gemTypes,
                    this._gemColorAt(bm, r, c - 1), this._gemColorAt(bm, r, c - 2),
                    this._gemColorAt(bm, r - 1, c), this._gemColorAt(bm, r - 2, c),
                    this._gemColorAt(bm, r - 1, c - 1));
                this.boardUI.addElement(r, c, t, 1);
                filled++;
            }
        }
        this.updateMetrics();
        cc.log("Fill gem: filled " + filled + " empty cells");
    },

    /**
     * Reset bàn về "map ban đầu" — đúng lưới mặc định lúc mở editor:
     * lưới đầy đủ, hàng trên cùng là spawn (2), các ô còn lại enabled (1),
     * gem random theo đúng số màu đang bật ở panel GEM COLORS (tránh match sẵn).
     * Snapshot trước để Undo lại được.
     */
    resetMap: function () {
        if (!this.boardUI) return;
        this.pushUndoState(); // cho phép Undo thao tác Reset
        var defaultMap = CoreGame.BoardEditUI.buildDefaultMapConfig(this._getActiveGemTypes());
        this.boardUI.loadMapConfig(defaultMap);
        if (this.boardUI.boardMgr) {
            this.boardUI.boardMgr.gemTypes = defaultMap.gemTypes.slice();
        }
        this.updateMetrics();
        cc.log("Map reset to initial default");
    },

    /**
     * True when the cell is occupied by a block that spans more than one cell
     * (2x2 box, 3x3, a tentacle/dynamic blocker, …). Such blocks can't be carved
     * or erased one cell at a time from the board — left-click refuses on them.
     */
    _isMultiCellAt: function (row, col) {
        var bm = this.boardUI && this.boardUI.boardMgr;
        var slot = bm && bm.mapGrid[row] && bm.mapGrid[row][col];
        if (!slot || !slot.listElement) return false;
        for (var i = 0; i < slot.listElement.length; i++) {
            var el = slot.listElement[i];
            if (!el) continue;
            if (el.size && (el.size.width > 1 || el.size.height > 1)) return true;
            if (typeof el.getGridCells === "function" && el.getGridCells().length > 1) return true;
        }
        return false;
    },

    /** Briefly flash a cell red to signal a refused action (e.g. multi-cell block). */
    _flashCell: function (row, col) {
        var bm = this.boardUI && this.boardUI.boardMgr;
        var slot = bm && bm.mapGrid[row] && bm.mapGrid[row][col];
        if (!slot) return;
        var base = slot.canSpawn ? cc.color(100, 220, 255) : cc.color(255, 255, 255);
        var sprites = [slot.bg, slot.bg2];
        for (var i = 0; i < sprites.length; i++) {
            var s = sprites[i];
            if (!s) continue;
            s.stopAllActions();
            s.runAction(cc.sequence(
                cc.tintTo(0.05, 255, 70, 70),
                cc.delayTime(0.12),
                cc.tintTo(0.12, base.r, base.g, base.b)
            ));
        }
    },

    /** Turn a cell into a hole: remove every block in it, clear spawn, disable slot. */
    _carveHole: function (row, col) {
        var bm = this.boardUI && this.boardUI.boardMgr;
        var slot = bm && bm.mapGrid[row] && bm.mapGrid[row][col];
        if (!slot) return;
        if (slot.listElement) {
            var els = slot.listElement.slice(); // copy — remove() mutates listElement
            for (var i = 0; i < els.length; i++) {
                if (els[i] && typeof els[i].remove === "function") els[i].remove();
            }
        }
        slot.canSpawn = false;
        if (slot.bg) slot.bg.setColor(cc.color(255, 255, 255));
        if (slot.bg2) slot.bg2.setColor(cc.color(255, 255, 255));
        slot.setEnable(false);
    },

    onCellClick: function (row, col, isMove) {
        // Ignore the touch the engine fires on a right-click — that is handled by the
        // context menu, not by the active paint/delete mode.
        if (this._lastMouseButton === cc.EventMouse.BUTTON_RIGHT) return;

        // Snapshot board state before the FIRST touch on any cell (not drag repeats)
        if (!isMove) {
            this.pushUndoState();
        }

        var bm = this.boardUI.boardMgr;

        // Spawn tool — toggle the spawn flag on an existing slot.
        if (this.spawnMode) {
            if (isMove && row === this.lastRow && col === this.lastCol) return;
            this.lastRow = row; this.lastCol = col;
            var rawSlot = bm.mapGrid[row] && bm.mapGrid[row][col];
            if (rawSlot && rawSlot.enable) {
                rawSlot.canSpawn = !rawSlot.canSpawn;
                if (rawSlot.bg) rawSlot.bg.setColor(rawSlot.canSpawn ? cc.color(100, 220, 255) : cc.color(255, 255, 255));
                if (rawSlot.bg2) rawSlot.bg2.setColor(rawSlot.canSpawn ? cc.color(100, 220, 255) : cc.color(255, 255, 255));
            }
            this.updateMetrics();
            return;
        }

        // Slot tool — toggle the cell's existence (hole <-> empty slot).
        //   hole          → create an empty slot
        //   multi-cell    → refuse (flash); delete the block first
        //   slot/1-block  → carve a hole (also clears the single block + spawn)
        if (this.slotMode) {
            if (isMove && row === this.lastRow && col === this.lastCol) return;
            this.lastRow = row; this.lastCol = col;
            var slotS = bm.mapGrid[row] && bm.mapGrid[row][col];
            if (slotS) {
                if (!slotS.enable) {
                    this.boardUI.enableSlot(row, col, true);
                    this.boardUI.refreshGrid();
                } else if (this._isMultiCellAt(row, col)) {
                    this._flashCell(row, col);
                } else {
                    this._carveHole(row, col);
                    this.activeDynamicBlocker = null;
                    this.boardUI.refreshGrid();
                }
            }
            this.updateMetrics();
            return;
        }

        // Delete tool — erase the top block layer, keep the slot. A multi-cell block
        // (2x2/3x3/tentacle) is one element, so removeAt() deletes the WHOLE block at
        // once — that's fine and expected. Only the Slot tool refuses on multi-cell.
        if (this.deleteMode) {
            if (isMove && row === this.lastRow && col === this.lastCol) return;
            this.lastRow = row; this.lastCol = col;
            var slotD = bm.mapGrid[row] && bm.mapGrid[row][col];
            if (slotD && slotD.enable && slotD.listElement && slotD.listElement.length > 0) {
                this.boardUI.removeAt(row, col);
                this.activeDynamicBlocker = null;
            }
            this.updateMetrics();
            return;
        }

        if (this.selectedType !== null && this.selectedType !== undefined) {
            if (this._isTentacleType(this.selectedType)) {
                this._handleTentacleClick(row, col);
            } else if (this._isDynamicBlockerType(this.selectedType)) {
                this._handleDynamicBlockerClick(row, col);
            } else {
                if (this._canPlaceElement(row, col, this.selectedType)) {
                    this.boardUI.addElement(row, col, this.selectedType, this.selectedHP);
                }
            }
            this.updateMetrics();
        }
    },

    // ─────────────────────────────────────────────────────────────────────────
    // Right-click context menu — per-cell Delete / Slot / Spawn
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Install a node-bound MOUSE listener that opens a context menu on right-click
     * over a valid board cell. Left-click painting is unaffected (touch handles that).
     */
    _setupBoardContextMenu: function () {
        var self = this;

        // The engine dispatches a touch-begin on EVERY mousedown (any button), so a
        // right-click would also paint the cell via onCellClick. Record the button on
        // `window` in the capture phase — an ancestor of the canvas, so it is guaranteed
        // to run before the engine's canvas-level handler — letting onCellClick ignore
        // right-clicks. Web only; native has no mouse.
        if (!cc.sys.isNative && typeof window !== "undefined" && !this._ctxMouseBtnHooked) {
            window.addEventListener("mousedown", function (e) {
                self._lastMouseButton = e.button;
            }, true);
            this._ctxMouseBtnHooked = true;
        }

        var listener = cc.EventListener.create({
            event: cc.EventListener.MOUSE,
            onMouseDown: function (event) {
                if (event.getButton() !== cc.EventMouse.BUTTON_RIGHT) return;
                if (!self.boardUI) return;

                var world = event.getLocation(); // GL coords (y-up)
                // Hit-test against the board grid using the same conversion as touch.
                var local = self.boardUI.convertToNodeSpace(world);
                var bm = self.boardUI.boardMgr;
                var gp = bm.pixelToGrid(local.x, local.y); // gp.x=row, gp.y=col
                if (gp.x < 0 || gp.x >= bm.rows || gp.y < 0 || gp.y >= bm.cols) {
                    self._closeCellContextMenu();
                    return;
                }
                self._showCellContextMenu(world, gp.x, gp.y);
            }
        });
        cc.eventManager.addListener(listener, this.boardUI);
        this._ctxMenuListener = listener;
    },

    /**
     * Build and display the context menu at the cursor for cell (row, col).
     *
     * A full-screen transparent overlay swallows touches so that clicking a menu
     * item (or clicking away to dismiss) never paints the board cell behind it.
     * Each item is a ccui.Layout with a solid background fill that highlights on
     * hover; the action is applied on click and the menu closes.
     */
    _showCellContextMenu: function (worldPos, row, col) {
        var self = this;
        this._closeCellContextMenu();

        var ITEM_W = 120;
        var ITEM_H = 30;

        // Menu adapts to the cell's state: hide actions that don't apply and label
        // toggles by what the click will actually do.
        var bm = this.boardUI.boardMgr;
        var slot = bm.mapGrid[row] && bm.mapGrid[row][col];
        var hasSlot = !!(slot && slot.enable);
        var hasBlock = !!(hasSlot && slot.listElement && slot.listElement.length > 0);
        var canSpawn = !!(hasSlot && slot.canSpawn);

        var items = [];
        if (hasBlock) {
            items.push({ label: "Xóa block", action: "delete", color: cc.color(200, 70, 70) });
        }
        items.push({ label: hasSlot ? "Xóa Slot" : "Thêm Slot", action: "slot", color: cc.color(70, 150, 220) });
        if (hasSlot) {
            items.push({ label: canSpawn ? "Spawn Off" : "Spawn On", action: "spawn", color: cc.color(90, 200, 120) });
        }
        if (hasBlock) {
            items.push({ label: "Update HP", action: "updateHP", color: cc.color(230, 170, 60) });
        }
        var menuH = ITEM_H * items.length;
        var idleColor = cc.color(34, 40, 60);

        // Full-screen transparent overlay — captures clicks outside the menu.
        var overlay = new ccui.Layout();
        overlay.setBackGroundColorType(ccui.Layout.BG_COLOR_NONE);
        overlay.setContentSize(cc.winSize.width, cc.winSize.height);
        overlay.setAnchorPoint(cc.p(0, 0));
        overlay.setPosition(0, 0);
        this.addChild(overlay, 10000);
        this._ctxMenu = overlay;
        this._ctxMenuItems = [];

        // Menu container — no background of its own; the item cells tile to fill it,
        // so there is exactly one solid quad per row (no overlapping quads / seams).
        var menu = new ccui.Layout();
        menu.setBackGroundColorType(ccui.Layout.BG_COLOR_NONE);
        menu.setContentSize(ITEM_W, menuH);
        menu.setAnchorPoint(cc.p(0, 1));

        // Keep the menu fully on-screen (flip near right/bottom edges).
        var local = overlay.convertToNodeSpace(worldPos);
        var px = local.x;
        var py = local.y;
        if (px + ITEM_W > cc.winSize.width) px -= ITEM_W;
        if (py - menuH < 0) py = menuH;
        // Snap to whole pixels so the solid-color quad edges stay crisp (no aliasing seams).
        menu.setPosition(Math.round(px), Math.round(py));
        overlay.addChild(menu, 1);

        for (var i = 0; i < items.length; i++) {
            var it = items[i];
            var rowY = menuH - (i + 1) * ITEM_H;

            // Each item is one solid quad; cells tile exactly to fill the menu (no overlap).
            var cell = new ccui.Layout();
            cell.setBackGroundColorType(ccui.Layout.BG_COLOR_SOLID);
            cell.setBackGroundColor(idleColor);
            cell.setContentSize(ITEM_W, ITEM_H);
            cell.setAnchorPoint(cc.p(0, 0)); // ccui.Widget defaults to (0.5,0.5) — would shift items off-center
            cell.setPosition(0, rowY);
            menu.addChild(cell, 1);

            var txt = new ccui.Text(it.label, "font/BalooPaaji2-Regular.ttf", 14);
            txt.setColor(cc.color(230, 230, 240));
            txt.setAnchorPoint(cc.p(0, 0.5));
            txt.setPosition(12, ITEM_H / 2);
            cell.addChild(txt, 1);

            this._ctxMenuItems.push({
                node: cell,
                action: it.action,
                hoverColor: it.color,
                idleColor: idleColor
            });
        }

        // Swallowing touch listener: selection on press + dismiss on outside press.
        // Registered at fixed priority -1 (above the board's scene-graph listener) so
        // the press is reliably intercepted and never leaks through to the board.
        var touchListener = cc.EventListener.create({
            event: cc.EventListener.TOUCH_ONE_BY_ONE,
            swallowTouches: true,
            onTouchBegan: function (touch) {
                var hit = self._ctxMenuItemAt(touch.getLocation());
                if (hit) self._applyCellAction(hit.action, row, col);
                // Tear the menu down on the NEXT frame, not synchronously here.
                // _closeCellContextMenu() unregisters this very listener, which sets
                // its _registered flag to false; the engine then checks that same
                // flag right after this handler to decide whether to honor
                // swallowTouches (CCEventManager _onTouchEventCallback). Closing now
                // would make the swallow no-op, leaking the touch to the board below
                // and accidentally painting/deleting the cell. Deferring keeps the
                // listener registered so the touch is reliably swallowed.
                var menuToClose = self._ctxMenu;
                self.scheduleOnce(function () {
                    // Only close if this is still the same menu — a new right-click
                    // could have already opened (and the old one torn down) by now.
                    if (self._ctxMenu === menuToClose) self._closeCellContextMenu();
                }, 0);
                return true; // swallow — board behind never sees this touch
            }
        });
        cc.eventManager.addListener(touchListener, -1);
        this._ctxMenuTouchListener = touchListener;

        // Hover highlight via mouse move.
        var hoverListener = cc.EventListener.create({
            event: cc.EventListener.MOUSE,
            onMouseMove: function (event) {
                if (!self._ctxMenuItems) return;
                var hovered = self._ctxMenuItemAt(event.getLocation());
                for (var k = 0; k < self._ctxMenuItems.length; k++) {
                    var mi = self._ctxMenuItems[k];
                    mi.node.setBackGroundColor(mi === hovered ? mi.hoverColor : mi.idleColor);
                }
            }
        });
        cc.eventManager.addListener(hoverListener, overlay);
        this._ctxMenuHoverListener = hoverListener;
    },

    /** Return the menu item whose rect contains the world-space point, or null. */
    _ctxMenuItemAt: function (worldPos) {
        if (!this._ctxMenuItems) return null;
        for (var k = 0; k < this._ctxMenuItems.length; k++) {
            var node = this._ctxMenuItems[k].node;
            var local = node.convertToNodeSpace(worldPos);
            var sz = node.getContentSize();
            if (cc.rectContainsPoint(cc.rect(0, 0, sz.width, sz.height), local)) {
                return this._ctxMenuItems[k];
            }
        }
        return null;
    },

    /** Tear down the context menu, its overlay, and listeners. */
    _closeCellContextMenu: function () {
        if (this._ctxMenuTouchListener) {
            cc.eventManager.removeListener(this._ctxMenuTouchListener);
            this._ctxMenuTouchListener = null;
        }
        if (this._ctxMenuHoverListener) {
            cc.eventManager.removeListener(this._ctxMenuHoverListener);
            this._ctxMenuHoverListener = null;
        }
        if (this._ctxMenu) {
            this._ctxMenu.removeFromParent(true);
            this._ctxMenu = null;
        }
        this._ctxMenuItems = null;
    },

    /** Apply a context-menu action to a single cell (mirrors onCellClick modes). */
    _applyCellAction: function (action, row, col) {
        if (!this.boardUI) return;

        // Update HP mở popup (thay đổi xảy ra sau, async) — tự push undo bên trong,
        // không snapshot ở đây.
        if (action === "updateHP") {
            this._openHPEditor(row, col);
            return;
        }

        this.pushUndoState();

        var bm = this.boardUI.boardMgr;
        var rawSlot = bm.mapGrid[row] && bm.mapGrid[row][col];

        if (action === "delete") {
            // Deliberate (right-click) erase — removes the whole block, incl. multi-cell.
            this.boardUI.removeAt(row, col);
            this.activeDynamicBlocker = null;
        } else if (action === "slot") {
            // Toggle the cell's existence. Right-click is a deliberate action, so it may
            // carve a hole under a multi-cell block (clearing the whole block + spawn).
            if (rawSlot && rawSlot.enable) {
                this._carveHole(row, col);   // Xóa Slot → hole
                this.activeDynamicBlocker = null;
            } else {
                this.boardUI.enableSlot(row, col, true);  // Thêm Slot → empty slot
            }
            this.boardUI.refreshGrid();
        } else if (action === "spawn") {
            if (rawSlot && rawSlot.enable) {
                rawSlot.canSpawn = !rawSlot.canSpawn;
                if (rawSlot.bg) rawSlot.bg.setColor(rawSlot.canSpawn ? cc.color(100, 220, 255) : cc.color(255, 255, 255));
                if (rawSlot.bg2) rawSlot.bg2.setColor(rawSlot.canSpawn ? cc.color(100, 220, 255) : cc.color(255, 255, 255));
            }
        }
        this.updateMetrics();
    },

    /**
     * Tìm element "có máu" (blocker maxHP > 1) trong ô (row, col) để chỉnh HP.
     * Trả về element trên cùng (priority cao) thoả điều kiện, hoặc null nếu ô
     * chỉ có gem/trống. Bỏ qua tentacle (HP = độ dài, không chỉnh kiểu này).
     */
    _findEditableBlockAt: function (row, col) {
        if (!this.boardUI || !this.boardUI.boardMgr) return null;
        var bm = this.boardUI.boardMgr;
        var slot = bm.mapGrid[row] && bm.mapGrid[row][col];
        if (!slot || !slot.listElement) return null;
        for (var i = slot.listElement.length - 1; i >= 0; i--) {
            var el = slot.listElement[i];
            if (!el || el.type === 30200) continue; // skip tentacle
            var cfgMax = (el.configData && el.configData.maxHP) ? el.configData.maxHP : 1;
            if (cfgMax > 1 || el.maxHP > 1 || el.hitPoints > 1) return el;
        }
        return null;
    },

    /**
     * Mở popup Element Config để chỉnh HP cho block đã đặt tại (row, col).
     * Mỗi lần đổi HP cập nhật trực tiếp hitPoints/maxHP của đúng element đó rồi
     * refresh HP bar + visual. Push undo 1 lần trước khi mở để Undo về trạng thái
     * trước khi chỉnh.
     */
    _openHPEditor: function (row, col) {
        if (!this.setElementConfigUI) return;
        var el = this._findEditableBlockAt(row, col);
        if (!el) {
            cc.log("Update HP: ô (" + row + "," + col + ") không có block chỉnh HP được");
            return;
        }
        var self = this;
        this.pushUndoState(); // cho phép Undo toàn bộ phiên chỉnh HP này
        var curHP = el.hitPoints || 1;
        var ok = this.setElementConfigUI.editExistingHP(el.type, curHP, function (hp) {
            el.hitPoints = hp;
            el.maxHP = hp; // HP đặt trong editor = "đầy" của thanh máu
            if (el.updateHPBar) el.updateHPBar();
            if (el.updateVisual) el.updateVisual();
            self.updateMetrics();
            cc.log("Update HP: (" + row + "," + col + ") type " + el.type + " -> hp " + hp);
        });
        if (!ok) {
            cc.log("Update HP: type " + el.type + " không hỗ trợ chỉnh HP (maxHP<=1)");
        }
    },

    _isTentacleType: function (type) {
        return type === 30200;
    },

    _computeTentacleCells: function (anchorRow, anchorCol, length, direction) {
        var dr = 0, dc = 0;
        // Row 0 is at the top of the screen; increasing row goes downward.
        // So visual UP = decreasing row (-1), visual DOWN = increasing row (+1).
        if (direction === "UP")    { dr = -1; dc =  0; }
        if (direction === "DOWN")  { dr =  1; dc =  0; }
        if (direction === "LEFT")  { dr =  0; dc =  1; }
        if (direction === "RIGHT") { dr =  0; dc = -1; }

        var bm = this.boardUI.boardMgr;
        var cells = [];
        for (var i = 0; i < length; i++) {
            var r = anchorRow + dr * i;
            var c = anchorCol + dc * i;
            if (r < 0 || r >= bm.rows || c < 0 || c >= bm.cols) break;
            cells.push({ r: r, c: c });
        }
        return cells;
    },

    _handleTentacleClick: function (row, col) {
        var bm = this.boardUI.boardMgr;
        var slot = bm.mapGrid[row] && bm.mapGrid[row][col];
        if (slot) {
            for (var i = 0; i < slot.listElement.length; i++) {
                
                if (slot.listElement[i].type === this.selectedType) return;
            }
        }
        var hp = this.selectedHP;
        var direction = this.setElementConfigUI ? this.setElementConfigUI.getDirection() : "RIGHT";
        var cells = this._computeTentacleCells(row, col, hp, direction);
        if (cells.length === 0) return;
        this.boardUI.addElement(row, col, this.selectedType, hp, cells);
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
        // Nếu activeDynamicBlocker không còn hợp lệ (vd: sau PlayTest), tìm lại
        // DynamicBlocker cùng type đang tồn tại trên board và restore về activeDynamicBlocker.
        if (!this.activeDynamicBlocker || this.activeDynamicBlocker.type !== this.selectedType) {
            var bm = this.boardUI.boardMgr;
            var found = null;
            outer: for (var r = 0; r < bm.rows; r++) {
                for (var c = 0; c < bm.cols; c++) {
                    var s = bm.mapGrid[r] && bm.mapGrid[r][c];
                    if (!s) continue;
                    for (var ei = 0; ei < s.listElement.length; ei++) {
                        var el = s.listElement[ei];
                        if (el instanceof CoreGame.DynamicBlocker && el.type === this.selectedType) {
                            found = el;
                            break outer;
                        }
                    }
                }
            }
            this.activeDynamicBlocker = found;
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

            // OVERLAY elements (e.g. Chain) must be placed on a slot that has a CONTENT element (GEM)
            // if (preview.layerBehavior === CoreGame.LayerBehavior.OVERLAY) {
            //     var contentElement = null;
            //     if (slot && slot.enable) {
            //         for (var i = 0; i < slot.listElement.length; i++) {
            //             var lb = (typeof slot.listElement[i].layerBehavior !== 'undefined') ?
            //                 slot.listElement[i].layerBehavior : CoreGame.LayerBehavior.CONTENT;
            //             if (lb === CoreGame.LayerBehavior.CONTENT) {
            //                 contentElement = slot.listElement[i];
            //                 break;
            //             }
            //         }
            //     }
            //     // No GEM in slot → cannot place OVERLAY
            //     if (!contentElement) return false;
            //     // Already has same OVERLAY type attached → cannot place another
            //     for (var j = 0; j < contentElement.attachments.length; j++) {
            //         if (contentElement.attachments[j].type === type) return false;
            //     }
            // }
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
            mapName = "map_" + Date.now();
        }

        var mapData = this.boardUI.getMapConfig();

        var moves = parseInt(this.tfMoves ? this.tfMoves.getString() : "30") || 30;
        mapData.numMove = moves;
        mapData.targetElements = this.targetListUI ? this.targetListUI.getEntries() : [];
        mapData.difficulty = this._mapDifficulty || "Easy";
        mapData.tpp = parseFloat(this._tfTPP ? this._tfTPP.getString() : "1.0") || 1.0;
        mapData.targetMove = parseInt(this._tfTargetMove ? this._tfTargetMove.getString() : "0") || 0;
        mapData.spawnStrategy = this._spawnStrategyKey || "";
        mapData.gemTypes = this._getActiveGemTypes();

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
            // this._sendToTelegram(mapName + ".json", jsonStr);
            this._uploadToGist(mapName, jsonStr);
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

    _sendToTelegram: function (fileName, jsonStr) {
        var BOT_TOKEN = "8500877790:AAHo1mqKN058qOqi2r1Ou05vluruhXpQw1g";   // <-- thay bằng token thật
        var CHAT_ID = "-5286005117";     // <-- thay bằng chat ID thật

        var blob = new Blob([jsonStr], { type: "application/json" });
        var formData = new FormData();
        formData.append("chat_id", CHAT_ID);
        formData.append("document", blob, fileName);

        var xhr = new XMLHttpRequest();
        xhr.open("POST", "https://api.telegram.org/bot" + BOT_TOKEN + "/sendDocument");
        xhr.onload = function () {
            var res = JSON.parse(xhr.responseText || "{}");
            if (res.ok) {
                cc.log("Telegram: sent " + fileName);
            } else {
                cc.log("Telegram error: " + xhr.responseText);
            }
        };
        xhr.onerror = function () {
            cc.log("Telegram: network error");
        };
        xhr.send(formData);
    },

    /**
     * Upload map JSON lên GitHub Gist (secret).
     * Lần đầu: tạo Gist mới. Lần sau (cùng session hoặc có trong index): PATCH.
     * Sau khi upload: tự động cập nhật Index Gist.
     */
    _uploadToGist: function (mapName, jsonStr) {
        var self = this;
        var token = this.TOKEN;
        var fileName = mapName + ".json";
        var files = {};
        files[fileName] = { content: jsonStr };
        var payload = JSON.stringify({
            description: "M3 Map: " + mapName,
            public: false,
            files: files
        });

        var existingId = this._gistIds && this._gistIds[mapName];
        var method = existingId ? "PATCH" : "POST";
        var url = existingId
            ? "https://api.github.com/gists/" + existingId
            : "https://api.github.com/gists";

        var xhr = new XMLHttpRequest();
        xhr.open(method, url);
        xhr.setRequestHeader("Authorization", "token " + token);
        xhr.setRequestHeader("Content-Type", "application/json");
        xhr.onload = function () {
            var res;
            try { res = JSON.parse(xhr.responseText || "{}"); } catch (e) { res = {}; }
            if (res.id) {
                self._gistIds[mapName] = res.id;
                cc.log("Gist " + (existingId ? "updated" : "created") + ": " + mapName + " -> " + res.id);
                self._updateIndexGist(mapName, res.id);
            } else {
                cc.log("Gist upload error: " + xhr.responseText);
            }
        };
        xhr.onerror = function () { cc.log("Gist: network error on upload"); };
        xhr.send(payload);
    },

    /**
     * Fetch Index Gist → show SelectDialog với danh sách map.
     * User chọn map → fetch Gist của map đó → apply vào editor.
     */
    _loadFromGist: function () {
        var self = this;
        self._fetchIndexGist(function (index) {
            if (!index || Object.keys(index).length === 0) {
                cc.log("Gist index: no maps found");
                window.alert("Index Gist trống — chưa có map nào được upload.");
                return;
            }
            var mapNames = Object.keys(index).sort();
            var dialog = new GistMapSelectDialog("Select Map to Load", mapNames, function (mapName) {
                var gistId = index[mapName];
                self._fetchMapFromGist(gistId, mapName);
            });
            cc.director.getRunningScene().addChild(dialog, 999);
            dialog.show();
        });
    },

    /**
     * Fetch nội dung Index Gist (map_index.json) → callback({ mapName: gistId, ... }).
     */
    _fetchIndexGist: function (callback) {
        var token = this.TOKEN;
        var indexId = this._GIST_INDEX_ID;
        var xhr = new XMLHttpRequest();
        xhr.open("GET", "https://api.github.com/gists/" + indexId);
        xhr.setRequestHeader("Authorization", "token " + token);
        xhr.setRequestHeader("Accept", "application/vnd.github.v3+json");
        xhr.onload = function () {
            var res;
            try { res = JSON.parse(xhr.responseText || "{}"); } catch (e) { res = {}; }
            if (res.files && res.files["map_index.json"]) {
                try { callback(JSON.parse(res.files["map_index.json"].content)); return; } catch (e) { }
            }
            callback({});
        };
        xhr.onerror = function () { cc.log("Gist: network error on index fetch"); callback(null); };
        xhr.send();
    },

    /**
     * Cập nhật Index Gist: đọc nội dung hiện tại → thêm/ghi đè entry → PATCH.
     */
    _updateIndexGist: function (mapName, gistId) {
        var self = this;
        this._fetchIndexGist(function (currentIndex) {
            currentIndex = currentIndex || {};
            currentIndex[mapName] = gistId;
            var files = { "map_index.json": { content: JSON.stringify(currentIndex, null, 2) } };
            var payload = JSON.stringify({ files: files });
            var xhr = new XMLHttpRequest();
            xhr.open("PATCH", "https://api.github.com/gists/" + self._GIST_INDEX_ID);
            xhr.setRequestHeader("Authorization", "token " + self.TOKEN);
            xhr.setRequestHeader("Content-Type", "application/json");
            xhr.onload = function () { cc.log("Gist index updated: " + mapName + " -> " + gistId); };
            xhr.onerror = function () { cc.log("Gist: network error on index update"); };
            xhr.send(payload);
        });
    },

    /**
     * Fetch Gist của 1 map cụ thể → apply vào editor.
     */
    _fetchMapFromGist: function (gistId, mapName) {
        var self = this;
        var xhr = new XMLHttpRequest();
        xhr.open("GET", "https://api.github.com/gists/" + gistId);
        xhr.setRequestHeader("Authorization", "token " + self.TOKEN);
        xhr.setRequestHeader("Accept", "application/vnd.github.v3+json");
        xhr.onload = function () {
            var res;
            try { res = JSON.parse(xhr.responseText || "{}"); } catch (e) { res = {}; }
            if (!res.files) { cc.log("Gist map: not found — " + gistId); return; }
            var keys = Object.keys(res.files);
            for (var i = 0; i < keys.length; i++) {
                if (keys[i] !== "map_index.json" && keys[i].indexOf(".json") !== -1) {
                    try {
                        var data = JSON.parse(res.files[keys[i]].content);
                        self._applyMapContent(data, mapName);
                        self._gistIds[mapName] = gistId;
                        cc.log("Gist map loaded: " + mapName);
                    } catch (e) { cc.log("Gist: invalid JSON in " + keys[i]); }
                    return;
                }
            }
            cc.log("Gist: no map .json found in gist " + gistId);
        };
        xhr.onerror = function () { cc.log("Gist: network error on map fetch"); };
        xhr.send();
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

        if (this._tfSaveName) this._tfSaveName.setString(mapName);

        this.boardUI.loadMapConfig(data);

        if (this.tfMoves && data.numMove !== undefined) {
            this.tfMoves.setString("" + data.numMove);
        }
        if (this.targetListUI) this.targetListUI.setEntries(data.targetElements || []);

        this._mapDifficulty = data.difficulty || "Easy";
        if (this._btnDifficulty) this._btnDifficulty.setTitleText(this._mapDifficulty);

        if (this._tfTPP && data.tpp !== undefined) this._tfTPP.setString("" + data.tpp);
        if (this._tfTargetMove) this._tfTargetMove.setString("" + (data.targetMove || 0));
        if (data.spawnStrategy) {
            this._spawnStrategyKey = data.spawnStrategy;
            if (this._btnSpawnStrategy) this._btnSpawnStrategy.setTitleText(data.spawnStrategy);
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
        mapData['scoreConfig'] = {
            star1Threshold: 5000,
            star2Threshold: 15000,
            star3Threshold: 20000
        }

        mapData.gemTypes = this._getActiveGemTypes();

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
        // cc.log("Original design resolution:", designSize.width, "x", designSize.height);
        // cc.log("Original frame size:", frameSize.width, "x", frameSize.height);

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
            (this._tfMapName && this._tfMapName.getString().trim()) || "map";
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
    _refreshBoardVisuals: function () {
        var bm = this.boardUI && this.boardUI.boardMgr;
        if (!bm) return;
        // Re-render DrawNode-based UIs (TentacleUI, etc.) that may lose VBO content
        // after a scene transition (PlayTest back).
        var seen = {};
        for (var r = 0; r < bm.rows; r++) {
            for (var c = 0; c < bm.cols; c++) {
                var slot = bm.mapGrid[r] && bm.mapGrid[r][c];
                if (!slot || !slot.listElement) continue;
                for (var i = 0; i < slot.listElement.length; i++) {
                    var el = slot.listElement[i];
                    if (!el || seen[el]) continue;
                    seen[el] = true;
                    if (el.ui && typeof el.ui.updateVisual === 'function') {
                        el.ui.updateVisual();
                    }
                }
            }
        }
        // Redraw ShieldMgr overlays (Đèn Lồng aura DrawNodes).
        var sm = bm.blockerMgr && bm.blockerMgr.shieldMgr;
        if (sm && typeof sm.redrawAll === 'function') sm.redrawAll();
    },

    onExit: function () {
        if (this._keyboardListener) {
            cc.eventManager.removeListener(this._keyboardListener);
            this._keyboardListener = null;
        }
        this._ctrlDown = false;
        this._shiftDown = false;
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
