
var ModelSelectorUI = cc.Layer.extend({
    ctor: function (models, currentModel, callback) {
        this._super();
        this.models = models || [];
        this.currentModel = currentModel;
        this.callback = callback;

        this.initUI();
    },

    initUI: function () {
        var winSize = cc.director.getWinSize();

        // Dark Overlay
        var overlay = new cc.LayerColor(cc.color(0, 0, 0, 180), winSize.width, winSize.height);
        this.addChild(overlay);

        // Prevent touch propagation
        cc.eventManager.addListener({
            event: cc.EventListener.TOUCH_ONE_BY_ONE,
            swallowTouches: true,
            onTouchBegan: function () { return true; }
        }, overlay);

        // Panel
        var panelWidth = 400;
        var panelHeight = 500;
        var panel = new cc.LayerColor(cc.color(40, 44, 52, 255), panelWidth, panelHeight);
        panel.setPosition(winSize.width / 2 - panelWidth / 2, winSize.height / 2 - panelHeight / 2);
        this.addChild(panel);

        // Title
        var title = new ccui.Text("Select Model", "Arial", 24);
        title.setColor(cc.color(255, 255, 255));
        title.setPosition(panelWidth / 2, panelHeight - 40);
        panel.addChild(title);

        // Close Button
        var closeBtn = new ccui.Button();
        closeBtn.setTitleText("X");
        closeBtn.setTitleFontSize(24);
        closeBtn.setTitleColor(cc.color.RED);
        closeBtn.setPosition(panelWidth - 30, panelHeight - 30);
        closeBtn.addTouchEventListener(function (sender, type) {
            if (type === ccui.Widget.TOUCH_ENDED) {
                this.removeFromParent();
            }
        }, this);
        panel.addChild(closeBtn);

        // ScrollView
        var scrollView = new ccui.ScrollView();
        scrollView.setDirection(ccui.ScrollView.DIR_VERTICAL);
        scrollView.setTouchEnabled(true);
        scrollView.setBounceEnabled(true);
        scrollView.setContentSize(cc.size(panelWidth - 40, panelHeight - 100));
        scrollView.setPosition(20, 20);
        panel.addChild(scrollView);

        // Content
        var itemHeight = 50;
        var innerHeight = Math.max(scrollView.height, this.models.length * itemHeight);
        scrollView.setInnerContainerSize(cc.size(scrollView.width, innerHeight));

        for (var i = 0; i < this.models.length; i++) {
            var modelName = this.models[i];
            var isSelected = (modelName === this.currentModel);

            var itemBg = new cc.LayerColor(
                isSelected ? cc.color(0, 120, 215, 255) : cc.color(60, 64, 72, 255),
                scrollView.width, itemHeight - 5
            );
            itemBg.setPosition(0, innerHeight - (i+1) * itemHeight);
            scrollView.addChild(itemBg);

            var btn = new ccui.Button();
            btn.setTitleText(modelName);
            btn.setTitleFontSize(18);
            btn.setTitleColor(cc.color.WHITE);
            btn.setPosition(itemBg.width / 2, itemBg.height / 2);
            btn.setTag(i);
            
            // Closure to capture modelName
            (function(name, self) {
                btn.addTouchEventListener(function (sender, type) {
                    if (type === ccui.Widget.TOUCH_ENDED) {
                        if (self.callback) self.callback(name);
                        self.removeFromParent();
                    }
                }, self);
            })(modelName, this);

            itemBg.addChild(btn);
        }
    }
});
