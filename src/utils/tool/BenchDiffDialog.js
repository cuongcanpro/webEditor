/**
 * BenchDiffDialog - Popup UI for showing results from DifficultyCalc report.
 */
var BenchDiffDialog = cc.LayerColor.extend({
    POPUP_W: 400,
    POPUP_H: 280,
    PAD: 30,
    ROW_H: 40,

    ctor: function (report) {
        this._super(cc.color(0, 0, 0, 180));
        this.setContentSize(cc.winSize);
        this._report = report;
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

        var title = new cc.LabelTTF("Difficulty Report", "Arial", 28);
        title.setPosition(W / 2, H - 40);
        title.setColor(cc.color(255, 200, 50));
        this.popupBg.addChild(title);

        var startY = H - 100;
        var report = this._report;

        var fmtMoves = function (v) { return v > 0 ? v.toFixed(1) : "-"; };
        var data = [
            { label: "Win / Lose:", value: report.wins + " / " + report.losses + "  (" + report.num_episodes + " eps)" },
            { label: "Win Rate:", value: (report.win_rate * 100).toFixed(1) + "%" },
            { label: "Avg Win Moves:", value: fmtMoves(report.avg_win_moves) }
        ];

        for (var i = 0; i < data.length; i++) {
            this._addRow(data[i].label, data[i].value, startY - i * this.ROW_H);
        }

        var btnClose = this._makeButton("Close", 120, 45, cc.color(100, 100, 110));
        btnClose.setPosition(W / 2, 50);
        btnClose.addTouchEventListener(function (sender, type) {
            if (type === ccui.Widget.TOUCH_ENDED) {
                this.hide();
            }
        }.bind(this));
        this.popupBg.addChild(btnClose);
    },

    _addRow: function (label, value, y) {
        var lbl = new cc.LabelTTF(label, "Arial", 18);
        lbl.setAnchorPoint(0, 0.5);
        lbl.setPosition(this.PAD, y);
        lbl.setColor(cc.color(200, 200, 200));
        this.popupBg.addChild(lbl);

        var val = new cc.LabelTTF(value, "Arial", 18);
        val.setAnchorPoint(1, 0.5);
        val.setPosition(this.POPUP_W - this.PAD, y);
        val.setColor(cc.color(255, 255, 255));
        this.popupBg.addChild(val);
    },

    _makeButton: function (text, w, h, bgColor) {
        var btn = new ccui.Button();
        btn.loadTextureNormal("res/tool/res/btnRed.png");
        btn.setScale9Enabled(true);
        btn.setContentSize(w, h);
        btn.setTitleText(text);
        btn.setTitleFontSize(20);
        // btn.setColor(bgColor);
        return btn;
    },

    show: function () {
        this.setVisible(true);
    },

    hide: function () {
        this.removeFromParent();
    }
});
