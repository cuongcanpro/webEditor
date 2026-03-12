


var BlockCreatorUI = cc.Layer.extend({
    ctor: function () {
        this._super();
        this.rootNode = null;
        this.currentTabIndex = -1;

        // Data structure to store user selections
        this.blockData = {
            baseAction: [],
            unblockAction: [],
            customAction: {},
            actions: [],
            visual: { path: "", type: 0 },
            type: CoreGame.Blocker.BlockerType.NORMAL_BLOCKER,
            width: 1,
            height: 1,
            layerBehavior: "CONTENT"
        };

        this.mapIDData = null;
        this.loadMapData();
        this.initUI();
        this.scheduleUpdate();
    },
    update: function (dt) {
        if (CoreGame.efkManager)
            CoreGame.efkManager.update();
    },
    loadMapData: function () {
        var self = this;
        cc.loader.loadJson("res/newBlock/mapID.json", function (err, data) {
            if (err) {
                cc.log("Error loading mapID.json initially: " + err);
                return;
            }
            self.mapIDData = data;
        });
    },

    initUI: function () {
        var loaded = ccs.load("tool/BlockToolUI.json");
        if (loaded && loaded.node) {
            this.rootNode = loaded.node;
            this.addChild(this.rootNode);
            this.setupTabs();
            this.setupHeader();

            var homeBtn = UIUtils.seekWidgetByName(this.rootNode, "homeBtn");
            if (homeBtn) {
                homeBtn.addTouchEventListener(function (sender, type) {
                    if (type === ccui.Widget.TOUCH_ENDED && this.currentTabIndex !== -1) {
                        this.switchToTab(this.currentTabIndex);
                    }
                }.bind(this));
            }

            // Initialize tab controllers after UI is loaded and this.tabContents is populated
            if (this.tabContents[4]) { // visual tab is now 5th (index 4)
                this.visualTab = new BlockVisualTab(this.tabContents[4], this.blockData);
            }
            if (this.tabContents[0]) { // type tab is now 1st (index 0)
                this.typeTab = new BlockTypeTab(this.tabContents[0], this.blockData, this);
            }
            if (this.tabContents[3]) { // custom action tab is 4th (index 3)
                this.customTab = new BlockCustomTab(this.tabContents[3], this.blockData, this);
            }
            this.rootNode.setContentSize(cc.size(this.width, this.height));
            ccui.helper.doLayout(this);
        }
    },

    setupHeader: function () {
        var self = this;
        var nameInput = UIUtils.seekWidgetByName(this.rootNode, "blockName"); // Block Name
        var idInput = UIUtils.seekWidgetByName(this.rootNode, "blockID");     // Block ID field
        var loadBtn = UIUtils.seekWidgetByName(this.rootNode, "loadBtn");
        var saveBtn = UIUtils.seekWidgetByName(this.rootNode, "saveBtn");

        if (!nameInput || !idInput) return;

        if (loadBtn) {
            loadBtn.addTouchEventListener(function (sender, type) {
                if (type === ccui.Widget.TOUCH_ENDED) {
                    var data = self.mapIDData;
                    if (!data) {
                        LogLayer.show("MapID data not found or not loaded yet.");
                        return;
                    }

                    // Prepare options for OptionSelector
                    var options = [];
                    var keys = Object.keys(data);
                    // Sort by ID
                    keys.sort(function (a, b) {
                        return data[a] - data[b];
                    });

                    for (var i = 0; i < keys.length; i++) {
                        var name = keys[i];
                        var id = data[name];
                        options.push({
                            name: id + " - " + name,
                            value: name
                        });
                    }

                    // Use the new OptionSelector tool
                    var selector = new OptionSelector(options, function (selectedOption) {
                        var id = data[selectedOption];
                        var name = selectedOption;

                        idInput.setString(id.toString());
                        nameInput.setString(name);
                        cc.log("Selected: " + name + " (" + id + ")");
                        self.loadBlockData(id);
                    });
                    self.addChild(selector, 9999);
                }
            });
        }

        if (saveBtn) {
            saveBtn.addTouchEventListener(function (sender, type) {
                if (type === ccui.Widget.TOUCH_ENDED) {
                    var blockID = idInput.getString();
                    var blockName = nameInput.getString();
                    if (self.mapIDData[blockName] == undefined)
                        blockID = undefined;
                    if (!blockID || blockID === "N/A" || blockID === "block_id") {
                        var maxID = 0;
                        for (var key in self.mapIDData) {
                            var val = self.mapIDData[key];
                            if (typeof val === 'number' && val > maxID) {
                                maxID = val;
                            }
                        }
                        blockID = (maxID + 1).toString();
                        idInput.setString(blockID);
                        LogLayer.show("Auto-generated new ID: " + blockID);
                    }

                    var dataToSave = self.getBlockData();
                    var jsonStr = JSON.stringify(dataToSave, null, 4);
                    var filePath = "res/newBlock/" + blockID + ".json";
                    if (cc.sys.platform !== cc.sys.WIN32) {
                        filePath = fr.NativeService.getFolderUpdateAssets() + "/" + filePath;
                    }

                    // Specific marker for the agent to catch and save to file if needed
                    cc.log("SAVE_BLOCK_DATA: " + filePath + "\n" + jsonStr);

                    // Try saving via native FileUtils if available (JSB)
                    if (typeof jsb !== "undefined" && jsb.fileUtils) {
                        if (jsb.fileUtils.writeStringToFile(jsonStr, filePath)) {
                            LogLayer.show("SUCCESS: Saved block data to: " + filePath);
                        } else {
                            LogLayer.show("ERROR: Failed to save block data to: " + filePath);
                        }
                    } else {
                        cc.log("Block data prepared for " + blockID + ".json. Please copy the log content above to save it manually.");
                    }

                    // Also update mapID.json
                    if (blockName) {
                        self.mapIDData[blockName] = parseInt(blockID);

                        var mapJsonStr = JSON.stringify(self.mapIDData, null, 4);
                        var mapFilePath = "res/newBlock/mapID.json";
                        if (cc.sys.platform !== cc.sys.WIN32) {
                            mapFilePath = fr.NativeService.getFolderUpdateAssets() + "/" + mapFilePath;
                        }

                        cc.log("SAVE_BLOCK_DATA: " + mapFilePath + "\n" + mapJsonStr);
                        if (typeof jsb !== "undefined" && jsb.fileUtils) {
                            jsb.fileUtils.writeStringToFile(mapJsonStr, mapFilePath);
                            LogLayer.show("SUCCESS: Updated mapID.json");
                        }
                    }
                }
            });
        }

        var testBtn = UIUtils.seekWidgetByName(this.rootNode, "testBtn");
        if (testBtn) {
            testBtn.addTouchEventListener(function (sender, type) {
                if (type === ccui.Widget.TOUCH_ENDED) {
                    CoreGame.BlockerFactory.preloadAllConfigs();

                    // var blockIDStr = idInput.getString();
                    // if (!blockIDStr || blockIDStr === "N/A" || blockIDStr === "block_id") {
                    //     LogLayer.show("Please enter or load a valid block ID to test");
                    //     return;
                    // }

                    // var blockID = parseInt(blockIDStr);
                    // var testBoxes = [
                    //     { r: 3, c: 3, hp: 1, type: blockID }
                    // ];

                    CoreGame.BoardUI.instance = null;
                    var scene = new cc.Scene();
                    // var layer = CoreGame.BoardUI.getInstance(null, testBoxes);
                    var layer = EditMapScene.getInstance();
                    scene.addChild(layer);
                    cc.director.runScene(scene);
                }
            });
        }
    },

    setupTabs: function () {
        var tabContainer = UIUtils.seekWidgetByName(this.rootNode, "TabContainer");
        if (!tabContainer) return;

        // Dynamically discover all tabs
        this.tabs = [];
        var i = 1;
        while (true) {
            var tab = tabContainer.getChildByName("Tab" + i);
            if (!tab) break;
            this.tabs.push(tab);
            i++;
        }
        // User added Tab0 manually in JSON, let's look for it too if not found by the numerical loop
        var tab0 = tabContainer.getChildByName("Tab0");
        if (tab0) {
            this.tabs.unshift(tab0); // Add Tab0 at the beginning
        }

        // Dynamically discover all tab contents
        this.tabContents = [];
        var j = 0;
        while (true) {
            var content = UIUtils.seekWidgetByName(this.rootNode, "tabContent" + j);
            if (!content) break;
            this.tabContents.push(content);
            j++;
        }
        // Set up click handlers for tabs
        var self = this;
        for (var k = 0; k < this.tabs.length; k++) {
            (function (index) {
                self.tabs[index].addTouchEventListener(function (sender, type) {
                    if (type === ccui.Widget.TOUCH_ENDED) {
                        self.switchToTab(index);
                    }
                });
            })(k);
        }

        // Show first tab by default
        this.switchToTab(0);

        // Setup action selectors for all tabs
        this.setupActionSelectors();
    },

    setupActionSelectors: function () {
        var actionNames = this.getActionNames();

        // Setup Tab1 (baseAction) - now at index 1 because Tab0 was unshifted
        if (this.tabContents[1]) {
            this.populateActionCheckboxes(this.tabContents[1], actionNames, 'baseAction');
        }

        // Setup Tab2 (blockAction) - now at index 2
        if (this.tabContents[2]) {
            this.populateActionCheckboxes(this.tabContents[2], actionNames, 'unblockAction');
        }

        // Setup Tab3 (customAction) - now at index 3
        if (this.customTab) {
            this.customTab.refreshUI();
        }

        // Setup Tab4 (visual) - now at index 4
        if (this.visualTab) {
            this.visualTab.refreshUI();
        }

        // Setup Tab0 (type) - now at index 0
        if (this.typeTab) {
            this.typeTab.refreshUI();
        }
    },

    getActionNames: function () {
        var actions = [];
        for (var key in CoreGame.ElementObject.Action) {
            if (CoreGame.ElementObject.Action.hasOwnProperty(key)) {
                actions.push({
                    name: key,
                    value: CoreGame.ElementObject.Action[key]
                });
            }
        }
        return actions;
    },

    getStrategyClasses: function () {
        return Object.keys(CoreGame.Strategies);
    },

    _createActionItem: function () {
        var loaded = ccs.load("tool/actionSelector.json");
        if (loaded && loaded.node) {
            return loaded.node;
        }
        return null;
    },

    populateActionCheckboxes: function (tabContent, actions, dataKey) {
        var self = this;
        var actionList = UIUtils.seekWidgetByName(tabContent, "ActionList");
        if (!actionList) return;

        actionList.removeAllItems();

        for (var i = 0; i < actions.length; i++) {
            var action = actions[i];
            var item = this._createActionItem();
            if (!item) continue;

            actionList.pushBackCustomItem(item);

            var label = item.getChildByName("Label");
            if (label) label.setString(action.name);

            var checkbox = item.getChildByName("checkbox");
            if (checkbox) {
                var isCheckedNode = checkbox.getChildByName("isChecked");
                if (isCheckedNode) {
                    var isChecked = self.blockData[dataKey] && self.blockData[dataKey].indexOf(action.name) !== -1;
                    isCheckedNode.setVisible(isChecked);
                }

                checkbox.actionValue = action.name;
                checkbox.dataKey = dataKey;
                checkbox.isCheckedNode = isCheckedNode;

                checkbox.addTouchEventListener(function (sender, type) {
                    if (type === ccui.Widget.TOUCH_ENDED) {
                        var isChecked = !sender.isCheckedNode.isVisible();
                        sender.isCheckedNode.setVisible(isChecked);
                        if (isChecked) {
                            self.onActionSelected(sender.dataKey, sender.actionValue);
                        } else {
                            self.onActionDeselected(sender.dataKey, sender.actionValue);
                        }
                    }
                });
            }
        }
    },

    onActionSelected: function (dataKey, actionValue) {
        if (this.blockData[dataKey].indexOf(actionValue) === -1) {
            this.blockData[dataKey].push(actionValue);
        }
        cc.log("Selected " + dataKey + ": " + JSON.stringify(this.blockData[dataKey]));
    },

    onActionDeselected: function (dataKey, actionValue) {
        var index = this.blockData[dataKey].indexOf(actionValue);
        if (index !== -1) {
            this.blockData[dataKey].splice(index, 1);
        }
        cc.log("Deselected " + dataKey + ": " + JSON.stringify(this.blockData[dataKey]));
    },
    getBlockData: function () {
        return this.blockData;
    },

    loadBlockData: function (blockID) {
        var self = this;
        var filePath = "res/newBlock/" + blockID + ".json";

        // Reset to default state before loading
        this.blockData = {
            baseAction: [],
            unblockAction: [],
            customAction: {},
            actions: [],
            visual: { path: "", type: 0 },
            type: CoreGame.Blocker.BlockerType.NORMAL_BLOCKER,
            width: 1,
            height: 1,
            layerBehavior: "CONTENT"
        };
        if (this.visualTab) this.visualTab.setData(this.blockData);
        if (this.typeTab) this.typeTab.setData(this.blockData);
        if (this.customTab) this.customTab.setData(this.blockData);

        cc.loader.loadJson(filePath, function (err, data) {
            if (err) {
                LogLayer.show("No existing data found at " + filePath + ", starting with empty configuration.");
                self.setupActionSelectors(); // Refresh UI to clear checkboxes
                return;
            }

            if (data) {
                var loadedType = data.type;
                if (typeof loadedType === "number") {
                    loadedType = loadedType === 1 ? CoreGame.Blocker.BlockerType.DYNAMIC_BLOCKER : CoreGame.Blocker.BlockerType.NORMAL_BLOCKER;
                }

                // Replace current blockData with loaded content
                self.blockData = {
                    baseAction: self._sanitizeActions(data.baseAction),
                    unblockAction: self._sanitizeActions(data.unblockAction),
                    customAction: data.customAction || {},
                    actions: data.actions || [],
                    visual: data.visual || { path: "", type: 0 },
                    type: loadedType || CoreGame.Blocker.BlockerType.NORMAL_BLOCKER,
                    width: data.width || 1,
                    height: data.height || 1,
                    layerBehavior: data.layerBehavior || "CONTENT",
                    configData: data.configData || {}
                };

                LogLayer.show("Loaded block data from " + filePath);
                if (self.visualTab) self.visualTab.setData(self.blockData);
                if (self.typeTab) self.typeTab.setData(self.blockData);
                if (self.customTab) self.customTab.setData(self.blockData);

                if (self.visualTab) self.visualTab.reset();

                self.setupActionSelectors(); // Refresh UI to match loaded data
                if (self.visualTab) self.visualTab.refreshUI();
                if (self.typeTab) self.typeTab.refreshUI();
            }
        });
    },

    _sanitizeActions: function (actions) {
        if (!actions) return [];
        var result = [];
        var ActionMap = CoreGame.ElementObject.Action;
        var ValueToKey = {};
        for (var key in ActionMap) {
            ValueToKey[ActionMap[key]] = key;
        }

        for (var i = 0; i < actions.length; i++) {
            var item = actions[i];
            if (typeof item === "number") {
                // Convert old numeric value to key string
                if (ValueToKey[item] !== undefined) {
                    result.push(ValueToKey[item]);
                }
            } else if (typeof item === "string") {
                result.push(item);
            }
        }
        return result;
    },

    switchToTab: function (tabIndex) {
        if (this.currentTabIndex === tabIndex) {
            if (tabIndex === 3 && this.customTab) {
                this.customTab.onTabClicked();
            }
            return;
        }

        this.currentTabIndex = tabIndex;

        // Hide all tab contents and reset all tab colors
        for (var i = 0; i < this.tabs.length; i++) {
            if (this.tabContents[i]) this.tabContents[i].setVisible(false);
            if (this.tabs[i]) this.tabs[i].setBackGroundColor(cc.color(38, 115, 64));
        }

        // Show selected tab content and highlight tab
        if (this.tabContents[tabIndex]) this.tabContents[tabIndex].setVisible(true);
        if (this.tabs[tabIndex]) this.tabs[tabIndex].setBackGroundColor(cc.color(51, 153, 77));
    },
});
