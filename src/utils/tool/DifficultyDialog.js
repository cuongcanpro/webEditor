/**
 * SelectDialog - Generic popup for selecting a key from a list.
 * Usage:
 *   new SelectDialog("Title", ["KeyA", "KeyB"], function(key) { ... })
 */
var SelectDialog = cc.LayerColor.extend({
    POPUP_W: 300,
    POPUP_H: 400,
    ITEM_H: 60,
    PAD: 20,

    ctor: function (title, items, onSelectCallback) {
        this._super(cc.color(0, 0, 0, 180));
        this.setContentSize(cc.winSize);
        this._title = title || "Select";
        this._items = items || [];
        this._onSelectCallback = onSelectCallback;
        this.POPUP_H = Math.max(200, this._items.length * (this.ITEM_H + 10) + 150);
        this._build();

        var self = this;
        var listener = cc.EventListener.create({
            event: cc.EventListener.TOUCH_ONE_BY_ONE,
            swallowTouches: true,
            onTouchBegan: function (touch, event) {
                if (!self.isVisible()) return false;
                var loc = self.popupBg.convertToNodeSpace(touch.getLocation());
                var sz = self.popupBg.getContentSize();
                if (loc.x < 0 || loc.x > sz.width || loc.y < 0 || loc.y > sz.height) {
                    self.hide();
                }
                return true;
            }
        });
        cc.eventManager.addListener(listener, this);
    },

    _build: function () {
        var W = this.POPUP_W, H = this.POPUP_H, PAD = this.PAD;
        this.popupBg = new ccui.Layout();
        this.popupBg.setBackGroundColorType(ccui.Layout.BG_COLOR_SOLID);
        this.popupBg.setBackGroundColor(cc.color(45, 45, 55));
        this.popupBg.setContentSize(W, H);
        this.popupBg.setPosition(cc.winSize.width / 2 - W / 2, cc.winSize.height / 2 - H / 2);
        this.addChild(this.popupBg);

        var title = new cc.LabelTTF(this._title, "Arial", 24);
        title.setPosition(W / 2, H - 40);
        title.setColor(cc.color(255, 200, 50));
        this.popupBg.addChild(title);

        var startY = H - 100;
        for (var i = 0; i < this._items.length; i++) {
            var key = this._items[i];
            var btn = new ccui.Button();
            btn.loadTextureNormal("res/tool/res/bgCell.png");
            btn.setScale9Enabled(true);
            btn.setContentSize(W - PAD * 2, this.ITEM_H);
            btn.setTitleText(key);
            btn.setTitleFontSize(20);
            btn.setTitleColor(cc.color(255, 255, 255));
            btn.setColor(cc.color(170, 170, 180));
            btn.setPosition(W / 2, startY - i * (this.ITEM_H + 10));
            btn.itemKey = key;
            btn.addTouchEventListener(function (sender, type) {
                if (type === ccui.Widget.TOUCH_ENDED) {
                    if (this._onSelectCallback) this._onSelectCallback(sender.itemKey);
                    this.hide();
                }
            }.bind(this));
            this.popupBg.addChild(btn);
        }

        var btnCancel = new ccui.Button();
        btnCancel.loadTextureNormal("res/tool/res/bgCell.png");
        btnCancel.setScale9Enabled(true);
        btnCancel.setContentSize(120, 40);
        btnCancel.setTitleText("Cancel");
        btnCancel.setTitleFontSize(18);
        btnCancel.setColor(cc.color(120, 120, 130));
        btnCancel.setPosition(W / 2, 40);
        btnCancel.addTouchEventListener(function (sender, type) {
            if (type === ccui.Widget.TOUCH_ENDED) this.hide();
        }.bind(this));
        this.popupBg.addChild(btnCancel);
    },

    show: function () { this.setVisible(true); },
    hide: function () { this.removeFromParent(); }
});

/**
 * GistMapSelectDialog - Popup for selecting a Gist map with filter TextField + ScrollView.
 * Usage:
 *   new GistMapSelectDialog("Title", ["map_001", "map_002", ...], function(key) { ... })
 */
var GistMapSelectDialog = cc.LayerColor.extend({
    POPUP_W: 380,
    POPUP_H: 500,
    ITEM_H:  44,
    PAD:     12,

    ctor: function (title, items, onSelectCallback) {
        this._super(cc.color(0, 0, 0, 180));
        this.setContentSize(cc.winSize);
        this._title    = title || "Select Map";
        this._allItems = items || [];
        this._onSelect = onSelectCallback;
        this._build();

        var self = this;
        var listener = cc.EventListener.create({
            event: cc.EventListener.TOUCH_ONE_BY_ONE,
            swallowTouches: true,
            onTouchBegan: function (touch, event) {
                if (!self.isVisible()) return false;
                var loc = self.popupBg.convertToNodeSpace(touch.getLocation());
                var sz  = self.popupBg.getContentSize();
                if (loc.x < 0 || loc.x > sz.width || loc.y < 0 || loc.y > sz.height) {
                    self.hide();
                }
                return true;
            }
        });
        cc.eventManager.addListener(listener, this);
    },

    _build: function () {
        var W = this.POPUP_W, H = this.POPUP_H, PAD = this.PAD;
        var TITLE_H = 44, TF_H = 34, CANCEL_H = 48;
        var LIST_H  = H - TITLE_H - TF_H - CANCEL_H - PAD * 3;

        this.popupBg = new ccui.Layout();
        this.popupBg.setBackGroundColorType(ccui.Layout.BG_COLOR_SOLID);
        this.popupBg.setBackGroundColor(cc.color(38, 40, 55));
        this.popupBg.setContentSize(W, H);
        this.popupBg.setPosition(
            cc.winSize.width  / 2 - W / 2,
            cc.winSize.height / 2 - H / 2
        );
        this.addChild(this.popupBg);

        // Title
        var titleLb = new cc.LabelTTF(this._title, "Arial", 20);
        titleLb.setPosition(W / 2, H - TITLE_H / 2);
        titleLb.setColor(cc.color(255, 200, 50));
        this.popupBg.addChild(titleLb);

        // Filter TextField
        var tfY = H - TITLE_H - PAD - TF_H / 2;
        var tfBg = new ccui.Scale9Sprite("res/tool/res/bgTf.png");
        tfBg.setContentSize(W - PAD * 2, TF_H);
        tfBg.setAnchorPoint(cc.p(0, 0.5));
        tfBg.setPosition(PAD, tfY);
        this.popupBg.addChild(tfBg);

        var self = this;
        this._tf = new ccui.TextField("Filter...", "font/BalooPaaji2-Regular.ttf", 14);
        this._tf.setContentSize(W - PAD * 2, TF_H);
        this._tf.setAnchorPoint(cc.p(0, 0.5));
        this._tf.setPosition(PAD, tfY);
        this._tf.addEventListenerTextField(function (sender, type) {
            if (type === ccui.TextField.EVENT_INSERT_TEXT ||
                type === ccui.TextField.EVENT_DELETE_BACKWARD) {
                self._applyFilter(sender.getString());
            }
        });
        this.popupBg.addChild(this._tf, 1);

        // ScrollView
        var svY = CANCEL_H + PAD;
        this._sv = new ccui.ScrollView();
        this._sv.setDirection(ccui.ScrollView.DIR_VERTICAL);
        this._sv.setContentSize(W - PAD * 2, LIST_H);
        this._sv.setAnchorPoint(cc.p(0, 0));
        this._sv.setPosition(PAD, svY);
        this._sv.setBounceEnabled(true);
        this.popupBg.addChild(this._sv, 1);

        // Cancel button
        var btnCancel = new ccui.Button();
        btnCancel.loadTextureNormal("res/tool/res/bgCell.png");
        btnCancel.setScale9Enabled(true);
        btnCancel.setContentSize(120, 36);
        btnCancel.setTitleText("Cancel");
        btnCancel.setTitleFontSize(16);
        btnCancel.setColor(cc.color(100, 100, 110));
        btnCancel.setPosition(W / 2, CANCEL_H / 2);
        btnCancel.addTouchEventListener(function (sender, type) {
            if (type === ccui.Widget.TOUCH_ENDED) self.hide();
        });
        this.popupBg.addChild(btnCancel);

        this._rebuildList(this._allItems);
    },

    _applyFilter: function (text) {
        var q = (text || "").toLowerCase().trim();
        var result = [];
        for (var i = 0; i < this._allItems.length; i++) {
            if (q === "" || this._allItems[i].toLowerCase().indexOf(q) !== -1) {
                result.push(this._allItems[i]);
            }
        }
        this._rebuildList(result);
    },

    _rebuildList: function (items) {
        this._sv.removeAllChildren();
        var W      = this._sv.getContentSize().width;
        var SV_H   = this._sv.getContentSize().height;
        var ITEM_H = this.ITEM_H;
        var GAP    = 6;
        var totalH = items.length * (ITEM_H + GAP);
        var innerH = Math.max(totalH, SV_H);
        this._sv.setInnerContainerSize(cc.size(W, innerH));

        var self = this;
        for (var i = 0; i < items.length; i++) {
            var key  = items[i];
            var yPos = innerH - (i + 1) * (ITEM_H + GAP) + GAP;
            var btn  = new ccui.Button();
            btn.loadTextureNormal("res/tool/res/bgCell.png");
            btn.setScale9Enabled(true);
            btn.setContentSize(W, ITEM_H);
            btn.setTitleText(key);
            btn.setTitleFontSize(15);
            btn.setTitleColor(cc.color(230, 230, 255));
            btn.setColor(cc.color(160, 165, 185));
            btn.setAnchorPoint(cc.p(0, 0));
            btn.setPosition(0, yPos);
            btn.itemKey = key;
            btn.addTouchEventListener(function (sender, type) {
                if (type === ccui.Widget.TOUCH_ENDED) {
                    if (self._onSelect) self._onSelect(sender.itemKey);
                    self.hide();
                }
            });
            this._sv.addChild(btn);
        }
    },

    show: function () { this.setVisible(true); },
    hide: function () { this.removeFromParent(); }
});

/**
 * DifficultyDialog - Popup UI for selecting difficulty
 */
var DifficultyDialog = cc.LayerColor.extend({
    POPUP_W: 300,
    POPUP_H: 400,
    ITEM_H: 60,
    PAD: 20,

    ctor: function (onSelectCallback) {
        this._super(cc.color(0, 0, 0, 180));
        this.setContentSize(cc.winSize);
        this._onSelectCallback = onSelectCallback;
        this._difficulties = [];
        for (var key in CoreGame.DropStrategy) {
            if (key !== "SpawnStrategy") {
                this._difficulties.push(key);
            }
        }
        this.POPUP_H = Math.max(400, this._difficulties.length * (this.ITEM_H + 10) + 150);
        this._build();

        // Swallow touches
        var self = this;
        var listener = cc.EventListener.create({
            event: cc.EventListener.TOUCH_ONE_BY_ONE,
            swallowTouches: true,
            onTouchBegan: function (touch, event) {
                if (!self.isVisible()) return false;
                var loc = self.popupBg.convertToNodeSpace(touch.getLocation());
                var sz = self.popupBg.getContentSize();
                if (loc.x < 0 || loc.x > sz.width || loc.y < 0 || loc.y > sz.height) {
                    self.hide();
                }
                return true;
            }
        });
        cc.eventManager.addListener(listener, this);
    },

    _build: function () {
        var W = this.POPUP_W, H = this.POPUP_H, PAD = this.PAD;
        this.popupBg = new ccui.Layout();
        this.popupBg.setBackGroundColorType(ccui.Layout.BG_COLOR_SOLID);
        this.popupBg.setBackGroundColor(cc.color(45, 45, 55));
        this.popupBg.setContentSize(W, H);
        this.popupBg.setPosition(cc.winSize.width / 2 - W / 2, cc.winSize.height / 2 - H / 2);
        this.addChild(this.popupBg);

        var title = new cc.LabelTTF("Select Difficulty", "Arial", 24);
        title.setPosition(W / 2, H - 40);
        title.setColor(cc.color(255, 200, 50));
        this.popupBg.addChild(title);

        var startY = H - 100;
        for (var i = 0; i < this._difficulties.length; i++) {
            var diff = this._difficulties[i];
            var btn = this._makeDifficultyButton(diff, W - PAD * 2, this.ITEM_H);
            btn.setPosition(W / 2, startY - i * (this.ITEM_H + 10));
            btn.difficultyName = diff;
            btn.addTouchEventListener(function (sender, type) {
                if (type === ccui.Widget.TOUCH_ENDED) {
                    if (this._onSelectCallback) this._onSelectCallback(sender.difficultyName);
                    this.hide();
                }
            }.bind(this));
            this.popupBg.addChild(btn);
        }

        var btnCancel = this._makeButton("Cancel", 120, 40, cc.color(120, 120, 130));
        btnCancel.setPosition(W / 2, 40);
        btnCancel.addTouchEventListener(function (sender, type) {
            if (type === ccui.Widget.TOUCH_ENDED) {
                this.hide();
            }
        }.bind(this));
        this.popupBg.addChild(btnCancel);
    },

    _makeDifficultyButton: function (text, w, h) {
        var btn = new ccui.Button();
        btn.loadTextureNormal("res/tool/res/bgCell.png");
        btn.setScale9Enabled(true);
        btn.setContentSize(w, h);
        btn.setTitleText(text);
        btn.setTitleFontSize(20);
        btn.setTitleColor(cc.color(255, 255, 255));
        btn.setColor(cc.color(170, 170, 180));
        return btn;
    },

    _makeButton: function (text, w, h, bgColor) {
        var btn = new ccui.Button();
        btn.loadTextureNormal("res/tool/res/bgCell.png");
        btn.setScale9Enabled(true);
        btn.setContentSize(w, h);
        btn.setTitleText(text);
        btn.setTitleFontSize(18);
        btn.setColor(bgColor);
        return btn;
    },

    show: function () {
        this.setVisible(true);
    },

    hide: function () {
        this.removeFromParent();
    }
});
