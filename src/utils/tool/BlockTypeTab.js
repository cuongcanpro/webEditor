/**
 * Created by Antigravity on 02/03/2026.
 */

var BlockTypeTab = cc.Class.extend({
    ctor: function (tabContent, blockData, parentUI) {
        this.tabContent = tabContent;
        this.blockData = blockData;
        this.parentUI = parentUI;
        this.init();
    },

    init: function () {
        var self = this;
        var tabContent = this.tabContent;
        if (!tabContent) return;

        // Type checkboxes (radio-button behavior)
        var updateCheckboxes = function (selectedIndex) {
            for (var i = 0; i < 2; i++) {
                var cb = UIUtils.seekWidgetByName(tabContent, "checkbox_" + i);
                if (cb) {
                    var node = cb.getChildByName("isChecked");
                    if (node) node.setVisible(i === selectedIndex);
                }
            }
        };

        var setupCheckbox = function (index) {
            var checkbox = UIUtils.seekWidgetByName(tabContent, "checkbox_" + index);
            if (checkbox) {
                checkbox.addTouchEventListener(function (sender, type) {
                    if (type === ccui.Widget.TOUCH_ENDED) {
                        var blockerTypes = Object.keys(CoreGame.Blocker.BlockerType);
                        var key = blockerTypes[index];
                        if (key) {
                            self.blockData.type = CoreGame.Blocker.BlockerType[key];
                        }
                        updateCheckboxes(index);
                    }
                });
            }
        };

        for (var i = 0; i < 2; i++) {
            setupCheckbox(i);
        }

        // Width and Height EditBoxes
        this.setupNumericInput("width", "width");
        this.setupNumericInput("height", "height");

        // Edit buttons for Layer and Shape Type
        var blockerTypeOptions = [];
        for (var key in CoreGame.Blocker.BlockerType) {
            blockerTypeOptions.push(CoreGame.Blocker.BlockerType[key]);
        }
        this.setupOptionInput("editBtn_0", "type", blockerTypeOptions);

        var layerOptions = [];
        if (typeof CoreGame !== "undefined" && CoreGame.LayerBehavior) {
            for (var key in CoreGame.LayerBehavior) {
                layerOptions.push(key);
            }
        }
        this.setupOptionInput("editBtn_1", "layerBehavior", layerOptions);

        // Edit Config Button
        var editConfigBtn = UIUtils.seekWidgetByName(tabContent, "editConfigBtn");
        if (editConfigBtn) {
            editConfigBtn.addTouchEventListener(function (sender, type) {
                if (type === ccui.Widget.TOUCH_ENDED) {
                    self.onEditConfigClicked();
                }
            });
        }

        // Initial UI sync
        this.refreshUI();
    },

    setupOptionInput: function (btnName, dataKey, options) {
        var self = this;
        var btn = UIUtils.seekWidgetByName(this.tabContent, btnName);
        if (btn) {
            btn.setTouchEnabled(true);
            btn.addTouchEventListener(function (sender, type) {
                if (type === ccui.Widget.TOUCH_ENDED) {
                    var selector = new OptionSelector(options, function (val) {
                        self.blockData[dataKey] = val;
                        self.refreshUI();
                    });
                    self.tabContent.getParent().addChild(selector, 1000);
                }
            });
        }
    },

    setupNumericInput: function (widgetName, dataKey) {
        var self = this;
        var textField = UIUtils.seekWidgetByName(this.tabContent, widgetName);
        if (textField) {
            var parent = textField.getParent();
            var size = textField.getContentSize();
            var pos = textField.getPosition();

            var editBox = new cc.EditBox(size, new cc.Scale9Sprite());
            editBox.setPosition(pos);
            editBox.setAnchorPoint(textField.getAnchorPoint());
            editBox.setFontSize(24);
            editBox.setFontColor(cc.color.WHITE);
            editBox.setPlaceholderFontSize(24);
            editBox.setMaxLength(10);
            editBox.setReturnType(cc.KEYBOARD_RETURNTYPE_DONE);
            editBox.setInputMode(cc.EDITBOX_INPUT_MODE_NUMERIC);

            editBox.setDelegate({
                editBoxTextChanged: function (sender, text) {
                    var val = parseInt(text);
                    if (!isNaN(val)) {
                        self.blockData[dataKey] = val;
                    }
                }
            });

            parent.addChild(editBox);
            textField.setVisible(false);

            this[widgetName + "EditBox"] = editBox;
        }
    },

    setData: function (blockData) {
        this.blockData = blockData;
    },

    refreshUI: function () {
        var tabContent = this.tabContent;

        // Refresh checkboxes
        var typeIndex = -1;
        var blockerTypes = Object.keys(CoreGame.Blocker.BlockerType);
        for (var k = 0; k < blockerTypes.length; k++) {
            if (this.blockData.type === CoreGame.Blocker.BlockerType[blockerTypes[k]]) {
                typeIndex = k;
                break;
            }
        }

        for (var i = 0; i < 2; i++) {
            var cb = UIUtils.seekWidgetByName(tabContent, "checkbox_" + i);
            if (cb) {
                var node = cb.getChildByName("isChecked");
                if (node) node.setVisible(i === typeIndex);
            }
        }

        // Refresh numeric inputs
        if (this.widthEditBox) {
            this.widthEditBox.setString(this.blockData.width.toString());
        }
        if (this.heightEditBox) {
            this.heightEditBox.setString(this.blockData.height.toString());
        }

        // Refresh option labels
        var updateOptionLabel = function (btnName, val, options) {
            var btn = UIUtils.seekWidgetByName(tabContent, btnName);
            if (btn) {
                var label = btn.getChildByName("Label");
                if (label) {
                    var displayText = val;
                    if (options) {
                        for (var i = 0; i < options.length; i++) {
                            if (typeof options[i] === "object" && (options[i].value === val || options[i].name === val)) {
                                displayText = options[i].name;
                                break;
                            }
                        }
                    }
                    if (displayText === undefined || displayText === null) displayText = "N/A";
                    label.setString(displayText.toString());
                }
            }
        };

        var layerOptions = [];
        if (typeof CoreGame !== "undefined" && CoreGame.LayerBehavior) {
            for (var key in CoreGame.LayerBehavior) {
                layerOptions.push(key);
            }
        }

        var blockerTypeOptions = [];
        for (var key in CoreGame.Blocker.BlockerType) {
            blockerTypeOptions.push(CoreGame.Blocker.BlockerType[key]);
        }

        updateOptionLabel("editBtn_0", this.blockData.type, blockerTypeOptions);
        updateOptionLabel("editBtn_1", this.blockData.layerBehavior, layerOptions);
    },

    onEditConfigClicked: function () {
        var self = this;
        var blockerTypeName = this.blockData.type;
        // Try to find the class in CoreGame or CoreGame.Blocker
        var BlockerClass = CoreGame.ElementObject;

        var defaultData = {};
        if (BlockerClass) {
            try {
                var instance = new BlockerClass();
                if (instance.configData) {
                    // Clone default config
                    defaultData = JSON.parse(JSON.stringify(instance.configData));
                }
            } catch (e) {
                cc.log("BlockTypeTab: Could not instantiate " + blockerTypeName + " to get default config.");
            }
        }

        // Merge existing configData into defaultData to ensure all keys exist
        var existingConfig = this.blockData.configData || {};
        for (var key in existingConfig) {
            defaultData[key] = existingConfig[key];
        }
        this.blockData.configData = defaultData;

        var editor = new ConfigEditor(this.blockData.configData, function (finalConfig) {
            self.blockData.configData = finalConfig;
            cc.log("BlockTypeTab: Updated blockData.configData: " + JSON.stringify(finalConfig));
        });

        if (this.parentUI) {
            this.parentUI.addChild(editor, 100);
        } else {
            this.tabContent.addChild(editor, 100);
        }
    }
});
