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
        btn.setColor(cc.color(70, 70, 80));
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
