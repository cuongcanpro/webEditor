/**
 * Created by Antigravity on 02/04/2026.
 */

var ConfigEditor = cc.Layer.extend({
    ctor: function (configData, callback) {
        this._super();
        this.configData = configData;
        this.callback = callback;
        this.initUI();
    },

    initUI: function () {
        var self = this;
        var loaded = ccs.load("tool/ConfigEditor.json");
        if (!loaded || !loaded.node) return;

        this.rootNode = loaded.node;
        this.addChild(this.rootNode);

        // Add semi-transparent background
        var bg = new cc.LayerColor(cc.color(0, 0, 0, 150));
        this.addChild(bg, -1);

        var actionList = UIUtils.seekWidgetByName(this.rootNode, "ListParam");
        var okBtn = UIUtils.seekWidgetByName(this.rootNode, "ok");

        var rawValuePlaceholder = UIUtils.seekWidgetByName(this.rootNode, "rawValue");
        var oldRawValuePlaceholder = UIUtils.seekWidgetByName(this.rootNode, "oldRawValue");

        if (rawValuePlaceholder) {
            this.rawValueEditBox = this._convertToEditBox(rawValuePlaceholder);
        }

        if (oldRawValuePlaceholder) {
            this.oldRawValueEditBox = this._convertToEditBox(oldRawValuePlaceholder);
            this.oldRawValueEditBox.setString(JSON.stringify(this.configData));
        }

        if (actionList) {
            this.populateList(actionList);
        }

        if (okBtn) {
            okBtn.addTouchEventListener(function (sender, type) {
                if (type === ccui.Widget.TOUCH_ENDED) {
                    var finalData = self.configData;

                    if (self.rawValueEditBox) {
                        var rawValue = self.rawValueEditBox.getString().trim();
                        if (rawValue.length > 0) {
                            try {
                                finalData = JSON.parse(rawValue);
                                cc.log("ConfigEditor: Using raw JSON data.");
                            } catch (e) {
                                cc.log("ConfigEditor: Invalid JSON in rawValue. Falling back to list data.");
                            }
                        }
                    }

                    if (self.callback) self.callback(finalData);
                    self.removeFromParent();
                }
            });
        }
    },

    _convertToEditBox: function (widget) {
        if (!widget) return null;
        var parent = widget.getParent();
        var size = widget.getContentSize();
        var pos = widget.getPosition();

        var editBox = new cc.EditBox(size, new cc.Scale9Sprite());
        editBox.setPosition(pos);
        editBox.setAnchorPoint(widget.getAnchorPoint());
        editBox.setFontSize(20);
        editBox.setFontColor(cc.color.WHITE);
        editBox.setPlaceholderFontSize(20);
        editBox.setMaxLength(1000);
        editBox.setReturnType(cc.KEYBOARD_RETURNTYPE_DONE);
        editBox.setInputMode(cc.EDITBOX_INPUT_MODE_SINGLELINE);

        parent.addChild(editBox);
        widget.setVisible(false);
        return editBox;
    },

    populateList: function (actionList) {
        var self = this;
        actionList.removeAllItems();

        for (var key in this.configData) {
            if (this.configData.hasOwnProperty(key)) {
                var item = this.createItem(key, this.configData[key]);
                if (item) {
                    actionList.pushBackCustomItem(item);
                }
            }
        }
    },

    createItem: function (key, value) {
        var self = this;
        var loaded = ccs.load("tool/inputValue.json");
        if (!loaded || !loaded.node) return null;

        var node = loaded.node;

        var nameLabel = UIUtils.seekWidgetByName(node, "name");
        var valueField = UIUtils.seekWidgetByName(node, "value");

        if (nameLabel) nameLabel.setString(key);
        if (valueField) {
            valueField.setString(value.toString());
            valueField.addEventListener(function (sender, type) {
                if (type === ccui.TextField.EVENT_DETACH_WITH_IME || type === ccui.TextField.EVENT_INSERT_TEXT || type === ccui.TextField.EVENT_DELETE_BACKWARD) {
                    var newVal = sender.getString();
                    // Basic type inference
                    if (!isNaN(newVal) && newVal.trim() !== "") {
                        self.configData[key] = Number(newVal);
                    } else {
                        self.configData[key] = newVal;
                    }
                }
            });
        }

        return node;
    }
});
