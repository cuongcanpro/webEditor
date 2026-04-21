/**
 * Created by Antigravity on 02/04/2026.
 */

var CustomActionState = {
    ACTION_TYPES: 0,
    ACTION_LIST: 1,
    STRATEGY_MARKET: 2
};

var BlockCustomTab = cc.Class.extend({
    ctor: function (tabContent, blockData, parentUI) {
        this.tabContent = tabContent;
        this.blockData = blockData;
        this.parentUI = parentUI; // Reference to BlockCreatorUI for shared helpers
        this.customActionState = CustomActionState.ACTION_TYPES;
        this.selectedActionType = null;

        this.subNavContainer = null;
        this.originalActionListPos = null;
        this.originalActionListSize = null;

        var actionList = UIUtils.seekWidgetByName(this.tabContent, "ActionList");
        if (actionList) {
            actionList.setClippingEnabled(true);
            this.listLayer = new CustomActionListLayer(actionList, this.blockData, this.parentUI, this.refreshUI.bind(this));
            this.marketLayer = new CustomActionMarketLayer(actionList, this.blockData, this.parentUI, function () {
                this.customActionState = CustomActionState.ACTION_LIST;
                this.refreshUI();
            }.bind(this));
        }

        this.init();
    },

    init: function () {
        this.refreshUI();
    },

    setData: function (blockData) {
        this.blockData = blockData;
        if (this.listLayer) this.listLayer.blockData = blockData;
        if (this.marketLayer) this.marketLayer.blockData = blockData;
    },

    refreshUI: function () {
        var tabContent = this.tabContent;
        if (!tabContent) return;

        var actionList = UIUtils.seekWidgetByName(this.tabContent, "ActionList");
        if (!actionList) return;

        if (this.customActionState === CustomActionState.ACTION_TYPES) {
            if (this.subNavContainer) this.subNavContainer.setVisible(false);
            if (this.originalActionListPos) {
                actionList.setPosition(this.originalActionListPos);
                actionList.setContentSize(this.originalActionListSize);
            }

            var actionTypes = [];
            for (var key in CoreGame.ElementObject.ACTION_TYPE) {
                actionTypes.push(CoreGame.ElementObject.ACTION_TYPE[key]);
            }
            this.populateActionTypes(actionList, actionTypes);
        } else {
            this._showSubNav();
            if (this.customActionState === CustomActionState.ACTION_LIST) {
                this.listLayer.populate(this.selectedActionType);
            } else {
                this.marketLayer.populate(this.selectedActionType);
            }
        }
        this._addPadding(actionList);
    },

    _showSubNav: function () {
        var actionList = UIUtils.seekWidgetByName(this.tabContent, "ActionList");
        if (actionList && !this.originalActionListPos) {
            this.originalActionListPos = actionList.getPosition();
            this.originalActionListSize = actionList.getContentSize();
        }

        if (!this.subNavContainer) {
            var contentSize = this.tabContent.getContentSize();
            this.subNavContainer = new ccui.Layout();
            this.subNavContainer.setContentSize(cc.size(contentSize.width, 80));
            this.subNavContainer.setAnchorPoint(cc.p(0.5, 1));
            this.subNavContainer.setPosition(cc.p(contentSize.width / 2, contentSize.height - 10));
            this.tabContent.addChild(this.subNavContainer);

            var btnWidth = (contentSize.width - 60) / 2;
            this.listBtn = new ccui.Button("res/tool/res/btn_green_2.png");
            this.listBtn.setScale9Enabled(true);
            this.listBtn.setContentSize(cc.size(btnWidth, 60));
            this.listBtn.setPosition(cc.p(contentSize.width / 4 + 5, 40));
            this.listBtn.setTitleText("Actions List");
            this.listBtn.setTitleFontSize(24);
            this.subNavContainer.addChild(this.listBtn);

            this.addBtn = new ccui.Button("res/tool/res/btn_green_2.png");
            this.addBtn.setScale9Enabled(true);
            this.addBtn.setContentSize(cc.size(btnWidth, 60));
            this.addBtn.setPosition(cc.p(contentSize.width * 3 / 4 - 5, 40));
            this.addBtn.setTitleText("Add Action");
            this.addBtn.setTitleFontSize(24);
            this.subNavContainer.addChild(this.addBtn);

            var self = this;
            this.listBtn.addTouchEventListener(function (sender, type) {
                if (type === ccui.Widget.TOUCH_ENDED) {
                    self.customActionState = CustomActionState.ACTION_LIST;
                    self.refreshUI();
                }
            });
            this.addBtn.addTouchEventListener(function (sender, type) {
                if (type === ccui.Widget.TOUCH_ENDED) {
                    self.customActionState = CustomActionState.STRATEGY_MARKET;
                    self.refreshUI();
                }
            });
        }

        if (actionList && this.originalActionListPos) {
            actionList.setPositionY(this.originalActionListPos.y - 90);
            actionList.setContentSize(cc.size(this.originalActionListSize.width, this.originalActionListSize.height - 90));
        }

        this.subNavContainer.setVisible(true);
        var activeColor = cc.color(255, 255, 255);
        var inactiveColor = cc.color(150, 150, 150);
        this.listBtn.setColor(this.customActionState === CustomActionState.ACTION_LIST ? activeColor : inactiveColor);
        this.addBtn.setColor(this.customActionState === CustomActionState.STRATEGY_MARKET ? activeColor : inactiveColor);
    },

    populateActionTypes: function (actionList, actionTypes) {
        var self = this;
        actionList.removeAllItems();

        for (var i = 0; i < actionTypes.length; i++) {
            var type = actionTypes[i];
            var item = this.parentUI._createActionItem();
            if (!item) continue;

            actionList.pushBackCustomItem(item);

            var label = item.getChildByName("Label");
            if (label) {
                label.setString(type);
                label.setTouchEnabled(true);
                label.actionType = type;
                label.addTouchEventListener(function (sender, eventType) {
                    if (eventType === ccui.Widget.TOUCH_ENDED) {
                        self.customActionState = CustomActionState.ACTION_LIST;
                        self.selectedActionType = sender.actionType;
                        self.refreshUI();
                    }
                });
            }

            var checkbox = item.getChildByName("checkbox");
            if (checkbox) {
                checkbox.setVisible(true);
                var isCheckedNode = checkbox.getChildByName("isChecked");
                if (isCheckedNode) {
                    var strategies = this.blockData.customAction[type] || [];
                    var hasStrategies = strategies.length > 0;
                    isCheckedNode.setVisible(hasStrategies);
                }

                checkbox.actionType = type;
                checkbox.isCheckedNode = isCheckedNode;
                checkbox.addTouchEventListener(function (sender, eventType) {
                    if (eventType === ccui.Widget.TOUCH_ENDED) {
                        var isChecked = sender.isCheckedNode.isVisible();
                        if (isChecked) {
                            self.blockData.customAction[sender.actionType] = [];
                            sender.isCheckedNode.setVisible(false);
                        } else {
                            self.customActionState = CustomActionState.ACTION_LIST;
                            self.selectedActionType = sender.actionType;
                            self.refreshUI();
                        }
                    }
                });
            }
        }
    },

    _addPadding: function (actionList) {
        // Add 3 empty cells at the end for extra scrolling space
        for (var i = 0; i < 3; i++) {
            var emptyItem = this.parentUI._createActionItem();
            if (emptyItem) {
                var label = emptyItem.getChildByName("Label");
                if (label) label.setVisible(false);
                var checkbox = emptyItem.getChildByName("checkbox");
                if (checkbox) checkbox.setVisible(false);
                actionList.pushBackCustomItem(emptyItem);
            }
        }
    },

    onTabClicked: function () {
        if (this.customActionState !== CustomActionState.ACTION_TYPES) {
            this.customActionState = CustomActionState.ACTION_TYPES;
            this.refreshUI();
        }
    }
});
