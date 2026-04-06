/**
 * BoardUI - Handle touch/mouse input for the game board
 * Part of Match-3 Core Game
 */
var CoreGame = CoreGame || {};
CoreGame.efkManager = null;

CoreGame.BoardUI = cc.Layer.extend({
    boardMgr: null,
    gemLayer: null,
    touchStartPos: null,
    selectedSlot: null,
    isTouching: false,
    swipeHandled: false,
    gridBorderMgr: null,

    ctor: function (mapConfig, testBoxes, noFill) {
        this._super();
        this.touchStartPos = null;
        this.selectedSlot = null;
        this.isTouching = false;
        this.swipeHandled = false;

        this.root = new cc.Node();
        this.addChild(this.root, 2);
        // let json = ccs.load(res.ZCSD_LAYER_MAIN_BOARD, res.ZCSD_ROOT);
        // this = json.node;
        // this.addChild(this);
        // this.width = this.width;
        // this.height = this.height;
        // ccui.helper.doLayout(this);
        // Initialize Managers
        this.boardMgr = new CoreGame.BoardMgr();
        this.gridBorderMgr = new CoreGame.GridBorderMgr(this, this.boardMgr);

        // Check if mapConfig is provided (from EditMapScene)
        this.boardMgr.init(this, mapConfig, testBoxes);

        this.rawScale = Math.min(1.5, (9 / this.boardMgr.activeCols));
        if (this.boardMgr.activeCols === 9) {
            this.rawScale = 1.05;
        }
        cc.log("BOARD UI RAW SCALE", this.rawScale, this.boardMgr.activeCols);
        this.setScale(this.rawScale);

        // if (mapConfig) {
        //     cc.log("Initializing board from mapConfig");
        //     this.boardMgr.init(this);
        //     this.boardMgr.initFromMapConfig(mapConfig);
        // } else {
        //     // Create test slotMap for custom board shape (diamond/cross pattern)
        //     // 1 = enabled slot, 0 = disabled slot
        //     // var slotMap = [
        //     //     [1, 1, 1, 1, 1, 1, 1],  // Row 0
        //     //     [1, 1, 1, 1, 1, 1, 1],  // Row 1
        //     //     [1, 1, 1, 1, 1, 1, 1],  // Row 2
        //     //     [1, 1, 1, 0, 1, 1, 1],  // Row 3
        //     //     [0, 1, 1, 1, 1, 1, 1],  // Row 4
        //     //     [1, 1, 1, 1, 1, 1, 1],  // Row 5
        //     //     [1, 1, 1, 1, 1, 1, 1],  // Row 6
        //     //     [0, 1, 1, 1, 1, 1, 1]   // Row 7
        //     // ];

        //     // Uncomment to use normal rectangular board
        //     slotMap = null;

        //     this.boardMgr.init(this, testBoxes, slotMap, noFill);
        // }

        this.efkManager = CoreGame.efkManager;

        this.initTouchListener();
        this.scheduleUpdate();

        // Debug: show row,col labels on each cell
        // this.renderDebugLabels();

        return true;
    },

    /**
     * Render debug labels (row, col) on each grid cell
     */
    renderDebugLabels: function () {
        if (!this.boardMgr) return;
        var rows = this.boardMgr.rows;
        var cols = this.boardMgr.cols;

        for (var r = 0; r < rows; r++) {
            for (var c = 0; c < cols; c++) {
                var slot = this.boardMgr.getSlot(r, c);
                if (!slot) continue;

                var pixelPos = this.boardMgr.gridToPixel(r, c);
                var label = new cc.LabelTTF(r + "," + c, "Arial", 14);
                label.setColor(cc.color(255, 255, 0));  // Yellow
                label.enableStroke(cc.color(0, 0, 0), 2); // Black outline for readability
                label.setPosition(pixelPos);
                // label.setVisible(false);
                this.root.addChild(label, 9999);  // High zOrder to always be on top
            }
        }
    },

    /**
     * Update loop - calls boardMgr update
     */
    update: function (dt) {
        if (this.boardMgr) {
            this.boardMgr.update(dt);
        }
        if (this.efkManager) {
            this.efkManager.update();
        }
    },

    shakeScreen: function (delta) {
        this.stopAllActions();
        var originalPos = this.getPosition();
        var timeMove = 0.03;
        var times = 2;
        var action = cc.sequence(
            cc.moveBy(timeMove, cc.p(delta, delta)),
            cc.moveBy(timeMove, cc.p(-delta * 2, -delta * 2)),
            cc.moveBy(timeMove, cc.p(delta, delta)),
            cc.moveBy(timeMove, cc.p(-delta, delta)),
            cc.moveBy(timeMove, cc.p(delta * 2, -delta * 2)),
            cc.moveBy(timeMove, cc.p(-delta, delta)),
            cc.moveTo(timeMove, originalPos)
        ).repeat(times);
        this.runAction(action);
    },

    /**
     * Set the board manager reference
     */
    setBoardMgr: function (boardMgr) {
        this.boardMgr = boardMgr;
    },

    /**
     * Add element avatar to the UI
     */
    addElementAvatar: function (element) {
        if (!element) return;

        // Create ui using element's method
        element.createUI(this.root);

        // If it's a connected element, refresh borders
        if (element.isConnectedUI) {
            this.refreshBorders();
        }
    },

    /**
     * Refresh all grid-based border/overlay UIs
     */
    refreshBorders: function () {
        // return;
        if (!this.gridBorderMgr) return;

        // Cloud
        this.gridBorderMgr.render(CoreGame.Config.ElementType.CLOUD, "cloud_piece_", BoardConst.CloudPieceInfo);

        // Grass (example of how easy it is to add now)
        if (BoardConst.GrassPieceInfo) {
            this.gridBorderMgr.render(CoreGame.Config.ElementType.GRASS, "grass_piece_", BoardConst.GrassPieceInfo);
        }
    },

    /**
     * Helper to add children to the root node (used by managers)
     */
    addChildToRoot: function (child, zOrder) {
        if (this) {
            this.addChild(child, zOrder);
        }
    },

    /**
     * Update render board border - rounded
     */
    renderBoardBorder: function () {
        //Render mapBorder
        let resPath = "game/board/nen/" + (BoardConst.BG_COLOR === 'light' ? 'light_' : 'dark_');
        this.listBorder = [];
        cc.log("Render mapBorder Start");
        for (let row = 0; row <= this.boardMgr.rows; row++) {
            for (let col = 0; col <= this.boardMgr.cols; col++) {
                let tmp = "";// trai-> phai -> tren -> duoi
                tmp += !this.boardMgr.getSlot(row - 1, col - 1) ? "0" : "1";
                tmp += !this.boardMgr.getSlot(row - 1, col) ? "0" : "1";
                tmp += !this.boardMgr.getSlot(row, col - 1) ? "0" : "1";
                tmp += !this.boardMgr.getSlot(row, col) ? "0" : "1";

                let info = BoardConst.BorderInfoUI[tmp];
                if (info) {
                    // cc.log("Render mapBorder", row, col, tmp, this.boardMgr.getSlot(row, col), JSON.stringify(info));
                    tmp = this.boardMgr.gridToPixel(row, col);
                    for (let i = 1; i < info.length; i++) {
                        let spr = fr.createSprite(resPath + info[0] + ".png");
                        spr.info = info[0];
                        spr.setRotation(info[i]);
                        spr.setPosition(tmp.x - CoreGame.Config.CELL_SIZE / 2, tmp.y - CoreGame.Config.CELL_SIZE / 2);
                        this.addChild(spr, BoardConst.zOrder.SHAPE);
                        this.listBorder.push(spr);
                    }
                }
            }
        }
    },

    /**
     * Initialize touch event listener
     */
    initTouchListener: function () {
        this.touchLayer = new cc.Node();

        cc.eventManager.addListener({
            event: cc.EventListener.TOUCH_ONE_BY_ONE,
            swallowTouches: true,

            onTouchBegan: function (touch, event) {
                return this.onTouchBegan(touch.getLocation());
            }.bind(this),

            onTouchMoved: function (touch, event) {
                this.onTouchMoved(touch.getLocation());
            }.bind(this),

            onTouchEnded: function (touch, event) {
                this.onTouchEnd(touch.getLocation());
            }.bind(this)
        }, this.touchLayer);
        this.addChild(this.touchLayer);
    },

    /**
     * Called when touch begins
     */
    onTouchBegan: function (pos) {
        if (!this.boardMgr || !this.boardMgr.canInteract()) {
            return false;
        }

        this.touchStartPos = pos;
        this.isTouching = true;
        this.swipeHandled = false;

        // Convert world-space touch to board-local coordinates
        var localPos = this.convertToNodeSpace(pos);
        var gridPos = this.boardMgr.pixelToGrid(localPos.x, localPos.y);

        // Notify board manager
        this.boardMgr.onTouchBegan(gridPos);

        return true;
    },

    /**
     * Called when touch moves
     */
    /**
     * Called when touch moves
     */
    onTouchMoved: function (pos) {
        if (!this.isTouching || this.swipeHandled) return;

        var dx = pos.x - this.touchStartPos.x;
        var dy = pos.y - this.touchStartPos.y;
        var threshold = CoreGame.Config.CELL_SIZE * 0.3;

        if (Math.abs(dx) > threshold || Math.abs(dy) > threshold) {
            var direction = this.getSwipeDirection(dx, dy);
            this.boardMgr.onInputDirection(direction);
            this.swipeHandled = true;
        }
    },

    /**
     * Called when touch ends
     */
    /**
     * Called when touch ends
     */
    onTouchEnd: function (pos) {
        if (this.isTouching) {
            if (!this.swipeHandled) {
                // No swipe detected during move — check final position
                var dx = pos.x - this.touchStartPos.x;
                var dy = pos.y - this.touchStartPos.y;
                var threshold = CoreGame.Config.CELL_SIZE * 0.3;

                if (Math.abs(dx) > threshold || Math.abs(dy) > threshold) {
                    var direction = this.getSwipeDirection(dx, dy);
                    this.boardMgr.onInputDirection(direction);
                } else {
                    this.boardMgr.onSelectLastGrid();
                }
            }
        }

        this.isTouching = false;
        this.swipeHandled = false;
    },

    /**
     * Get swipe direction from delta
     */
    getSwipeDirection: function (dx, dy) {
        if (Math.abs(dx) > Math.abs(dy)) {
            return dx > 0 ? CoreGame.Direction.RIGHT : CoreGame.Direction.LEFT;
        } else {
            return dy > 0 ? CoreGame.Direction.UP : CoreGame.Direction.DOWN;
        }
    },

    onExit: function () {
        this._super();
        cc.log("Run here ======== ");
        CoreGame.BoardUI.instance = null;
    }
});

CoreGame.BoardUI.instance = null;

CoreGame.BoardUI.getInstance = function (data) {
    if (CoreGame.BoardUI.instance == null) {
        CoreGame.BoardUI.instance = new CoreGame.BoardUI(data);
        cc.log("Count init " + CoreGame.BoardUI.count);
        CoreGame.BoardUI.count++;
    }
    return CoreGame.BoardUI.instance;
}
CoreGame.BoardUI.count = 0;