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
    boughtMoveTurn: 0,
    isBossRun: false,
    levelId: 0,

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

        // Create BoardTool UI
        if (cc.sys.isNative) {
            this.gameBoardToolUI = new CoreGame.GameBoardToolUI(this);
            this.addChild(this.gameBoardToolUI);
        }


        // Create BoardInfo UI
        this.gameBoardInfoUI = new CoreGame.GameBoardInfoUI(this);
        this.addChild(this.gameBoardInfoUI);
        this.gameBoardInfoUI.initData(levelConfig);

        // Create EffectLayer
        this.gameBoardEffectLayer = new CoreGame.GameBoardEffectLayer(this);
        this.addChild(this.gameBoardEffectLayer);

        this.boardUI.boardMgr.gameUI = this;
        this.levelId = this.boardUI.boardMgr.getLevelId();

        this.boardUI.setVisible(false);
        this.gameBoardInfoUI.setVisible(false);
        if (this.gameBoardToolUI) {
            this.gameBoardToolUI.setVisible(false);
        }
        this.gameBoardEffectLayer.setVisible(false);
        this.boardUI.boardMgr.setMove(levelConfig.mapConfig ? (levelConfig.mapConfig.numMove || 0) : 0);

        // Apply spawn strategy from map config if specified
        var stratKey = levelConfig.mapConfig && levelConfig.mapConfig.spawnStrategy;
        if (stratKey && CoreGame.DropStrategy[stratKey] && this.boardUI.boardMgr.dropMgr) {
            this.boardUI.boardMgr.dropMgr.setSpawnStrategy(new CoreGame.DropStrategy[stratKey]());
        }

        // Init AdaptiveTPP dynamic difficulty
        if (CoreGame.AdaptiveTPP) {
            var mapCfg    = levelConfig.mapConfig || {};
            var boardTEs  = this.boardUI.boardMgr.targetElements || [];

            // Build HP-per-type map from level elements (bosses have hp > 1)
            var hpPerType = {};
            var mapElems  = mapCfg.elements || [];
            for (var ei = 0; ei < mapElems.length; ei++) {
                var me = mapElems[ei];
                if (me.hp && me.hp > 1) {
                    hpPerType[me.type] = me.hp;
                }
            }

            // Weight each target by HP so bosses count proportionally
            var tppTargets = {};
            for (var ti = 0; ti < boardTEs.length; ti++) {
                var te = boardTEs[ti];
                tppTargets[te.id] = te.count * (hpPerType[te.id] || 1);
            }

            CoreGame.AdaptiveTPP.init(this.boardUI.boardMgr, {
                targetMoves: mapCfg.targetMove || mapCfg.numMove || 30,
                targets:     tppTargets,
                levelId:     mapCfg.levelId || null
            });
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
                cc.log("Back button clicked - returning to TestScene");
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
     * Update remained move(s)
     */
    onUpdateMove: function (numbMove) {
        cc.log("onUpdateMove", numbMove);
        let node = this.gameBoardInfoUI.setMove(numbMove);
    },

    /**
     * Happy Cheese and confetti
     */
    showEndGameWinEffect: function () {
        this.gameBoardEffectLayer.showLevelCompleteLabel();
    },

    /**
     * Check the type and decrease
     */
    onEndGame: function (isWin = true, targets) {
        let guiEndGame = sceneMgr.openGUI(GameBoardEndGame.className);
        guiEndGame.gameUI = this;

        var bm = this.boardUI && this.boardUI.boardMgr;
        if (CoreGame.AdaptiveTPP && bm) {
            CoreGame.AdaptiveTPP.onLevelEnd(bm._tppMovesUsed || 0, !!isWin);
        }

        this.sendMetrics(this._buildMetrics(isWin));

        if (isWin) {
            this.gameBoardEffectLayer.showLevelCompleteLabel();
            guiEndGame.showResult(BoardResult.WIN, this.levelConfig, 1.5);
        } else {
            guiEndGame.showResult(BoardResult.LOSE, targets);
        }
    },

    /**
     * Play trail effects from source to each target gem, transforming them into PowerUps.
     * @param {Array} targets - Array of {row, col} positions
     * @param {Object} boardMgr - Reference to BoardMgr
     */
    playBonusTrailEffect: function (targets, boardMgr) {
        var boardUI = CoreGame.BoardUI.getInstance();
        var parent = boardUI;

        // Source position: lbMove label position converted to boardUI space
        var lbMove = this.gameBoardInfoUI.lbMove;
        var lbMoveWorldPos = lbMove.getParent().convertToWorldSpace(lbMove.getPosition());
        var sourcePos = parent.convertToNodeSpace(lbMoveWorldPos);

        // Track displayed moves for countdown
        var displayedMoves = boardMgr.numMove;

        var self = this;
        var delayPerRay = 0.15;
        var rayTravelTime = 0.2;

        for (var i = 0; i < targets.length; i++) {
            (function (index) {
                var target = targets[index];
                var targetPos = boardMgr.gridToPixel(target.row, target.col);
                var delay = index * delayPerRay;

                CoreGame.TimedActionMgr.addAction(delay, function () {
                    // Decrease displayed moves by 1 on each ray fired
                    displayedMoves--;
                    self.gameBoardInfoUI.setMove(Math.max(0, displayedMoves));

                    self.createBonusRay(sourcePos, targetPos, parent);

                    CoreGame.TimedActionMgr.addAction(rayTravelTime, function () {
                        boardMgr.transformGemToPowerUp(target.row, target.col);
                        self.createBonusHitEffect(targetPos, parent);
                    });
                });
            })(i);
        }

        // After all rays + transforms complete, activate all bonus PowerUps
        var totalDuration = targets.length * delayPerRay + rayTravelTime + 0.5;
        CoreGame.TimedActionMgr.addAction(totalDuration, function () {
            boardMgr.activateBonusPowerUps();
        });
    },

    /**
     * Create a single rainbow ray from source to target position.
     */
    createBonusRay: function (fromPos, toPos, parent) {
        fr.Sound.playSoundEffect(resSound.disco_shot, false);

        var ray = gv.createSpineAnimation(resAni.rainbow_ray_spine);
        ray.setPosition(fromPos);
        parent.addChild(ray, CoreGame.ZORDER_BOARD_EFFECT);

        var dir = cc.p(fromPos.x - toPos.x, fromPos.y - toPos.y);
        var angle = Math.atan2(dir.x, dir.y) * (180 / Math.PI) - 180;
        ray.setRotation(angle);

        var distance = cc.pDistance(fromPos, toPos);
        ray.setScale(1.0, Math.abs(distance / 200));
        ray.setAnimation(0, "run", false);

        ray.runAction(cc.sequence(
            cc.delayTime(0.3),
            cc.removeSelf()
        ));
    },

    /**
     * Create a hit visual effect at the target position.
     */
    createBonusHitEffect: function (pos, parent) {
        var hit = gv.createSpineAnimation(resAni.rainbow_hit_spine);
        hit.setPosition(pos);
        parent.addChild(hit, CoreGame.ZORDER_BOARD_EFFECT);
        hit.setAnimation(0, "run", false);
        gv.removeSpineAfterRun(hit);

        var boardUI = CoreGame.BoardUI.getInstance();
        var efkManager = (boardUI && boardUI.efkManager) ? boardUI.efkManager : null;
        if (efkManager && typeof gv.createEfk === "function") {
            var emitter = gv.createEfk(efkManager, resAni.rainbow_hit_efk);
            emitter.setPosition3D(cc.math.vec3(pos.x, pos.y, 0));
            parent.addChild(emitter, CoreGame.ZORDER_BOARD_EFFECT);
        }
    },

    /**
     * Assembles the full end-of-level metrics payload.
     * @param {boolean} isWin
     * @returns {Object}
     */
    _buildMetrics: function (isWin) {
        var bm  = this.boardUI && this.boardUI.boardMgr;
        var tpp = (CoreGame.AdaptiveTPP) ? CoreGame.AdaptiveTPP.getMetrics() : null;

        var deviceId = "";
        try { deviceId = fr.platformWrapper ? fr.platformWrapper.getDeviceID() : ""; } catch (e) {}

        var bd = {
            device_id: deviceId,
            is_win:    !!isWin,
            pu_count:  tpp ? tpp.pu_count : 0
        };

        var ad = null;
        if (tpp) {
            var d = tpp.deviation_distribution;
            ad = {
                deviation_mean:    d.mean,
                deviation_median:  d.median,
                deviation_p25:     d.p25,
                deviation_p75:     d.p75,
                boost_switches:    tpp.boost_switches,
                suppress_switches: tpp.suppress_switches,
                move_surplus:      tpp.move_surplus,
                pu_rate:           tpp.pu_rate,
                retry_count:       tpp.retry_count
            };
        }

        return { board: bd, adaptive: ad };
    },

    /**
     * POST end-of-level metrics to the local LogServer (dev-only).
     * URL: http://127.0.0.1:8081/metrics
     * Run bare:   cd client/LogServer && node server.js
     * Run docker: cd client/LogServer && docker compose up -d
     * @param {Object} metrics  Result of _buildMetrics()
     */
    sendMetrics: function (metrics) {
        var mapCfg  = this.levelConfig && this.levelConfig.mapConfig;
        var levelId = (mapCfg && mapCfg.levelId != null) ? mapCfg.levelId : "unknown";
        var ad      = metrics.adaptive || {};
        var bd      = metrics.board    || {};

        var payload = {
            level_id:          levelId,
            device_id:         bd.device_id          || "",
            is_win:            bd.is_win ? 1 : 0,
            pu_count:          bd.pu_count            || 0,
            pu_rate:           ad.pu_rate             || 0,
            move_surplus:      ad.move_surplus        || 0,
            boost_switches:    ad.boost_switches      || 0,
            suppress_switches: ad.suppress_switches   || 0,
            deviation_mean:    ad.deviation_mean      || 0,
            deviation_median:  ad.deviation_median    || 0,
            deviation_p25:     ad.deviation_p25       || 0,
            deviation_p75:     ad.deviation_p75       || 0,
            retry_count:       ad.retry_count         || 0
        };

        try {
            fr.Network.xmlHttpRequestPost("http://120.138.72.4:8081/metrics", payload, function (result) {
                cc.log("[GameUI] sendMetrics →", result ? "OK" : "FAIL");
            });
        } catch (e) {
            cc.log("[GameUI] sendMetrics error:", e);
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
    },

    /**
     * Called when buy-move purchase succeeds.
     * Hides end game GUI, adds extra moves, updates UI, resumes gameplay.
     */
    onBuyMoveSuccess: function () {
        cc.log("GameUI onBuyMoveSuccess");

        // Hide end game GUI
        var guiEndGame = sceneMgr.getGUIByClassName(GameBoardEndGame.className);
        if (guiEndGame) {
            guiEndGame.onClose();
        }

        // Add extra moves to BoardMgr
        var extraMoves = ConfigResource.EXTRA_MOVE;
        this.boardUI.boardMgr.addMoves(extraMoves);

        // Update UI move counter
        this.onUpdateMove(this.boardUI.boardMgr.numMove);

        // Increment bought turn for price scaling
        this.boughtMoveTurn++;

        // Resume board to allow swapping again
        this.boardUI.boardMgr.state = CoreGame.BoardState.IDLE;
    },

    /**
     * Send end-game lose action to server (subtract heart).
     * Ported from MainScene.addActionEndGameLose.
     */
    addActionEndGameLose: function (logType) {
        userInfo.setJustStart(-1);
        let heartBefore = userInfo.getHeartWithUpdate();
        let heartAfter;
        if (heartBefore == 0) {
            heartAfter = 0;
        } else if (FreeFunction.getInstance().isInFreeResourceDuration(ResourceType.HEART)) {
            heartAfter = heartBefore;
        } else {
            heartAfter = heartBefore - 1;
        }

        let levelId = this.getLevel();
        let dataArr = [levelId, ResourceType.HEART, heartBefore, heartAfter, heartAfter - heartBefore];
        let actionType = this.isBossRun ? ActionType.BOSS_RUN_END_GAME_LOSE : ActionType.END_GAME_LOSE;
        eventProcessor.addNewAction(actionType, dataArr);

        if (logType == ActionType.LOG_LOSE_SUBTRACT_HEART) {
            gv.clientNetwork.connector.sendMetricLevel([
                Number(ActionType.LOG_LOSE_SUBTRACT_HEART),
                this.getLevel(),
                0, // version
                this.getLevelWithVer(),
                0, // numPlay
                fr.platformWrapper.getVersionCode(),
                0, // winStreakLevel
                FreeFunction.getInstance().getResourceFreeTimeRemainInSec(ResourceType.HEART),
                heartAfter
            ]);
        }
    },

    //region GET
    getLevel: function () {
        return this.boardUI.boardMgr.getLevelId();
    },

    getLevelWithVer: function () {
        return this.getLevel();
    },
    //endregion GET

    //region EFX
    /**
     * Boss intro effect: find the boss element on the board, make it jump
     * from off-screen to the top of the board, then jump back to its slot.
     * @param {number} config - Effect's config
     * @returns {number} Total duration of the effect
     */
    efxBossShowUp: function (config) {
        //Dolly Zoom
        let delayTime = config["delayTime"];
        let efxTime = 0.75;
        //Moving bg
        this.gameBoardBg.stopAllActions();
        this.gameBoardBg.setVisible(true);
        this.gameBoardBg.setScale(1.5);
        this.gameBoardBg.runAction(cc.sequence(
            cc.delayTime(delayTime),
            cc.scaleTo(efxTime, 1).easing(cc.easeOut(2.5))
        ));

        //Moving Core board
        this.boardUI.stopAllActions();
        this.boardUI.setVisible(true);
        this.boardUI.setScale(2.5);
        this.boardUI.runAction(cc.sequence(
            cc.delayTime(delayTime),
            cc.scaleTo(efxTime, 1).easing(cc.easeBackOut())
        ));

        delayTime += efxTime + 0.5;

        var boardMgr = this.boardUI.boardMgr;

        let bossLowId = 10000;
        // Find boss element on the board
        var bossElement = null;
        for (var r = 0; r < boardMgr.rows; r++) {
            for (var c = 0; c < boardMgr.cols; c++) {
                var slot = boardMgr.getSlot(r, c);
                if (!slot) continue;
                for (var i = 0; i < slot.listElement.length; i++) {
                    var el = slot.listElement[i];
                    if (el.type >= bossLowId) {
                        bossElement = el;
                        break;
                    }
                }
                if (bossElement) break;
            }
            if (bossElement) break;
        }

        if (!bossElement || !bossElement.ui) {
            cc.log("efxBossShowUp: no boss found");
            return 0;
        }

        var bossUI = bossElement.ui;
        var originalPos = bossUI.getPosition();

        // --- Create fake gems at the boss's grid cells ---
        var bossCells = bossElement.cells || [];
        cc.log("BOSS CELLS", JSON.stringify(bossCells), JSON.stringify(bossElement.size));
        if (bossCells.length === 0) {
            for (let i = 0; i < bossElement.size.width; i++) {
                for (let j = 0; j < bossElement.size.height; j++) {
                    bossCells.push({
                        r: bossElement.position.x + i,
                        c: bossElement.position.y + j
                    });
                }
            }
        }

        var fakeGems = [];
        var boardParent = bossUI.getParent();

        for (var fi = 0; fi < bossCells.length; fi++) {
            var cell = bossCells[fi];
            var gemType = Math.floor(Math.random() * CoreGame.Config.NUM_GEN * 0.5) + 1;
            var gemPath = "res/high/game/element/" + gemType + ".png";
            var fakeGem = fr.createSprite(gemType + ".png", gemPath);

            var cellPos = boardMgr.gridToPixel(cell.r, cell.c);
            fakeGem.setPosition(cellPos);
            fakeGem.setLocalZOrder(BoardConst.zOrder.GEM);
            fakeGem._fakeGemType = gemType;
            boardParent.addChild(fakeGem);
            fakeGems.push(fakeGem);
        }
        // --- End fake gems creation ---

        // Top of boardUI + offset above the board
        var boardTop = boardMgr.rows * CoreGame.Config.CELL_SIZE + boardMgr.boardOffsetY;
        var showUpPos = cc.p(originalPos.x - 250, boardTop);
        // let animConfig =  CoreGame.GameBoardInfoUI.animMonster[bossElement.type];
        // showUpPos.x += animConfig.offset.x / animConfig.scale;
        // showUpPos.y += animConfig.offset.y / animConfig.scale;

        // Off-screen start position (above the visible area)
        var offScreenPos = cc.p(cc.winSize.width + 250, boardTop + 500);

        var jumpDuration = 0.8;
        var pauseDuration = 3.8;
        var returnDuration = 1;

        bossUI.setLocalZOrder(CoreGame.ZORDER_BOARD_EFFECT);
        bossUI.setPosition(offScreenPos);
        bossUI.setVisible(false);
        bossUI["Sprite2D"].setVisible(false);

        bossUI.runAction(cc.sequence(
            cc.delayTime(delayTime),

            //Animation appear_01
            cc.show(),
            cc.callFunc(function () {
                bossUI.setHijacked(true);
                bossUI["ccSpine"].setAnimation(0, "Appear_01", false);
            }.bind(bossUI)),
            // Jump down from off-screen to top of board
            cc.jumpTo(
                jumpDuration,
                showUpPos,
                150,
                1
            ).easing(cc.easeBezierAction(0, 0.39, 1.23, 1.0)),

            cc.callFunc(function () {
                // Screen shake on first landing
                CoreGame.BoardUI.getInstance().shakeScreen(1);
            }),

            // Bounce taunt at the top
            // cc.sequence(
            //     cc.scaleTo(0.15, 1.2, 0.85),
            //     cc.scaleTo(0.15, 0.9, 1.15),
            //     cc.scaleTo(0.1, 1.0, 1.0)
            // ),
            cc.delayTime(pauseDuration),

            //Animation appear_02
            cc.callFunc(function () {
                bossUI["ccSpine"].setAnimation(0, "Appear_02", false);
            }.bind(bossUI)),
            // Jump back to original slot position
            cc.spawn(
                cc.jumpTo(returnDuration, originalPos, cc.winSize.height * 0.25, 1).easing(
                    cc.easeBezierAction(0, 0.1, 0.9, 1.0)
                ),
                cc.scaleTo(returnDuration, 1.0, 1.0)
            ),
            cc.callFunc(function () {
                bossUI.setLocalZOrder(BoardConst.zOrder.BOSS);
                bossUI["Sprite2D"].setVisible(true);
                bossUI.setHijacked(false);
                bossUI._onAnimationFinish();

                // Crush fake gems on landing
                for (var gi = 0; gi < fakeGems.length; gi++) {
                    var fg = fakeGems[gi];
                    var fgType = fg._fakeGemType;

                    // Debris particles
                    if (fgType < debris_type_name.length) {
                        for (var di = 0; di < 2; di++) {
                            var debrisPos = cc.p(
                                fg.x + (0.5 - Math.random()) * 20,
                                fg.y + (0.5 - Math.random()) * 20
                            );
                            var wPos = boardParent.convertToWorldSpace(debrisPos);
                            var nodeTLFX = gv.createTLFX(
                                debris_type_name[fgType],
                                wPos,
                                boardParent,
                                BoardConst.zOrder.EFF_EXPLODE
                            );
                            nodeTLFX.setScale(2 + Math.random() * 0.5);
                        }
                    }

                    // Squash and remove
                    fg.runAction(cc.sequence(
                        cc.spawn(
                            cc.scaleTo(0.15, 1.3, 0.3).easing(cc.easeOut(2.5)),
                            cc.fadeOut(0.15)
                        ),
                        cc.removeSelf()
                    ));
                }

                // Screen shake on landing
                CoreGame.BoardUI.getInstance().shakeScreen(8);

                // --- Shockwave: displace nearby gems radially outward, then return ---
                var bossCenter = cc.p(originalPos.x, originalPos.y);
                var shockRadius = CoreGame.Config.CELL_SIZE * 3.5; // affect gems within ~3.5 cells
                var shockStrength = CoreGame.Config.CELL_SIZE * 1.25; // max displacement in pixels
                var shockOutTime = 0.3;
                var shockReturnTime = 0.7;

                // Build set of boss cell keys to exclude
                cc.log("BOSS CELLS SHOCKWAVE", JSON.stringify(bossCells), JSON.stringify(bossElement.size));
                var bossCellSet = {};
                for (var bi = 0; bi < bossCells.length; bi++) {
                    bossCellSet[bossCells[bi].r + "," + bossCells[bi].c] = true;
                }

                for (var sr = 0; sr < boardMgr.rows; sr++) {
                    for (var sc = 0; sc < boardMgr.cols; sc++) {
                        // Skip boss cells
                        if (bossCellSet[sr + "," + sc]) continue;

                        var sSlot = boardMgr.getSlot(sr, sc);
                        if (!sSlot) continue;

                        for (var si = 0; si < sSlot.listElement.length; si++) {
                            var sEl = sSlot.listElement[si];
                            if (!sEl || !sEl.ui || sEl.type >= bossLowId) continue;

                            var gemUI = sEl.ui;
                            var gemPos = gemUI.getPosition();
                            var dx = gemPos.x - bossCenter.x;
                            var dy = gemPos.y - bossCenter.y;
                            var dist = Math.sqrt(dx * dx + dy * dy);

                            if (dist < 1 || dist > shockRadius) continue;

                            // Displacement falls off with distance
                            var factor = 1.0 - (dist / shockRadius);
                            var displaceAmount = shockStrength * factor * factor;
                            var angle = Math.atan2(dy, dx);
                            var offsetX = Math.cos(angle) * displaceAmount;
                            var offsetY = Math.sin(angle) * displaceAmount;

                            cc.log("FOUND A ACTUAL GEM TO DISPLACE", offsetX, offsetY);
                            gemUI.setColor(cc.BLACK);

                            var displacedPos = cc.p(gemPos.x + offsetX, gemPos.y + offsetY);

                            gemUI.stopActionByTag(CoreGame.TAG_MOVE_ACTION);
                            var shockAction = cc.sequence(
                                cc.moveTo(shockOutTime, displacedPos).easing(cc.easeOut(2.5)),
                                cc.moveTo(shockReturnTime, gemPos).easing(cc.easeElasticOut(2.5))
                            );
                            shockAction.setTag(CoreGame.TAG_MOVE_ACTION);
                            gemUI.runAction(shockAction);
                        }
                    }
                }
                // --- End shockwave ---
            })
        ));

        let totalTime = delayTime + jumpDuration + pauseDuration + returnDuration;

        //Tool and info layer
        this.gameBoardToolUI.setVisible(true);
        this.gameBoardToolUI.efxIn(totalTime + 0.5, efxTime);

        this.gameBoardInfoUI.setVisible(true);
        this.gameBoardInfoUI.efxIn(totalTime + 1.5, true);

        return totalTime;
    },

    efxStart: function (efxTime = 0.5, delayTime = 0, monsterBanner = false) {
        //Dolly Zoom

        //Moving bg
        this.gameBoardBg.stopAllActions();
        this.gameBoardBg.setVisible(true);
        this.gameBoardBg.setScale(1.5);
        this.gameBoardBg.runAction(cc.sequence(
            cc.delayTime(delayTime),
            cc.scaleTo(efxTime, 1).easing(cc.easeOut(2.5))
        ));

        //Moving Core board
        this.boardUI.stopAllActions();
        this.boardUI.setVisible(true);
        this.boardUI.setScale(2.5);
        this.boardUI.runAction(cc.sequence(
            cc.delayTime(delayTime),
            cc.scaleTo(efxTime, 1).easing(cc.easeBackOut())
        ));

        //Tool and info layer
        this.gameBoardToolUI.setVisible(true);
        this.gameBoardToolUI.efxIn(delayTime + efxTime + 0.5, efxTime);
        
        this.gameBoardInfoUI.setVisible(true);
        this.gameBoardInfoUI.efxIn(delayTime + efxTime + 1, monsterBanner);
    },

    startNow: function () {
        this.gameBoardBg.stopAllActions();
        this.gameBoardBg.setVisible(true);
        this.gameBoardBg.setScale(1);
        this.boardUI.stopAllActions();
        this.boardUI.setVisible(true);
        this.boardUI.setScale(1);
        if (this.gameBoardToolUI)
            this.gameBoardToolUI.setVisible(true);
        this.gameBoardInfoUI.setVisible(true);
    }
    //endregion EFX
});
