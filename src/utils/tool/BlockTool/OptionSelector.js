/**
 * Created by Antigravity on 04/02/2026.
 */

var OptionSelector = cc.Layer.extend({
    ctor: function (options, callback) {
        this._super();
        this.options = options;
        this.callback = callback;
        this.init();
    },

    init: function () {
        var self = this;
        var loaded = ccs.load("tool/TabActionDefSelector.json");
        if (loaded && loaded.node) {
            this.rootNode = loaded.node;
            this.addChild(this.rootNode);
            // this.rootNode.setContentSize(cc.size(this.width, this.height));
            // ccui.helper.doLayout(this.rootNode);
            var actionList = UIUtils.seekWidgetByName(this.rootNode, "ActionList");
            if (actionList) {
                actionList.removeAllItems();

                for (var i = 0; i < this.options.length; i++) {
                    var option = this.options[i];
                    var item = this._createItem(option);
                    if (item) {
                        actionList.pushBackCustomItem(item);
                    }
                }
            }

            // Close when clicking background (if any)
            var scrollContent = UIUtils.seekWidgetByName(this.rootNode, "ScrollContent");
            if (scrollContent) {
                scrollContent.setTouchEnabled(true);
                scrollContent.addTouchEventListener(function (sender, type) {
                    if (type === ccui.Widget.TOUCH_ENDED) {
                        self.removeFromParent();
                    }
                });
            }
        }
    },

    _createItem: function (option) {
        var self = this;
        var loaded = ccs.load("tool/actionSelector.json");
        if (loaded && loaded.node) {
            var node = loaded.node;
            var label = node.getChildByName("Label");
            var checkbox = node.getChildByName("checkbox");

            if (checkbox) checkbox.setVisible(false);

            var optionText = typeof option === "string" ? option : option.name;
            var optionValue = typeof option === "string" ? option : option.value;

            if (label) {
                label.setString(optionText);
                label.setTouchEnabled(true);
                label.addTouchEventListener(function (sender, type) {
                    if (type === ccui.Widget.TOUCH_ENDED) {
                        if (self.callback) {
                            self.callback(optionValue);
                        }
                        self.removeFromParent();
                    }
                });
            }

            // Also make the whole row clickable
            node.setTouchEnabled(true);
            node.addTouchEventListener(function (sender, type) {
                if (type === ccui.Widget.TOUCH_ENDED) {
                    if (self.callback) {
                        self.callback(optionValue);
                    }
                    self.removeFromParent();
                }
            });

            return node;
        }
        return null;
    }
});
