/**
 * BoardInfoUI - Popup UI for entering level board information:
 *   - numMove       : number of swap moves allowed in a Level
 *   - targetElements: array of { id, count } — elements to collect
 *   - numTest       : number of times to run automated Test
 *
 * Usage:
 *   var ui = new BoardInfoUI(function (info) {
 *       // info = { numMove, targetElements, numTest }
 *   });
 *   ui.show();                     // open the popup
 *   ui.setInfo({ numMove: 30, targetElements: [{id:1,count:5}], numTest: 3 }); // pre-fill
 *   var info = ui.getInfo();       // read current values
 */
var BoardInfoUI = cc.LayerColor.extend({

    // ─── Layout constants ───────────────────────────────────────────────────
    POPUP_W: 500,
    POPUP_H: 560,
    ROW_H: 48,
    PAD: 16,
    BTN_SZ: 38,

    // ─── State ───────────────────────────────────────────────────────────────
    onChangeCallback: null,
    targetEntries: [],   // [{ id, count, rowNode, idField, countField }]

    // ─── Number inputs ───────────────────────────────────────────────────────
    numMoveField: null,
    numTestField: null,

    // ─── Scroll list ─────────────────────────────────────────────────────────
    scrollView: null,
    listContainer: null,

    // ─────────────────────────────────────────────────────────────────────────
    ctor: function (onChangeCallback) {
        this._super(cc.color(0, 0, 0, 180));
        this.onChangeCallback = onChangeCallback || null;
        this.targetEntries = [];
        this.setContentSize(cc.winSize);
        this._buildPopup();

        // Swallow all touches so background doesn't receive them
        var self = this;
        var listener = cc.EventListener.create({
            event: cc.EventListener.TOUCH_ONE_BY_ONE,
            swallowTouches: true,
            onTouchBegan: function (touch, event) {
                if (!self.isVisible()) return false;
                var loc = self.popupBg.convertToNodeSpace(touch.getLocation());
                var sz = self.popupBg.getContentSize();
                // Close if click is outside popup
                if (loc.x < 0 || loc.x > sz.width || loc.y < 0 || loc.y > sz.height) {
                    self.hide();
                }
                return true;
            }
        });
        cc.eventManager.addListener(listener, this);

        this.setVisible(false);
    },

    // =========================================================================
    // Build
    // =========================================================================

    _buildPopup: function () {
        var W = this.POPUP_W, H = this.POPUP_H, PAD = this.PAD;

        // ── Background panel ────────────────────────────────────────────────
        this.popupBg = new ccui.Layout();
        this.popupBg.setBackGroundColorType(ccui.Layout.BG_COLOR_SOLID);
        this.popupBg.setBackGroundColor(cc.color(35, 35, 45));
        this.popupBg.setContentSize(W, H);
        this.popupBg.setPosition(
            cc.winSize.width / 2 - W / 2,
            cc.winSize.height / 2 - H / 2
        );
        this.addChild(this.popupBg);

        var curY = H - PAD;

        // ── Title ────────────────────────────────────────────────────────────
        var title = new cc.LabelTTF("Board Info", "Arial", 24);
        title.setPosition(W / 2, curY - 16);
        title.setColor(cc.color(255, 220, 80));
        this.popupBg.addChild(title);
        curY -= 46;

        // ── Divider ──────────────────────────────────────────────────────────
        curY = this._addDivider(curY);

        // ── numMove row ──────────────────────────────────────────────────────
        this.numMoveField = this._addNumberRow("Moves (numMove):", curY, 1, 999, 30);
        curY -= this.ROW_H + PAD / 2;

        // ── numTest row ──────────────────────────────────────────────────────
        this.numTestField = this._addNumberRow("Tests (numTest):", curY, 1, 100, 1);
        curY -= this.ROW_H + PAD;

        // ── Divider ──────────────────────────────────────────────────────────
        curY = this._addDivider(curY);

        // ── targetElements header ─────────────────────────────────────────────
        var targetLabel = new cc.LabelTTF("Target Elements:", "Arial", 18);
        targetLabel.setAnchorPoint(0, 0.5);
        targetLabel.setPosition(PAD, curY - 14);
        targetLabel.setColor(cc.color(180, 220, 255));
        this.popupBg.addChild(targetLabel);

        // ── Add Entry button ─────────────────────────────────────────────────
        var self = this;
        var btnAdd = this._makeButton("+  Add", 90, 28, cc.color(60, 160, 80));
        btnAdd.setPosition(W - PAD - 45, curY - 14);
        btnAdd.addTouchEventListener(function (sender, type) {
            if (type === ccui.Widget.TOUCH_ENDED) {
                self._addTargetEntry(0, 1);
                self._refreshScrollList();
            }
        });
        this.popupBg.addChild(btnAdd);
        curY -= 36;

        // ── Scroll view for target entries ────────────────────────────────────
        var scrollH = 140;
        this.scrollView = new ccui.ScrollView();
        this.scrollView.setDirection(ccui.ScrollView.DIR_VERTICAL);
        this.scrollView.setContentSize(W - PAD * 2, scrollH);
        this.scrollView.setPosition(PAD, curY - scrollH);
        this.scrollView.setBounceEnabled(true);
        this.popupBg.addChild(this.scrollView);

        this.listContainer = new ccui.Layout();
        this.listContainer.setContentSize(W - PAD * 2, scrollH);
        this.scrollView.addChild(this.listContainer);

        curY -= scrollH + PAD;

        // ── Divider ──────────────────────────────────────────────────────────
        curY = this._addDivider(curY);

        // ── Buttons row ───────────────────────────────────────────────────────
        var btnOk = this._makeButton("OK", 110, 40, cc.color(60, 130, 200));
        btnOk.setPosition(W / 2 + 65, curY - 22);
        btnOk.addTouchEventListener(function (sender, type) {
            if (type === ccui.Widget.TOUCH_ENDED) {
                if (self.onChangeCallback) self.onChangeCallback(self.getInfo());
                self.hide();
            }
        });
        this.popupBg.addChild(btnOk);

        var btnCancel = this._makeButton("Cancel", 110, 40, cc.color(160, 60, 60));
        btnCancel.setPosition(W / 2 - 65, curY - 22);
        btnCancel.addTouchEventListener(function (sender, type) {
            if (type === ccui.Widget.TOUCH_ENDED) {
                self.hide();
            }
        });
        this.popupBg.addChild(btnCancel);
    },

    // =========================================================================
    // Helper: add a numeric row with label + − value + buttons
    // Returns the TextField so value can be read / written later
    // =========================================================================
    _addNumberRow: function (labelText, topY, min, max, defaultVal) {
        var W = this.POPUP_W, PAD = this.PAD, BTN = this.BTN_SZ, ROW = this.ROW_H;
        var self = this;
        var midY = topY - ROW / 2;

        var lbl = new cc.LabelTTF(labelText, "Arial", 18);
        lbl.setAnchorPoint(0, 0.5);
        lbl.setPosition(PAD, midY);
        lbl.setColor(cc.color(220, 220, 220));
        this.popupBg.addChild(lbl);

        // Minus button
        var btnMin = this._makeButton("-", BTN, BTN, cc.color(80, 80, 90));
        btnMin.setPosition(W - PAD - BTN * 2 - 60, midY);

        // Input field
        var field = new ccui.TextField();
        field.setPlaceHolder(String(defaultVal));
        field.setPlaceHolderColor(cc.color(120, 120, 120));
        field.setTextColor(cc.color(255, 255, 255));
        field.setFontSize(20);
        field.setMaxLengthEnabled(true);
        field.setMaxLength(4);
        field.setTouchEnabled(true);
        field.setString(String(defaultVal));
        // field.setContentSize(70, BTN);
        field.setPosition(W - PAD - BTN - 30, midY);
        this.popupBg.addChild(field);

        // Plus button
        var btnPlus = this._makeButton("+", BTN, BTN, cc.color(80, 80, 90));
        btnPlus.setPosition(W - PAD - 6, midY);

        // Wire buttons
        btnMin.addTouchEventListener(function (sender, type) {
            if (type === ccui.Widget.TOUCH_ENDED) {
                var v = parseInt(field.getString()) || defaultVal;
                if (v > min) { v--; field.setString(String(v)); }
            }
        });
        btnPlus.addTouchEventListener(function (sender, type) {
            if (type === ccui.Widget.TOUCH_ENDED) {
                var v = parseInt(field.getString()) || defaultVal;
                if (v < max) { v++; field.setString(String(v)); }
            }
        });

        this.popupBg.addChild(btnMin);
        this.popupBg.addChild(btnPlus);

        // Store min/max on field for getInfo validation
        field._min = min;
        field._max = max;
        field._default = defaultVal;

        return field;
    },

    // =========================================================================
    // Target entries list
    // =========================================================================

    /** Add a logical entry (doesn't build UI yet) */
    _addTargetEntry: function (id, count) {
        this.targetEntries.push({ id: id, count: count });
    },

    /** Rebuild the scroll‑list UI from this.targetEntries */
    _refreshScrollList: function () {
        var self = this;
        var ITEM_H = 46, PAD = 8;
        var W = this.listContainer.getContentSize().width;

        this.listContainer.removeAllChildren();

        var totalH = Math.max(this.scrollView.getContentSize().height,
            this.targetEntries.length * (ITEM_H + PAD) + PAD);
        this.listContainer.setContentSize(W, totalH);
        this.scrollView.setInnerContainerSize(cc.size(W, totalH));

        for (var i = 0; i < this.targetEntries.length; i++) {
            this._buildEntryRow(i, totalH, ITEM_H, PAD, W);
        }

        if (this.targetEntries.length === 0) {
            var hint = new cc.LabelTTF("(No targets — tap + Add)", "Arial", 16);
            hint.setPosition(W / 2, totalH / 2);
            hint.setColor(cc.color(120, 120, 120));
            this.listContainer.addChild(hint);
        }
    },

    _buildEntryRow: function (index, totalH, ITEM_H, PAD, W) {
        var self = this;
        var entry = this.targetEntries[index];
        var rowY = totalH - (index * (ITEM_H + PAD) + PAD + ITEM_H / 2);
        var col = cc.color(50, 52, 65);

        // Row background
        var bg = new ccui.Layout();
        bg.setBackGroundColorType(ccui.Layout.BG_COLOR_SOLID);
        bg.setBackGroundColor(col);
        bg.setContentSize(W, ITEM_H);
        bg.setPosition(0, rowY - ITEM_H / 2);
        this.listContainer.addChild(bg);

        // Index label
        var idxLbl = new cc.LabelTTF("#" + (index + 1), "Arial", 14);
        idxLbl.setAnchorPoint(0, 0.5);
        idxLbl.setPosition(6, ITEM_H / 2);
        idxLbl.setColor(cc.color(160, 160, 160));
        bg.addChild(idxLbl);

        // ── Element ID field ─────────────────────────────────────────────
        var idLabel = new cc.LabelTTF("ID:", "Arial", 16);
        idLabel.setAnchorPoint(0, 0.5);
        idLabel.setPosition(34, ITEM_H / 2);
        idLabel.setColor(cc.color(200, 220, 255));
        bg.addChild(idLabel);

        var idBtn = this._makeButton(entry.id ? String(entry.id) : "?", 70, ITEM_H - 10, cc.color(60, 60, 70));
        idBtn.setPosition(95, ITEM_H / 2);
        bg.addChild(idBtn);

        var updateIdVisual = function (type) {
            idBtn.setTitleText(String(type));
            var oldIcon = idBtn.getChildByName("element_icon");
            if (oldIcon) oldIcon.removeFromParent();

            var elementObject;
            if (CoreGame.ElementObject.map[type]) {
                elementObject = CoreGame.ElementObject.create(0, 0, type, 1);
            } else if (CoreGame.BlockerFactory._configCache[type] || type > 7) {
                elementObject = CoreGame.BlockerFactory.createBlocker(0, 0, type, 1);
            }

            if (elementObject) {
                elementObject.createUI(idBtn);
                if (elementObject.ui) {
                    elementObject.ui.setName("element_icon");
                    elementObject.ui.setPosition(idBtn.getContentSize().width * 0.25, idBtn.getContentSize().height / 2);
                    var scale = elementObject.getScaleToFit(24, 24);
                    elementObject.ui.setScale(scale);
                    idBtn.setTitleText("     " + type);
                }
            }
        };

        if (entry.id !== undefined && entry.id !== null) {
            updateIdVisual(entry.id);
        }

        idBtn.addTouchEventListener(function (sender, type) {
            if (type === ccui.Widget.TOUCH_ENDED) {
                self._showElementPicker(function (selectedType) {
                    entry.id = selectedType;
                    updateIdVisual(selectedType);
                    // trigger refresh of anything? no need, just visual
                });
            }
        });

        // keep reference so getInfo can read it
        entry.idField = null; // No longer text field

        // ── Count ─────────────────────────────────────────────────────────
        var cntLabel = new cc.LabelTTF("Count:", "Arial", 16);
        cntLabel.setAnchorPoint(0, 0.5);
        cntLabel.setPosition(140, ITEM_H / 2);
        cntLabel.setColor(cc.color(200, 220, 255));
        bg.addChild(cntLabel);

        var btnMinus = this._makeButton("-", 28, 28, cc.color(80, 80, 90));
        btnMinus.setPosition(200, ITEM_H / 2);
        bg.addChild(btnMinus);

        var cntField = new ccui.TextField();
        cntField.setPlaceHolder("1");
        cntField.setPlaceHolderColor(cc.color(100, 100, 100));
        cntField.setTextColor(cc.color(255, 255, 255));
        cntField.setFontSize(16);
        cntField.setMaxLengthEnabled(true);
        cntField.setMaxLength(4);
        cntField.setTouchEnabled(true);
        cntField.setString(String(entry.count));
        // cntField.setContentSize(55, ITEM_H - 10);
        cntField.setPosition(240, ITEM_H / 2);
        bg.addChild(cntField);

        var btnPlus = this._makeButton("+", 28, 28, cc.color(80, 80, 90));
        btnPlus.setPosition(278, ITEM_H / 2);
        bg.addChild(btnPlus);

        entry.countField = cntField;

        // Wire ± buttons
        btnMinus.addTouchEventListener(function (sender, type) {
            if (type === ccui.Widget.TOUCH_ENDED) {
                var v = parseInt(cntField.getString()) || 1;
                if (v > 1) { v--; cntField.setString(String(v)); }
            }
        });
        btnPlus.addTouchEventListener(function (sender, type) {
            if (type === ccui.Widget.TOUCH_ENDED) {
                var v = parseInt(cntField.getString()) || 1;
                v++; cntField.setString(String(v));
            }
        });

        // ── Delete button ─────────────────────────────────────────────────
        var btnDel = this._makeButton("✕", 28, 28, cc.color(160, 50, 50));
        btnDel.setPosition(W - 20, ITEM_H / 2);
        // closure to capture index
        (function (idx) {
            btnDel.addTouchEventListener(function (sender, type) {
                if (type === ccui.Widget.TOUCH_ENDED) {
                    self.targetEntries.splice(idx, 1);
                    self._refreshScrollList();
                }
            });
        })(index);
        bg.addChild(btnDel);
    },

    // =========================================================================
    // Helpers
    // =========================================================================

    _makeButton: function (text, w, h, bgColor) {
        var btn = new ccui.Button();
        btn.loadTextureNormal("res/tool/res/bgCell.png");
        btn.setScale9Enabled(true);
        btn.setContentSize(w, h);
        btn.setTitleText(text);
        btn.setTitleFontSize(16);
        btn.setColor(bgColor || cc.color(80, 80, 90));
        return btn;
    },

    _addDivider: function (topY) {
        var line = new ccui.Layout();
        line.setBackGroundColorType(ccui.Layout.BG_COLOR_SOLID);
        line.setBackGroundColor(cc.color(70, 70, 80));
        line.setContentSize(this.POPUP_W - this.PAD * 2, 1);
        line.setPosition(this.PAD, topY - 8);
        this.popupBg.addChild(line);
        return topY - 20;
    },

    _clampField: function (field) {
        var v = parseInt(field.getString());
        if (isNaN(v)) v = field._default;
        if (v < field._min) v = field._min;
        if (v > field._max) v = field._max;
        return v;
    },

    // =========================================================================
    // Element Picker Dialog (Lazy initialized)
    // =========================================================================

    _showElementPicker: function (callback) {
        if (!this._pickerLayer) {
            var sz = cc.winSize;
            this._pickerLayer = new cc.LayerColor(cc.color(0, 0, 0, 200));
            this._pickerLayer.setContentSize(sz);

            // swallow touches for picker layer to prevent interacting with the UI behind it
            var listener = cc.EventListener.create({
                event: cc.EventListener.TOUCH_ONE_BY_ONE,
                swallowTouches: true,
                onTouchBegan: function (touch, event) {
                    var target = event.getCurrentTarget();
                    // If the layer is not visible, don't swallow touches, let them pass through.
                    if (!target || !target.isVisible()) return false;

                    // Close if tapped outside panel
                    target.setVisible(false);
                    return true;
                }
            });
            cc.eventManager.addListener(listener, this._pickerLayer);

            // Popup panel
            var panelW = 600;
            var panelH = 500;
            var panel = new ccui.Layout();
            panel.setBackGroundColorType(ccui.Layout.BG_COLOR_SOLID);
            panel.setBackGroundColor(cc.color(40, 40, 50));
            panel.setContentSize(panelW, panelH);
            panel.setPosition(sz.width / 2 - panelW / 2, sz.height / 2 - panelH / 2);

            // Re-swallow inside panel so clicking elements doesn't trigger the close
            var panelListener = cc.EventListener.create({
                event: cc.EventListener.TOUCH_ONE_BY_ONE,
                swallowTouches: true,
                onTouchBegan: function (touch, event) {
                    var targetLayer = self._pickerLayer;
                    if (!targetLayer || !targetLayer.isVisible()) return false;
                    return true;
                }
            });
            cc.eventManager.addListener(panelListener, panel);
            this._pickerLayer.addChild(panel);

            // Close button hints
            var lblClose = new cc.LabelTTF("Drop anywhere outside to close", "Arial", 16);
            lblClose.setPosition(panelW / 2, panelH + 20);
            lblClose.setColor(cc.color(200, 200, 200));
            panel.addChild(lblClose);

            // Instantiate ElementSelectorUI to fill the panel
            var self = this;
            this._selectorUI = new ElementSelectorUI(cc.size(panelW - 20, panelH - 20), function (type, name) {
                self._pickerLayer.setVisible(false);
                if (self._pickerCallback) self._pickerCallback(type);
            });
            this._selectorUI.setPosition(10, 10);
            panel.addChild(this._selectorUI);

            // High Z order to appear on top of boardInfoUI
            this.addChild(this._pickerLayer, 9999);
        }

        this._pickerCallback = callback;
        this._pickerLayer.setVisible(true);
        this._selectorUI.clearSelection();
    },

    // =========================================================================
    // Public API
    // =========================================================================

    /**
     * Pre-fill the UI with existing level info.
     * @param {Object} info - { numMove, targetElements:[{id,count}], numTest }
     */
    setInfo: function (info) {
        if (!info) return;

        if (info.numMove !== undefined)
            this.numMoveField.setString(String(info.numMove));

        if (info.numTest !== undefined)
            this.numTestField.setString(String(info.numTest));

        this.targetEntries = [];
        if (info.targetElements && info.targetElements.length) {
            for (var i = 0; i < info.targetElements.length; i++) {
                var t = info.targetElements[i];
                this._addTargetEntry(t.id || 0, t.count || 1);
            }
        }
        this._refreshScrollList();
    },

    /**
     * Read current values from the UI.
     * @returns {{ numMove: number, targetElements: Array, numTest: number }}
     */
    getInfo: function () {
        var numMove = this._clampField(this.numMoveField);
        var numTest = this._clampField(this.numTestField);

        var targets = [];
        for (var i = 0; i < this.targetEntries.length; i++) {
            var e = this.targetEntries[i];
            var id = parseInt(e.idField ? e.idField.getString() : e.id) || 0;
            var cnt = parseInt(e.countField ? e.countField.getString() : e.count) || 1;
            if (cnt < 1) cnt = 1;
            // Sync values back into the entry so targetEntries always reflects the latest UI state
            e.id = id;
            e.count = cnt;
            targets.push({ id: id, count: cnt });
        }

        return {
            numMove: numMove,
            targetElements: targets,
            numTest: numTest
        };
    },

    /** Show the popup */
    show: function () {
        cc.log("Target Entry " + JSON.stringify(this.targetEntries));
        this.setVisible(true);
        this._refreshScrollList();
    },

    /** Hide the popup */
    hide: function () {
        var info = this.getInfo();
        cc.log("Target Entry " + JSON.stringify(this.targetEntries));
        this.setVisible(false);
    }
});
