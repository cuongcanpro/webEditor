/**
 * Created by Antigravity on 03/10/2026.
 */

var CustomActionMarketLayer = cc.Class.extend({
    ctor: function (actionList, blockData, parentUI, onActionAddedCallback) {
        this.actionList = actionList;
        this.blockData = blockData;
        this.parentUI = parentUI;
        this.onActionAddedCallback = onActionAddedCallback;
    },

    populate: function (actionType) {
        var self = this;
        if (!this.actionList) return;

        this.actionList.removeAllItems();
        var strategies = this.parentUI.getStrategyClasses();

        for (var i = 0; i < strategies.length; i++) {
            var strategyName = strategies[i];
            var item = this.parentUI._createActionItem();
            if (!item) continue;
            this.actionList.pushBackCustomItem(item);

            var label = item.getChildByName("Label");
            if (label) {
                label.setString(strategyName);
                label.setTouchEnabled(true);
                label.strategyName = strategyName;
                label.actionType = actionType;
                label.addTouchEventListener(function (sender, eventType) {
                    if (eventType === ccui.Widget.TOUCH_ENDED) {
                        self.addNewAction(sender.actionType, sender.strategyName);
                    }
                });
            }

            var checkbox = item.getChildByName("checkbox");
            if (checkbox) checkbox.setVisible(false);
        }
    },

    addNewAction: function (actionType, strategyName) {
        var self = this;
        var StrategyClass = CoreGame.Strategies[strategyName];
        var obj = null;
        if (StrategyClass) {
            try {
                obj = new StrategyClass();
            } catch (e) {
            }
        }

        var processAdd = function (finalConfig) {
            if (!self.blockData.customAction[actionType]) self.blockData.customAction[actionType] = [];
            var entry = strategyName;
            if (finalConfig && Object.keys(finalConfig).length > 0) {
                entry = {
                    name: strategyName,
                    config: finalConfig
                };
            }
            self.blockData.customAction[actionType].push(entry);
            if (self.onActionAddedCallback) self.onActionAddedCallback();
        };

        if (obj && obj.configData && Object.keys(obj.configData).length > 0) {
            var editor = new ConfigEditor(obj.configData, processAdd);
            this.parentUI.addChild(editor, 100);
        } else {
            processAdd(null);
        }
    }
});
