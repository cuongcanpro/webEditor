/**
 * TargetListUI - Standalone target element list editor
 *
 * Fills a given parent node (e.g. pTarget panel from EditMapUINew.json).
 * Style mirrors BoardInfoUI's target entry rows:
 *   - Dark row bg
 *   - Element icon + ID (tap to pick via ElementSelectorUI)
 *   - Count field with − / + buttons
 *   - Delete (✕) button per row
 *   - "+ Add" header button
 *   - Scrollable list
 *
 * Usage:
 *   var ui = new TargetListUI(parentNode);
 *   ui.setEntries([{id:1, count:50}, {id:12, count:3}]);
 *   var entries = ui.getEntries(); // [{id, count}]
 */
var TargetListUI = cc.Node.extend({

    // ─── State ───────────────────────────────────────────────────────────────
    targetEntries: null,   // [{id, count, countField}]

    // ─── UI refs ─────────────────────────────────────────────────────────────
    _scrollView: null,
    _listContainer: null,
    _pickerLayer: null,
    _selectorUI: null,
    _pickerCallback: null,

    // ─── Layout ──────────────────────────────────────────────────────────────
    ITEM_H: 42,
    ITEM_PAD: 4,

    // ─────────────────────────────────────────────────────────────────────────
    /**
     * @param {cc.Node} parentNode - The panel to fill (e.g. pTarget)
     */
    ctor: function (parentNode) {
        this._super();
        this.targetEntries = [];

        if (!parentNode) { cc.log("[TargetListUI] ERROR: no parentNode"); return; }

        var size = parentNode.getContentSize();
        this.setContentSize(size);
        this.setAnchorPoint(cc.p(0, 0));
        this.setPosition(0, 0);
        parentNode.addChild(this, 2);

        this._build(size);
    },

    // ─────────────────────────────────────────────────────────────────────────
    // Build
    // ─────────────────────────────────────────────────────────────────────────
    _build: function (size) {
        var self = this;
        var W = size.width;
        var H = size.height;
        var HEADER_H = 28;

        // ── Header row ──────────────────────────────────────────────────────
        var headerBg = new ccui.Layout();
        headerBg.setBackGroundColorType(ccui.Layout.BG_COLOR_SOLID);
        headerBg.setBackGroundColor(cc.color("#282e44"));
        // hdr.setColor(cc.color("#282e44"));
        headerBg.setContentSize(W, HEADER_H);
        headerBg.setPosition(0, H - HEADER_H);
        this.addChild(headerBg, 1);

        var lbTitle = new ccui.Text("OBJECTIVE", "font/BalooPaaji2-Bold.ttf", 11);
        lbTitle.setColor(cc.color(180, 220, 255));
        lbTitle.setAnchorPoint(cc.p(0, 0.5));
        lbTitle.setPosition(6, HEADER_H / 2);
        headerBg.addChild(lbTitle);

        var btnAdd = this._makeBtnBg("+ Add", 52, HEADER_H - 4, cc.color(150, 240, 160));
        btnAdd.setAnchorPoint(cc.p(1, 0.5));
        btnAdd.setPosition(W - 4, HEADER_H / 2);
        btnAdd.addTouchEventListener(function (sender, type) {
            cc.log("lfjsdlfds ======== btnAdd");
            if (type === ccui.Widget.TOUCH_ENDED) {
                self.targetEntries.push({ id: 1, count: 1 });
                self._refresh();
            }
        });
        headerBg.addChild(btnAdd);

        // Button: Add From Map (collect blockers/gems present on current EditMap)
        var btnFromMap = this._makeBtnBg("From Map", 80, HEADER_H - 6, cc.color(120, 200, 250));
        btnFromMap.setAnchorPoint(cc.p(1, 0.5));
        // place to the left of +Add (leave a small gap)
        btnFromMap.setPosition(W - 62, HEADER_H / 2);
        btnFromMap.addTouchEventListener(function (sender, type) {
            if (type === ccui.Widget.TOUCH_ENDED) {
                self._showMapPicker(function () {
                    self._refresh();
                });
            }
        });
        headerBg.addChild(btnFromMap);

        // ── ScrollView ──────────────────────────────────────────────────────
        var scrollH = H - HEADER_H;
        this._scrollView = new ccui.ScrollView();
        this._scrollView.setDirection(ccui.ScrollView.DIR_VERTICAL);
        this._scrollView.setContentSize(cc.size(W, scrollH));
        this._scrollView.setPosition(0, 0);
        this._scrollView.setBounceEnabled(true);
        this.addChild(this._scrollView, 1);

        this._listContainer = new ccui.Layout();
        this._listContainer.setContentSize(W, scrollH);
        this._scrollView.addChild(this._listContainer);

        this._refresh();
    },

    // ─────────────────────────────────────────────────────────────────────────
    // Refresh list
    // ─────────────────────────────────────────────────────────────────────────
    _refresh: function () {
        var self = this;
        var entries = this.targetEntries;
        var ITEM_H = this.ITEM_H;
        var PAD = this.ITEM_PAD;
        var W = this._listContainer.getContentSize().width;

        this._listContainer.removeAllChildren();

        var totalH = Math.max(
            this._scrollView.getContentSize().height,
            entries.length * (ITEM_H + PAD) + PAD
        );
        this._listContainer.setContentSize(W, totalH);
        this._scrollView.setInnerContainerSize(cc.size(W, totalH));

        if (entries.length === 0) {
            var hint = new cc.LabelTTF("(Tap + Add to add a target)", "font/BalooPaaji2-Regular.ttf", 12);
            hint.setPosition(W / 2, totalH / 2);
            hint.setColor(cc.color(100, 100, 110));
            this._listContainer.addChild(hint);
            return;
        }

        for (var i = 0; i < entries.length; i++) {
            this._buildRow(i, entries[i], totalH, W, ITEM_H, PAD);
        }
    },

    _buildRow: function (index, entry, totalH, W, ITEM_H, PAD) {
        var self = this;
        var rowY = totalH - (index * (ITEM_H + PAD) + PAD + ITEM_H / 2);

        // Row background
        var bg = new ccui.Layout();
        bg.setBackGroundColorType(ccui.Layout.BG_COLOR_SOLID);
        bg.setBackGroundColor(cc.color(45, 48, 62));
        bg.setContentSize(W, ITEM_H);
        bg.setPosition(0, rowY - ITEM_H / 2);
        this._listContainer.addChild(bg);

        // Index label
        var idxLbl = new cc.LabelTTF("#" + (index + 1), "font/BalooPaaji2-Regular.ttf", 11);
        idxLbl.setAnchorPoint(cc.p(0, 0.5));
        idxLbl.setPosition(4, ITEM_H / 2);
        idxLbl.setColor(cc.color(130, 130, 140));
        bg.addChild(idxLbl);

        // ── Element ID button (tap to pick) ──────────────────────────────
        var idBtn = this._makeBtn(entry.id ? String(entry.id) : "?", 62, ITEM_H - 8, cc.color(55, 58, 75));
        idBtn.setPosition(52, ITEM_H / 2);
        bg.addChild(idBtn);

        // Helper to refresh icon+label on idBtn
        var updateIdVisual = function (type) {
            idBtn.setTitleText(String(type));
            var old = idBtn.getChildByName("el_icon");
            if (old) old.removeFromParent();

            var elemObj;
            try {
                if (CoreGame.ElementObject.map[type]) {
                    elemObj = CoreGame.ElementObject.create(0, 0, type, 1);
                } else {
                    elemObj = CoreGame.BlockerFactory.createBlocker(0, 0, type, 1);
                }
            } catch (e) { }

            if (elemObj) {
                elemObj.createUI(idBtn);
                if (elemObj.ui) {
                    elemObj.ui.setName("el_icon");
                    var sc = elemObj.getScaleToFit ? elemObj.getScaleToFit(22, 22) : 0.35;
                    elemObj.ui.setScale(sc);
                    elemObj.ui.setPosition(idBtn.getContentSize().width * 0.25, idBtn.getContentSize().height / 2);
                    idBtn.setTitleText("    " + type);
                }
            }
        };
        if (entry.id !== undefined && entry.id !== null) updateIdVisual(entry.id);

        idBtn.addTouchEventListener(function (sender, type) {
            if (type === ccui.Widget.TOUCH_ENDED) {
                self._showPicker(function (selectedType) {
                    entry.id = selectedType;
                    updateIdVisual(selectedType);
                });
            }
        });

        // ── Count: − field + ──────────────────────────────────────────────
        var btnMinus = this._makeBtn("−", 24, 24, cc.color(150, 240, 160));
        btnMinus.setPosition(W - 74, ITEM_H / 2);
        bg.addChild(btnMinus);

        var cntField = new ccui.TextField();
        cntField.setPlaceHolder("1");
        cntField.setPlaceHolderColor(cc.color(100, 100, 110));
        cntField.setTextColor(cc.color(255, 255, 255));
        cntField.setFontSize(14);
        cntField.setMaxLengthEnabled(true);
        cntField.setMaxLength(5);
        cntField.setTouchEnabled(true);
        cntField.setString(String(entry.count || 1));
        cntField.setPosition(W - 48, ITEM_H / 2);
        bg.addChild(cntField);
        entry.countField = cntField;

        var btnPlus = this._makeBtn("+", 24, 24, cc.color(150, 240, 160));
        btnPlus.setPosition(W - 22, ITEM_H / 2);
        bg.addChild(btnPlus);

        btnMinus.addTouchEventListener(function (sender, type) {
            cc.log("lfjsdlfds ======== ");
            if (type === ccui.Widget.TOUCH_ENDED) {
                var v = parseInt(cntField.getString()) || 1;
                if (v > 1) { v--; cntField.setString(String(v)); entry.count = v; }
            }
        });
        btnPlus.addTouchEventListener(function (sender, type) {
            if (type === ccui.Widget.TOUCH_ENDED) {
                var v = parseInt(cntField.getString()) || 1;
                v++; cntField.setString(String(v)); entry.count = v;
            }
        });

        // ── Delete button ─────────────────────────────────────────────────
        var btnDel = this._makeBtn("X", 22, 22, cc.color(240, 40, 40));
        // Position between idBtn and count area
        btnDel.setPosition(120, ITEM_H / 2);
        bg.addChild(btnDel);
        (function (idx) {
            btnDel.addTouchEventListener(function (sender, type) {
                if (type === ccui.Widget.TOUCH_ENDED) {
                    self.targetEntries.splice(idx, 1);
                    self._refresh();
                }
            });
        })(index);
    },

    // ─────────────────────────────────────────────────────────────────────────
    // Element picker popup (lazy-initialized, same as BoardInfoUI style)
    // ─────────────────────────────────────────────────────────────────────────
    _showPicker: function (callback) {
        var self = this;
        if (!this._pickerLayer) {
            var sz = cc.winSize;
            var panelW = Math.min(sz.width * 0.7, 600);
            var panelH = Math.min(sz.height * 0.75, 500);

            this._pickerLayer = new cc.LayerColor(cc.color(0, 0, 0, 190));
            this._pickerLayer.setContentSize(sz);

            // Close on tap outside panel
            var outerListener = cc.EventListener.create({
                event: cc.EventListener.TOUCH_ONE_BY_ONE,
                swallowTouches: true,
                onTouchBegan: function (touch, event) {
                    var target = event.getCurrentTarget();
                    if (!target || !target.isVisible()) return false;
                    target.setVisible(false);
                    return true;
                }
            });
            cc.eventManager.addListener(outerListener, this._pickerLayer);

            // Panel
            var panel = new ccui.Layout();
            panel.setBackGroundColorType(ccui.Layout.BG_COLOR_SOLID);
            panel.setBackGroundColor(cc.color(35, 37, 50));
            panel.setContentSize(panelW, panelH);
            panel.setPosition(sz.width / 2 - panelW / 2, sz.height / 2 - panelH / 2);

            // Prevent outer close from firing when touching inside panel
            var innerListener = cc.EventListener.create({
                event: cc.EventListener.TOUCH_ONE_BY_ONE,
                swallowTouches: true,
                onTouchBegan: function (touch, event) {
                    var layer = self._pickerLayer;
                    if (!layer || !layer.isVisible()) return false;
                    return true;
                }
            });
            cc.eventManager.addListener(innerListener, panel);
            this._pickerLayer.addChild(panel);

            // Title
            var lbTitle = new cc.LabelTTF("Select Element", "font/BalooPaaji2-Regular.ttf", 18);
            lbTitle.setColor(cc.color(220, 220, 255));
            lbTitle.setPosition(panelW / 2, panelH - 18);
            panel.addChild(lbTitle);

            // ElementSelectorUI fills the panel
            this._selectorUI = new ElementSelectorUI(
                cc.size(panelW - 8, panelH - 38),
                function (type, name) {
                    self._pickerLayer.setVisible(false);
                    if (self._pickerCallback) self._pickerCallback(type);
                }
            );
            this._selectorUI.setPosition(4, 4);
            panel.addChild(this._selectorUI);

            // Close button (✕)
            var btnClose = this._makeBtn("X", 32, 32, cc.color(240, 40, 40));
            btnClose.setPosition(panelW - 20, panelH - 18);
            btnClose.addTouchEventListener(function (sender, type) {
                if (type === ccui.Widget.TOUCH_ENDED) {
                    self._pickerLayer.setVisible(false);
                }
            });
            panel.addChild(btnClose);

            // Attach to scene root (high z-order)
            // var scene = cc.director.getRunningScene();
            // if (scene) scene.addChild(this._pickerLayer, 9999);
            EditMapSceneNew.getInstance().addChild(this._pickerLayer, 9999);
        }

        this._pickerCallback = callback;
        this._pickerLayer.setVisible(true);
        if (this._selectorUI) this._selectorUI.clearSelection();
    },

    // Show a picker listing unique element types currently on the EditMap
    _showMapPicker: function (doneCallback) {
        var self = this;
        // Try to locate the running EditMapScene instance.
        // Don't call EditMapSceneNew.getInstance() here because that may create
        // a new singleton instead of returning the currently displayed scene.
        var edit = EditMapSceneNew.getInstance();
        // // First try walking up from this node (pTarget -> rootNode -> scene layer)
        // try {
        //     var p = this.getParent();
        //     while (p) {
        //         if (p.boardUI && p.boardUI.getMapConfig) { edit = p; break; }
        //         p = p.getParent ? p.getParent() : null;
        //     }
        // } catch (e) { }

        // // Fallback: search running scene children for a layer with boardUI
        // if (!edit) {
        //     var scene = cc.director.getRunningScene();
        //     if (scene) {
        //         var ch = scene.getChildren();
        //         for (var ci = 0; ci < ch.length; ci++) {
        //             var c = ch[ci];
        //             if (c && c.boardUI && c.boardUI.getMapConfig) { edit = c; break; }
        //         }
        //     }
        // }

        // if (!edit || !edit.boardUI || !edit.boardUI.getMapConfig) {
        //     cc.log("[TargetListUI] _showMapPicker: EditMapScene not available");
        //     return;
        // }

        var mapCfg = edit.boardUI.getMapConfig();
        var elems = (mapCfg && mapCfg.elements) ? mapCfg.elements : [];

        // Collect unique types + count occurrences
        var countMap = {};
        var types = [];
        for (var i = 0; i < elems.length; i++) {
            var t = elems[i].type;
            if (t == null) continue;
            if (!countMap[t]) { countMap[t] = 0; types.push(t); }
            countMap[t]++;
        }

        if (types.length === 0) {
            cc.log("[TargetListUI] No elements found on map to import as targets");
            return;
        }
        this._mapCountMap = countMap; // Store for use in button callbacks

        // Lazy-initialize map picker layer
        if (!this._mapPickerLayer) {
            var sz = cc.winSize;
            var panelW = Math.min(sz.width * 0.7, 700);
            var panelH = Math.min(sz.height * 0.75, 520);

            this._mapPickerLayer = new cc.LayerColor(cc.color(0, 0, 0, 190));
            this._mapPickerLayer.setContentSize(sz);

            var outerListener = cc.EventListener.create({
                event: cc.EventListener.TOUCH_ONE_BY_ONE,
                swallowTouches: true,
                onTouchBegan: function (touch, event) {
                    var target = event.getCurrentTarget();
                    if (!target || !target.isVisible()) return false;
                    target.setVisible(false);
                    return true;
                }
            });
            cc.eventManager.addListener(outerListener, this._mapPickerLayer);

            var panel = new ccui.Layout();
            // panel.setBackGroundColorType(ccui.Layout.BG_COLOR_SOLID);
            // panel.setBackGroundColor(cc.color(35, 37, 50));
            panel.setBackGroundImageScale9Enabled(true);
            panel.setBackGroundImage("res/tool/res/popup.png");
            panel.setContentSize(panelW, panelH);
            panel.setPosition(sz.width / 2 - panelW / 2, sz.height / 2 - panelH / 2);

            var innerListener = cc.EventListener.create({
                event: cc.EventListener.TOUCH_ONE_BY_ONE,
                swallowTouches: true,
                onTouchBegan: function (touch, event) {
                    if (self._mapPickerLayer.isVisible()) {
                        return true;
                    }
                    return false;
                }
            });
            cc.eventManager.addListener(innerListener, panel);
            this._mapPickerLayer.addChild(panel);

            var lbTitle = new cc.LabelTTF("Map Elements", "font/BalooPaaji2-Regular.ttf", 18);
            lbTitle.setColor(cc.color(220, 220, 255));
            lbTitle.setPosition(panelW / 2, panelH - 18);
            panel.addChild(lbTitle);

            // Scroll view for types
            var listH = panelH - 64;
            var sv = new ccui.ScrollView();
            sv.setDirection(ccui.ScrollView.DIR_VERTICAL);
            sv.setContentSize(cc.size(panelW - 20, listH));
            sv.setPosition(10, 32);
            panel.addChild(sv);
            this._mapPickerScroll = sv;

            // Add All button
            var btnAddAll = this._makeBtn("Add All", 80, 28, cc.color(150, 240, 160));
            btnAddAll.setAnchorPoint(cc.p(1, 0.5));
            btnAddAll.setPosition(panelW - 10, panelH - 18);
            btnAddAll.addTouchEventListener(function (sender, type) {
                if (type === ccui.Widget.TOUCH_ENDED) {
                    for (var k = 0; k < self._mapPickerTypes.length; k++) {
                        var tid = self._mapPickerTypes[k];
                        var defaultCnt = (self._mapCountMap && self._mapCountMap[tid]) ? self._mapCountMap[tid] : 1;
                        var exists = false;
                        for (var e = 0; e < self.targetEntries.length; e++) if (self.targetEntries[e].id === tid) { exists = true; break; }
                        if (!exists) self.targetEntries.push({ id: tid, count: defaultCnt });
                    }
                    if (doneCallback) doneCallback();
                    self._mapPickerLayer.setVisible(false);
                }
            });
            panel.addChild(btnAddAll);

            // Close button (✕)
            var btnClose = this._makeBtnBg("Close", 100, 40, cc.color(240, 40, 40));
            btnClose.setAnchorPoint(cc.p(0.5, 0.5));
            btnClose.setPosition(panelW * 0.5, 50);
            btnClose.addTouchEventListener(function (sender, type) {
                if (type === ccui.Widget.TOUCH_ENDED) {
                    self._mapPickerLayer.setVisible(false);
                }
            });
            panel.addChild(btnClose);

            // Attach to scene root
            EditMapSceneNew.getInstance().addChild(this._mapPickerLayer, 9999);
        }

        // Populate list (rebuild)
        this._mapPickerLayer.setVisible(true);
        this._mapPickerTypes = types;
        this._mapCountMap = countMap;

        var sv = this._mapPickerScroll;
        sv.removeAllChildren();

        var totalH = Math.max(sv.getContentSize().height, types.length * 40 + 8);
        var container = new ccui.Layout();
        container.setContentSize(sv.getContentSize().width, totalH);
        sv.addChild(container);
        sv.setInnerContainerSize(container.getContentSize());

        for (var i = 0; i < types.length; i++) {
            var ti = types[i];
            var idx = i;
            var y = totalH - (idx * 40 + 20);
            var row = new ccui.Layout();
            row.setContentSize(container.getContentSize().width, 36);
            row.setPosition(0, y - 18);
            container.addChild(row);

            var defaultCnt = (countMap && countMap[ti]) ? countMap[ti] : 1;
            var lb = new cc.LabelTTF("ID: " + String(ti) + "  x" + defaultCnt, "font/BalooPaaji2-Regular.ttf", 14);
            lb.setAnchorPoint(cc.p(0, 0.5));
            lb.setPosition(48, 18); // Shifted right for icon
            lb.setColor(cc.color(220, 220, 220));
            row.addChild(lb);

            // --- Icon for Map Picker row ---
            var elemObj;
            try {
                if (CoreGame.ElementObject.map[ti]) {
                    elemObj = CoreGame.ElementObject.create(0, 0, ti, 1);
                } else {
                    elemObj = CoreGame.BlockerFactory.createBlocker(0, 0, ti, 1);
                }
            } catch (e) { }

            if (elemObj) {
                elemObj.createUI(row);
                if (elemObj.ui) {
                    var sc = elemObj.getScaleToFit ? elemObj.getScaleToFit(32, 32) : 0.45;
                    elemObj.ui.setScale(sc);
                    elemObj.ui.setPosition(24, 18);
                }
            }

            var btn = self._makeBtn("Add", 56, 26, cc.color(150, 240, 160));
            btn.setAnchorPoint(cc.p(1, 0.5));
            btn.setPosition(container.getContentSize().width - 8, 18);
            // Lưu giá trị vào chính button (cách Cocos2d-JS để tránh closure var)
            btn.targetTypeId = ti;
            btn.targetCnt = defaultCnt;
            btn.addTouchEventListener(function (s, ttype) {
                if (ttype === ccui.Widget.TOUCH_ENDED) {
                    var type_id = s.targetTypeId;
                    var cnt = s.targetCnt;
                    var exists = false;
                    for (var e = 0; e < self.targetEntries.length; e++) if (self.targetEntries[e].id === type_id) { exists = true; break; }
                    if (!exists) self.targetEntries.push({ id: type_id, count: cnt });
                    if (doneCallback) doneCallback();
                    s.setTitleText("Added");
                    s.setEnabled(false);
                }
            });
            row.addChild(btn);
        }
    },

    // ─────────────────────────────────────────────────────────────────────────
    // Helpers
    // ─────────────────────────────────────────────────────────────────────────
    _makeBtn: function (text, w, h, color) {
        var btn = new ccui.Button();
        btn.setScale9Enabled(true);
        btn.setContentSize(w, h);
        btn.setTitleText(text);
        btn.setTitleFontSize(12);
        btn.setColor(color || cc.color(70, 72, 88));
        btn.setTitleFontName("font/BalooPaaji2-Regular.ttf");
        return btn;
    },

    _makeBtnBg: function (text, w, h, color) {
        var btn = new ccui.Button("res/tool/res/btnGrey.png", "res/tool/res/btnGrey.png", "res/tool/res/btnGrey.png");
        btn.setScale9Enabled(true);
        btn.setContentSize(w, h);
        btn.setTitleText(text);
        btn.setTitleFontSize(12);
        btn.setTitleFontName("font/BalooPaaji2-Regular.ttf");
        // btn.setColor(color || cc.color(70, 72, 88));
        return btn;
    },

    // ─────────────────────────────────────────────────────────────────────────
    // Public API
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Pre-fill with an array of {id, count} objects.
     * @param {Array} entries
     */
    setEntries: function (entries) {
        this.targetEntries = [];
        if (entries && entries.length) {
            for (var i = 0; i < entries.length; i++) {
                this.targetEntries.push({ id: entries[i].id || 0, count: entries[i].count || 1 });
            }
        }
        this._refresh();
    },

    /**
     * Read current entries (syncs count from TextField).
     * @returns {Array} [{id, count}]
     */
    getEntries: function () {
        var result = [];
        for (var i = 0; i < this.targetEntries.length; i++) {
            var e = this.targetEntries[i];
            var cnt = e.countField ? (parseInt(e.countField.getString()) || 1) : (e.count || 1);
            if (cnt < 1) cnt = 1;
            e.count = cnt;
            result.push({ id: e.id || 0, count: cnt });
        }
        return result;
    }
});
