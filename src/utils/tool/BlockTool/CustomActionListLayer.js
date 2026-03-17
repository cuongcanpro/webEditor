/**
 * Created by Antigravity on 03/10/2026.
 */

var CustomActionListLayer = cc.Class.extend({
    ctor: function (actionList, blockData, parentUI, refreshCallback) {
        this.actionList = actionList;
        this.blockData = blockData;
        this.parentUI = parentUI;
        this.refreshCallback = refreshCallback;
    },

    populate: function (actionType) {
        var self = this;
        if (!this.actionList) return;

        this.actionList.removeAllItems();
        var currentActions = this.blockData.customAction[actionType] || [];

        for (var i = 0; i < currentActions.length; i++) {
            var actionData = currentActions[i];
            var strategyName = (typeof actionData === "string") ? actionData : actionData.name;

            var item = this.parentUI._createActionItem();
            if (!item) continue;
            this.actionList.pushBackCustomItem(item);

            var label = item.getChildByName("Label");
            if (label) {
                label.setString((i + 1) + ". " + strategyName);
                label.setTouchEnabled(true);
                label.actionIndex = i;
                label.actionType = actionType;
                label.addTouchEventListener(function (sender, eventType) {
                    if (eventType === ccui.Widget.TOUCH_ENDED) {
                        self.editAction(sender.actionType, sender.actionIndex);
                    }
                });
            }

            var checkbox = item.getChildByName("checkbox");
            if (checkbox) {
                checkbox.setVisible(true);
                var isCheckedNode = checkbox.getChildByName("isChecked");
                if (isCheckedNode) isCheckedNode.setVisible(true);

                checkbox.actionType = actionType;
                checkbox.actionIndex = i;
                checkbox.addTouchEventListener(function (sender, eventType) {
                    if (eventType === ccui.Widget.TOUCH_ENDED) {
                        self.removeAction(sender.actionType, sender.actionIndex);
                    }
                });
            }
        }
    },

    editAction: function (actionType, index) {
        var self = this;
        var actionData = this.blockData.customAction[actionType][index];
        var strategyName = (typeof actionData === "string") ? actionData : actionData.name;
        var currentConfig = (typeof actionData === "string") ? {} : (actionData.config || {});

        var StrategyClass = CoreGame.Strategies[strategyName];
        var obj = null;
        if (StrategyClass) {
            try {
                obj = new StrategyClass();
            } catch (e) {
            }
        }

        if (!obj || !obj.configData || Object.keys(obj.configData).length === 0) {
            cc.log("No config data for strategy: " + strategyName);
            return;
        }

        var configToEdit = JSON.parse(JSON.stringify(obj.configData));
        for (var key in currentConfig)
            configToEdit[key] = currentConfig[key];

        var editor = new ConfigEditor(configToEdit, function (finalConfig) {
            self.blockData.customAction[actionType][index] = {
                name: strategyName,
                config: finalConfig
            };
            if (self.refreshCallback) self.refreshCallback();
        });
        this.parentUI.addChild(editor, 100);
    },

    removeAction: function (actionType, index) {
        if (this.blockData.customAction[actionType]) {
            this.blockData.customAction[actionType].splice(index, 1);
            if (this.refreshCallback) this.refreshCallback();
        }
    }
});
