/**
 * TestProgressDialog - Shows progress while DifficultyCalc runs episodes.
 *
 * Usage:
 *   var dlg = new TestProgressDialog("Run Test — BotName / MapName");
 *   self.addChild(dlg, 1000);
 *   dlg.show();
 *   // in onProgress:
 *   dlg.updateProgress(current, total);
 *   // on complete:
 *   dlg.hide();
 */
var TestProgressDialog = cc.LayerColor.extend({
    POPUP_W: 480,
    POPUP_H: 200,

    ctor: function (title) {
        this._super(cc.color(0, 0, 0, 180));
        this.setContentSize(cc.winSize);
        this._title = title || "Run Test";
        this._barW = 0;
        this._build();

        // Swallow all touches so board isn't clickable during test
        var listener = cc.EventListener.create({
            event: cc.EventListener.TOUCH_ONE_BY_ONE,
            swallowTouches: true,
            onTouchBegan: function () { return true; }
        });
        cc.eventManager.addListener(listener, this);
    },

    _build: function () {
        var W = this.POPUP_W, H = this.POPUP_H;
        var PAD = 20;
        var self = this;

        // Background panel
        this._popupBg = new ccui.Layout();
        this._popupBg.setBackGroundColorType(ccui.Layout.BG_COLOR_SOLID);
        this._popupBg.setBackGroundColor(cc.color(20, 30, 55));
        this._popupBg.setContentSize(W, H);
        this._popupBg.setPosition(cc.winSize.width / 2 - W / 2, cc.winSize.height / 2 - H / 2);
        this.addChild(this._popupBg);

        // Title + X button row
        var lbTitle = new ccui.Text(this._title, "font/BalooPaaji2-Regular.ttf", 15);
        lbTitle.setColor(cc.color(240, 240, 255));
        lbTitle.setAnchorPoint(cc.p(0, 0.5));
        lbTitle.setPosition(PAD, H - 28);
        this._popupBg.addChild(lbTitle, 1);

        var btnX = new ccui.Button();
        btnX.setTitleText("x");
        btnX.setTitleFontSize(18);
        btnX.setTitleColor(cc.color(200, 200, 200));
        btnX.setContentSize(28, 28);
        btnX.setAnchorPoint(cc.p(1, 1));
        btnX.setPosition(W - 4, H - 4);
        btnX.addTouchEventListener(function (sender, type) {
            if (type === ccui.Widget.TOUCH_ENDED) self.hide();
        });
        this._popupBg.addChild(btnX, 2);

        // Separator line
        var sep = new ccui.Layout();
        sep.setBackGroundColorType(ccui.Layout.BG_COLOR_SOLID);
        sep.setBackGroundColor(cc.color(50, 60, 90));
        sep.setContentSize(W, 1);
        sep.setPosition(0, H - 48);
        this._popupBg.addChild(sep, 1);

        // Episode label
        this._lblEpisode = new ccui.Text("Episode 0/0...", "font/BalooPaaji2-Regular.ttf", 15);
        this._lblEpisode.setColor(cc.color(210, 210, 220));
        this._lblEpisode.setAnchorPoint(cc.p(0.5, 0.5));
        this._lblEpisode.setPosition(W / 2, H - 72);
        this._popupBg.addChild(this._lblEpisode, 1);

        // Progress bar background
        var BAR_W = W - PAD * 2;
        var BAR_H = 16;
        var barY = H - 105;

        var barBg = new ccui.Layout();
        barBg.setBackGroundColorType(ccui.Layout.BG_COLOR_SOLID);
        barBg.setBackGroundColor(cc.color(35, 45, 75));
        barBg.setContentSize(BAR_W, BAR_H);
        barBg.setAnchorPoint(cc.p(0, 0.5));
        barBg.setPosition(PAD, barY);
        this._popupBg.addChild(barBg, 1);

        // Progress bar fill
        this._barFill = new ccui.Layout();
        this._barFill.setBackGroundColorType(ccui.Layout.BG_COLOR_SOLID);
        this._barFill.setBackGroundColor(cc.color(50, 180, 255));
        this._barFill.setContentSize(0, BAR_H);
        this._barFill.setAnchorPoint(cc.p(0, 0.5));
        this._barFill.setPosition(PAD, barY);
        this._popupBg.addChild(this._barFill, 2);

        this._barW = BAR_W;
        this._barH = BAR_H;

        // Percentage label
        this._lblPct = new ccui.Text("0%", "font/BalooPaaji2-Regular.ttf", 13);
        this._lblPct.setColor(cc.color(150, 160, 175));
        this._lblPct.setAnchorPoint(cc.p(0.5, 0.5));
        this._lblPct.setPosition(W / 2, H - 125);
        this._popupBg.addChild(this._lblPct, 1);

        // "Đóng" button
        var btnClose = new ccui.Button();
        btnClose.loadTextureNormal("res/tool/res/bgCell.png");
        btnClose.setScale9Enabled(true);
        btnClose.setContentSize(90, 34);
        btnClose.setTitleText("Đóng");
        btnClose.setTitleFontSize(13);
        btnClose.setColor(cc.color(50, 80, 130));
        btnClose.setAnchorPoint(cc.p(1, 0));
        btnClose.setPosition(W - PAD, PAD);
        btnClose.addTouchEventListener(function (sender, type) {
            if (type === ccui.Widget.TOUCH_ENDED) self.hide();
        });
        this._popupBg.addChild(btnClose, 1);
    },

    /**
     * @param {number} current  episodes completed so far
     * @param {number} total    total episodes
     */
    updateProgress: function (current, total) {
        var t = total || 1;
        var pct = Math.min(1, current / t);

        if (this._lblEpisode) {
            this._lblEpisode.setString("Episode " + current + "/" + t + "...");
        }
        if (this._barFill) {
            this._barFill.setContentSize(Math.floor(this._barW * pct), this._barH);
        }
        if (this._lblPct) {
            this._lblPct.setString(Math.round(pct * 100) + "%");
        }
    },

    show: function () {
        this.setVisible(true);
    },

    hide: function () {
        this.removeFromParent();
    }
});
