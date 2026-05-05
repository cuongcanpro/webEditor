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

    // ── Agent relay ──────────────────────────────────────────────────────────
    RELAY_URL: "http://127.0.0.1:3001",
    _relaySessionId: null,
    _relayPollCb: null,   // stored so we can unschedule it

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
        this.gameBoardBg = new GameBoardBg();
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
            this.gameBoardToolUI = new GameBoardToolUI(this);
            this.addChild(this.gameBoardToolUI);
        }


        // Create BoardInfo UI
        this.gameBoardInfoUI = new GameBoardInfoUI(this);
        this.addChild(this.gameBoardInfoUI, CoreGame.Config.zOrder.EFF_MATCHING + 1);
        this.gameBoardInfoUI.initData(levelConfig);

        // Create EffectLayer
        this.gameBoardEffectLayer = new CoreGame.GameBoardEffectLayer(this);
        this.addChild(this.gameBoardEffectLayer);

        this.boardUI.boardMgr.gameUI = this;
        this.levelId = this.boardUI.boardMgr.getLevelId();
        try {
            this.oldStarBeforePlay = userMgr.getData().getStarByLevel(this.levelId);
        }
        catch (ex) {
            this.oldStarBeforePlay = 0;
        }

        // AI agent
        this._aiAgent = null;
        CoreGame.EventMgr.on("turnFinished", function () {
            if (self._aiAgent) self._aiAgent.onTurnReady();
        }, this);
        this._createAIButton();

        this.boardUI.setVisible(false);
        this.gameBoardInfoUI.setVisible(false);
        if (this.gameBoardToolUI) {
            this.gameBoardToolUI.setVisible(false);
        }
        this.gameBoardEffectLayer.setVisible(false);
        this.boardUI.boardMgr.setMove(levelConfig.mapConfig ? (levelConfig.mapConfig.numMove || 0) : 0);

        this.onScoreChanged(0, levelConfig.mapConfig.scoreConfig);

        // Apply spawn strategy from map config if specified
        var stratKey = levelConfig.mapConfig && levelConfig.mapConfig.spawnStrategy;
        if (stratKey && CoreGame.DropStrategy[stratKey] && this.boardUI.boardMgr.dropMgr) {
            this.boardUI.boardMgr.dropMgr.setSpawnStrategy(new CoreGame.DropStrategy[stratKey]());
        }

        // Init AdaptiveTPP dynamic difficulty
        if (CoreGame.AdaptiveTPP) {
            var mapCfg = levelConfig.mapConfig || {};
            var boardTEs = this.boardUI.boardMgr.targetElements || [];

            // Use raw target counts (no HP weighting). Matches tppCleared in
            // BoardMgr which uses el.count - el.current (the game's own counter).
            var tppTargets = {};
            var targetIdSet = {};
            for (var ti = 0; ti < boardTEs.length; ti++) {
                var te = boardTEs[ti];
                tppTargets[te.id] = te.count;
                targetIdSet[te.id] = true;
            }

            // v2: Compute total initial HP across all objective element instances.
            // Used for HP-based fractional progress (boss/multi-HP tracking).
            var objectiveTotalHp = 0;
            var mapElements = mapCfg.elements || [];
            for (var ei = 0; ei < mapElements.length; ei++) {
                if (targetIdSet[mapElements[ei].type]) {
                    objectiveTotalHp += (mapElements[ei].hp || 1);
                }
            }

            CoreGame.AdaptiveTPP.init(this.boardUI.boardMgr, {
                targetMoves: mapCfg.targetMove || mapCfg.numMove || 30,
                targets: tppTargets,
                objectiveTotalHp: objectiveTotalHp,
                levelId: mapCfg.levelId || null
            });
        }

        // this._relayInit();
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

    _createAIButton: function () {
        var self = this;
        var winW = cc.winSize.width;
        var winH = cc.winSize.height;

        // ── Main "AI" button — bottom-right corner ───────────────────────────
        var btn = new ccui.Button(
            "res/modules/items/star.png",
            "res/modules/items/star.png"
        );
        btn.setTitleText("AI");
        btn.setTitleFontSize(24);
        btn.setTitleColor(cc.color(180, 50, 220));
        btn.setScale9Enabled(false);
        btn.setContentSize(60, 60);
        btn.setPosition(winW - 40, 45);
        btn.addTouchEventListener(function (sender, type) {
            if (type === ccui.Widget.TOUCH_ENDED) {
                self._toggleAIMenu();
            }
        });
        this.addChild(btn, 1000);
        this._aiButton = btn;

        // ── Thinking timer label (shown above the AI button while LLM is running) ─
        var thinkLabel = new cc.LabelTTF("", "Arial", 13);
        thinkLabel.setAnchorPoint(cc.p(0.5, 0));
        thinkLabel.setPosition(winW - 40, 78);
        thinkLabel.setColor(cc.color(255, 220, 50));
        thinkLabel.setVisible(false);
        this.addChild(thinkLabel, 1001);
        this._aiThinkingLabel = thinkLabel;

        // ── Mini popup menu (appears above the AI button) ────────────────────
        var menuW = 130, menuH = 134;
        var menuX = winW - menuW - 5;
        var menuY = 95;

        var menuBg = new cc.LayerColor(cc.color(20, 20, 20, 220), menuW, menuH);
        menuBg.setPosition(menuX, menuY);
        menuBg.setVisible(false);
        this.addChild(menuBg, 1001);
        this._aiMenuBg = menuBg;

        // Sub-button: AI ON/OFF
        var aiToggleBtn = new ccui.Button(
            "res/tool/res/btn_green_2.png",
            "res/tool/res/btn_green_2.png"
        );
        aiToggleBtn.setTitleText("AI: OFF");
        aiToggleBtn.setTitleFontSize(18);
        aiToggleBtn.setTitleColor(cc.color(255, 80, 80));
        aiToggleBtn.setScale9Enabled(true);
        aiToggleBtn.setContentSize(menuW - 10, 36);
        aiToggleBtn.setPosition(menuX + menuW / 2, menuY + menuH - 26);
        aiToggleBtn.setVisible(false);
        aiToggleBtn.addTouchEventListener(function (sender, type) {
            if (type === ccui.Widget.TOUCH_ENDED) {
                self._toggleAI();
                self._closeAIMenu();
            }
        });
        this.addChild(aiToggleBtn, 1002);
        this._aiToggleBtn = aiToggleBtn;

        // Sub-button: BENCH (opens LLM benchmark scene)
        var benchBtn = new ccui.Button(
            "res/tool/res/btn_green_2.png",
            "res/tool/res/btn_green_2.png"
        );
        benchBtn.setTitleText("BENCH");
        benchBtn.setTitleFontSize(18);
        benchBtn.setTitleColor(cc.color(80, 200, 255));
        benchBtn.setScale9Enabled(true);
        benchBtn.setContentSize(menuW - 10, 36);
        benchBtn.setPosition(menuX + menuW / 2, menuY + menuH / 2);
        benchBtn.setVisible(false);
        benchBtn.addTouchEventListener(function (sender, type) {
            if (type === ccui.Widget.TOUCH_ENDED) {
                self._closeAIMenu();
                cc.director.runScene(new CoreGame.SceneLLMBench());
            }
        });
        this.addChild(benchBtn, 1002);
        this._benchBtn = benchBtn;

        // Sub-button: DBG
        var dbgBtn = new ccui.Button(
            "res/tool/res/btn_green_2.png",
            "res/tool/res/btn_green_2.png"
        );
        dbgBtn.setTitleText("DBG");
        dbgBtn.setTitleFontSize(18);
        dbgBtn.setTitleColor(cc.color(180, 180, 180));
        dbgBtn.setScale9Enabled(true);
        dbgBtn.setContentSize(menuW - 10, 36);
        dbgBtn.setPosition(menuX + menuW / 2, menuY + 22);
        dbgBtn.setVisible(false);
        dbgBtn.addTouchEventListener(function (sender, type) {
            if (type === ccui.Widget.TOUCH_ENDED) {
                self._toggleDebugOverlay();
                self._closeAIMenu();
            }
        });
        this.addChild(dbgBtn, 1002);
        this._dbgToggleBtn = dbgBtn;

        this._aiMenuVisible = false;

        // ── Reasoning panel (bottom strip, scrollable, shown while AI thinks) ─
        var panelH = 190;
        var panelY = 80;

        var reasonBg = new cc.LayerColor(cc.color(10, 10, 30, 220), winW, panelH);
        reasonBg.setPosition(0, panelY);
        reasonBg.setVisible(false);
        this.addChild(reasonBg, 999);
        this._aiReasoningBg = reasonBg;

        var scrollW = winW - 12;
        var scrollH = panelH - 8;
        var reasonScroll = new ccui.ScrollView();
        reasonScroll.setDirection(ccui.ScrollView.DIR_VERTICAL);
        reasonScroll.setContentSize(cc.size(scrollW, scrollH));
        reasonScroll.setPosition(6, panelY + 4);
        reasonScroll.setBounceEnabled(false);
        reasonScroll.setScrollBarEnabled(true);
        reasonScroll.setScrollBarOpacity(140);
        reasonScroll.setInnerContainerSize(cc.size(scrollW, scrollH));
        reasonScroll.setVisible(false);
        this.addChild(reasonScroll, 1000);
        this._aiReasoningScroll = reasonScroll;

        // RichText — multi-color, supports "\n" line-break elements
        var richW = scrollW - 16;
        var richH = 600;  // fixed tall inner canvas; scroll shows top portion
        var richText = new ccui.RichText();
        richText.setContentSize(cc.size(richW, richH));
        richText.ignoreContentAdaptWithSize(false);
        richText.setAnchorPoint(cc.p(0, 1));
        richText.setPosition(8, richH);
        reasonScroll.setInnerContainerSize(cc.size(scrollW, richH));
        reasonScroll.getInnerContainer().addChild(richText, 1);
        this._aiRichText = richText;

        this._createDebugOverlay();
    },

    _toggleAIMenu: function () {
        this._aiMenuVisible = !this._aiMenuVisible;
        if (this._aiMenuBg) this._aiMenuBg.setVisible(this._aiMenuVisible);
        if (this._aiToggleBtn) this._aiToggleBtn.setVisible(this._aiMenuVisible);
        if (this._benchBtn) this._benchBtn.setVisible(this._aiMenuVisible);
        if (this._dbgToggleBtn) this._dbgToggleBtn.setVisible(this._aiMenuVisible);
    },

    _closeAIMenu: function () {
        this._aiMenuVisible = false;
        if (this._aiMenuBg) this._aiMenuBg.setVisible(false);
        if (this._aiToggleBtn) this._aiToggleBtn.setVisible(false);
        if (this._benchBtn) this._benchBtn.setVisible(false);
        if (this._dbgToggleBtn) this._dbgToggleBtn.setVisible(false);
    },

    _createDebugOverlay: function () {
        var self = this;

        // Panel: right side, below difficulty button area
        var panelW = 260;
        var panelH = 260;
        var panelX = cc.winSize.width - panelW - 5;
        var panelY = cc.winSize.height - 270 - panelH;

        var bg = new cc.LayerColor(cc.color(0, 0, 0, 185), panelW, panelH);
        bg.setPosition(panelX, panelY);
        bg.setVisible(false);
        this.addChild(bg, 998);
        this._debugBg = bg;

        var lbl = new cc.LabelTTF(
            "", "Arial", 14,
            cc.size(panelW - 12, panelH - 8),
            cc.TEXT_ALIGNMENT_LEFT
        );
        lbl.setPosition(panelX + panelW / 2, panelY + panelH / 2);
        lbl.setFontFillColor(cc.color(200, 255, 200));
        lbl.enableStroke(cc.color(0, 0, 0), 1);
        lbl.setVisible(false);
        this.addChild(lbl, 999);
        this._debugLabel = lbl;

        this._debugVisible = false;
        this._debugUpdateCb = function () { self._updateDebugOverlay(); };
    },

    _toggleDebugOverlay: function () {
        this._debugVisible = !this._debugVisible;
        if (this._debugBg) this._debugBg.setVisible(this._debugVisible);
        if (this._debugLabel) this._debugLabel.setVisible(this._debugVisible);

        if (this._debugVisible) {
            this._updateDebugOverlay();
            this.schedule(this._debugUpdateCb, 0.3);
        } else {
            this.unschedule(this._debugUpdateCb);
        }
    },

    _updateDebugOverlay: function () {
        if (!this._debugLabel || !this._debugVisible) return;

        var bm = this.boardUI && this.boardUI.boardMgr;
        if (!bm) return;

        var lines = [];
        var movesUsed = (bm.totalMove || 0) - (bm.numMove || 0);

        // ── AdaptiveTPP ──────────────────────────────────────────────────────
        if (CoreGame.AdaptiveTPP) {
            var tpp = CoreGame.AdaptiveTPP;
            var totalCleared = 0;
            var tes = bm.targetElements || [];
            for (var ti = 0; ti < tes.length; ti++) {
                totalCleared += (tes[ti].count - tes[ti].current);
            }
            var dev = tpp.getDeviation(movesUsed, totalCleared);
            var devStr = (dev >= 0 ? "+" : "") + dev.toFixed(3);
            var streak = tpp._assistStreak || 0;
            lines.push("=== AdaptiveTPP ===");
            lines.push("Strategy : " + tpp.getCurrentStrategyName());
            lines.push("Deviation: " + devStr);
            lines.push("Thresholds: " + tpp.TPP_THRESHOLD.toFixed(2)
                + " / " + tpp.HARD_THRESHOLD.toFixed(2)
                + " / " + tpp.EXTREME_THRESHOLD.toFixed(2));
            lines.push("Streak   : " + streak + " / " + tpp.MAX_ASSIST_STREAK);
            lines.push("Retry    : x" + tpp.getRetryFactor().toFixed(2));
        }

        // ── Targets ──────────────────────────────────────────────────────────
        var _GEM = { 1: "G", 2: "B", 3: "R", 4: "Y", 5: "P", 6: "C" };
        var _PU = { 101: "h", 102: "n", 103: "*", 104: "+", 105: "L", 106: "v" };
        lines.push("=== Targets ===");
        var tes2 = bm.targetElements || [];
        if (tes2.length === 0) {
            lines.push("  (none)");
        } else {
            for (var i = 0; i < tes2.length; i++) {
                var te = tes2[i];
                var lbl = _GEM[te.id] || _PU[te.id] || ("T" + te.id);
                var done = te.count - te.current;
                var bar = "";
                for (var b = 0; b < te.count && b < 10; b++) bar += (b < done ? "#" : ".");
                lines.push(lbl + ": " + done + "/" + te.count
                    + " [" + bar + "] " + te.current + " rem");
            }
        }

        // ── Moves ────────────────────────────────────────────────────────────
        lines.push("=== Moves ===");
        lines.push(bm.numMove + " left / " + bm.totalMove
            + " total  (used " + movesUsed + ")");

        // ── Token stats ──────────────────────────────────────────────────────
        var agent = this._aiAgent;
        if (agent && agent._tokenStats && agent._tokenStats.calls > 0) {
            var ts = agent._tokenStats;
            var avgIn = Math.round(ts.in / ts.calls);
            var avgOut = Math.round(ts.out / ts.calls);
            lines.push("=== Tokens ===");
            lines.push("Calls: " + ts.calls);
            lines.push("In:  " + ts.in + "  (~" + avgIn + "/call)");
            lines.push("Out: " + ts.out + "  (~" + avgOut + "/call)");
        }

        this._debugLabel.setString(lines.join("\n"));
    },

    _toggleAI: function () {
        var self = this;
        var bm = this.boardUI && this.boardUI.boardMgr;
        if (!bm) return;
        var mainBtn = this._aiButton;
        var subBtn = this._aiToggleBtn;
        if (!this._aiAgent) {
            this._aiAgent = new CoreGame.LLMAgent();
            var richText = this._aiRichText;
            var reasoningBg = this._aiReasoningBg;
            var reasoningScroll = this._aiReasoningScroll;

            var richElemCount = 0;  // track added elements for clearing (native has no _richElements)
            this._aiAgent.onReasoning = function (planText, reasonText) {
                if (!reasoningScroll || !richText) return;
                // Clear via index loop (same as CustomLabel.clearText)
                for (var c = 0; c < richElemCount; c++) richText.removeElement(0);
                richElemCount = 0;

                function push(text, color, size) {
                    richText.pushBackElement(new ccui.RichElementText(++richElemCount, color, 255, text, "Arial", size));
                }
                if (planText) {
                    push("\u25c6 Plan:  " + planText, cc.color(160, 230, 255), 19);
                }
                if (planText && reasonText) {
                    push("\n \n", cc.color(0, 0, 0), 8);
                }
                if (reasonText) {
                    push("\u25b6 AI:  " + reasonText, cc.color(255, 240, 160), 19);
                }

                richText.formatText();
                reasoningScroll.setVisible(true);
                if (reasoningBg) reasoningBg.setVisible(true);
            };
            this._aiAgent.onStatus = function (status) {
                var lbl = self._aiThinkingLabel;
                if (status === "thinking") {
                    mainBtn.setTitleColor(cc.color(255, 220, 50));
                    mainBtn.stopAllActions();
                    mainBtn.setScale(1.0);
                    mainBtn.runAction(cc.repeatForever(cc.sequence(
                        cc.scaleTo(0.35, 1.18),
                        cc.scaleTo(0.25, 1.0)
                    )));
                    // Start elapsed-time ticker
                    self._thinkStartTime = Date.now();
                    if (self._thinkTimer) { clearInterval(self._thinkTimer); }
                    if (lbl) { lbl.setString("Thinking... 0.0s"); lbl.setVisible(true); }
                    self._thinkTimer = setInterval(function () {
                        if (!lbl) return;
                        var elapsed = (Date.now() - self._thinkStartTime) / 1000;
                        lbl.setString("Thinking... " + elapsed.toFixed(1) + "s");
                    }, 100);
                } else if (status === "moving") {
                    if (self._thinkTimer) { clearInterval(self._thinkTimer); self._thinkTimer = null; }
                    mainBtn.stopAllActions();
                    mainBtn.setScale(1.0);
                    mainBtn.setTitleColor(cc.color(50, 200, 255));
                    if (lbl) { lbl.setString("Moving..."); lbl.setVisible(true); }
                } else {
                    if (self._thinkTimer) { clearInterval(self._thinkTimer); self._thinkTimer = null; }
                    mainBtn.stopAllActions();
                    mainBtn.setScale(1.0);
                    mainBtn.setTitleColor(cc.color(80, 255, 80));
                    if (lbl) { lbl.setVisible(false); }
                }
            };
            this._aiAgent.start(bm);
            mainBtn.setTitleColor(cc.color(80, 255, 80));
            if (subBtn) { subBtn.setTitleText("AI: ON"); subBtn.setTitleColor(cc.color(80, 255, 80)); }
            this._aiAgent.onTurnReady();
        } else {
            this._aiAgent.stop();
            this._aiAgent = null;
            if (this._thinkTimer) { clearInterval(this._thinkTimer); this._thinkTimer = null; }
            if (this._aiThinkingLabel) this._aiThinkingLabel.setVisible(false);
            mainBtn.stopAllActions();
            mainBtn.setScale(1.0);
            mainBtn.setTitleColor(cc.color(255, 80, 80));
            if (subBtn) { subBtn.setTitleText("AI: OFF"); subBtn.setTitleColor(cc.color(255, 80, 80)); }
            if (this._aiReasoningScroll) this._aiReasoningScroll.setVisible(false);
            if (this._aiReasoningBg) this._aiReasoningBg.setVisible(false);
        }
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
        this._relayStopPoll();
        this.boardUI.removeFromParent();
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
        //cc.log("removedElement", element.type);
        let node = this.gameBoardInfoUI.getNodeTarget(element.type);
        if (node) {
            //cc.log("removedElement collectElement", element.type);
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

    onScoreChanged: function (score, scoreConfig) {
        this.gameBoardInfoUI.setScore(score, scoreConfig);
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
    onEndGame: function (isWin = true, targets, noMoveShuffle = false) {
        // Stop debug overlay if running
        if (this._debugUpdateCb) this.unschedule(this._debugUpdateCb);
        if (this._debugBg) this._debugBg.setVisible(false);
        if (this._debugLabel) this._debugLabel.setVisible(false);
        this._debugVisible = false;

        // Stop AI agent if running
        this._closeAIMenu();
        if (this._aiReasoningScroll) this._aiReasoningScroll.setVisible(false);
        if (this._aiReasoningBg) this._aiReasoningBg.setVisible(false);
        if (this._aiAgent) {
            this._aiAgent.stop();
            this._aiAgent = null;
            if (this._aiButton) {
                this._aiButton.stopAllActions();
                this._aiButton.setScale(1.0);
                this._aiButton.setTitleColor(cc.color(255, 80, 80));
            }
            if (this._aiToggleBtn) {
                this._aiToggleBtn.setTitleText("AI: OFF");
                this._aiToggleBtn.setTitleColor(cc.color(255, 80, 80));
            }
        }
        this._relayPushState(isWin ? "win" : "lose");
        this._relayStopPoll();

        let guiEndGame = sceneMgr.openGUI(GameBoardEndGame.className);
        guiEndGame.gameUI = this;

        var bm = this.boardUI && this.boardUI.boardMgr;
        if (CoreGame.AdaptiveTPP && bm) {
            CoreGame.AdaptiveTPP.onLevelEnd(bm._tppMovesUsed || 0, !!isWin);
        }

        this.sendMetrics(this._buildMetrics(isWin));

        if (isWin) {
            let isShowed = this.gameBoardEffectLayer.char;
            if (isShowed) {
                this.gameBoardEffectLayer.showLevelCompleteLabel();
            }

            guiEndGame.showResult(BoardResult.WIN, this.levelConfig, isShowed ? 1.5 : 0);
        } else {
            guiEndGame.showResult(BoardResult.LOSE, targets, noMoveShuffle);
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

        // Show skip button
        this.gameBoardInfoUI.showSkip();

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
        var bm = this.boardUI && this.boardUI.boardMgr;
        var tpp = (CoreGame.AdaptiveTPP) ? CoreGame.AdaptiveTPP.getMetrics() : null;

        var deviceId = "";
        try { deviceId = fr.platformWrapper ? fr.platformWrapper.getDeviceID() : ""; } catch (e) { }

        // Target completion: how far each target got (% cleared)
        var targetCompletion = {};
        if (bm && bm.targetElements) {
            for (var ti = 0; ti < bm.targetElements.length; ti++) {
                var te = bm.targetElements[ti];
                var cleared = Math.max(0, te.count - te.current);
                targetCompletion[te.id] = (te.count > 0) ? Math.round(cleared / te.count * 100) : 100;
            }
        }

        var bd = {
            device_id: deviceId,
            is_win: !!isWin,
            pu_count: tpp ? tpp.pu_count : 0
        };

        var ad = null;
        if (tpp) {
            var d = tpp.deviation_distribution;
            ad = {
                deviation_mean: d.mean,
                deviation_median: d.median,
                deviation_p25: d.p25,
                deviation_p75: d.p75,
                boost_switches: tpp.boost_switches,
                suppress_switches: tpp.suppress_switches,
                move_surplus: tpp.move_surplus,
                pu_rate: tpp.pu_rate,
                retry_count: tpp.retry_count,
                retry_factor: tpp.retry_factor,
                // ── New metrics ──
                pu_rockets: tpp.pu_rockets,
                pu_bombs: tpp.pu_bombs,
                pu_rainbows: tpp.pu_rainbows,
                pu_planes: tpp.pu_planes,
                cascade_avg: tpp.cascade_avg,
                cascade_max: tpp.cascade_max,
                avg_tiles_per_move: tpp.avg_tiles_per_move,
                shuffle_count: tpp.shuffle_count,
                min_valid_moves: tpp.min_valid_moves,
                moves_used: tpp.moves_used,
                total_moves: tpp.total_moves
            };
        }

        return { board: bd, adaptive: ad, target_completion: targetCompletion };
    },

    /**
     * POST end-of-level metrics to the local LogServer (dev-only).
     * URL: http://127.0.0.1:8081/metrics
     * Run bare:   cd client/LogServer && node server.js
     * Run docker: cd client/LogServer && docker compose up -d
     * @param {Object} metrics  Result of _buildMetrics()
     */
    sendMetrics: function (metrics) {
        var mapCfg = this.levelConfig && this.levelConfig.mapConfig;
        var levelId = (mapCfg && mapCfg.levelId != null) ? mapCfg.levelId : "unknown";
        var ad = metrics.adaptive || {};
        var bd = metrics.board || {};

        var payload = {
            level_id: levelId,
            device_id: bd.device_id || "",
            is_win: bd.is_win ? 1 : 0,
            pu_count: bd.pu_count || 0,
            pu_rate: ad.pu_rate || 0,
            move_surplus: ad.move_surplus || 0,
            boost_switches: ad.boost_switches || 0,
            suppress_switches: ad.suppress_switches || 0,
            deviation_mean: ad.deviation_mean || 0,
            deviation_median: ad.deviation_median || 0,
            deviation_p25: ad.deviation_p25 || 0,
            deviation_p75: ad.deviation_p75 || 0,
            retry_count: ad.retry_count || 0,
            retry_factor: ad.retry_factor != null ? ad.retry_factor : 1,
            // ── Group 1: Match quality ──
            cascade_avg: ad.cascade_avg || 0,
            cascade_max: ad.cascade_max || 0,
            avg_tiles_per_move: ad.avg_tiles_per_move || 0,
            // ── Group 2: PU breakdown ──
            pu_rockets: ad.pu_rockets || 0,
            pu_bombs: ad.pu_bombs || 0,
            pu_rainbows: ad.pu_rainbows || 0,
            pu_planes: ad.pu_planes || 0,
            // ── Group 3: Target bottleneck ──
            target_completion: metrics.target_completion || {},
            // ── Group 4: Board health ──
            shuffle_count: ad.shuffle_count || 0,
            min_valid_moves: ad.min_valid_moves != null ? ad.min_valid_moves : -1,
            // ── Group 5: Move efficiency ──
            moves_used: ad.moves_used || 0,
            total_moves: ad.total_moves || 0
        };

        var metric_url = "http://120.138.72.4:8081/metrics";
        try {
            fr.Network.xmlHttpRequestPost(metric_url, payload, function (result) {
                cc.log("[GameUI] sendMetrics →", result ? "OK" : "FAIL");
            });
        } catch (e) {
            cc.log("[GameUI] sendMetrics error:", e);
        }
    },

    // ── Agent relay methods ──────────────────────────────────────────────────

    _relayInit: function () {
        var bm = this.boardUI && this.boardUI.boardMgr;
        var levelId = bm ? bm.getLevelId() : "unknown";
        this._relaySessionId = "lvl" + levelId + "_" + Date.now();

        // Push initial board state
        this._relayPushState("playing");

        // Listen for turn end to push updated state
        var self = this;
        CoreGame.EventMgr.on("turnFinished", function () {
            self._relayPushState("playing");
        }, this);

        // Start polling for agent moves every 500 ms
        this._relayStartPoll();
        cc.log("[AgentRelay] init  session=" + this._relaySessionId);
    },

    _relayPushState: function (status) {
        var bm = this.boardUI && this.boardUI.boardMgr;
        if (!bm) return;

        var board = [];
        for (var r = 0; r < bm.rows; r++) {
            board[r] = [];
            for (var c = 0; c < bm.cols; c++) {
                var slot = bm.mapGrid[r][c];
                board[r][c] = (slot && slot.enable) ? slot.getType() : -1;
            }
        }

        var targets = {}, targetsCleared = {};
        for (var i = 0; i < bm.targetElements.length; i++) {
            var te = bm.targetElements[i];
            targets[te.id] = te.count;
            targetsCleared[te.id] = te.count - te.current;
        }

        // Convert getAllSwappableMoves() to [[r1,c1,r2,c2], ...] for agent
        var _dirDelta = {};
        _dirDelta[CoreGame.Direction.UP] = { dr: 1, dc: 0 };
        _dirDelta[CoreGame.Direction.DOWN] = { dr: -1, dc: 0 };
        _dirDelta[CoreGame.Direction.LEFT] = { dr: 0, dc: -1 };
        _dirDelta[CoreGame.Direction.RIGHT] = { dr: 0, dc: 1 };
        var validMoves = [];
        var swappable = bm.getAllSwappableMoves();
        for (var mi = 0; mi < swappable.length; mi++) {
            var m = swappable[mi];
            var d = _dirDelta[m.moveDirect];
            if (d) {
                validMoves.push([m.position.x, m.position.y,
                m.position.x + d.dr, m.position.y + d.dc]);
            }
        }

        var body = JSON.stringify({
            session_id: this._relaySessionId,
            level_id: bm.getLevelId(),
            board: board,
            rows: bm.rows,
            cols: bm.cols,
            targets: targets,
            targets_cleared: targetsCleared,
            moves_remaining: bm.numMove,
            total_moves: bm.totalMove,
            valid_moves: validMoves,
            status: status || "playing"
        });

        // try {
        //     var xhr = new XMLHttpRequest();
        //     xhr.open("POST", this.RELAY_URL + "/state", true);
        //     xhr.setRequestHeader("Content-Type", "application/json");
        //     xhr.send(body);
        // } catch (e) {
        //     cc.log("[AgentRelay] pushState error:", e);
        // }
    },

    _relayStartPoll: function () {
        var self = this;
        var cb = function () { self._relayPollMove(); };
        this._relayPollCb = cb;
        this.schedule(cb, 0.5);
    },

    _relayStopPoll: function () {
        if (this._relayPollCb) {
            this.unschedule(this._relayPollCb);
            this._relayPollCb = null;
        }
        CoreGame.EventMgr.off("turnFinished", this);
    },

    _relayPollMove: function () {
        var bm = this.boardUI && this.boardUI.boardMgr;
        if (!bm || !bm.canInteract()) return;

        var self = this;
        // try {
        //     var xhr = new XMLHttpRequest();
        //     xhr.open("GET", this.RELAY_URL + "/move/pending", true);
        //     xhr.onreadystatechange = function () {
        //         if (xhr.readyState !== 4 || xhr.status !== 200) return;
        //         var data;
        //         try { data = JSON.parse(xhr.responseText); } catch (e) { return; }
        //         if (!data || !data.move || data.move.row1 == null) return;

        //         var move = data.move;

        //         // Validate move is for current session
        //         if (move.session_id && move.session_id !== self._relaySessionId) return;

        //         // Re-check before executing (state may have changed during XHR round-trip)
        //         if (!bm.canInteract()) return;

        //         var slot1 = bm.getSlot(move.row1, move.col1);
        //         var slot2 = bm.getSlot(move.row2, move.col2);
        //         if (!slot1 || !slot2) {
        //             cc.log("[AgentRelay] invalid slot (" + move.row1 + "," + move.col1
        //                 + ")→(" + move.row2 + "," + move.col2 + ")");
        //         } else {
        //             cc.log("[AgentRelay] exec (" + move.row1 + "," + move.col1
        //                 + ")→(" + move.row2 + "," + move.col2 + ")");
        //             bm.trySwapSlots(slot1, slot2);
        //         }

        //         // Ack regardless (don't retry a bad move)
        //         try {
        //             var ack = new XMLHttpRequest();
        //             ack.open("POST", self.RELAY_URL + "/move/ack", true);
        //             ack.setRequestHeader("Content-Type", "application/json");
        //             ack.send(JSON.stringify({ session_id: self._relaySessionId }));
        //         } catch (e) { }
        //     };
        //     xhr.send();
        // } catch (e) {
        //     cc.log("[AgentRelay] pollMove error:", e);
        // }
    },

    // ── End agent relay ──────────────────────────────────────────────────────

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
        } else {
            heartAfter = heartBefore - 1;
        }

        let levelId = this.getLevel();
        let dataArr = [levelId, ResourceType.HEART, heartBefore, heartAfter, heartAfter - heartBefore];
        let actionType = this.isBossRun ? ActionType.BOSS_RUN_END_GAME_LOSE : ActionType.END_GAME_LOSE;
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
     * Show elements being thrown from in front of the screen onto the board.
     * Elements start large (as if close to camera) and fly to their grid position
     * while shrinking to normal scale, with staggered timing.
     * @param {Array} elementIds - Array of element type IDs to find and animate
     * @param {number} delayTime - Initial delay before the effect starts
     * @returns {number} Total duration of the effect
     */
    efxElementShowUp: function (elementIds, delayTime) {
        delayTime = delayTime || 0;
        var boardMgr = this.boardUI.boardMgr;

        // Collect all matching elements with their UIs
        var targets = [];
        var processed = [];
        for (var ei = 0; ei < elementIds.length; ei++) {
            var id = elementIds[ei];
            for (var r = 0; r < boardMgr.rows; r++) {
                for (var c = 0; c < boardMgr.cols; c++) {
                    var slot = boardMgr.getSlot(r, c);
                    if (!slot) continue;
                    for (var si = 0; si < slot.listElement.length; si++) {
                        var el = slot.listElement[si];
                        if (el.type === id && el.ui && processed.indexOf(el) < 0) {
                            processed.push(el);
                            targets.push(el);
                        }
                    }
                }
            }
        }

        if (targets.length === 0) {
            cc.log("efxElementShowUp: no matching elements found");
            return 0;
        }

        // Board center as the "throw origin" point
        var boardCenter = cc.p(
            boardMgr.cols * CoreGame.Config.CELL_SIZE * 0.5,
            boardMgr.rows * CoreGame.Config.CELL_SIZE * 0.5
        );

        var staggerDelay = 0.05;
        var throwDuration = 0.5;
        var startScale = 3.0;
        var bounceTime = 0.15;

        var boardParent = this.boardUI.root;

        for (var i = 0; i < targets.length; i++) {
            var el = targets[i];
            var elUI = el.ui;
            var originalPos = elUI.getPosition();
            var originalScale = elUI.getScale();

            // --- Create fake gems at this element's grid cells ---
            var elCells = el.cells || [];
            if (elCells.length === 0) {
                if (el.size && el.size.width && el.size.height) {
                    for (var sx = 0; sx < el.size.width; sx++) {
                        for (var sy = 0; sy < el.size.height; sy++) {
                            elCells.push({ r: el.position.x + sx, c: el.position.y + sy });
                        }
                    }
                } else {
                    elCells.push({ r: el.position.x, c: el.position.y });
                }
            }

            var fakeGems = [];
            for (var fi = 0; fi < elCells.length; fi++) {
                var cell = elCells[fi];
                var gemType = Math.floor(Math.random() * CoreGame.Config.NUM_GEN) + 1;
                var gemPath = "res/modules/game/element/" + gemType + ".png";
                var fakeGem = fr.createSprite(gemType + ".png", gemPath);
                var cellPos = boardMgr.gridToPixel(cell.r, cell.c);
                fakeGem.setPosition(cellPos);
                fakeGem.setLocalZOrder(CoreGame.Config.zOrder.GEM);
                fakeGem._fakeGemType = gemType;
                boardParent.addChild(fakeGem);
                fakeGems.push(fakeGem);
            }

            // Starting position: board center (as if thrown from the camera)
            var startPos = cc.p(
                boardCenter.x + (Math.random() - 0.5) * 500,
                boardCenter.y + (Math.random() * 0.5) * 500
            );

            // Hide initially
            elUI.setVisible(false);
            elUI.setScale(startScale);
            elUI.setPosition(startPos);
            elUI.setOpacity(0);
            elUI.setLocalZOrder(CoreGame.ZORDER_BOARD_EFFECT);
            elUI.setRotation((Math.random() - 0.5) * 30 + 360);

            var totalDelay = delayTime + i * staggerDelay;

            elUI.runAction(cc.sequence(
                cc.delayTime(totalDelay),
                cc.show(),
                cc.spawn(
                    cc.fadeIn(throwDuration * 0.3).easing(cc.easeOut(2.5)),
                    cc.moveTo(throwDuration, originalPos).easing(cc.easeOut(2.5)),
                    cc.scaleTo(throwDuration, originalScale * 0.85).easing(cc.easeIn(5)),
                    cc.rotateTo(throwDuration, 0).easing(cc.easeIn(1.5))
                ),
                // Landing: crush fake gems
                cc.callFunc(function (gems, parent) {
                    for (var gi = 0; gi < gems.length; gi++) {
                        var fg = gems[gi];
                        var fgType = fg._fakeGemType;

                        // Debris particles
                        if (fgType < debris_type_name.length) {
                            for (var di = 0; di < 2; di++) {
                                var debrisPos = cc.p(
                                    fg.x + (0.5 - Math.random()) * 20,
                                    fg.y + (0.5 - Math.random()) * 20
                                );
                                var wPos = parent.convertToWorldSpace(debrisPos);
                                var nodeTLFX = gv.createTLFX(
                                    debris_type_name[fgType],
                                    wPos,
                                    parent,
                                    CoreGame.Config.zOrder.EFF_EXPLODE
                                );
                                if (nodeTLFX) nodeTLFX.setScale(2 + Math.random() * 0.5);
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
                }.bind(null, fakeGems, boardParent)),
                // Landing bounce: squash then restore
                cc.spawn(
                    cc.scaleTo(bounceTime, originalScale * 1.15, originalScale * 0.85).easing(cc.easeOut(2.0))
                ),
                cc.scaleTo(bounceTime, originalScale).easing(cc.easeElasticOut(0.5)),
                cc.callFunc(function (ui, zOrder) {
                    ui.setLocalZOrder(zOrder);
                }.bind(null, elUI, CoreGame.Config.zOrder.GEM))
            ));
        }

        return delayTime + targets.length * staggerDelay + throwDuration + bounceTime * 2;
    },

    /**
     * Boss intro effect: find the boss element on the board, make it jump
     * from off-screen to the top of the board, then jump back to its slot.
     * @param {number} config - Effect's config
     * @returns {number} Total duration of the effect
     */
    efxBossShowUp: function (config) {
        let delayTime = config["delayTime"];
        let efxTime = 0.75;

        //Leaves animation
        // let leaves = gv.createSpineAnimation(resAni['spine_' + this.type]);

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
            cc.scaleTo(efxTime, this.boardUI.rawScale).easing(cc.easeBackOut())
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
            var gemPath = "res/modules/game/element/" + gemType + ".png";
            var fakeGem = fr.createSprite(gemType + ".png", gemPath);

            var cellPos = boardMgr.gridToPixel(cell.r, cell.c);
            fakeGem.setPosition(cellPos);
            fakeGem.setLocalZOrder(CoreGame.Config.zOrder.GEM);
            fakeGem._fakeGemType = gemType;
            fakeGem.setScale(CoreGame.ElementUI.GEM_SCALE);
            boardParent.addChild(fakeGem);
            fakeGems.push(fakeGem);
        }
        // --- End fake gems creation ---

        // Top of boardUI + offset above the board
        var boardTop = boardMgr.rows * CoreGame.Config.CELL_SIZE + boardMgr.boardOffsetY;
        var showUpPos = cc.p(originalPos.x - CoreGame.Config.CELL_SIZE, boardTop);
        // let animConfig =  GameBoardInfoUI.animMonster[bossElement.type];
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
        if (bossUI.sprBg) {
            bossUI.sprBg.setVisible(false);
        }

        bossUI.runAction(cc.sequence(
            cc.delayTime(delayTime),

            //Animation appear_01
            cc.show(),
            cc.callFunc(function () {
                bossUI.setHijacked(true);
                bossUI["ccSpine"].setAnimation(0, "Appear_01", false);

                fr.Sound.playSoundEffect(resSound.monster["10000"].roar, false);
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
                bossUI.setLocalZOrder(CoreGame.Config.zOrder.BOSS);
                bossUI["Sprite2D"].setVisible(true);

                if (bossUI.sprBg) {
                    bossUI.sprBg.setVisible(true);
                }

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
                                CoreGame.Config.zOrder.EFF_EXPLODE
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
            cc.scaleTo(efxTime, this.boardUI.rawScale).easing(cc.easeBackOut())
        ));

        //Tool and info layer
        this.gameBoardToolUI.setVisible(true);
        this.gameBoardToolUI.efxIn(delayTime + efxTime + 0.5, efxTime);

        this.gameBoardInfoUI.setVisible(true);
        this.gameBoardInfoUI.efxIn(delayTime, monsterBanner);
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
