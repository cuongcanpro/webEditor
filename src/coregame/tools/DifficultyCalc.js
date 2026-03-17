/**
 * DifficultyCalc.js
 * Async difficulty calculator for Match-3 levels.
 *
 * Every move is scheduled with setTimeout(..., 0) so Cocos retains control of
 * the main loop between steps — preventing freezes / crashes.
 *
 * API (all async):
 *   CoreGame.DifficultyCalc.calculate(boardMgr, levelConfig, bot, onProgress, onComplete)
 *
 *   levelConfig = {
 *     maxMoves : <number>,          // safety cap — simulation stops here even without a win
 *     targets  : { <typeId>: <count>, ... }  // elements to destroy
 *   }
 *   bot          — one of CoreGame.Bots.RandomBot / GreedyBot (or any compatible bot)
 *   onProgress(step, totalSteps, state)   -- optional
 *   onComplete(report)                    -- called when finished
 *
 * report = {
 *   wins, losses, win_rate,
 *   avg_win_moves, num_episodes
 * }
 */
var CoreGame = CoreGame || {};

CoreGame.Bots = CoreGame.Bots || {};

// ---------------------------------------------------------------------------
// RandomBot
// ---------------------------------------------------------------------------
CoreGame.Bots.RandomBot = {
    getAction: function (boardMgr /*, levelConfig */) {
        var moves = boardMgr.getAllSwappableMoves();
        if (moves.length === 0) return null;
        return moves[Math.floor(Math.random() * moves.length)];
    }
};

// ---------------------------------------------------------------------------
// GreedyBot
// ---------------------------------------------------------------------------
CoreGame.Bots.GreedyBot = {
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
// SmartBot — PU creation priority + objective  (SmartAgent port)
// ---------------------------------------------------------------------------
CoreGame.Bots.SmartBot = {
    PU_MIN: 101,
    _DIR: [{ x: -1, y: 0 }, { x: 1, y: 0 }, { x: 0, y: -1 }, { x: 0, y: 1 }],

    getAction: function (boardMgr, levelConfig) {
        var moves = boardMgr.getAllSwappableMoves();
        if (moves.length === 0) return null;
        var tt   = CoreGame.DifficultyCalc._extractTargetTypes(levelConfig);
        var best = -Infinity, bestMove = null;
        for (var i = 0; i < moves.length; i++) {
            var s = this._score(boardMgr.simulateSwap(moves[i].position, moves[i].moveDirect), moves[i], tt, boardMgr);
            if (s > best) { best = s; bestMove = moves[i]; }
        }
        return bestMove;
    },

    _score: function (sim, move, tt, boardMgr) {
        var tiles = sim.tilesRemoved, combos = sim.comboCount;
        var cleared = 0;
        for (var i = 0; i < sim.removedTypes.length; i++)
            if (tt.indexOf(sim.removedTypes[i]) !== -1) cleared++;

        // PU creation bonus from match size (4 → Rocket/Boom, 5+ → Rainbow)
        var puB = 0;
        if (tiles >= 5)      puB = 30;
        else if (tiles >= 4) puB = 20;

        // PU activation: src cell or destination cell
        var r = move.position.x, c = move.position.y;
        if (this._gem(boardMgr, r, c) >= this.PU_MIN) puB += 15;
        var off = this._DIR[move.moveDirect];
        if (off && this._gem(boardMgr, r + off.x, c + off.y) >= this.PU_MIN) puB += 15;

        return cleared * 15 + puB + combos * 3 + tiles + r * 0.05;
    },

    _gem: function (boardMgr, r, c) {
        var s = boardMgr.mapGrid[r] && boardMgr.mapGrid[r][c];
        return (s && s.gem) ? (s.gem.type || 0) : 0;
    }
};

// ---------------------------------------------------------------------------
// ObjectiveBot — 100 % objective focus  (ObjectiveAgent port)
// ---------------------------------------------------------------------------
CoreGame.Bots.ObjectiveBot = {
    PU_MIN: 101,

    getAction: function (boardMgr, levelConfig) {
        var moves = boardMgr.getAllSwappableMoves();
        if (moves.length === 0) return null;
        var tt   = CoreGame.DifficultyCalc._extractTargetTypes(levelConfig);
        var best = -Infinity, bestMove = null;
        for (var i = 0; i < moves.length; i++) {
            var s = this._score(boardMgr.simulateSwap(moves[i].position, moves[i].moveDirect), moves[i], tt, boardMgr);
            if (s > best) { best = s; bestMove = moves[i]; }
        }
        return bestMove;
    },

    _score: function (sim, move, tt, boardMgr) {
        var tiles = sim.tilesRemoved;
        var cleared = 0;
        for (var i = 0; i < sim.removedTypes.length; i++)
            if (tt.indexOf(sim.removedTypes[i]) !== -1) cleared++;

        var r = move.position.x, c = move.position.y;
        var srcType = this._gem(boardMgr, r, c);
        var targetColorBonus = (tt.indexOf(srcType) !== -1) ? 10 : 0;
        var puBonus           = (srcType >= this.PU_MIN)      ? 20 : 0;

        return cleared * 50 + targetColorBonus + puBonus + tiles * 0.5 + r * 0.02;
    },

    _gem: function (boardMgr, r, c) {
        var s = boardMgr.mapGrid[r] && boardMgr.mapGrid[r][c];
        return (s && s.gem) ? (s.gem.type || 0) : 0;
    }
};

// ---------------------------------------------------------------------------
// ObjectivePUBot — objective-first, PU-aware via preview  (ObjectivePUAgent port)
// ---------------------------------------------------------------------------
CoreGame.Bots.ObjectivePUBot = {
    PU_MIN: 101,
    _DIR: [{ x: -1, y: 0 }, { x: 1, y: 0 }, { x: 0, y: -1 }, { x: 0, y: 1 }],

    getAction: function (boardMgr, levelConfig) {
        var moves = boardMgr.getAllSwappableMoves();
        if (moves.length === 0) return null;
        var tt   = CoreGame.DifficultyCalc._extractTargetTypes(levelConfig);
        var best = -Infinity, bestMove = null;
        for (var i = 0; i < moves.length; i++) {
            var s = this._score(boardMgr.simulateSwap(moves[i].position, moves[i].moveDirect), moves[i], tt, boardMgr);
            if (s > best) { best = s; bestMove = moves[i]; }
        }
        return bestMove;
    },

    _score: function (sim, move, tt, boardMgr) {
        var tiles = sim.tilesRemoved, combos = sim.comboCount;
        var cleared = 0;
        for (var i = 0; i < sim.removedTypes.length; i++)
            if (tt.indexOf(sim.removedTypes[i]) !== -1) cleared++;

        // Tiny PU tiebreaker — only separates equal-scored moves
        var r = move.position.x, c = move.position.y;
        var puTie = 0;
        if (this._gem(boardMgr, r, c) >= this.PU_MIN) {
            puTie = 3;
        } else {
            var off = this._DIR[move.moveDirect];
            if (off && this._gem(boardMgr, r + off.x, c + off.y) >= this.PU_MIN) puTie = 3;
        }

        return cleared * 50 + tiles * 1.5 + combos * 2 + puTie + r * 0.02;
    },

    _gem: function (boardMgr, r, c) {
        var s = boardMgr.mapGrid[r] && boardMgr.mapGrid[r][c];
        return (s && s.gem) ? (s.gem.type || 0) : 0;
    }
};

// ---------------------------------------------------------------------------
// ObjectivePUBotV3 — hitbox awareness + PU combo + 2-level beam search
//   Port of ObjectivePUAgentV3; lookahead depth reduced 3→2 for JS performance.
//
//   PU type IDs (adjust if the game uses different values):
//     101 = Rocket-H   102 = Rocket-V
//     103 = Rainbow    104 = Boom-T   105 = Boom-L
// ---------------------------------------------------------------------------
CoreGame.Bots.ObjectivePUBotV3 = {
    PU_MIN:     101,
    ROCKET_H:   101,
    ROCKET_V:   102,
    RAINBOW:    103,
    BOOM_SET:   [104, 105],
    ROCKET_SET: [101, 102],

    BEAM_WIDTH: 3,
    MAX_DEPTH:  2,   // 3 in the Python version; reduced for performance
    DISCOUNT:   0.5,
    _DIR: [{ x: -1, y: 0 }, { x: 1, y: 0 }, { x: 0, y: -1 }, { x: 0, y: 1 }],

    getAction: function (boardMgr, levelConfig) {
        var moves = boardMgr.getAllSwappableMoves();
        if (moves.length === 0) return null;
        var tt     = CoreGame.DifficultyCalc._extractTargetTypes(levelConfig);
        var result = this._beam(boardMgr, moves, tt, 0);
        return result.move || moves[0];
    },

    _beam: function (boardMgr, moves, tt, depth) {
        var self = this;

        // Score all candidate moves
        var scored = [];
        for (var i = 0; i < moves.length; i++) {
            var sim = boardMgr.simulateSwap(moves[i].position, moves[i].moveDirect);
            scored.push({ score: self._eval(sim, moves[i], tt, boardMgr), move: moves[i] });
        }
        scored.sort(function (a, b) { return b.score - a.score; });
        if (scored.length === 0) return { score: 0, move: null };

        // Leaf: return best without further lookahead
        if (depth >= self.MAX_DEPTH - 1) return scored[0];

        // Expand top-BEAM_WIDTH moves with one extra depth
        var beam     = scored.slice(0, self.BEAM_WIDTH);
        var bestTot  = -Infinity;
        var bestMove = beam[0].move;
        var saved    = boardMgr.getBoardState();

        for (var j = 0; j < beam.length; j++) {
            var m = beam[j].move;
            boardMgr.quickSwap(m.position, m.moveDirect, true);
            var futureMoves = boardMgr.getAllSwappableMoves();
            var fScore = 0;
            if (futureMoves.length > 0) {
                fScore = self._beam(boardMgr, futureMoves, tt, depth + 1).score;
            }
            boardMgr.setBoardState(saved);

            var total = beam[j].score + self.DISCOUNT * fScore;
            if (total > bestTot) { bestTot = total; bestMove = m; }
        }
        return { score: bestTot, move: bestMove };
    },

    _eval: function (sim, move, tt, boardMgr) {
        var tiles = sim.tilesRemoved, combos = sim.comboCount;
        var cleared = 0;
        for (var i = 0; i < sim.removedTypes.length; i++)
            if (tt.indexOf(sim.removedTypes[i]) !== -1) cleared++;

        var r       = move.position.x, c = move.position.y;
        var srcType = this._gem(boardMgr, r, c);
        var off     = this._DIR[move.moveDirect];
        var dstType = off ? this._gem(boardMgr, r + off.x, c + off.y) : 0;

        var puAtSrc = (srcType >= this.PU_MIN) ? srcType : 0;
        var puAtDst = (dstType >= this.PU_MIN) ? dstType : 0;

        // Hitbox bonus: objectives within PU blast radius
        // (PU+PU swaps are covered by comboBonus instead)
        var hitboxB = 0;
        if (puAtSrc && !puAtDst) {
            hitboxB = this._hitbox(boardMgr, r, c, srcType, tt);
        } else if (puAtDst && !puAtSrc && off) {
            hitboxB = this._hitbox(boardMgr, r + off.x, c + off.y, dstType, tt);
        }

        // PU+PU combo bonus
        var comboB = this._puCombo(srcType, dstType);

        // Light tiebreaker for any PU involvement
        var puTie = (puAtSrc || puAtDst) ? 3 : 0;

        return cleared * 50 + tiles * 1.5 + combos * 2 + hitboxB + comboB + puTie + r * 0.02;
    },

    _hitbox: function (boardMgr, r, c, puType, tt) {
        var cells = this._hitboxCells(boardMgr, r, c, puType, tt);
        var bonus = 0;
        for (var i = 0; i < cells.length; i++) {
            var t = this._gem(boardMgr, cells[i].x, cells[i].y);
            if (tt.indexOf(t) !== -1) bonus += 2;                               // objective in range
            if (t >= this.PU_MIN && (cells[i].x !== r || cells[i].y !== c)) bonus += 3; // chain PU
        }
        return bonus;
    },

    _hitboxCells: function (boardMgr, r, c, puType, tt) {
        var cells = [], rows = boardMgr.rows, cols = boardMgr.cols;
        var rr, cc, dr, dc, nr, nc;

        if (puType === this.ROCKET_H) {
            for (cc = 0; cc < cols; cc++) cells.push({ x: r, y: cc });
        } else if (puType === this.ROCKET_V) {
            for (rr = 0; rr < rows; rr++) cells.push({ x: rr, y: c });
        } else if (this.BOOM_SET.indexOf(puType) !== -1) {
            for (dr = -1; dr <= 1; dr++)
                for (dc = -1; dc <= 1; dc++) {
                    nr = r + dr; nc = c + dc;
                    if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) cells.push({ x: nr, y: nc });
                }
        } else if (puType === this.RAINBOW) {
            // All cells whose gem type is a remaining target color
            for (rr = 0; rr < rows; rr++)
                for (cc = 0; cc < cols; cc++)
                    if (tt.indexOf(this._gem(boardMgr, rr, cc)) !== -1) cells.push({ x: rr, y: cc });
        }
        return cells;
    },

    _puCombo: function (t1, t2) {
        if (t1 < this.PU_MIN || t2 < this.PU_MIN) return 0;
        var b1 = this.BOOM_SET.indexOf(t1)   !== -1;
        var b2 = this.BOOM_SET.indexOf(t2)   !== -1;
        var r1 = this.ROCKET_SET.indexOf(t1) !== -1;
        var r2 = this.ROCKET_SET.indexOf(t2) !== -1;
        if ((b1 && r2) || (r1 && b2))            return 25; // Boom + Rocket: 3 rows + 3 cols
        if (t1 === this.RAINBOW || t2 === this.RAINBOW) return 20; // Rainbow + any PU
        if (b1 && b2)                             return 15; // Boom + Boom
        if (r1 && r2)                             return 15; // Rocket + Rocket cross
        return 10;                                            // other PU+PU
    },

    _gem: function (boardMgr, r, c) {
        var s = boardMgr.mapGrid[r] && boardMgr.mapGrid[r][c];
        return (s && s.gem) ? (s.gem.type || 0) : 0;
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
     * @param {Object}    bot          CoreGame.Bots.RandomBot | GreedyBot | custom
     * @param {Function}  [onProgress] (step, total, state)
     *   state = { phase: "start", numEpisodes }
     *         | { phase: "episode", bot, episode, numEpisodes, win, movesUsed, movesWin }
     *         | { phase: "done" }
     * @param {Function}  onComplete   (report)
     */
    calculate: function (boardMgr, levelConfig, bot, onProgress, onComplete) {
        var self         = this;
        var initialState = boardMgr.getBoardState();
        var total        = self.NUM_EPISODES;

        if (onProgress) onProgress(0, total, { phase: "start", numEpisodes: self.NUM_EPISODES });

        self._runBatchAsync(boardMgr, initialState, bot, levelConfig,
            onProgress, 0, total,
            function (metrics) {
                boardMgr.setBoardState(initialState);
                if (onProgress) onProgress(total, total, { phase: "done" });

                var report = {
                    wins:          metrics.win_count,
                    losses:        self.NUM_EPISODES - metrics.win_count,
                    win_rate:      metrics.win_rate,
                    avg_win_moves: metrics.avg_win_moves,
                    num_episodes:  self.NUM_EPISODES
                };
                if (onComplete) onComplete(report);
            }
        );
    },

    // -----------------------------------------------------------------------
    // Internal — batch runner
    // -----------------------------------------------------------------------
    _runBatchAsync: function (boardMgr, initialState, bot, levelConfig, onProgress, stepOffset, totalSteps, callback) {
        var self = this;
        var botName = "Bot";
        if (CoreGame.Bots) {
            for (var k in CoreGame.Bots) {
                if (CoreGame.Bots.hasOwnProperty(k) && CoreGame.Bots[k] === bot) {
                    botName = k; break;
                }
            }
        }
        var wins = [], movesWinList = [];
        var winCount = 0;
        var ep = 0;

        function runNextEpisode() {
            if (ep >= self.NUM_EPISODES) {
                callback({
                    win_rate:      self._mean(wins),
                    win_count:     winCount,
                    avg_win_moves: movesWinList.length > 0 ? self._mean(movesWinList) : 0
                });
                return;
            }

            self._runEpisodeAsync(boardMgr, initialState, bot, levelConfig, function (result) {
                wins.push(result.win ? 1.0 : 0.0);
                if (result.win) { winCount++; movesWinList.push(result.movesWin); }
                ep++;
                if (onProgress) {
                    onProgress(stepOffset + ep, totalSteps, {
                        phase:       "episode",
                        bot:         botName,
                        episode:     ep,
                        numEpisodes: self.NUM_EPISODES,
                        win:         result.win,
                        movesUsed:   result.movesUsed,
                        movesWin:    result.movesWin
                    });
                }
                setTimeout(runNextEpisode, 0);
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

        var maxMoves     = levelConfig.maxMoves || 200; // safety cap — run until win or cap
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
                    callback({ win: win, movesUsed: movesUsed, movesWin: 0,
                               noProgressTurns: noProgressTurns,
                               validMovesHistory: validMovesHistory });
                    return;
                }

                var action = bot.getAction(boardMgr, levelConfig);
                if (!action) {
                    callback({ win: win, movesUsed: movesUsed, movesWin: 0,
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
                    callback({ win: true, movesUsed: movesUsed, movesWin: movesUsed,
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

    _mean: function (arr) {
        if (!arr.length) return 0;
        var s = 0; for (var i = 0; i < arr.length; i++) s += arr[i];
        return s / arr.length;
    }
};
