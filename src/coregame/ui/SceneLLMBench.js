/**
 * SceneLLMBench.js — LLM auto-play benchmark scene.
 *
 * Select a level range (from → to) and N runs per level.
 * Collects win-rate, move usage, token stats, timing per run,
 * and sends metrics to LogServer for each completed game.
 *
 * Entry: from the AI popup menu in GameUI ("BENCH" button).
 */

CoreGame.SceneLLMBench = cc.Scene.extend({

    _levelFrom:  1,
    _levelTo:    1,
    _runsPerLevel: 5,

    // Runtime state
    _currentLevel: 1,
    _currentRun:   0,
    _results:      null,   // [{levelId, win, movesUsed, totalMoves, ...}, ...]
    _gameUI:       null,
    _phase:        "config",  // "config" | "running" | "results"

    // UI refs
    _configLayer:   null,
    _hudLayer:      null,
    _resultsLayer:  null,
    _fromValLabel:  null,
    _toValLabel:    null,
    _runsValLabel:  null,
    _hudLabel:      null,
    _runStartTime:  0,

    ctor: function () {
        this._super();
        this._results = [];
        this._buildConfigUI();
        return true;
    },

    // ══════════════════════════════════════════════════════════════════════════
    //  Config phase
    // ══════════════════════════════════════════════════════════════════════════

    _buildConfigUI: function () {
        var W = cc.winSize.width;
        var H = cc.winSize.height;
        var self = this;

        var layer = new cc.Layer();
        this.addChild(layer, 10);
        this._configLayer = layer;

        layer.addChild(new cc.LayerColor(cc.color(18, 18, 32, 255)));

        // Title
        var title = new cc.LabelTTF("LLM Benchmark", "Arial", 30);
        title.setPosition(W / 2, H - 50);
        title.setColor(cc.color(255, 220, 80));
        layer.addChild(title);

        // Provider / model info
        var info = new cc.LabelTTF(
            "Provider: " + (LLMConfig.provider || "?") + "  Model: " + (LLMConfig.model || "?"),
            "Arial", 14
        );
        info.setPosition(W / 2, H - 80);
        info.setColor(cc.color(160, 160, 160));
        layer.addChild(info);

        var cy = H / 2 + 60;

        // ── Level From row ──
        var fl = new cc.LabelTTF("From:", "Arial", 22);
        fl.setAnchorPoint(1, 0.5);
        fl.setPosition(W / 2 - 70, cy);
        layer.addChild(fl);

        this._fromValLabel = new cc.LabelTTF(String(this._levelFrom), "Arial", 26);
        this._fromValLabel.setPosition(W / 2, cy);
        this._fromValLabel.setColor(cc.color(255, 255, 255));
        layer.addChild(this._fromValLabel);

        layer.addChild(this._cfgBtn("\u221210", W / 2 - 80, cy, function () {
            self._levelFrom = Math.max(1, self._levelFrom - 10);
            self._fromValLabel.setString(String(self._levelFrom));
            self._clampTo();
        }));
        layer.addChild(this._cfgBtn("\u2212", W / 2 - 45, cy, function () {
            if (self._levelFrom > 1) self._levelFrom--;
            self._fromValLabel.setString(String(self._levelFrom));
            self._clampTo();
        }));
        layer.addChild(this._cfgBtn("+", W / 2 + 45, cy, function () {
            self._levelFrom++;
            self._fromValLabel.setString(String(self._levelFrom));
            self._clampTo();
        }));
        layer.addChild(this._cfgBtn("+10", W / 2 + 80, cy, function () {
            self._levelFrom += 10;
            self._fromValLabel.setString(String(self._levelFrom));
            self._clampTo();
        }));

        // ── Level To row ──
        cy -= 50;
        var tl = new cc.LabelTTF("To:", "Arial", 22);
        tl.setAnchorPoint(1, 0.5);
        tl.setPosition(W / 2 - 70, cy);
        layer.addChild(tl);

        this._toValLabel = new cc.LabelTTF(String(this._levelTo), "Arial", 26);
        this._toValLabel.setPosition(W / 2, cy);
        this._toValLabel.setColor(cc.color(255, 255, 255));
        layer.addChild(this._toValLabel);

        layer.addChild(this._cfgBtn("\u221210", W / 2 - 80, cy, function () {
            self._levelTo = Math.max(self._levelFrom, self._levelTo - 10);
            self._toValLabel.setString(String(self._levelTo));
        }));
        layer.addChild(this._cfgBtn("\u2212", W / 2 - 45, cy, function () {
            if (self._levelTo > self._levelFrom) self._levelTo--;
            self._toValLabel.setString(String(self._levelTo));
        }));
        layer.addChild(this._cfgBtn("+", W / 2 + 45, cy, function () {
            self._levelTo++;
            self._toValLabel.setString(String(self._levelTo));
        }));
        layer.addChild(this._cfgBtn("+10", W / 2 + 80, cy, function () {
            self._levelTo += 10;
            self._toValLabel.setString(String(self._levelTo));
        }));

        // ── Runs per level row ──
        cy -= 50;
        var rl = new cc.LabelTTF("Runs/lvl:", "Arial", 22);
        rl.setAnchorPoint(1, 0.5);
        rl.setPosition(W / 2 - 70, cy);
        layer.addChild(rl);

        this._runsValLabel = new cc.LabelTTF(String(this._runsPerLevel), "Arial", 26);
        this._runsValLabel.setPosition(W / 2, cy);
        this._runsValLabel.setColor(cc.color(255, 255, 255));
        layer.addChild(this._runsValLabel);

        layer.addChild(this._cfgBtn("\u2212", W / 2 - 45, cy, function () {
            if (self._runsPerLevel > 1) self._runsPerLevel--;
            self._runsValLabel.setString(String(self._runsPerLevel));
        }));
        layer.addChild(this._cfgBtn("+", W / 2 + 45, cy, function () {
            self._runsPerLevel++;
            self._runsValLabel.setString(String(self._runsPerLevel));
        }));
        layer.addChild(this._cfgBtn("+10", W / 2 + 80, cy, function () {
            self._runsPerLevel += 10;
            self._runsValLabel.setString(String(self._runsPerLevel));
        }));

        // ── Total display ──
        cy -= 35;
        this._totalLabel = new cc.LabelTTF("", "Arial", 14);
        this._totalLabel.setPosition(W / 2, cy);
        this._totalLabel.setColor(cc.color(140, 140, 140));
        layer.addChild(this._totalLabel);
        this._updateTotalLabel();

        // ── Start button ──
        cy -= 45;
        var startBtn = new ccui.Button(
            "res/tool/res/btn_green_2.png",
            "res/tool/res/btn_green_2.png"
        );
        startBtn.setScale9Enabled(true);
        startBtn.setContentSize(160, 44);
        startBtn.setTitleText("\u25b6  START");
        startBtn.setTitleFontSize(22);
        startBtn.setTitleColor(cc.color(255, 255, 255));
        startBtn.setPosition(W / 2, cy);
        startBtn.addTouchEventListener(function (s, t) {
            if (t === ccui.Widget.TOUCH_ENDED) self._startBenchmark();
        });
        layer.addChild(startBtn);

        // ── Back button ──
        var backBtn = new ccui.Button(
            "res/tool/res/btn_green_2.png",
            "res/tool/res/btn_green_2.png"
        );
        backBtn.setScale9Enabled(true);
        backBtn.setContentSize(120, 36);
        backBtn.setTitleText("\u2190 Exit");
        backBtn.setTitleFontSize(18);
        backBtn.setTitleColor(cc.color(180, 180, 180));
        backBtn.setPosition(W / 2, cy - 60);
        backBtn.addTouchEventListener(function (s, t) {
            if (t === ccui.Widget.TOUCH_ENDED) self._exitScene();
        });
        layer.addChild(backBtn);
    },

    /** Ensure _levelTo >= _levelFrom */
    _clampTo: function () {
        if (this._levelTo < this._levelFrom) {
            this._levelTo = this._levelFrom;
            if (this._toValLabel) this._toValLabel.setString(String(this._levelTo));
        }
    },

    _updateTotalLabel: function () {
        if (!this._totalLabel) return;
        var nLevels = this._levelTo - this._levelFrom + 1;
        this._totalLabel.setString(
            nLevels + " level" + (nLevels > 1 ? "s" : "") +
            " \u00d7 " + this._runsPerLevel + " = " +
            (nLevels * this._runsPerLevel) + " total games"
        );
    },

    _cfgBtn: function (text, x, y, cb) {
        var self = this;
        var btn = new ccui.Button(
            "res/tool/res/btn_green_2.png",
            "res/tool/res/btn_green_2.png"
        );
        btn.setScale9Enabled(true);
        btn.setContentSize(text.length > 2 ? 52 : 36, 32);
        btn.setTitleText(text);
        btn.setTitleFontSize(18);
        btn.setTitleColor(cc.color(220, 220, 220));
        btn.setPosition(x, y);
        btn.addTouchEventListener(function (s, t) {
            if (t === ccui.Widget.TOUCH_ENDED) {
                cb();
                self._updateTotalLabel();
            }
        });
        return btn;
    },

    // ══════════════════════════════════════════════════════════════════════════
    //  Running phase
    // ══════════════════════════════════════════════════════════════════════════

    _startBenchmark: function () {
        this._currentLevel = this._levelFrom;
        this._currentRun   = 0;
        this._results      = [];
        this._phase        = "running";
        if (this._configLayer)  this._configLayer.setVisible(false);
        if (this._resultsLayer) { this.removeChild(this._resultsLayer); this._resultsLayer = null; }
        this._buildHUD();
        this._runNext();
    },

    _buildHUD: function () {
        if (this._hudLayer) { this.removeChild(this._hudLayer); this._hudLayer = null; }
        var W = cc.winSize.width;
        var H = cc.winSize.height;
        var self = this;

        var hud = new cc.Layer();
        this.addChild(hud, 100);
        this._hudLayer = hud;

        var bar = new cc.LayerColor(cc.color(0, 0, 0, 180), W, 32);
        bar.setPosition(0, H - 32);
        hud.addChild(bar);

        this._hudLabel = new cc.LabelTTF("", "Arial", 16);
        this._hudLabel.setAnchorPoint(0, 0.5);
        this._hudLabel.setPosition(10, H - 16);
        this._hudLabel.setColor(cc.color(255, 255, 200));
        hud.addChild(this._hudLabel);

        var stopBtn = new ccui.Button(
            "res/tool/res/btn_green_2.png",
            "res/tool/res/btn_green_2.png"
        );
        stopBtn.setScale9Enabled(true);
        stopBtn.setContentSize(70, 26);
        stopBtn.setTitleText("\u25a0 STOP");
        stopBtn.setTitleFontSize(14);
        stopBtn.setTitleColor(cc.color(255, 80, 80));
        stopBtn.setPosition(W - 45, H - 16);
        stopBtn.addTouchEventListener(function (s, t) {
            if (t === ccui.Widget.TOUCH_ENDED) self._stopBenchmark();
        });
        hud.addChild(stopBtn);

        // ── Reasoning panel (same layout as GameUI) ──
        var panelH = 190, panelY = 80;
        var reasonBg = new cc.LayerColor(cc.color(10, 10, 30, 220), W, panelH);
        reasonBg.setPosition(0, panelY);
        reasonBg.setVisible(false);
        this.addChild(reasonBg, 99);
        this._reasonBg = reasonBg;

        var scrollW = W - 12, scrollH = panelH - 8;
        var reasonScroll = new ccui.ScrollView();
        reasonScroll.setDirection(ccui.ScrollView.DIR_VERTICAL);
        reasonScroll.setContentSize(cc.size(scrollW, scrollH));
        reasonScroll.setPosition(6, panelY + 4);
        reasonScroll.setBounceEnabled(false);
        reasonScroll.setScrollBarEnabled(true);
        reasonScroll.setScrollBarOpacity(140);
        reasonScroll.setVisible(false);
        this.addChild(reasonScroll, 100);
        this._reasonScroll = reasonScroll;

        var richW = scrollW - 16, richH = 600;
        var richText = new ccui.RichText();
        richText.setContentSize(cc.size(richW, richH));
        richText.ignoreContentAdaptWithSize(false);
        richText.setAnchorPoint(cc.p(0, 1));
        richText.setPosition(8, richH);
        reasonScroll.setInnerContainerSize(cc.size(scrollW, richH));
        reasonScroll.getInnerContainer().addChild(richText, 1);
        this._richText = richText;
        this._richElemCount = 0;

        this._updateHUD();
    },

    _updateHUD: function () {
        if (!this._hudLabel) return;
        var w = 0, l = 0;
        for (var i = 0; i < this._results.length; i++) {
            if (this._results[i].win) w++; else l++;
        }
        var totalGames = (this._levelTo - this._levelFrom + 1) * this._runsPerLevel;
        var completed  = this._results.length;
        this._hudLabel.setString(
            "Lv" + this._currentLevel +
            " run " + (this._currentRun + 1) + "/" + this._runsPerLevel +
            "  |  " + completed + "/" + totalGames +
            "  |  W:" + w + " L:" + l
        );
    },

    /** Determine which level + run we are on, then load and play */
    _runNext: function () {
        // Clean up previous run
        if (this._gameUI) {
            CoreGame.EventMgr.off("turnFinished", this._gameUI);
            this.removeChild(this._gameUI);
            this._gameUI = null;
        }
        CoreGame.BoardUI.instance = null;

        // Advance: if we finished all runs for current level, go to next level
        if (this._currentRun >= this._runsPerLevel) {
            this._currentLevel++;
            this._currentRun = 0;
        }

        // Check if all levels done
        if (this._currentLevel > this._levelTo || this._phase !== "running") {
            this._showResults();
            return;
        }

        // Load level
        var mapData;
        try {
            mapData = levelMgr.getMapDataConfig(this._currentLevel);
        } catch (e) {
            cc.error("[LLMBench] Cannot load level " + this._currentLevel + ": " + e);
            // Skip to next level
            this._currentLevel++;
            this._currentRun = 0;
            var self = this;
            this.scheduleOnce(function () { self._runNext(); }, 0.5);
            return;
        }
        if (!mapData) {
            cc.error("[LLMBench] Level " + this._currentLevel + " not found");
            this._currentLevel++;
            this._currentRun = 0;
            var self = this;
            this.scheduleOnce(function () { self._runNext(); }, 0.5);
            return;
        }

        // Create GameUI (deep-clone mapData so cache stays clean)
        var mapClone = JSON.parse(JSON.stringify(mapData));
        var gameUI = new CoreGame.GameUI({ mapConfig: mapClone }, false);
        this.addChild(gameUI, 1);
        this._gameUI = gameUI;
        gameUI.efxStart();

        // Override onEndGame — skip end-game GUI, but still send metrics
        var self = this;
        gameUI.onEndGame = function (isWin) {
            // Call AdaptiveTPP.onLevelEnd + sendMetrics (same as original GameUI.onEndGame)
            var bm = gameUI.boardUI && gameUI.boardUI.boardMgr;
            if (CoreGame.AdaptiveTPP && bm) {
                CoreGame.AdaptiveTPP.onLevelEnd(bm._tppMovesUsed || 0, !!isWin);
            }
            gameUI.sendMetrics(gameUI._buildMetrics(isWin));

            self._onRunComplete(!!isWin);
        };

        // Auto-start LLM agent after board settles
        this._runStartTime = Date.now();
        this._updateHUD();
        this.scheduleOnce(function () { self._autoStartAI(); }, 1.0);
    },

    _autoStartAI: function () {
        var gameUI = this._gameUI;
        if (!gameUI || this._phase !== "running") return;
        var bm = gameUI.boardUI && gameUI.boardUI.boardMgr;
        if (!bm) { cc.error("[LLMBench] No BoardMgr"); return; }

        var self = this;
        var agent = new CoreGame.LLMAgent();
        gameUI._aiAgent = agent;

        // ── Reasoning display (same as GameUI) ──
        var richText    = this._richText;
        var reasonScroll = this._reasonScroll;
        var reasonBg    = this._reasonBg;
        var richElemCount = this._richElemCount;

        agent.onReasoning = function (planText, reasonText) {
            if (!reasonScroll || !richText) return;
            for (var c = 0; c < richElemCount; c++) richText.removeElement(0);
            richElemCount = 0;

            function push(text, color, size) {
                richText.pushBackElement(
                    new ccui.RichElementText(++richElemCount, color, 255, text, "Arial", size)
                );
            }
            if (planText)  push("\u25c6 Plan:  " + planText, cc.color(160, 230, 255), 19);
            if (planText && reasonText) push("\n \n", cc.color(0, 0, 0), 8);
            if (reasonText) push("\u25b6 AI:  " + reasonText, cc.color(255, 240, 160), 19);

            richText.formatText();
            self._richElemCount = richElemCount;
            reasonScroll.setVisible(true);
            if (reasonBg) reasonBg.setVisible(true);
        };

        // ── Status / thinking timer on HUD ──
        agent.onStatus = function (status) {
            if (status === "thinking") {
                self._thinkStartTime = Date.now();
                if (self._thinkTimer) clearInterval(self._thinkTimer);
                self._thinkTimer = setInterval(function () {
                    if (!self._hudLabel) return;
                    var elapsed = (Date.now() - self._thinkStartTime) / 1000;
                    var w = 0, l = 0;
                    for (var i = 0; i < self._results.length; i++) {
                        if (self._results[i].win) w++; else l++;
                    }
                    var totalGames = (self._levelTo - self._levelFrom + 1) * self._runsPerLevel;
                    var completed  = self._results.length;
                    self._hudLabel.setString(
                        "Lv" + self._currentLevel +
                        " run " + (self._currentRun + 1) + "/" + self._runsPerLevel +
                        "  |  " + completed + "/" + totalGames +
                        "  |  W:" + w + " L:" + l +
                        "  |  Thinking... " + elapsed.toFixed(1) + "s"
                    );
                }, 100);
            } else {
                if (self._thinkTimer) { clearInterval(self._thinkTimer); self._thinkTimer = null; }
                self._updateHUD();
            }
        };

        agent.start(bm);
        agent.onTurnReady();   // kick off the first move
    },

    _onRunComplete: function (isWin) {
        var gameUI = this._gameUI;
        var bm = gameUI && gameUI.boardUI && gameUI.boardUI.boardMgr;

        // Collect stats
        var movesUsed  = bm ? (bm.totalMove - bm.numMove) : 0;
        var totalMoves = bm ? bm.totalMove : 0;
        var tokensIn = 0, tokensOut = 0, calls = 0;
        if (gameUI && gameUI._aiAgent) {
            var ts = gameUI._aiAgent._tokenStats;
            tokensIn  = ts.in;
            tokensOut = ts.out;
            calls     = ts.calls;
        }
        var elapsed = (Date.now() - this._runStartTime) / 1000;

        // Stop agent + cleanup timers
        if (gameUI && gameUI._aiAgent) {
            gameUI._aiAgent.stop();
            gameUI._aiAgent = null;
        }
        if (this._thinkTimer) {
            clearInterval(this._thinkTimer);
            this._thinkTimer = null;
        }
        if (gameUI && gameUI._thinkTimer) {
            clearInterval(gameUI._thinkTimer);
            gameUI._thinkTimer = null;
        }
        // Hide reasoning panel between runs
        if (this._reasonScroll) this._reasonScroll.setVisible(false);
        if (this._reasonBg)     this._reasonBg.setVisible(false);

        this._results.push({
            levelId:    this._currentLevel,
            win:        isWin,
            movesUsed:  movesUsed,
            totalMoves: totalMoves,
            tokensIn:   tokensIn,
            tokensOut:  tokensOut,
            calls:      calls,
            elapsed:    elapsed,
        });

        cc.log("[LLMBench] Lv" + this._currentLevel +
               " run " + (this._currentRun + 1) + "/" + this._runsPerLevel +
               "  " + (isWin ? "WIN" : "LOSE") +
               "  moves=" + movesUsed + "/" + totalMoves +
               "  tokens=" + tokensIn + "/" + tokensOut +
               "  calls=" + calls +
               "  time=" + elapsed.toFixed(1) + "s");

        this._currentRun++;
        this._updateHUD();

        if (this._phase === "running") {
            var self = this;
            this.scheduleOnce(function () { self._runNext(); }, 1.5);
        } else {
            this._showResults();
        }
    },

    _stopBenchmark: function () {
        this._phase = "stopped";
        if (this._thinkTimer) { clearInterval(this._thinkTimer); this._thinkTimer = null; }
        if (this._gameUI && this._gameUI._aiAgent) {
            this._gameUI._aiAgent.stop();
            this._gameUI._aiAgent = null;
        }
        this._showResults();
    },

    // ══════════════════════════════════════════════════════════════════════════
    //  Results phase
    // ══════════════════════════════════════════════════════════════════════════

    _showResults: function () {
        this._phase = "results";

        // Clean up game
        if (this._gameUI) {
            CoreGame.EventMgr.off("turnFinished", this._gameUI);
            if (this._gameUI._aiAgent) {
                this._gameUI._aiAgent.stop();
                this._gameUI._aiAgent = null;
            }
            this.removeChild(this._gameUI);
            this._gameUI = null;
        }
        CoreGame.BoardUI.instance = null;
        if (this._hudLayer)     this._hudLayer.setVisible(false);
        if (this._reasonScroll) this._reasonScroll.setVisible(false);
        if (this._reasonBg)     this._reasonBg.setVisible(false);

        var W = cc.winSize.width;
        var H = cc.winSize.height;
        var self = this;

        var layer = new cc.Layer();
        this.addChild(layer, 50);
        this._resultsLayer = layer;

        layer.addChild(new cc.LayerColor(cc.color(18, 18, 32, 255)));

        // ── Group results by level ──
        var byLevel = {};
        var levelOrder = [];
        var n = this._results.length;
        var totalWins = 0, totalTIn = 0, totalTOut = 0, totalCalls = 0, totalTime = 0;
        for (var i = 0; i < n; i++) {
            var r = this._results[i];
            var lid = r.levelId;
            if (!byLevel[lid]) {
                byLevel[lid] = { wins: 0, count: 0, usedSum: 0, movSum: 0, runs: [] };
                levelOrder.push(lid);
            }
            var g = byLevel[lid];
            g.count++;
            if (r.win) { g.wins++; totalWins++; }
            g.usedSum += r.movesUsed;
            g.movSum  += r.totalMoves;
            g.runs.push(r);
            totalTIn   += r.tokensIn;
            totalTOut  += r.tokensOut;
            totalCalls += r.calls;
            totalTime  += r.elapsed;
        }

        var lines = [];
        var rangeStr = (this._levelFrom === this._levelTo)
            ? "Level " + this._levelFrom
            : "Levels " + this._levelFrom + "\u2013" + this._levelTo;
        lines.push(rangeStr + "  |  " + n + " game" + (n > 1 ? "s" : ""));
        lines.push("Provider: " + (LLMConfig.provider || "?") + "  Model: " + (LLMConfig.model || "?"));
        lines.push("");

        // Overall summary
        lines.push("Overall win rate:  " + totalWins + "/" + n +
                    " (" + (n ? Math.round(totalWins / n * 100) : 0) + "%)");
        lines.push("Avg calls/game:    " + (n ? (totalCalls / n).toFixed(1) : "-"));
        lines.push("Avg tokens/game:   " + (n ? Math.round(totalTIn / n) : "-") +
                    " in / " + (n ? Math.round(totalTOut / n) : "-") + " out");
        lines.push("Avg time/game:     " + (n ? (totalTime / n).toFixed(1) : "-") + "s");
        lines.push("Total tokens:      " + totalTIn + " in / " + totalTOut + " out");

        // Per-level summary
        if (levelOrder.length > 1) {
            lines.push("");
            lines.push("\u2550\u2550\u2550 Per-level summary \u2550\u2550\u2550");
            for (var li = 0; li < levelOrder.length; li++) {
                var lk = levelOrder[li];
                var lg = byLevel[lk];
                lines.push(
                    "Lv" + lk + ":  " +
                    lg.wins + "/" + lg.count + " win" +
                    " (" + Math.round(lg.wins / lg.count * 100) + "%)" +
                    "  avg " + (lg.usedSum / lg.count).toFixed(1) + "/" +
                    Math.round(lg.movSum / lg.count) + " moves"
                );
            }
        }

        // Per-run detail
        lines.push("");
        lines.push("\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500");
        for (var j = 0; j < n; j++) {
            var rr = this._results[j];
            lines.push(
                "#" + (j + 1) +
                " Lv" + rr.levelId + "  " +
                (rr.win ? "\u2713 Win " : "\u2717 Lose") + "  " +
                rr.movesUsed + "/" + rr.totalMoves + " moves  " +
                rr.calls + " calls  " +
                rr.elapsed.toFixed(1) + "s"
            );
        }

        // ── Title ──
        var resTitle = new cc.LabelTTF("Benchmark Results", "Arial", 26);
        resTitle.setPosition(W / 2, H - 30);
        resTitle.setColor(cc.color(255, 220, 80));
        layer.addChild(resTitle);

        // ── Scrollable results text ──
        var scrollW = W - 40, scrollH = H - 130;
        var scroll = new ccui.ScrollView();
        scroll.setDirection(ccui.ScrollView.DIR_VERTICAL);
        scroll.setContentSize(cc.size(scrollW, scrollH));
        scroll.setPosition(20, 70);
        scroll.setBounceEnabled(false);
        scroll.setScrollBarEnabled(true);
        scroll.setScrollBarOpacity(140);
        layer.addChild(scroll);

        var text = lines.join("\n");
        var lbl = new cc.LabelTTF(text, "Arial", 15);
        lbl.setAnchorPoint(0, 1);
        lbl.setColor(cc.color(220, 220, 220));
        lbl.setDimensions(cc.size(scrollW - 20, 0));
        lbl.setHorizontalAlignment(cc.TEXT_ALIGNMENT_LEFT);

        var lblH = Math.max(scrollH, lbl.getContentSize().height + 20);
        lbl.setPosition(10, lblH);
        scroll.setInnerContainerSize(cc.size(scrollW, lblH));
        scroll.getInnerContainer().addChild(lbl);

        // ── Buttons ──
        var againBtn = new ccui.Button(
            "res/tool/res/btn_green_2.png", "res/tool/res/btn_green_2.png"
        );
        againBtn.setScale9Enabled(true);
        againBtn.setContentSize(140, 38);
        againBtn.setTitleText("\u25b6 Run Again");
        againBtn.setTitleFontSize(18);
        againBtn.setTitleColor(cc.color(255, 255, 255));
        againBtn.setPosition(W / 2 - 85, 35);
        againBtn.addTouchEventListener(function (s, t) {
            if (t === ccui.Widget.TOUCH_ENDED) {
                self.removeChild(self._resultsLayer);
                self._resultsLayer = null;
                self._startBenchmark();
            }
        });
        layer.addChild(againBtn);

        var cfgBtn = new ccui.Button(
            "res/tool/res/btn_green_2.png", "res/tool/res/btn_green_2.png"
        );
        cfgBtn.setScale9Enabled(true);
        cfgBtn.setContentSize(100, 38);
        cfgBtn.setTitleText("\u2190 Config");
        cfgBtn.setTitleFontSize(18);
        cfgBtn.setTitleColor(cc.color(180, 180, 180));
        cfgBtn.setPosition(W / 2 + 85, 35);
        cfgBtn.addTouchEventListener(function (s, t) {
            if (t === ccui.Widget.TOUCH_ENDED) self._backToConfig();
        });
        layer.addChild(cfgBtn);
    },

    // ══════════════════════════════════════════════════════════════════════════
    //  Navigation
    // ══════════════════════════════════════════════════════════════════════════

    _backToConfig: function () {
        if (this._resultsLayer) { this.removeChild(this._resultsLayer); this._resultsLayer = null; }
        if (this._hudLayer)     { this._hudLayer.setVisible(false); }
        if (this._gameUI) {
            CoreGame.EventMgr.off("turnFinished", this._gameUI);
            if (this._gameUI._aiAgent) { this._gameUI._aiAgent.stop(); this._gameUI._aiAgent = null; }
            this.removeChild(this._gameUI);
            this._gameUI = null;
        }
        CoreGame.BoardUI.instance = null;
        if (this._configLayer) this._configLayer.setVisible(true);
        this._phase = "config";
    },

    _exitScene: function () {
        this._backToConfig();
        // Navigate back — try lobby, fallback to TestScene
        try {
            if (typeof SceneLobby !== "undefined") {
                SceneLoading.openWithBuffer(SceneLobby);
            } else {
                SceneLoading.openWithBuffer(CoreGame.TestScene);
            }
        } catch (e) {
            cc.log("[LLMBench] Cannot navigate back: " + e);
        }
    },
});
