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
        headerBg.setBackGroundColor(cc.color(30, 30, 40));
        headerBg.setContentSize(W, HEADER_H);
        headerBg.setPosition(0, H - HEADER_H);
        this.addChild(headerBg, 1);

        var lbTitle = new cc.LabelTTF("TARGETS", "font/BalooPaaji2-Regular.ttf", 12);
        lbTitle.setColor(cc.color(180, 220, 255));
        lbTitle.setAnchorPoint(cc.p(0, 0.5));
        lbTitle.setPosition(6, HEADER_H / 2);
        headerBg.addChild(lbTitle);

        var btnAdd = this._makeBtn("+ Add", 52, HEADER_H - 4, cc.color(150, 240, 160));
        btnAdd.setAnchorPoint(cc.p(1, 0.5));
        btnAdd.setPosition(W - 4, HEADER_H / 2);
        btnAdd.addTouchEventListener(function (sender, type) {
            if (type === ccui.Widget.TOUCH_ENDED) {
                self.targetEntries.push({ id: 1, count: 1 });
                self._refresh();
            }
        });
        headerBg.addChild(btnAdd);

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
        var btnDel = this._makeBtn("✕", 22, 22, cc.color(240, 40, 40));
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

            // Attach to scene root (high z-order)
            var scene = cc.director.getRunningScene();
            if (scene) scene.addChild(this._pickerLayer, 9999);
            else this.addChild(this._pickerLayer, 9999);
        }

        this._pickerCallback = callback;
        this._pickerLayer.setVisible(true);
        if (this._selectorUI) this._selectorUI.clearSelection();
    },

    // ─────────────────────────────────────────────────────────────────────────
    // Helpers
    // ─────────────────────────────────────────────────────────────────────────
    _makeBtn: function (text, w, h, color) {
        var btn = new ccui.Button();
        btn.setScale9Enabled(true);
        btn.setContentSize(w, h);
        btn.setTitleText(text);
        btn.setTitleFontSize(16);
        btn.setColor(color || cc.color(70, 72, 88));
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
