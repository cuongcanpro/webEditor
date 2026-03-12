/**
 * Created by Antigravity on 02/03/2026.
 */

var BlockVisualTab = cc.Class.extend({
    ctor: function (tabContent, blockData) {
        this.tabContent = tabContent;
        this.blockData = blockData;
        this.init();
    },

    init: function () {
        var self = this;
        var tabContent = this.tabContent;
        if (!tabContent) return;

        var pathInput = UIUtils.seekWidgetByName(tabContent, "path");
        if (pathInput) {
            var parent = pathInput.getParent();
            var size = pathInput.getContentSize();
            var pos = pathInput.getPosition();

            // Create EditBox using a simple scale9 sprite (can be empty or a background image)
            // Using a dummy sprite or a dedicated background if available. 
            // For now, let's use a scale9 sprite and match the appearance.
            var editBox = new cc.EditBox(size, new cc.Scale9Sprite());
            editBox.setPosition(pos);
            editBox.setAnchorPoint(pathInput.getAnchorPoint());
            editBox.setFontSize(22);
            editBox.setFontColor(cc.color.WHITE);
            editBox.setPlaceHolder("Enter path...");
            editBox.setPlaceholderFontSize(22);
            editBox.setMaxLength(200);
            editBox.setReturnType(cc.KEYBOARD_RETURNTYPE_DONE);
            editBox.setInputMode(cc.EDITBOX_INPUT_MODE_SINGLELINE);

            editBox.setDelegate({
                editBoxTextChanged: function (sender, text) {
                    self.blockData.visual.path = text;
                    if (self.updateBtn) self.updateBtn.setTitleText("Update");
                }
            });

            parent.addChild(editBox);
            this.pathEditBox = editBox;

            // Hide original
            pathInput.setVisible(false);

            // Initial value
            this.pathEditBox.setString(this.blockData.visual.path || "");
        }

        var updateCheckboxes = function (selectedIndex) {
            for (var i = 0; i < 3; i++) {
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
                        self.blockData.visual.type = index;
                        updateCheckboxes(index);
                        self.refreshPrefixes();
                        if (self.updateBtn) self.updateBtn.setTitleText("Update");
                    }
                });
            }
        };

        for (var i = 0; i < 3; i++) {
            setupCheckbox(i);
        }

        // Initial UI sync
        updateCheckboxes(this.blockData.visual.type);
        this.refreshPrefixes();

        // Setup Update Button
        var updateBtn = UIUtils.seekWidgetByName(tabContent, "updateBtn");
        var demoNode = UIUtils.seekWidgetByName(tabContent, "demo");
        this.updateBtn = updateBtn;
        this.demoNode = demoNode;

        if (updateBtn && demoNode) {
            updateBtn.addTouchEventListener(function (sender, type) {
                if (type === ccui.Widget.TOUCH_ENDED) {
                    if (sender.getTitleText() === "Preview Anm") {
                        self.startAnimationLoop();
                    } else {
                        self.updatePreview(demoNode, false);
                        sender.setTitleText("Preview Anm");
                    }
                }
            });
        }
    },

    refreshPrefixes: function () {
        var self = this;
        var tabContent = this.tabContent;
        var visualType = this.blockData.visual.type;
        var demoNode = UIUtils.seekWidgetByName(tabContent, "demo");

        var prefixes = [];
        if (visualType === 1 || visualType === 2) { // Spine or Custom/JSON
            if (visualType === 1) {
                prefixes = [
                    "game/animation/spine/blocker_rock",
                    "game/animation/spine/so",
                    "game/animation/spine/ruong",
                    "game/animation/spine/vali"
                ];
            } else {
                prefixes = [
                    "res/newBlock/BlockUI/demo_1.json",
                    "res/newBlock/BlockUI/demo_2.json",
                    "res/newBlock/BlockUI/demo_3.json",
                    "res/newBlock/BlockUI/demo_4.json"
                ];
            }

            var setupPrefix = function (index) {
                var btn = UIUtils.seekWidgetByName(tabContent, "prefix_" + index);
                if (btn) {
                    btn.setVisible(true);
                    btn.ignoreContentAdaptWithSize(false);
                    btn.removeAllChildren(); // Clear previous demo nodes

                    btn.loadTextureNormal("res/tool/res/btn_green_2.png");
                    btn.setContentSize(cc.size(50, 50));

                    if (visualType === 1) {
                        var dummyElement = { type: 0, position: cc.p(0, 0), hitPoints: 1 };
                        var spineNode = new CoreGame.SpineElementUI(dummyElement, prefixes[index]);
                        spineNode.setPosition(25, 10); // Center in 50x50, adjust Y for common spine pivot
                        btn.addChild(spineNode);
                    } else if (visualType === 2) {
                        // For JSON, we could show a label or just icon
                        var label = new cc.LabelTTF((index + 1).toString(), "Arial", 20);
                        label.setPosition(25, 25);
                        btn.addChild(label);
                    }

                    btn.addTouchEventListener(function (sender, type) {
                        if (type === ccui.Widget.TOUCH_ENDED) {
                            var path = prefixes[index];
                            self.blockData.visual.path = path;
                            if (self.pathEditBox) {
                                self.pathEditBox.setString(path);
                            }
                            if (self.updateBtn) self.updateBtn.setTitleText("Update");
                            self.updatePreview(demoNode, false);
                            if (self.updateBtn) self.updateBtn.setTitleText("Preview Anm");
                        }
                    });
                }
            };

            for (var i = 0; i < prefixes.length; i++) {
                setupPrefix(i);
            }

            if (this.scrollViewContent)
                this.scrollViewContent.setVisible(false);
        } else if (visualType === 0) {
            // Hide pre-existing buttons from Cocos file and get position from first button
            var firstBtnPos = cc.p(20, 100); // Default position
            for (var i = 0; i < 4; i++) {
                var existingBtn = UIUtils.seekWidgetByName(tabContent, "prefix_" + i);
                if (existingBtn) {
                    if (i === 0) {
                        // Get position from first button
                        firstBtnPos = existingBtn.getPosition();
                    }
                    existingBtn.setVisible(false);
                }
            }
            if (this.scrollViewContent) {
                this.scrollViewContent.setVisible(true);
                return;
            }
            var pathDefault = "res/high/game/element/";
            var prefixes = ['1.png', '2.png', '3.png', '4.png', '5.png', '6.png', '7.png', '8.png', '10.png', '11.png', '12.png', '100.png', '101.png', '102.png', '103.png', '104.png', '105.png', '106.png', '300.png', '301.png', '302.png', '303.png', '304.png', '305.png', '306.png', '500.png', '501.png', '502.png', '600.png', '601.png', '602.png', '700.png', '701.png', '702.png', '703.png', '704.png', '705.png', '800.png', '900.png', '901.png', '1000.png', '1100.png', '1101.png', '1102.png', '1103.png', '1104.png', '1105.png', '1200.png', '1300.png', '1400.png', '1500.png', '1600.png', '1700.png', '1800.png', '1900.png', '2000.png', '2100.png', '2200.png', '2300.png', '2400.png', '2500.png', '2600.png', '2700.png', '2800.png', '2900.png', '3000.png', '3100.png', '3101.png', '3102.png', '3200.png', '3300.png', '3400.png', '3500.png', '3600.png', '3700.png', '3800.png', '3801.png', '3803.png', '3806.png', '3807.png', '3900.png', '4000.png', '4100.png', '4101.png', '4200.png', '4201.png', '4300.png', '4400.png', '10000.png']

            // Create ScrollView container
            var scrollView = new ccui.ScrollView();
            scrollView.setDirection(ccui.ScrollView.DIR_HORIZONTAL);
            scrollView.setContentSize(700, 100);
            scrollView.setPosition(firstBtnPos.x, firstBtnPos.y - 20); // Use position from existing buttons
            scrollView.setBounceEnabled(true);
            this.scrollViewContent = scrollView;
            tabContent.addChild(scrollView);

            // Calculate inner container size based on number of buttons
            var buttonWidth = 100;
            var buttonHeight = 100;
            var spacing = 10;
            var innerWidth = prefixes.length * (buttonWidth + spacing);
            scrollView.setInnerContainerSize(cc.size(innerWidth, buttonHeight));

            // Create buttons for each prefix
            for (var i = 0; i < prefixes.length; i++) {
                (function (index) {
                    var path = pathDefault + prefixes[index];

                    // Create button
                    var btn = new ccui.Button();
                    btn.loadTextureNormal(path);
                    btn.setScale9Enabled(false);
                    btn.setContentSize(cc.size(buttonWidth, buttonHeight));
                    btn.setPosition(index * (buttonWidth + spacing) + buttonWidth / 2, buttonHeight / 2);

                    // Add touch listener
                    btn.addTouchEventListener(function (sender, type) {
                        if (type === ccui.Widget.TOUCH_ENDED) {
                            self.blockData.visual.path = path;
                            if (self.pathEditBox) {
                                self.pathEditBox.setString(path);
                            }
                            if (self.updateBtn) self.updateBtn.setTitleText("Update");
                            self.updatePreview(demoNode, false);
                            if (self.updateBtn) self.updateBtn.setTitleText("Preview Anm");
                        }
                    });

                    scrollView.addChild(btn);
                })(i);
            }
        }


    },

    isPathValid: function () {
        var visual = this.blockData.visual;
        var path = visual.path;
        if (!path) {
            LogLayer.show("ERROR: Path is empty");
            return false;
        }

        var type = visual.type;
        if (type === 0) { // Sprite
            var ext = path.split('.').pop().toLowerCase();
            if (ext !== 'png' && ext !== 'jpg' && ext !== 'jpeg') {
                LogLayer.show("ERROR: Sprite path must end with .png or .jpg");
                return false;
            }
        } else if (type === 2) { // Custom/JSON
            if (path.indexOf(".json") === -1) {
                LogLayer.show("ERROR: Custom path must end with .json");
                return false;
            }
        }

        // Check file existence on native
        if (typeof jsb !== "undefined" && jsb.fileUtils) {
            var checkPath = path;
            if (type === 1) { // Spine
                checkPath = path + ".json";
            }

            // Try to find the file (considering search paths)
            var fullPath = jsb.fileUtils.fullPathForFilename(checkPath);
            if (!fullPath || !jsb.fileUtils.isFileExist(fullPath)) {
                LogLayer.show("ERROR: File not found: " + checkPath);
                return false;
            }
        }

        return true;
    },

    updatePreview: function (demoNode, playAnim) {
        demoNode.removeAllChildren();
        var visual = this.blockData.visual;

        if (!this.isPathValid()) {
            return;
        }

        var dummyElement = {
            type: 0,
            position: cc.p(0, 0),
            hitPoints: 1
        };

        var uiNode = null;
        if (visual.type === 0) { // Sprite
            uiNode = new CoreGame.SpriteElementUI(dummyElement, visual.path);
        } else if (visual.type === 1) { // Spine
            uiNode = new CoreGame.SpineElementUI(dummyElement, visual.path);
        } else if (visual.type === 2) { // Custom/JSON
            uiNode = new CoreGame.CustomElementUI(dummyElement, visual.path);
        }

        if (uiNode) {
            this.currentUINode = uiNode;
            demoNode.addChild(uiNode);
            cc.log("Updated demo with " + uiNode.constructor.name + ": " + visual.path);

            if (playAnim) {
                this.startAnimationLoop();
            }
        } else {
            cc.log("Preview for type " + visual.type + " is not yet implemented.");
        }
    },

    startAnimationLoop: function () {
        var uiNode = this.currentUINode;
        if (!uiNode) return;

        uiNode.stopAllActions();

        // Cycle through animations based on customAction keys
        var actionTypes = [];//Object.keys(this.blockData.customAction);

        if (actionTypes.length === 0) {
            // Fallback to standard ones if none configured
            actionTypes = [
                CoreGame.ElementObject.ACTION_TYPE.MATCH,
                CoreGame.ElementObject.ACTION_TYPE.SIDE_MATCH,
                CoreGame.ElementObject.ACTION_TYPE.REMOVE,
                CoreGame.ElementObject.ACTION_TYPE.SPAWN
            ];
        }

        var animIndex = 0;
        var playNext = function () {
            if (actionTypes.length === 0 || animIndex >= actionTypes.length) return;
            var type = actionTypes[animIndex];
            cc.log("Preview - Testing Action: " + type);
            var duration = uiNode.playAnimation(type, "", playNext);

            animIndex = animIndex + 1;
        };

        playNext();
    },

    setData: function (blockData) {
        this.blockData = blockData;
    },

    reset: function () {
        if (this.demoNode) {
            this.demoNode.removeAllChildren();
        }
        if (this.updateBtn) {
            this.updateBtn.setTitleText("Update");
        }
        this.updatePreview(UIUtils.seekWidgetByName(this.tabContent, "demo"), false);
        this.currentUINode = null;
    },

    // Optional: add a refresh method if needed for loading data
    refreshUI: function () {
        var tabContent = this.tabContent;
        if (this.pathEditBox) {
            this.pathEditBox.setString(this.blockData.visual.path || "");
        } else {
            var pathInput = UIUtils.seekWidgetByName(tabContent, "path");
            if (pathInput) {
                pathInput.setString(this.blockData.visual.path || "");
            }
        }

        for (var i = 0; i < 3; i++) {
            var cb = UIUtils.seekWidgetByName(tabContent, "checkbox_" + i);
            if (cb) {
                var node = cb.getChildByName("isChecked");
                if (node) node.setVisible(i === this.blockData.visual.type);
            }
        }
    }
});
