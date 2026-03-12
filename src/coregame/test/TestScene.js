/**
 * TestScene - Scene for running CoreGame tests
 * Part of Match-3 Core Game
 */
var CoreGame = CoreGame || {};

CoreGame.TestScene = cc.Scene.extend({
    boardUI: null,
    testFlow: null,

    ctor: function () {
        this._super();

        // Center board on screen
        var winSize = cc.director.getWinSize();
        var boardWidth = CoreGame.Config.BOARD_COLS * CoreGame.Config.CELL_SIZE;
        var boardHeight = CoreGame.Config.BOARD_ROWS * CoreGame.Config.CELL_SIZE;

        CoreGame.Config.BOARD_OFFSET_X = (winSize.width - boardWidth) / 2;
        CoreGame.Config.BOARD_OFFSET_Y = (winSize.height - boardHeight) / 2;

        // Create UI
        this.boardUI = CoreGame.BoardUI.getInstance();
        // this.boardUI = new BlockCreatorUI();
        // this.boardUI = EditMapScene.getInstance();
        this.boardUI = EditMapSceneNew.getInstance();

        // this.boardUI = new CoreGame.GameUI();

        this.addChild(this.boardUI);

        // Test BlockerFactory with type 545
        // this.testBlockerFactory();

        return true;
    },

    /**
     * Test BlockerFactory.createBlocker with type 545
     */
    testBlockerFactory: function () {
        cc.log("=== Testing BlockerFactory.createBlocker(545) ===");

        var self = this;
        CoreGame.BlockerFactory.createBlocker(545, 3, 3, function (err, blocker) {
            if (err) {
                cc.log("ERROR: Failed to create blocker:", err);
                return;
            }

            cc.log("SUCCESS: Blocker created!");
            cc.log("  Type:", blocker.type);
            cc.log("  Position:", blocker.position);
            cc.log("  HitPoints:", blocker.hitPoints);
            cc.log("  Size:", blocker.size);
            cc.log("  LayerBehavior:", blocker.layerBehavior);
            cc.log("  haveBaseAction:", blocker.haveBaseAction);
            cc.log("  blockBaseAction:", blocker.blockBaseAction);
            cc.log("  configData:", blocker.configData);

            // Check actions
            var matchActions = blocker.getActions(CoreGame.ElementObject.ACTION_TYPE.MATCH);
            cc.log("  Match Actions count:", matchActions.length);
            if (matchActions.length > 0) {
                cc.log("    Action[0] type:", matchActions[0].constructor.name);
                cc.log("    Action[0] configData:", matchActions[0].configData);
            }

            // Add to board for visual testing
            if (self.boardUI && self.boardUI.boardMgr) {
                //  self.boardUI.boardMgr.addElement(blocker);
                cc.log("  Added blocker to board at (3,3)");
            }

            cc.log("=== BlockerFactory Test Complete ===");
        });
    },

    onEnter: function () {
        this._super();
    },

    runTestFlow: function () {
        cc.log("=== STARTING TEST FLOW ===");
        if (!this.boardUI || !this.boardUI.boardMgr) {
            cc.log("ERROR: BoardMgr not initialized!");
            return;
        }

        // Initialize Test Logic
        this.testFlow = new CoreGame.TestLogic(this.boardUI.boardMgr);
    }
});

/**
 * TestLogic - Encapsulates the test steps
 */
CoreGame.TestLogic = cc.Class.extend({
    boardMgr: null,
    isFinished: false,

    ctor: function (boardMgr) {
        this.boardMgr = boardMgr;

        CoreGame.EventMgr.on('turnFinished', this.onTurnFinished, this);
        CoreGame.EventMgr.on('powerUpCreated', this.onPowerUpCreated, this);

        this.runStep0();
    },

    runStep0: function () {
        cc.log("Step 0: Setup Board for Match-4");
        // Clear board
        for (var r = 0; r < this.boardMgr.rows; r++) {
            for (var c = 0; c < this.boardMgr.cols; c++) {
                this.boardMgr.mapGrid[r][c].clearElements();
            }
        }

        // Setup Pattern:
        // R R B R
        //     R (below B)
        this.createGem(2, 0, 1); // Red
        this.createGem(2, 1, 1); // Red
        this.createGem(2, 2, 2); // Blue (blocker)
        this.createGem(2, 3, 1); // Red
        this.createGem(3, 2, 1); // Red (swap source)

        this.fillRestWithNoMatch();
        this.boardMgr.state = CoreGame.BoardState.IDLE;

        var self = this;
        setTimeout(function () { self.runStep1(); }, 1000);
    },

    runStep1: function () {
        cc.log("Step 1: Performing Swap (2,2) <-> (3,2)");
        this.boardMgr.swapMgr.selectGem(2, 2);
        this.boardMgr.swapMgr.selectGem(3, 2);
    },

    // Helpers
    createGem: function (row, col, type) {
        return this.boardMgr.addNewElement(row, col, type);
    },

    fillRestWithNoMatch: function () {
        var type = 3;
        for (var r = 0; r < this.boardMgr.rows; r++) {
            for (var c = 0; c < this.boardMgr.cols; c++) {
                if (this.boardMgr.getSlot(r, c).isEmpty()) {
                    this.createGem(r, c, type++);
                    if (type > 5) type = 3;
                }
            }
        }
    },

    onPowerUpCreated: function (data) {
        cc.log("Step 2: PowerUp Created!");
        cc.log(" - Type: " + data.type + " (Expect " + CoreGame.PowerUPType.ROCKET_H + ")");
        cc.log(" - Pos: " + data.row + "," + data.col);

        if (data.type === CoreGame.PowerUPType.ROCKET_H) {
            cc.log(" [PASS] PowerUp Type Correct");
        } else {
            cc.log(" [FAIL] PowerUp Type Incorrect");
        }
    },

    onTurnFinished: function () {
        cc.log("Step 3: Turn Finished!");
        if (this.isFinished) return;
        this.isFinished = true;

        // Verify result
        var r = 2, c = 2; // Expected location (targetPos)
        // Or check surrounding area since we had a match group
        var found = false;

        for (var row = 0; row < this.boardMgr.rows; row++) {
            for (var col = 0; col < this.boardMgr.cols; col++) {
                var el = this.boardMgr.getSlot(row, col).getFirstInteractable();
                if (el && el instanceof CoreGame.PowerUP) {
                    cc.log(" [PASS] PowerUp found at " + row + "," + col);
                    found = true;
                }
            }
        }

        if (!found) cc.log(" [FAIL] PowerUp NOT found on board");
        else cc.log("=== TEST COMPLETED ===");
    }
});
