/**
 * DifficultyCalc.js
 * Async difficulty calculator for Match-3 levels.
 *
 * Every move is scheduled with setTimeout(..., 0) so Cocos retains control of
 * the main loop between steps — preventing freezes / crashes.
 *
 * API (all async):
 *   CoreGame.DifficultyCalc.calculate(boardMgr, levelConfig, onProgress, onComplete)
 *
 *   levelConfig = {
 *     maxMoves : <number>,          // move limit
 *     targets  : { <typeId>: <count>, ... }  // elements to destroy
 *   }
 *   onProgress(step, totalSteps, message)   -- optional
 *   onComplete(report)                       -- called when finished
 *
 * report = {
 *   difficulty, flags,
 *   random_win_rate, greedy_win_rate,
 *   skill_gap, rng_penalty,
 *   avg_fail_turn, avg_no_progress_turns
 * }
 */
var CoreGame = CoreGame || {};

// ---------------------------------------------------------------------------
// RandomBot
// ---------------------------------------------------------------------------
CoreGame.RandomBot = {
    getAction: function (boardMgr /*, levelConfig */) {
        var moves = boardMgr.getAllSwappableMoves();
        if (moves.length === 0) return null;
        return moves[Math.floor(Math.random() * moves.length)];
    }
};

// ---------------------------------------------------------------------------
// GreedyBot
// ---------------------------------------------------------------------------
CoreGame.GreedyBot = {
    getAction: function (boardMgr, levelConfig) {
        var moves = boardMgr.getAllSwappableMoves();
        if (moves.length === 0) return null;

        var targetTypes = (levelConfig && levelConfig.targetTypes)
            ? levelConfig.targetTypes
            : CoreGame.DifficultyCalc._extractTargetTypes(levelConfig);

        var bestScore        = -Infinity;
        var bestAction       = null;
        var bestTilesRemoved = -1;

        for (var i = 0; i < moves.length; i++) {
            var move   = moves[i];
            var result = boardMgr.simulateSwap(move.position, move.moveDirect);
            var score  = this._calcScore(result, move, targetTypes, boardMgr.rows);

            var isBetter = (score > bestScore) ||
                           (Math.abs(score - bestScore) < 1e-9 && result.tilesRemoved > bestTilesRemoved);

            if (isBetter) {
                bestScore        = score;
                bestAction       = move;
                bestTilesRemoved = result.tilesRemoved;
            }
        }
        return bestAction;
    },

    _calcScore: function (simResult, move, targetTypes, numRows) {
        var targetsCleared = 0;
        var removedTypes   = simResult.removedTypes;
        for (var i = 0; i < removedTypes.length; i++) {
            if (targetTypes.indexOf(removedTypes[i]) !== -1) targetsCleared++;
        }
        var rows     = numRows || 8;
        var rowScore = (rows - move.position.x) * 0.1;
        return (simResult.tilesRemoved * 1.0) + (simResult.comboCount * 2.0) +
               (targetsCleared * 10.0) + rowScore - 0.1;
    }
};

// ---------------------------------------------------------------------------
// DifficultyCalc
// ---------------------------------------------------------------------------
CoreGame.DifficultyCalc = {

    NUM_EPISODES: 20,

    // -----------------------------------------------------------------------
    // Public entry point — fully async
    // -----------------------------------------------------------------------
    /**
     * @param {BoardMgr}  boardMgr
     * @param {Object}    levelConfig  { maxMoves, targets }
     * @param {Function}  [onProgress] (step, total, state)
     *   state = { phase: "start", numEpisodes }
     *         | { phase: "episode", bot, episode, numEpisodes, win, movesUsed }
     *         | { phase: "done" }
     * @param {Function}  onComplete   (report)
     */
    calculate: function (boardMgr, levelConfig, onProgress, onComplete) {
        var self         = this;
        var initialState = boardMgr.getBoardState();
        var total        = self.NUM_EPISODES * 2;

        if (onProgress) onProgress(0, total, { phase: "start", numEpisodes: self.NUM_EPISODES });

        self._runBatchAsync(boardMgr, initialState, CoreGame.RandomBot, levelConfig,
            onProgress, 0, total,
            function (randomMetrics) {
                self._runBatchAsync(boardMgr, initialState, CoreGame.GreedyBot, levelConfig,
                    onProgress, self.NUM_EPISODES, total,
                    function (greedyMetrics) {
                        boardMgr.setBoardState(initialState);
                        if (onProgress) onProgress(total, total, { phase: "done" });

                        var report = self._computeDifficulty(
                            randomMetrics, greedyMetrics, levelConfig.maxMoves || 30);
                        if (onComplete) onComplete(report);
                    }
                );
            }
        );
    },

    // -----------------------------------------------------------------------
    // Internal — batch runner
    // -----------------------------------------------------------------------
    _runBatchAsync: function (boardMgr, initialState, bot, levelConfig, onProgress, stepOffset, totalSteps, callback) {
        var self    = this;
        var botName = (bot === CoreGame.RandomBot) ? "RandomBot" : "GreedyBot";
        var wins  = [], movesUsedList = [], failTurns = [],
            noProgressList = [], validMovesAll = [];
        var ep = 0;

        function runNextEpisode() {
            if (ep >= self.NUM_EPISODES) {
                var allValidCounts = [];
                for (var i = 0; i < validMovesAll.length; i++) {
                    var h = validMovesAll[i];
                    for (var j = 0; j < h.length; j++) allValidCounts.push(h[j]);
                }
                callback({
                    win_rate:              self._mean(wins),
                    win_std:               self._std(wins),
                    avg_fail_turn:         failTurns.length > 0 ? self._mean(failTurns) : 0,
                    avg_no_progress_turns: self._mean(noProgressList),
                    avg_valid_moves:       allValidCounts.length > 0 ? self._mean(allValidCounts) : 0
                });
                return;
            }

            self._runEpisodeAsync(boardMgr, initialState, bot, levelConfig, function (result) {
                wins.push(result.win ? 1.0 : 0.0);
                movesUsedList.push(result.movesUsed);
                if (!result.win) failTurns.push(result.movesUsed);
                noProgressList.push(result.noProgressTurns);
                validMovesAll.push(result.validMovesHistory);
                ep++;
                if (onProgress) {
                    onProgress(stepOffset + ep, totalSteps, {
                        phase:       "episode",
                        bot:         botName,
                        episode:     ep,
                        numEpisodes: self.NUM_EPISODES,
                        win:         result.win,
                        movesUsed:   result.movesUsed
                    });
                }
                setTimeout(runNextEpisode, 0);   // next episode — yield to game loop
            });
        }

        setTimeout(runNextEpisode, 0);
    },

    // -----------------------------------------------------------------------
    // Internal — single episode
    // -----------------------------------------------------------------------
    _runEpisodeAsync: function (boardMgr, initialState, bot, levelConfig, callback) {
        var self = this;
        boardMgr.setBoardState(initialState);

        var maxMoves     = levelConfig.maxMoves || 30;
        var targets      = levelConfig.targets  || {};
        var targetTypes  = levelConfig.targetTypes || self._extractTargetTypes(levelConfig);

        var remainingTargets = {};
        for (var t in targets) remainingTargets[parseInt(t)] = targets[t];

        var movesUsed        = 0;
        var win              = false;
        var noProgressTurns  = 0;
        var validMovesHistory= [];

        // Run up to MOVES_PER_SLICE moves synchronously, then yield one frame.
        var MOVES_PER_SLICE = 10;

        function runSlice() {
            for (var s = 0; s < MOVES_PER_SLICE; s++) {
                var availableMoves = boardMgr.getAllSwappableMoves();
                validMovesHistory.push(availableMoves.length);

                if (movesUsed >= maxMoves || availableMoves.length === 0) {
                    callback({ win: win, movesUsed: movesUsed,
                               noProgressTurns: noProgressTurns,
                               validMovesHistory: validMovesHistory });
                    return;
                }

                var action = bot.getAction(boardMgr, levelConfig);
                if (!action) {
                    callback({ win: win, movesUsed: movesUsed,
                               noProgressTurns: noProgressTurns,
                               validMovesHistory: validMovesHistory });
                    return;
                }

                boardMgr.quickSwap(action.position, action.moveDirect, true);
                movesUsed++;

                var removedTypes = boardMgr.removedElementTypes;
                var hadProgress  = false;
                for (var i = 0; i < removedTypes.length; i++) {
                    var type = removedTypes[i];
                    if (remainingTargets[type] !== undefined && remainingTargets[type] > 0) {
                        remainingTargets[type]--;
                        hadProgress = true;
                    }
                }
                if (!hadProgress) noProgressTurns++;

                if (self._allTargetsMet(remainingTargets)) {
                    win = true;
                    callback({ win: true, movesUsed: movesUsed,
                               noProgressTurns: noProgressTurns,
                               validMovesHistory: validMovesHistory });
                    return;
                }
            }

            setTimeout(runSlice, 0);   // yield to Cocos game loop every MOVES_PER_SLICE moves
        }

        setTimeout(runSlice, 0);
    },

    // -----------------------------------------------------------------------
    // Helpers
    // -----------------------------------------------------------------------
    _extractTargetTypes: function (levelConfig) {
        if (!levelConfig || !levelConfig.targets) return [];
        return Object.keys(levelConfig.targets).map(Number);
    },

    _allTargetsMet: function (remainingTargets) {
        for (var t in remainingTargets) {
            if (remainingTargets[t] > 0) return false;
        }
        return true;
    },

    /**
     * Formula (mirrors Python m3gym/difficulty.py):
     *   difficulty = (1 - greedy_wr) * 0.6
     *              + (1 - skill_gap) * 0.25
     *              + random_std      * 0.15
     *
     * Flags: UNFAIR_ABSOLUTE | RNG_HEAVY | FAKE_DIFFICULTY | EARLY_FAIL
     */
    _computeDifficulty: function (randomMetrics, greedyMetrics, maxMoves) {
        var gwr  = greedyMetrics.win_rate;
        var rwr  = randomMetrics.win_rate;
        var rstd = randomMetrics.win_std;
        var aft  = greedyMetrics.avg_fail_turn;

        var base  = 1.0 - gwr;
        var gap   = Math.max(0.0, gwr - rwr);
        var diff  = Math.max(0.0, Math.min(1.0,
                        (base * 0.6) + ((1.0 - gap) * 0.25) + (rstd * 0.15)));

        var flags = [];
        if (gwr < 0.20 && rwr < 0.05)            flags.push("UNFAIR_ABSOLUTE");
        if (gap < 0.10 && rstd > 0.15)            flags.push("RNG_HEAVY");
        if (gwr > 0.70 && rwr > 0.40)             flags.push("FAKE_DIFFICULTY");
        if (aft < maxMoves * 0.4 && gwr < 0.40)  flags.push("EARLY_FAIL");

        return {
            difficulty:            diff,
            flags:                 flags,
            random_win_rate:       rwr,
            greedy_win_rate:       gwr,
            skill_gap:             gap,
            rng_penalty:           rstd,
            avg_fail_turn:         aft,
            avg_no_progress_turns: greedyMetrics.avg_no_progress_turns
        };
    },

    _mean: function (arr) {
        if (!arr.length) return 0;
        var s = 0; for (var i = 0; i < arr.length; i++) s += arr[i];
        return s / arr.length;
    },

    _std: function (arr) {
        if (!arr.length) return 0;
        var m = this._mean(arr), v = 0;
        for (var i = 0; i < arr.length; i++) { var d = arr[i] - m; v += d * d; }
        return Math.sqrt(v / arr.length);
    }
};
