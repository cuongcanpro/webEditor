/**
 * GameUI - Main game interface wrapper
 * Contains BoardUI with additional game UI elements:
 * - Back button to return to BlockCreatorUI
 * - Collection objectives panel
 */
var CoreGame = CoreGame || {};

CoreGame.GameUI = cc.Layer.extend({
    boardUI: null,
    objectivesPanel: null,
    objectives: null,  // Array of {type, name, target, current}

    /**
     * Constructor
     * @param {Object} levelConfig - Level configuration
     *   - mapConfig: Board map data
     *   - objectives: Array of collection objectives [{type, name, target}]
     */
    ctor: function (levelConfig, isTest = true) {
        this._super();

        levelConfig = levelConfig || {};

        // Initialize objectives current count
        this.objectives = levelConfig.objectives || [];
        for (var i = 0; i < this.objectives.length; i++) {
            this.objectives[i].current = 0;
        }

        this.initUI(levelConfig, isTest);

        return true;
    },

    /**
     * Initialize UI components
     */
    initUI: function (levelConfig, isTest = true) {
        cc.log("GAME UI initUI", JSON.stringify(levelConfig), isTest);
        this.levelConfig = levelConfig;

        var self = this;

        // Remove BoardUI's built-in back button (we'll add our own)
        // The back button is at z-order 999 in BoardUI

        // Center board on screen
        var winSize = cc.director.getWinSize();
        var boardWidth = CoreGame.Config.BOARD_COLS * CoreGame.Config.CELL_SIZE;
        var boardHeight = CoreGame.Config.BOARD_ROWS * CoreGame.Config.CELL_SIZE;

        CoreGame.Config.BOARD_OFFSET_X = (winSize.width - boardWidth) / 2;
        CoreGame.Config.BOARD_OFFSET_Y = (winSize.height - boardHeight) / 2;


        // Create BoardBg
        this.gameBoardBg = new CoreGame.GameBoardBg();
        this.addChild(this.gameBoardBg);

        // Create BoardUI instance
        this.boardUI = CoreGame.BoardUI.getInstance(levelConfig.mapConfig);
        this.addChild(this.boardUI);

        cc.log("GAME UI SIZES", JSON.stringify(this.getContentSize()));
        cc.log("GAME BOARD", JSON.stringify(this.boardUI.getPosition()));
        cc.log("GAME BOARD SIZES", JSON.stringify(this.boardUI.getContentSize()));

        // Create Back button
        if (isTest) {
            this.createBackButton();
        }

        // Create Objectives panel
        if (this.objectives.length > 0) {
            this.createObjectivesPanel();
        }

        // Create BoardInfo UI
        this.gameBoardInfoUI = new CoreGame.GameBoardInfoUI();
        this.addChild(this.gameBoardInfoUI);
        this.gameBoardInfoUI.initData(levelConfig);

        // Create BoardTool UI
        if (cc.sys.isNative) {
            this.gameBoardToolUI = new CoreGame.GameBoardToolUI(this);
            this.addChild(this.gameBoardToolUI);
        }

        this.gameBoardInfoUI.initData(levelConfig);

        // Create EffectLayer
        this.gameBoardEffectLayer = new CoreGame.GameBoardEffectLayer(this);
        this.addChild(this.gameBoardEffectLayer);

        this.boardUI.boardMgr.gameUI = this;
        this.boardUI.boardMgr.setMove(levelConfig.mapConfig ? (levelConfig.mapConfig.numMove || 0) : 0);

        // Apply spawn strategy from map config if specified
        var stratKey = levelConfig.mapConfig && levelConfig.mapConfig.spawnStrategy;
        if (stratKey && CoreGame.DropStrategy[stratKey] && this.boardUI.boardMgr.dropMgr) {
            this.boardUI.boardMgr.dropMgr.setSpawnStrategy(new CoreGame.DropStrategy[stratKey]());
        }
    },

    /**
     * Create Back button
     */
    createBackButton: function () {
        var backBtn = new ccui.Button("res/tool/res/btn_green_2.png", "res/tool/res/btn_green_2.png");
        backBtn.setTitleText("Back");
        backBtn.setTitleFontSize(24);
        backBtn.setTitleColor(cc.color(255, 255, 255));
        backBtn.setScale9Enabled(true);
        backBtn.setContentSize(100, 40);
        backBtn.setPosition(80, cc.winSize.height - 50);
        backBtn.addTouchEventListener(function (sender, type) {
            if (type === ccui.Widget.TOUCH_ENDED) {
                // var toolScene = new cc.Scene();
                // toolScene.addChild(new BlockCreatorUI());
                SceneLoading.openWithBuffer(CoreGame.TestScene);
            }
        });
        this.addChild(backBtn, 1000);
        var difficultyBtn = new ccui.Button("res/tool/res/btn_green_2.png", "res/tool/res/btn_green_2.png");
        difficultyBtn.setTitleText("Difficulty");
        difficultyBtn.setTitleFontSize(20);
        difficultyBtn.setTitleColor(cc.color(255, 255, 255));
        difficultyBtn.setScale9Enabled(true);
        difficultyBtn.setContentSize(120, 50);
        difficultyBtn.setPosition(cc.winSize.width - 100, cc.winSize.height - 200);
        difficultyBtn.addTouchEventListener(function (sender, type) {
            if (type === ccui.Widget.TOUCH_ENDED) {
                var dialog = new DifficultyDialog(function (diffName) {
                    cc.log("Selected difficulty: " + diffName);
                    // Run a callback method with param being difficulty name
                    if (this.onDifficultySelected) {
                        this.onDifficultySelected(diffName);
                    }
                }.bind(this));
                this.addChild(dialog, 10000);
                dialog.show();
            }
        }, this);
        this.addChild(difficultyBtn, 999);
    },

    /**
     * Create objectives panel
     */
    createObjectivesPanel: function () {
        var self = this;

        // Create panel background
        var panelWidth = 200;
        var itemHeight = 50;
        var padding = 10;
        var panelHeight = Math.min((this.objectives.length * itemHeight) + (padding * 2) + 30, 400);

        this.objectivesPanel = new ccui.Layout();
        this.objectivesPanel.setBackGroundColorType(ccui.Layout.BG_COLOR_SOLID);
        this.objectivesPanel.setBackGroundColor(cc.color(40, 40, 50, 220));
        this.objectivesPanel.setContentSize(panelWidth, panelHeight);
        this.objectivesPanel.setPosition(cc.winSize.width - panelWidth - 10, cc.winSize.height - panelHeight - 10);
        this.objectivesPanel.setVisible(false);
        this.addChild(this.objectivesPanel, 1000);

        // Add title
        var title = new cc.LabelTTF("Objectives", "Arial", 20);
        title.setPosition(panelWidth / 2, panelHeight - 20);
        title.setColor(cc.color(255, 255, 255));
        this.objectivesPanel.addChild(title);

        // Create scrollable content if needed
        var contentHeight = this.objectives.length * itemHeight;
        var scrollView = new ccui.ScrollView();
        scrollView.setDirection(ccui.ScrollView.DIR_VERTICAL);
        scrollView.setContentSize(panelWidth - 10, panelHeight - 40);
        scrollView.setInnerContainerSize(cc.size(panelWidth - 10, Math.max(contentHeight, panelHeight - 40)));
        scrollView.setPosition(5, 5);
        scrollView.setBounceEnabled(true);
        this.objectivesPanel.addChild(scrollView);

        // Add objective items
        this.objectiveLabels = [];
        for (var i = 0; i < this.objectives.length; i++) {
            var objective = this.objectives[i];
            var yPos = contentHeight - (i * itemHeight) - 25;

            // Create item container
            var itemBg = new ccui.Layout();
            itemBg.setBackGroundColorType(ccui.Layout.BG_COLOR_SOLID);
            itemBg.setBackGroundColor(cc.color(60, 60, 70));
            itemBg.setContentSize(panelWidth - 20, itemHeight - 5);
            itemBg.setPosition(5, yPos - 20);
            scrollView.getInnerContainer().addChild(itemBg);

            // Element name
            var nameLabel = new cc.LabelTTF(objective.name || "Item " + i, "Arial", 16);
            nameLabel.setPosition(10, itemHeight - 15);
            nameLabel.setAnchorPoint(0, 0.5);
            nameLabel.setColor(cc.color(255, 255, 255));
            itemBg.addChild(nameLabel);

            // Count label
            var countLabel = new cc.LabelTTF("0 / " + objective.target, "Arial", 18);
            countLabel.setPosition(panelWidth - 30, itemHeight - 30);
            countLabel.setAnchorPoint(1, 0.5);
            countLabel.setColor(cc.color(255, 200, 100));
            itemBg.addChild(countLabel);

            // Store reference for updates
            this.objectiveLabels.push(countLabel);
        }
    },

    /**
     * Update objective progress
     * @param {number} type - Element type
     * @param {number} count - Amount to add (default 1)
     */
    updateObjective: function (type, count) {
        count = count || 1;

        for (var i = 0; i < this.objectives.length; i++) {
            var objective = this.objectives[i];
            if (objective.type === type) {
                objective.current = Math.min(objective.current + count, objective.target);

                // Update label
                if (this.objectiveLabels && this.objectiveLabels[i]) {
                    var label = this.objectiveLabels[i];
                    label.setString(objective.current + " / " + objective.target);

                    // Change color if completed
                    if (objective.current >= objective.target) {
                        label.setColor(cc.color(100, 255, 100));
                    }
                }

                // Check if all objectives completed
                this.checkVictory();
                break;
            }
        }
    },

    /**
     * Check if all objectives are completed
     */
    checkVictory: function () {
        var allCompleted = true;
        for (var i = 0; i < this.objectives.length; i++) {
            if (this.objectives[i].current < this.objectives[i].target) {
                allCompleted = false;
                break;
            }
        }

        if (allCompleted) {
            this.onVictory();
        }
    },

    /**
     * Called when all objectives are completed
     */
    onVictory: function () {
        cc.log("Victory! All objectives completed!");
        LogLayer.show("Level Complete! All objectives achieved!");
    },

    /**
     * Clean up
     */
    onExit: function () {
        this._super();
    },

    /**
     * Called by BoardMgr when move count changes
     */
    onMoveUpdate: function (move) {
        if (this.gameBoardInfoUI) {
            this.gameBoardInfoUI.setMove(move);
        }
    },

    /**
     * Check the type and decrease
     */
    onUpdateTargetElement: function (element) {
        cc.log("removedElement", element.type);
        let node = this.gameBoardInfoUI.getNodeTarget(element.type);
        if (node) {
            cc.log("removedElement collectElement", element.type);
            node.collectElement(-1);
        }
    },

    /**
     * Check the type and decrease
     */
    onEndGame: function (isWin = true) {
        if (isWin) {
            this.gameBoardEffectLayer.showLevelCompleteLabel();

            let guiEndGame = new CoreGame.GameBoardEndGame(this);
            this.addChild(guiEndGame, MainScene.ZORDER.END_GAME, MainScene.TagLayer.END_GAME);
            guiEndGame.setPosition(cc.winSize.width / 2, cc.winSize.height / 2);
            guiEndGame.setVisible(false);
            guiEndGame.showResult(BoardResult.WIN, this.levelConfig, 1.5);
        } else {

        }
    },
    onDifficultySelected: function (diffName) {
        cc.log("GameUI: Applying strategy: " + diffName);
        if (CoreGame.DropStrategy[diffName]) {
            var strategy = new CoreGame.DropStrategy[diffName]();
            if (this.boardUI && this.boardUI.boardMgr && this.boardUI.boardMgr.dropMgr) {
                this.boardUI.boardMgr.dropMgr.setSpawnStrategy(strategy);
                LogLayer.show("Strategy changed to: " + diffName);
            }
        }
    }
});
