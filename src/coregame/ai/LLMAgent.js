/**
 * LLMAgent.js — In-game LLM auto-play agent for M3-Reborn.
 *
 * Calls the LLM API directly from JS (no external Python process needed).
 * Activated by the AI toggle button in GameUI.
 *
 * Depends on: LLMConfig.js (must be loaded first)
 */

// ── Board display constants (mirrored from llm_relay_agent.py) ────────────────

// Type IDs from BoardConst.ElementType: GREEN=1, BLUE=2, RED=3, YELLOW=4, PINK=5, CYAN=6
var _LLM_GEM_LABEL = {1: "G", 2: "B", 3: "R", 4: "Y", 5: "P", 6: "C"};

var _LLM_PU_LABEL = {
    101: "h",   // rocket horizontal
    102: "n",   // paper plane
    103: "*",   // rainbow
    104: "+",   // bomb T-shape
    105: "L",   // bomb L-shape
    106: "v",   // rocket vertical
};

var _LLM_POWER_UPS = {101: true, 102: true, 103: true, 104: true, 105: true, 106: true};
var _LLM_BLOCKERS  = {700: true, 10000: true};

function _llmCellChar(t) {
    if (t < 0)  return "\u00b7";               // · disabled
    if (t === 0) return " ";                   // empty
    if (_LLM_GEM_LABEL[t])  return _LLM_GEM_LABEL[t];
    if (_LLM_PU_LABEL[t])   return _LLM_PU_LABEL[t];
    if (t <= 20) return String(t);
    return "X";                                // blocker
}

function _llmTargetLabel(tid) {
    var t = parseInt(tid, 10);
    if (isNaN(t)) return String(tid);
    if (_LLM_GEM_LABEL[t])  return _LLM_GEM_LABEL[t];
    if (_LLM_PU_LABEL[t])   return _LLM_PU_LABEL[t];
    if (_LLM_BLOCKERS[t])   return "X";
    if (t === 500)           return "~";   // grass
    return "type" + t;
}

// ── LLM tool schema ────────────────────────────────────────────────────────────

var _LLM_SELECT_MOVE_TOOL_ANTHROPIC = {
    name: "select_move",
    description: (
        "Choose one move from the candidate list by its 0-based index. " +
        "All listed moves are pre-validated as legal. " +
        "Pick the move that best advances the current strategy and objectives."
    ),
    input_schema: {
        type: "object",
        properties: {
            revised_strategy: {
                type: "string",
                description: (
                    "REQUIRED when Active Strategy is empty — write a concise multi-turn plan. " +
                    "OPTIONAL otherwise — write only if the board state has changed significantly " +
                    "(e.g. a blocker was destroyed, a new Power-Up appeared, targets nearly done). " +
                    "Example: 'Board has X at (1,2). Match R gems at (1,3)/(2,2) to hit it. " +
                    "Then clear remaining B×5 via the h-rocket at (4,3).' " +
                    "Leave empty string '' if current strategy is still valid."
                ),
            },
            reasoning: {
                type: "string",
                description: (
                    "How this specific move advances the strategy. " +
                    "Reference objective labels (R, G, X, h…) explicitly."
                ),
            },
            index: {
                type: "integer",
                description: "0-based index of the chosen move in the candidate list.",
            },
            elem1: {
                type: "string",
                description: "Board label of the FIRST cell (e.g. 'G', 'R', 'h'). Copy exactly from the board.",
            },
            elem2: {
                type: "string",
                description: "Board label of the SECOND cell (e.g. 'B', 'Y', '*'). Copy exactly from the board.",
            },
            min_target_cleared: {
                type: "integer",
                description: (
                    "Minimum TARGET units this move will DIRECTLY clear. " +
                    "Use 0 if no targets are expected to be cleared this move."
                ),
            },
        },
        required: ["revised_strategy", "reasoning", "index", "elem1", "elem2", "min_target_cleared"],
    },
};

var _LLM_SELECT_MOVE_TOOL_OPENAI = {
    type: "function",
    "function": {
        name: "select_move",
        description: _LLM_SELECT_MOVE_TOOL_ANTHROPIC.description,
        parameters: _LLM_SELECT_MOVE_TOOL_ANTHROPIC.input_schema,
    },
};

var _LLM_SYSTEM_PROMPT = [
    "You are an expert Match-3 puzzle solver.",
    "Goal: clear ALL remaining target elements within the move budget.",
    "",
    "Board legend:",
    "  G B R Y P C = colored gems (G=Green B=Blue R=Red Y=Yellow P=Pink C=Cyan)",
    "  Power-ups (activate immediately when swapped with any gem):",
    "    h = Rocket horizontal  v = Rocket vertical",
    "    n = Paper plane        * = Rainbow (clears all of one color)",
    "    + = Bomb T-shape       L = Bomb L-shape",
    "  X           = blocker (Box/Kong - cannot be swapped; damaged by matching gems",
    "                in adjacent cells; destroyed after enough hits; counts as objective)",
    "  \u00b7           = disabled cell",
    "  ~ (Grass layer) = listed separately below the board; grass covers a cell from BELOW.",
    "    To destroy grass: make a match IN that cell (the gem on top participates in a match).",
    "    Grass does NOT block swapping — the gem above can be swapped normally.",
    "",
    "Row 0 is at the BOTTOM of the visual board.",
    "",
    "═══ STRATEGIC PLANNING ═══",
    "Each turn you receive an 'Active Strategy' — your multi-turn plan.",
    "  • If Active Strategy is EMPTY: you MUST write a full strategy in revised_strategy.",
    "  • If Active Strategy is set: check if it's still valid before picking a move.",
    "    Revise it (revised_strategy) ONLY if the board changed significantly:",
    "    - A blocker (X) was destroyed",
    "    - A Power-Up appeared that changes the plan",
    "    - Remaining targets dropped to a new phase (e.g. only 1 type left)",
    "    Otherwise leave revised_strategy as '' and follow the existing plan.",
    "",
    "A good strategy answers:",
    "  1. Which targets are hardest to reach and why?",
    "  2. Which blockers (X) are blocking progress, and what gems are adjacent?",
    "  3. What sequence of moves (2-4 steps) will unlock the critical path?",
    "  4. Are there Power-Ups on board that should be saved or used now?",
    "",
    "═══ MOVE PRIORITIES (within the strategy) ═══",
    "1. If X is a target: match or activate PU in cells ADJACENT to X.",
    "2. If ~ (grass) is a target: match gems IN grass cells (the gem on top).",
    "3. Directly match target gem types (labels in Objectives).",
    "4. Activate Power-Ups (h/v/+/L/n/*) near target gems, X blockers, or ~ grass cells.",
    "5. Create 4+ matches of a target gem type.",
    "6. All other moves (last resort only).",
    "",
    "Every listed candidate is pre-validated as legal.",
    "Call select_move with: revised_strategy (or ''), reasoning, index, elem1, elem2, min_target_cleared.",
].join("\n");

// ── LLMAgent class ────────────────────────────────────────────────────────────

CoreGame.LLMAgent = cc.Class.extend({

    // Re-evaluate strategy every N turns even if no blocker change
    STRATEGY_REFRESH_TURNS: 6,

    ctor: function () {
        this._bm         = null;
        this._running    = false;
        this._pendingLLM  = false;   // prevent overlapping XHR calls
        this._turnCount   = 0;
        this.onStatus       = null;    // cb(status) — set by GameUI to update button label
        this.onReasoning    = null;    // cb(text)   — called with LLM reasoning text
        this._pendingVerify = null;   // {minCleared, beforeCleared, moveDesc, reasoning}
        this._tokenStats    = {in: 0, out: 0, calls: 0};
        // ── Strategy state ──────────────────────────────────────────────────
        this._strategy          = null;  // current multi-turn plan (string)
        this._strategyTurn      = 0;     // turn when strategy was last set
        this._prevBlockerCount  = -1;    // detect when blockers are destroyed
        this._strategyNeedsReview = false; // blocker destroyed → force LLM to revise
    },

    /** Notify GameUI of current status. status: "thinking" | "moving" | "idle" */
    _setStatus: function (status) {
        if (this.onStatus) this.onStatus(status);
    },

    start: function (bm) {
        this._bm         = bm;
        this._running    = true;
        this._pendingLLM = false;
        this._tokenStats = {in: 0, out: 0, calls: 0};
        this._strategy          = null;
        this._strategyTurn      = 0;
        this._prevBlockerCount  = -1;
        this._strategyNeedsReview = false;
        cc.log("[LLMAgent] started  provider=" + LLMConfig.provider +
               "  model=" + LLMConfig.model);
    },

    stop: function () {
        this._running       = false;
        this._pendingLLM    = false;
        this._pendingVerify = null;
        this._setStatus("idle");
        cc.log("[LLMAgent] stopped");
    },

    /** Called by GameUI after every "turnFinished" event. */
    onTurnReady: function () {
        if (!this._running)    return;
        if (this._pendingLLM)  return;
        var bm = this._bm;
        if (!bm || !bm.canInteract()) return;

        // ── Verify previous move outcome ──────────────────────────────────────
        if (this._pendingVerify) {
            var pv = this._pendingVerify;
            this._pendingVerify = null;
            var actualCleared = 0;
            for (var i = 0; i < bm.targetElements.length; i++) {
                var te = bm.targetElements[i];
                var before = pv.beforeCleared[te.id] || 0;
                var now    = te.count - te.current;   // cleared so far
                actualCleared += Math.max(0, now - before);
            }
            if (actualCleared < pv.minCleared) {
                cc.warn("[LLMAgent] VERIFY FAIL  move=" + pv.moveDesc +
                        "  claimed_min=" + pv.minCleared +
                        "  actual=" + actualCleared);
                cc.warn("[LLMAgent] reasoning: " + pv.reasoning);
                // Dump current board state for debugging
                var dbgState = this._buildState(bm);
                cc.warn("[LLMAgent] Board after move:\n" +
                        this._buildPrompt(dbgState, []));
            } else {
                cc.log("[LLMAgent] VERIFY OK  claimed_min=" + pv.minCleared +
                       "  actual=" + actualCleared);
            }
        }

        this._pendingLLM = true;
        this._turnCount++;
        var turn = this._turnCount;

        // ── Strategy refresh checks ───────────────────────────────────────────
        var state      = this._buildState(bm);

        // Count current blockers on board
        var blockerCount = 0;
        for (var br = 0; br < state.board.length; br++) {
            for (var bc = 0; bc < state.board[br].length; bc++) {
                if (_LLM_BLOCKERS[state.board[br][bc]]) blockerCount++;
            }
        }
        if (this._prevBlockerCount >= 0 && blockerCount < this._prevBlockerCount) {
            cc.log("[LLMAgent] Blocker destroyed: " +
                   this._prevBlockerCount + " → " + blockerCount + "  (strategy review forced)");
            this._strategyNeedsReview = true;
        }
        this._prevBlockerCount = blockerCount;

        // Periodic refresh — full reset so LLM writes from scratch
        if (this._strategy &&
            (turn - this._strategyTurn) >= this.STRATEGY_REFRESH_TURNS) {
            cc.log("[LLMAgent] Strategy periodic refresh after " +
                   this.STRATEGY_REFRESH_TURNS + " turns");
            this._strategy = null;
            this._strategyNeedsReview = false;
        }

        cc.log("[LLMAgent] Turn " + turn +
               "  moves_left=" + bm.numMove +
               "  strategy=" + (this._strategy ? (this._strategyNeedsReview ? "REVIEW" : "set") : "EMPTY"));
        this._setStatus("thinking");

        // ── Build candidates ──────────────────────────────────────────────────
        var candidates = this._filterCandidates(
            state.valid_moves, state.board, state.targets, state.grass_map
        );

        if (candidates.length === 0) {
            cc.log("[LLMAgent]   no valid moves — skipping");
            this._pendingLLM = false;
            this._setStatus("idle");
            return;
        }
        cc.log("[LLMAgent]   " + state.valid_moves.length +
               " valid moves  showing " + candidates.length);

        // ── Call LLM ──────────────────────────────────────────────────────────
        var userMsg  = this._buildPrompt(state, candidates, this._strategy, this._strategyNeedsReview);
        var t0       = Date.now();
        var self     = this;

        this._callLLM(userMsg, function (err, idx, reasoning, elem1, elem2, minCleared, revisedStrategy) {
            var ms = Date.now() - t0;
            cc.log("[LLMAgent]   LLM latency: " + ms + " ms");

            self._pendingLLM = false;

            if (err) {
                cc.warn("[LLMAgent]   LLM error: " + err);
                self._setStatus("idle");
                if (self._running) {
                    setTimeout(function () {
                        if (self._running) self.onTurnReady();
                    }, 2000);
                }
                return;
            }

            // ── Update strategy if LLM revised it ────────────────────────────
            if (revisedStrategy && revisedStrategy.trim()) {
                self._strategy     = revisedStrategy.trim();
                self._strategyTurn = turn;
                self._strategyNeedsReview = false;
                cc.log("[LLMAgent]   strategy updated: " +
                       self._strategy.substring(0, 120));
            } else if (!self._strategy) {
                cc.warn("[LLMAgent]   expected strategy but got none");
            } else if (self._strategyNeedsReview) {
                cc.warn("[LLMAgent]   blocker destroyed but LLM did not revise strategy");
                self._strategyNeedsReview = false; // don't keep nagging
            }

            if (idx < 0 || idx >= candidates.length) {
                cc.warn("[LLMAgent]   index " + idx + " out of range, using 0");
                idx = 0;
            }

            var move = candidates[idx];
            cc.log("[LLMAgent]   move [" + idx + "] (" +
                   move[0] + "," + move[1] + ")→(" + move[2] + "," + move[3] + ")");

            // Validate elem labels against actual board state
            var actualE1 = _llmCellChar(state.board[move[0]][move[1]]);
            var actualE2 = _llmCellChar(state.board[move[2]][move[3]]);
            if (elem1 && elem1 !== actualE1) {
                cc.warn("[LLMAgent]   coord mismatch! LLM elem1='" + elem1 +
                        "' but board has '" + actualE1 +
                        "' at (" + move[0] + "," + move[1] + ")");
            }
            if (elem2 && elem2 !== actualE2) {
                cc.warn("[LLMAgent]   coord mismatch! LLM elem2='" + elem2 +
                        "' but board has '" + actualE2 +
                        "' at (" + move[2] + "," + move[3] + ")");
            }
            cc.log("[LLMAgent]   elems " + (elem1 || "?") + "↔" + (elem2 || "?") +
                   "  actual " + actualE1 + "↔" + actualE2);
            cc.log("[LLMAgent]   min_target_cleared=" + (minCleared || 0));
            cc.log("[LLMAgent]   why  " + (reasoning || "").substring(0, 100));
            if (self.onReasoning) {
                var planDisplay   = self._strategy ? self._strategy.replace(/\n/g, " ") : "";
                var reasonDisplay = reasoning ? reasoning.replace(/\n\n+/g, "\n").trim() : "";
                self.onReasoning(planDisplay, reasonDisplay);
            }

            // Snapshot cleared counts BEFORE executing move (for post-move verify)
            var beforeCleared = {};
            for (var vi = 0; vi < bm.targetElements.length; vi++) {
                var te = bm.targetElements[vi];
                beforeCleared[te.id] = te.count - te.current;
            }
            self._pendingVerify = {
                minCleared:   minCleared || 0,
                beforeCleared: beforeCleared,
                moveDesc:  "(" + move[0] + "," + move[1] + ")↔(" + move[2] + "," + move[3] + ")" +
                           " " + actualE1 + "↔" + actualE2,
                reasoning: (reasoning || "").substring(0, 120),
            };

            self._setStatus("moving");
            self._executeMove(move);
        });
    },

    // ── State building ────────────────────────────────────────────────────────

    _buildState: function (bm) {
        var rows = bm.rows;
        var cols = bm.cols;

        // Board grid
        var board = [];
        for (var r = 0; r < rows; r++) {
            var row = [];
            for (var c = 0; c < cols; c++) {
                var slot = bm.getSlot(r, c);
                if (!slot || !slot.enable) {
                    row.push(-1);
                } else {
                    var type = slot.getType();   // gem type, or -1 if no gem
                    if (type < 0 && slot.listElement) {
                        // No gem — slot might hold an EXCLUSIVE blocker (Box etc.)
                        // getType() only returns gems; scan listElement for any element
                        for (var li = 0; li < slot.listElement.length; li++) {
                            var el = slot.listElement[li];
                            if (el && el.type > 0) { type = el.type; break; }
                        }
                    }
                    row.push(type);
                }
            }
            board.push(row);
        }

        // Targets
        var targets = {}, targetsCleared = {};
        for (var i = 0; i < bm.targetElements.length; i++) {
            var te = bm.targetElements[i];
            targets[te.id]        = te.count;
            targetsCleared[te.id] = te.count - te.current;
        }

        // Valid moves (same conversion as _relayPushState)
        var _dirDelta = {};
        _dirDelta[CoreGame.Direction.UP]    = {dr:  1, dc:  0};
        _dirDelta[CoreGame.Direction.DOWN]  = {dr: -1, dc:  0};
        _dirDelta[CoreGame.Direction.LEFT]  = {dr:  0, dc: -1};
        _dirDelta[CoreGame.Direction.RIGHT] = {dr:  0, dc:  1};

        var validMoves = [];
        var swappable = bm.getAllSwappableMoves();
        for (var mi = 0; mi < swappable.length; mi++) {
            var m = swappable[mi];
            var d = _dirDelta[m.moveDirect];
            if (d) {
                validMoves.push([
                    m.position.x, m.position.y,
                    m.position.x + d.dr, m.position.y + d.dc
                ]);
            }
        }

        // Grass map — separate from board because grass is BACKGROUND (under gems)
        var grassMap = [];
        for (var gr = 0; gr < rows; gr++) {
            var grassRow = [];
            for (var gc = 0; gc < cols; gc++) {
                var gslot = bm.getSlot(gr, gc);
                var hasGrass = false;
                if (gslot && gslot.listElement) {
                    for (var gl = 0; gl < gslot.listElement.length; gl++) {
                        if (gslot.listElement[gl] && gslot.listElement[gl].type === 500) {
                            hasGrass = true; break;
                        }
                    }
                }
                grassRow.push(hasGrass ? 1 : 0);
            }
            grassMap.push(grassRow);
        }

        return {
            board:           board,
            grass_map:       grassMap,
            rows:            rows,
            cols:            cols,
            targets:         targets,
            targets_cleared: targetsCleared,
            moves_remaining: bm.numMove,
            total_moves:     bm.totalMove,
            valid_moves:     validMoves,
        };
    },

    // ── Candidate filtering (PU > target gems > others, top-K) ───────────────

    _filterCandidates: function (moves, board, targets, grassMap) {
        var topK = LLMConfig.topK || 0;
        if (topK <= 0 || moves.length <= topK) return moves.slice();

        // Collect target type IDs; also check if X blocker or grass is a target
        var targetSet = {};
        var blockerIsTarget = false;
        var grassIsTarget   = false;
        for (var tid in targets) {
            var tidInt = parseInt(tid, 10);
            targetSet[tidInt] = true;
            if (_LLM_BLOCKERS[tidInt]) blockerIsTarget = true;
            if (tidInt === 500)        grassIsTarget   = true;
        }

        var rows = board.length;
        var cols = board[0] ? board[0].length : 0;
        var dirs = [[-1,0],[1,0],[0,-1],[0,1]];

        // Cells adjacent to X blockers (when X is a target)
        var adjToBlocker = {};
        if (blockerIsTarget) {
            for (var br = 0; br < rows; br++) {
                for (var bc = 0; bc < cols; bc++) {
                    if (_LLM_BLOCKERS[board[br][bc]]) {
                        for (var di = 0; di < dirs.length; di++) {
                            var nr = br + dirs[di][0], nc = bc + dirs[di][1];
                            if (nr >= 0 && nr < rows && nc >= 0 && nc < cols)
                                adjToBlocker[nr + "," + nc] = true;
                        }
                    }
                }
            }
        }

        // Grass cells themselves (when grass is a target) — match IN the cell destroys grass
        var grassCell = {};
        if (grassIsTarget && grassMap) {
            for (var gr = 0; gr < rows; gr++) {
                for (var gc = 0; gc < cols; gc++) {
                    if (grassMap[gr] && grassMap[gr][gc]) {
                        grassCell[gr + "," + gc] = true;
                    }
                }
            }
        }

        // tier0 = PU activation
        // tier1 = adjacent to X blocker OR on grass cell (when respective target) OR target gem
        // tier2 = everything else
        var tier0 = [], tier1 = [], tier2 = [];
        for (var i = 0; i < moves.length; i++) {
            var m  = moves[i];
            var t1 = board[m[0]][m[1]];
            var t2 = board[m[2]][m[3]];
            if (_LLM_POWER_UPS[t1] || _LLM_POWER_UPS[t2]) {
                tier0.push(m);
            } else if (targetSet[t1] || targetSet[t2] ||
                       adjToBlocker[m[0]+","+m[1]] || adjToBlocker[m[2]+","+m[3]] ||
                       grassCell[m[0]+","+m[1]]    || grassCell[m[2]+","+m[3]]) {
                tier1.push(m);
            } else {
                tier2.push(m);
            }
        }

        var selected = tier0.slice();
        var rem = topK - selected.length;
        if (rem > 0) {
            selected = selected.concat(_llmSample(tier1, rem));
            rem = topK - selected.length;
        }
        if (rem > 0) {
            selected = selected.concat(_llmSample(tier2, rem));
        }
        return selected;
    },

    // ── Prompt building ───────────────────────────────────────────────────────

    _buildPrompt: function (state, candidates, strategy, needsReview) {
        var board = state.board;
        var rows  = state.rows;
        var cols  = state.cols;

        // ASCII board (row 0 at bottom)
        var colHeader = "    " + _llmRange(cols).map(function(c){ return c; }).join("  ");
        var sep       = "    " + new Array(cols * 2 + 1).join("\u2500");
        var boardLines = [colHeader, sep];
        for (var r = rows - 1; r >= 0; r--) {
            var cells = [];
            for (var c = 0; c < cols; c++) {
                cells.push(_llmCellChar(board[r][c]));
            }
            boardLines.push(_llmPad(r, 2) + " \u2502 " + cells.join("  "));
        }
        var boardStr = boardLines.join("\n");

        // Objectives
        var objLines = [];
        for (var tid in state.targets) {
            var total = state.targets[tid];
            var done  = state.targets_cleared[tid] || 0;
            var rem   = total - done;
            var bar   = _llmRepeat("\u2588", done) + _llmRepeat("\u2591", rem);
            var label = _llmTargetLabel(tid);
            objLines.push("  " + label + ": " + done + "/" + total +
                          " [" + bar + "]  (" + rem + " remaining)");
        }
        var objStr = objLines.length ? objLines.join("\n") : "  (none)";

        // Candidate list (with computed match annotation)
        var candLines = [];
        for (var i = 0; i < candidates.length; i++) {
            var mv = candidates[i];
            var l1 = _llmCellChar(board[mv[0]][mv[1]]);
            var l2 = _llmCellChar(board[mv[2]][mv[3]]);
            var matchNote = _llmMatchStr(board, rows, cols, mv[0], mv[1], mv[2], mv[3]);
            candLines.push("  [" + _llmPad(i, 3) + "] (" +
                           mv[0] + "," + mv[1] + ")" + l1 +
                           " \u2194 (" + mv[2] + "," + mv[3] + ")" + l2 +
                           "  \u2192 " + matchNote);
        }
        var candStr = candLines.length ? candLines.join("\n") : "  (none)";

        var strategyStr, reviewNote;
        if (!strategy) {
            strategyStr = "(EMPTY — you MUST write a strategy in revised_strategy before picking a move)";
            reviewNote  = "Write a full strategy in revised_strategy, then call select_move.";
        } else if (needsReview) {
            strategyStr = strategy + "\n\n⚠ A blocker was just destroyed. You MUST update revised_strategy to reflect the new board state.";
            reviewNote  = "A blocker was just destroyed — update revised_strategy to reflect the new situation, then call select_move.";
        } else {
            strategyStr = strategy;
            reviewNote  = "Review the Active Strategy. If it needs updating, set revised_strategy.\nThen choose the move that best advances it and call select_move.";
        }

        // Grass section (only if any grass exists)
        var grassStr = "";
        var gm = state.grass_map;
        if (gm) {
            var grassCells = [];
            for (var gr = 0; gr < rows; gr++) {
                for (var gc = 0; gc < cols; gc++) {
                    if (gm[gr] && gm[gr][gc]) grassCells.push("(" + gr + "," + gc + ")");
                }
            }
            if (grassCells.length > 0) {
                grassStr = "## Grass ~ cells (match gems IN these cells to destroy grass)\n" +
                           grassCells.join("  ") + "\n\n";
            }
        }

        return (
            "## Current board  (row 0 = bottom)\n\n" +
            boardStr + "\n\n" +
            grassStr +
            "## Objectives\n" + objStr + "\n\n" +
            "## Resources\nMoves remaining: " +
            state.moves_remaining + " / " + state.total_moves + "\n\n" +
            "## Active Strategy\n" + strategyStr + "\n\n" +
            "## Valid moves (" + candidates.length + " total)\n" + candStr + "\n\n" +
            reviewNote
        );
    },

    // ── LLM API calls ─────────────────────────────────────────────────────────

    /**
     * cb(err, index, reasoning, elem1, elem2, minCleared)
     */
    _callLLM: function (userMsg, cb) {
        var provider = LLMConfig.provider;
        if (provider === "anthropic") {
            this._callAnthropic(userMsg, cb);
        } else {
            // openai / deepseek — OpenAI-compatible
            var baseUrl = (provider === "deepseek")
                ? "https://api.deepseek.com/v1"
                : "https://api.openai.com/v1";
            this._callOpenAICompat(userMsg, baseUrl, cb);
        }
    },

    _callAnthropic: function (userMsg, cb) {
        var self = this;
        var body = JSON.stringify({
            model:       LLMConfig.model,
            max_tokens:  1024,
            system:      _LLM_SYSTEM_PROMPT,
            tools:       [_LLM_SELECT_MOVE_TOOL_ANTHROPIC],
            tool_choice: {type: "any"},
            messages:    [{role: "user", content: userMsg}],
        });

        _llmXHR(
            "POST",
            "https://api.anthropic.com/v1/messages",
            {
                "Content-Type":      "application/json",
                "x-api-key":         LLMConfig.apiKey,
                "anthropic-version": "2023-06-01",
            },
            body,
            function (err, data) {
                if (err) return cb(err);
                try {
                    var u = data.usage;
                    if (u) {
                        self._tokenStats.in  += (u.input_tokens  || 0);
                        self._tokenStats.out += (u.output_tokens || 0);
                        self._tokenStats.calls++;
                        cc.log("[LLMAgent] tokens  in=" + u.input_tokens
                            + "  out=" + u.output_tokens
                            + "  total=" + self._tokenStats.in + "/" + self._tokenStats.out
                            + "  calls=" + self._tokenStats.calls);
                    }
                    for (var i = 0; i < data.content.length; i++) {
                        var blk = data.content[i];
                        if (blk.type === "tool_use" && blk.name === "select_move") {
                            return cb(null, parseInt(blk.input.index, 10),
                                      blk.input.reasoning || "",
                                      blk.input.elem1 || "",
                                      blk.input.elem2 || "",
                                      parseInt(blk.input.min_target_cleared, 10) || 0,
                                      blk.input.revised_strategy || "");
                        }
                    }
                    cb("Anthropic: no select_move call in response");
                } catch (e) {
                    cb("Anthropic parse error: " + e);
                }
            }
        );
    },

    _callOpenAICompat: function (userMsg, baseUrl, cb) {
        var self = this;
        var body = JSON.stringify({
            model:       LLMConfig.model,
            max_tokens:  1024,
            stream:      false,   // must be explicit — SSE format breaks JSON.parse
            tools:       [_LLM_SELECT_MOVE_TOOL_OPENAI],
            tool_choice: {type: "function", "function": {name: "select_move"}},
            messages: [
                {role: "system", content: _LLM_SYSTEM_PROMPT},
                {role: "user",   content: userMsg},
            ],
        });

        _llmXHR(
            "POST",
            baseUrl + "/chat/completions",
            {
                "Content-Type":  "application/json",
                "Authorization": "Bearer " + LLMConfig.apiKey,
            },
            body,
            function (err, data) {
                if (err) return cb(err);
                try {
                    var u = data.usage;
                    if (u) {
                        self._tokenStats.in  += (u.prompt_tokens     || 0);
                        self._tokenStats.out += (u.completion_tokens || 0);
                        self._tokenStats.calls++;
                        cc.log("[LLMAgent] tokens  in=" + u.prompt_tokens
                            + "  out=" + u.completion_tokens
                            + "  total=" + self._tokenStats.in + "/" + self._tokenStats.out
                            + "  calls=" + self._tokenStats.calls);
                    }
                    var toolCalls = data.choices[0].message.tool_calls;
                    if (toolCalls && toolCalls.length > 0) {
                        var inp = JSON.parse(toolCalls[0]["function"].arguments);
                        return cb(null, parseInt(inp.index, 10), inp.reasoning || "",
                                  inp.elem1 || "", inp.elem2 || "",
                                  parseInt(inp.min_target_cleared, 10) || 0,
                                  inp.revised_strategy || "");
                    }
                    cb("OpenAI/DeepSeek: no tool_calls in response");
                } catch (e) {
                    cb("OpenAI/DeepSeek parse error: " + e);
                }
            }
        );
    },

    // ── Move execution ────────────────────────────────────────────────────────

    _executeMove: function (move) {
        var bm   = this._bm;
        var self = this;
        var delayMs = LLMConfig.moveDelayMs || 0;

        setTimeout(function () {
            self._setStatus("idle");
            if (!self._running) return;
            if (!bm || !bm.canInteract()) {
                cc.log("[LLMAgent]   move skipped: board not interactive");
                return;
            }
            var slot1 = bm.getSlot(move[0], move[1]);
            var slot2 = bm.getSlot(move[2], move[3]);
            if (!slot1 || !slot2) {
                cc.warn("[LLMAgent]   move skipped: invalid slot coordinates");
                return;
            }
            bm.trySwapSlots(slot1, slot2);
        }, delayMs);
    },

});

// ── Utility helpers ───────────────────────────────────────────────────────────

/** Async XHR helper. cb(err, parsedJson) */
function _llmXHR(method, url, headers, body, cb) {
    try {
        var xhr = new XMLHttpRequest();
        xhr.open(method, url, true);
        for (var key in headers) {
            xhr.setRequestHeader(key, headers[key]);
        }
        xhr.onreadystatechange = function () {
            if (xhr.readyState !== 4) return;
            if (xhr.status === 200) {
                try {
                    cb(null, JSON.parse(xhr.responseText));
                } catch (e) {
                    cb("JSON parse error: " + e);
                }
            } else {
                cb("HTTP " + xhr.status + " " + xhr.statusText);
            }
        };
        xhr.send(body);
    } catch (e) {
        cb("XHR error: " + e);
    }
}

/**
 * Compute a human-readable annotation for what match a swap creates.
 * Returns e.g. "G×3 col3:r3-5", "R×4 row2:c1-4", "activates h", or "?".
 */
function _llmMatchStr(board, rows, cols, r1, c1, r2, c2) {
    var t1 = board[r1][c1];
    var t2 = board[r2][c2];

    // PU activation: swapping a PU with any gem activates it
    if (_LLM_POWER_UPS[t1]) return "activates " + _llmCellChar(t1) + " at (" + r1 + "," + c1 + ")";
    if (_LLM_POWER_UPS[t2]) return "activates " + _llmCellChar(t2) + " at (" + r2 + "," + c2 + ")";

    // Simulate swap on a shallow copy
    var tmp = [];
    for (var rr = 0; rr < rows; rr++) tmp.push(board[rr].slice());
    tmp[r1][c1] = t2;
    tmp[r2][c2] = t1;

    function runLen(r, c, dr, dc) {
        var typ = tmp[r][c], len = 1;
        var nr = r + dr, nc = c + dc;
        while (nr >= 0 && nr < rows && nc >= 0 && nc < cols && tmp[nr][nc] === typ) {
            len++; nr += dr; nc += dc;
        }
        nr = r - dr; nc = c - dc;
        while (nr >= 0 && nr < rows && nc >= 0 && nc < cols && tmp[nr][nc] === typ) {
            len++; nr -= dr; nc -= dc;
        }
        return len;
    }
    function runStart(r, c, dr, dc) {
        var typ = tmp[r][c];
        var sr = r - dr, sc = c - dc;
        while (sr >= 0 && sr < rows && sc >= 0 && sc < cols && tmp[sr][sc] === typ) {
            sr -= dr; sc -= dc;
        }
        return {r: sr + dr, c: sc + dc};
    }
    function matchAt(r, c) {
        var typ = tmp[r][c];
        if (typ <= 0 || _LLM_POWER_UPS[typ]) return null;
        var lbl = _llmCellChar(typ);
        // horizontal
        var hLen = runLen(r, c, 0, 1);
        if (hLen >= 3) {
            var hs = runStart(r, c, 0, 1);
            return lbl + "\xd7" + hLen + " row" + r + ":c" + hs.c + "-" + (hs.c + hLen - 1);
        }
        // vertical
        var vLen = runLen(r, c, 1, 0);
        if (vLen >= 3) {
            var vs = runStart(r, c, 1, 0);
            return lbl + "\xd7" + vLen + " col" + c + ":r" + vs.r + "-" + (vs.r + vLen - 1);
        }
        return null;
    }

    var parts = [];
    var m1 = matchAt(r1, c1);
    var m2 = matchAt(r2, c2);
    if (m1) parts.push(m1);
    if (m2 && m2 !== m1) parts.push(m2);
    return parts.length ? parts.join(" + ") : "?";
}

/** Random sample of n items from array (Fisher-Yates partial). */
function _llmSample(arr, n) {
    if (n >= arr.length) return arr.slice();
    var copy = arr.slice();
    for (var i = 0; i < n; i++) {
        var j = i + Math.floor(Math.random() * (copy.length - i));
        var tmp = copy[i]; copy[i] = copy[j]; copy[j] = tmp;
    }
    return copy.slice(0, n);
}

/** Zero-padded number string. */
function _llmPad(n, width) {
    var s = String(n);
    while (s.length < width) s = " " + s;
    return s;
}

/** Repeat string n times. */
function _llmRepeat(ch, n) {
    var s = "";
    for (var i = 0; i < n; i++) s += ch;
    return s;
}

/** Range array [0..n-1]. */
function _llmRange(n) {
    var a = [];
    for (var i = 0; i < n; i++) a.push(i);
    return a;
}
