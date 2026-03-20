/**
 * LevelSelectorUI - Popup UI for selecting map levels to load
 * Displays list of available maps from res/maps/ directory
 */
var LevelSelectorUI = cc.LayerColor.extend({
    scrollView: null,
    container: null,
    levelList: [],          // Array of {name: string, filename: string}
    filterText: "",         // Current filter string
    onSelectCallback: null,

    // Layout config
    POPUP_WIDTH: 400,
    POPUP_HEIGHT: 500,
    ITEM_HEIGHT: 60,
    ITEM_PADDING: 10,

    /**
     * Constructor
     * @param {Function} onSelectCallback - Callback when level is selected (levelName)
     */
    ctor: function (onSelectCallback) {
        this._super(cc.color(0, 0, 0, 180)); // Semi-transparent black background

        this.onSelectCallback = onSelectCallback;
        this.setContentSize(cc.winSize);

        // Create popup container
        this.initPopupContainer();

        // Load available levels
        this.loadLevels();

        // Add touch handler to close when clicking background
        var self = this;
        var touchListener = cc.EventListener.create({
            event: cc.EventListener.TOUCH_ONE_BY_ONE,
            swallowTouches: true,
            onTouchBegan: function (touch, event) {
                if (!self.isVisible())
                    return false;
                cc.log("on touch began");
                var target = event.getCurrentTarget();
                var locationInNode = target.convertToNodeSpace(touch.getLocation());
                var size = target.getContentSize();
                var rect = cc.rect(0, 0, size.width, size.height);

                if (cc.rectContainsPoint(rect, locationInNode)) {
                    // Check if click is outside popup
                    var popupRect = self.popupBg.getBoundingBox();
                    if (!cc.rectContainsPoint(popupRect, touch.getLocation())) {
                        self.hide();
                    }
                    return true;
                }
                return false;
            }
        });
        cc.eventManager.addListener(touchListener, this);
    },

    /**
     * Initialize popup container with background and title
     */
    initPopupContainer: function () {
        var self = this;

        // Create popup background
        this.popupBg = new ccui.Layout();
        this.popupBg.setBackGroundColorType(ccui.Layout.BG_COLOR_SOLID);
        this.popupBg.setBackGroundColor(cc.color(40, 40, 50));
        this.popupBg.setContentSize(this.POPUP_WIDTH, this.POPUP_HEIGHT);
        this.popupBg.setPosition(cc.winSize.width / 2 - this.POPUP_WIDTH / 2,
            cc.winSize.height / 2 - this.POPUP_HEIGHT / 2);
        this.addChild(this.popupBg);

        // Add title
        var title = new cc.LabelTTF("Select Level", "Arial", 24);
        title.setPosition(this.POPUP_WIDTH / 2, this.POPUP_HEIGHT - 40);
        title.setColor(cc.color(255, 255, 255));
        this.popupBg.addChild(title);

        // Add close button
        var closeBtn = new ccui.Button();
        closeBtn.loadTextureNormal("res/tool/res/bgCell.png");
        closeBtn.setScale9Enabled(true);
        closeBtn.setContentSize(80, 40);
        closeBtn.setTitleText("Close");
        closeBtn.setTitleFontSize(18);
        closeBtn.setPosition(this.POPUP_WIDTH / 2, 30);
        closeBtn.addTouchEventListener(function (sender, type) {
            if (type === ccui.Widget.TOUCH_ENDED) {
                self.hide();
            }
        });
        this.popupBg.addChild(closeBtn);

        // Add filter text field
        var filterBg = new ccui.Layout();
        filterBg.setBackGroundColorType(ccui.Layout.BG_COLOR_SOLID);
        filterBg.setBackGroundColor(cc.color(20, 20, 30));
        filterBg.setContentSize(this.POPUP_WIDTH - 40, 36);
        filterBg.setPosition(20, this.POPUP_HEIGHT - 100);
        this.popupBg.addChild(filterBg);

        this.filterField = new ccui.TextField();
        this.filterField.setPlaceHolder("Filter levels...");
        this.filterField.setFontSize(18);
        this.filterField.setContentSize(this.POPUP_WIDTH - 40, 36);
        this.filterField.setPosition(0, 5);
        this.filterField.setAnchorPoint(cc.p(0, 0));
        this.filterField.setMaxLength(50);
        this.filterField.setMaxLengthEnabled(true);
        var self2 = this;
        this.filterField.addEventListener(function (sender, eventType) {
            self2.filterText = sender.getString();
            self2.applyFilter();
        });
        filterBg.addChild(this.filterField);

        // Create scroll view for levels
        this.scrollView = new ccui.ScrollView();
        this.scrollView.setDirection(ccui.ScrollView.DIR_VERTICAL);
        this.scrollView.setContentSize(this.POPUP_WIDTH - 40, this.POPUP_HEIGHT - 160);
        this.scrollView.setPosition(20, 60);
        this.scrollView.setBounceEnabled(true);
        this.popupBg.addChild(this.scrollView);

        // Create inner container
        this.container = new ccui.Layout();
        this.container.setContentSize(this.POPUP_WIDTH - 40, 100); // Will be updated
        this.scrollView.addChild(this.container);
    },

    /**
     * Load available levels from ListMap.json manifest
     */
    loadLevels: function () {
        var self = this;
        var listPath = "res/maps/ListMap.json";

        cc.loader.loadJson(listPath, function (err, mapList) {
            if (err || !mapList) {
                cc.log("Error loading ListMap.json or no maps found:", err);
                self.populateList();
                return;
            }

            // Clear existing list
            self.levelList = [];
            // Add each level from the manifest
            for (var i = 0; i < mapList.length; i++) {
                self.levelList.push({
                    name: mapList[i],
                    filename: mapList[i]
                });
            }
            cc.log("mapList: ", JSON.stringify(mapList));
            cc.log("Loaded " + self.levelList.length + " levels from ListMap.json");

            // Populate the list
            self.populateList();
        });
    },

    /**
     * Filter levelList by filterText and repopulate
     */
    applyFilter: function () {
        var keyword = this.filterText.toLowerCase().trim();
        if (keyword === "") {
            this.filteredList = this.levelList.slice();
        } else {
            this.filteredList = [];
            for (var i = 0; i < this.levelList.length; i++) {
                if (this.levelList[i].name.toLowerCase().indexOf(keyword) !== -1) {
                    this.filteredList.push(this.levelList[i]);
                }
            }
        }
        this.populateList();
    },

    /**
     * Populate scroll view with level buttons
     */
    populateList: function () {
        this.container.removeAllChildren();

        var list = this.filteredList || this.levelList;

        if (list.length === 0) {
            var noLevelsLabel = new cc.LabelTTF(
                this.filterText ? "No results for \"" + this.filterText + "\"" : "No maps found in res/maps/",
                "Arial", 18
            );
            noLevelsLabel.setPosition(this.container.getContentSize().width / 2, 100);
            noLevelsLabel.setColor(cc.color(200, 200, 200));
            this.container.addChild(noLevelsLabel);
            return;
        }

        // Sort levels alphabetically
        // list.sort(function (a, b) {
        //     return a.name.localeCompare(b.name);
        // });

        var containerHeight = list.length * (this.ITEM_HEIGHT + this.ITEM_PADDING) + this.ITEM_PADDING;
        this.container.setContentSize(this.scrollView.getContentSize().width, containerHeight);
        this.scrollView.setInnerContainerSize(cc.size(this.scrollView.getContentSize().width, containerHeight));

        // Create button for each level
        for (var i = 0; i < list.length; i++) {
            var level = list[i];
            var btn = this.createLevelButton(level, i);
            this.container.addChild(btn);
        }
    },

    /**
     * Create a single level button
     */
    createLevelButton: function (level, index) {
        var self = this;

        var btn = new ccui.Button();
        btn.loadTextureNormal("res/tool/res/bgCell.png");
        btn.setScale9Enabled(true);
        btn.setContentSize(this.container.getContentSize().width - 20, this.ITEM_HEIGHT);

        // Position from top
        var x = this.container.getContentSize().width / 2;
        var y = this.container.getContentSize().height - (index * (this.ITEM_HEIGHT + this.ITEM_PADDING) + this.ITEM_PADDING + this.ITEM_HEIGHT / 2);
        btn.setPosition(x, y);

        // Set label
        btn.setTitleText(level.name);
        btn.setTitleFontSize(20);
        btn.setColor(cc.color(100, 200, 255));

        // Store level data
        btn.levelName = level.filename;

        // Add click handler
        btn.addTouchEventListener(function (sender, type) {
            if (type === ccui.Widget.TOUCH_ENDED) {
                self.selectLevel(sender.levelName);
            }
        });

        return btn;
    },

    /**
     * Handle level selection
     */
    selectLevel: function (levelName) {
        cc.log("Selected level:", levelName);

        // Trigger callback
        if (this.onSelectCallback) {
            this.onSelectCallback(levelName);
        }

        // Hide popup
        this.hide();
    },

    /**
     * Show the selector
     */
    show: function () {
        this.setVisible(true);

        // Reset filter
        this.filterText = "";
        this.filteredList = null;
        if (this.filterField) {
            this.filterField.setString("");
        }

        // Reload levels in case new ones were added
        this.levelList = [];
        this.loadLevels();
    },

    /**
     * Hide the selector
     */
    hide: function () {
        this.setVisible(false);
    }
});
