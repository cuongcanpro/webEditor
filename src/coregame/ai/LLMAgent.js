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
    if (t < 0)  return ".";               // · disabled
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
    "  Kong (large X blocker) special mechanic:",
    "    Kong has a COOLDOWN timer. Every turn without being hit, cooldown decreases by 1.",
    "    When cooldown reaches 0, Kong SPAWNS 3 wooden boxes (X) on random cells, then resets.",
    "    Hitting Kong resets cooldown to 3 (buying extra time).",
    "    → You MUST hit Kong regularly (every 2-3 turns) to prevent box spam.",
    "    → Ignoring Kong lets it flood the board with boxes, blocking moves and wasting turns.",
    "  .           = disabled cell",
    "  ~ (Grass layer) = listed separately below the board; grass covers a cell from BELOW.",
    "    To destroy grass: make a match IN that cell (the gem on top participates in a match).",
    "    Grass does NOT block swapping — the gem above can be swapped normally.",
    "",
    "Row 0 is at the BOTTOM of the visual board.",
    "",
    "Move annotations show ->PU:x when a move creates a Power-Up at the swapped position.",
    "",
    "=== POWER-UP MECHANICS ===",
    "Creation rules:",
    "  4 gems in a row (H)     -> h  (Rocket horizontal) — fires along its row",
    "  4 gems in a column (V)  -> v  (Rocket vertical)   — fires along its column",
    "  T or L shape (H=>3 + V=>3) -> +  (Bomb)              — clears 3x3 area",
    "  5 in a line             -> *  (Rainbow)           — clears ALL gems of one color",
    "",
    "Rocket targeting (IMPORTANT — by game design):",
    "  h and v rockets PRIORITIZE hitting blockers (X) in their path.",
    "  If a blocker X exists in the same row (h) or same column (v),",
    "  the rocket will fly toward it and deal damage — even from a distance.",
    "  CRITICAL — rockets fire from their DESTINATION (post-swap cell, NOT origin):",
    "    Move annotations show 'fires row N' or 'fires col N'.",
    "    [X!] means a blocker exists in that row/col — the rocket WILL hit it.",
    "    Example: h rocket at row 3, X at row 2 — swap h DOWN -> fires row 2 [X!].",
    "  -> When X is a target: look for an h rocket you can swap INTO X's row,",
    "    or a v rocket you can swap INTO X's col. Check [X!] in annotations.",
    "  -> Creating h in X's row or v in X's col (via ->PU:h/->PU:v) is also",
    "    highly effective (new PU appears at the swapped position).",
    "",
    "PU + PU combos (swap two adjacent PUs — extremely powerful):",
    "  h + v  -> cross: clears full row AND column simultaneously",
    "  h + h  -> clears 3 rows;  v + v -> clears 3 columns",
    "  + + h/v -> clears ~5 rows AND columns",
    "  + + +  -> massive ~5x5 explosion",
    "  * + gem -> clears ALL gems matching that gem's color",
    "  * + PU  -> converts ALL gems of one color into that PU, then activates all",
    "",
    "PU strategy tips:",
    "  • Creating a PU is often worth more than a direct 3-match — prioritise it.",
    "  • If two PUs are adjacent, swapping them for a combo is almost always best.",
    "  • Save * (Rainbow) to combine with another PU for maximum board clear.",
    "  • h/v rockets seek blockers — activate one sharing a row/col with X.",
    "  • Plan 'setup' moves: accept a weak move now to align 4 gems of a target color",
    "    next turn, creating a PU that will be more efficient than three 3-matches.",
    "  • Saving PUs for future advantage:",
    "    - Check 'Power-Up pairs' section each turn for distances between PUs.",
    "    - dist=1 (ADJACENT): swap them NOW for a combo — do not waste by activating alone.",
    "    - dist=2 (near-combo): consider a non-PU setup move (gem match) that may",
    "      cascade and close the gap, then combo next turn.",
    "    - dist≥3: don't wait — activate each PU when it's useful (hitting X / targets).",
    "    - URGENCY (<=25% moves left): activate ALL PUs immediately, no saving.",
    "",
    "=== STRATEGIC PLANNING ===",
    "Each turn you receive an 'Active Strategy' — your multi-turn plan.",
    "  * If Active Strategy is EMPTY: you MUST write a full strategy in revised_strategy.",
    "  * If Active Strategy is set: check if it's still valid before picking a move.",
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
    "  5. Is there a 'setup' opportunity — a move that doesn't score now but will",
    "     create a PU or strong chain next turn?",
    "",
    "=== MOVE PRIORITIES (within the strategy) ===",
    "0. (!) RAINBOW SUPER COMBO — absolute top priority, no exceptions:",
    "   If any candidate annotation says '(!) SUPER COMBO: *+' — pick it IMMEDIATELY.",
    "   * + PU converts ALL gems of one color into that PU type, then fires ALL of them at once.",
    "   This beats every other rule: blockers, endgame, urgency, everything.",
    "   If a candidate says '[(!): *d1 -> SUPER COMBO avail]' — swap that rainbow first instead.",
    "1. Swap two other adjacent PUs for a combo (h+v, ++h, etc.).",
    "   Check 'Power-Up pairs' — if dist=1 (ADJACENT label), this is your move.",
    "   If dist=2 (near-combo), consider a non-PU gem match that may close the gap.",
    "2. If Kong is on board: hit Kong every 2-3 turns to prevent box spawns.",
    "   Use h/v rockets in Kong's row/col, or match gems adjacent to Kong.",
    "3. If X is a target: match or activate PU in cells ADJACENT to X.",
    "4. If ~ (grass) is a target: match gems IN grass cells (the gem on top).",
    "5. Create a PU via 4/5-match (->PU: annotations). When the board has FEW existing",
    "   PUs, creation OUTRANKS single PU activation — build your arsenal first.",
    "   Exception: still activate if it forms a PU+PU combo (rule 1), or the PU",
    "   shares its row/col with an X target (rocket targeting bonus).",
    "6. Activate an existing PU (h/v/+/L/n/*) near targets, X, or ~ cells. Prefer",
    "   activation when PUs are already plentiful (=>3 on board) or moves are scarce.",
    "7. Directly match target gem types (labels in Objectives).",
    "8. Setup move: sacrifice direct score to align gems for a PU or chain next turn.",
    "9. All other moves (last resort only).",
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
        this._consecutiveErrors = 0;     // consecutive LLM call failures
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
        this._consecutiveErrors = 0;
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
            cc.log("[LLMAgent]   no valid moves — retrying after delay (board reshuffle?)");
            this._pendingLLM = false;
            this._setStatus("idle");
            var selfRetry = this;
            setTimeout(function () {
                if (selfRetry._running) selfRetry.onTurnReady();
            }, 1500);
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
                self._consecutiveErrors++;
                // After 2+ consecutive failures the strategy may be stale — force refresh
                if (self._consecutiveErrors >= 2 && self._strategy) {
                    cc.warn("[LLMAgent]   " + self._consecutiveErrors +
                            " consecutive errors — clearing stale strategy");
                    self._strategy = null;
                    self._strategyNeedsReview = false;
                }
                self._setStatus("idle");
                if (self._running) {
                    setTimeout(function () {
                        if (self._running) self.onTurnReady();
                    }, 2000);
                }
                return;
            }

            self._consecutiveErrors = 0;  // reset on success

            // ── Update strategy if LLM revised it ────────────────────────────
            if (revisedStrategy && revisedStrategy.trim()) {
                self._strategy     = revisedStrategy.trim();
                self._strategyTurn = turn;
                self._strategyNeedsReview = false;
                var stratLines = self._strategy.split("\n");
                cc.log("[LLMAgent]   strategy updated (" + stratLines.length + " lines):");
                for (var si = 0; si < stratLines.length; si++) {
                    if (stratLines[si].trim()) cc.log("[LLMAgent]     " + stratLines[si]);
                }
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
                   move[0] + "," + move[1] + ")->("  + move[2] + "," + move[3] + ")");

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
            cc.log("[LLMAgent]   elems " + (elem1 || "?") + "<>" + (elem2 || "?") +
                   "  actual " + actualE1 + "<>" + actualE2);
            cc.log("[LLMAgent]   min_target_cleared=" + (minCleared || 0));
            cc.log("[LLMAgent]   why  " + (reasoning || ""));
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
                moveDesc:  "(" + move[0] + "," + move[1] + ")<>(" + move[2] + "," + move[3] + ")" +
                           " " + actualE1 + "<>" + actualE2,
                reasoning: (reasoning || ""),
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

        // Count existing PUs on board to decide creation vs activation preference
        var existingPUCount = 0;
        var boardCells = rows * cols;
        for (var pur = 0; pur < rows; pur++) {
            for (var puc = 0; puc < cols; puc++) {
                if (_LLM_POWER_UPS[board[pur][puc]]) existingPUCount++;
            }
        }
        // Threshold scales with board size: larger boards sustain more PUs before
        // activation becomes preferred over creation.
        // ~36 cells → 2, ~49 cells → 2, ~63 cells → 3, ~81 cells → 3
        var puCreationThreshold = Math.max(2, Math.round(boardCells / 24));
        var preferCreation = existingPUCount < puCreationThreshold;

        // tierCombo    = PU + PU combo swaps (always highest priority)
        // tierActivate = activate a single existing PU
        // tierCreate   = move creates a new PU via 4/5-match
        // tier1        = adjacent to X / on grass / target gem type
        // tier2        = everything else
        var tierCombo = [], tierActivate = [], tierCreate = [], tier1 = [], tier2 = [];
        for (var i = 0; i < moves.length; i++) {
            var m  = moves[i];
            var t1 = board[m[0]][m[1]];
            var t2 = board[m[2]][m[3]];
            var isPUCombo    = _LLM_POWER_UPS[t1] && _LLM_POWER_UPS[t2];
            var isPUActivate = !isPUCombo && (_LLM_POWER_UPS[t1] || _LLM_POWER_UPS[t2]);
            var isPUCreate   = !isPUCombo && !isPUActivate &&
                               _llmCreatesNewPU(board, rows, cols, m[0], m[1], m[2], m[3]);
            if (isPUCombo) {
                tierCombo.push(m);
            } else if (isPUActivate) {
                tierActivate.push(m);
            } else if (isPUCreate) {
                tierCreate.push(m);
            } else if (targetSet[t1] || targetSet[t2] ||
                       adjToBlocker[m[0]+","+m[1]] || adjToBlocker[m[2]+","+m[3]] ||
                       grassCell[m[0]+","+m[1]]    || grassCell[m[2]+","+m[3]]) {
                tier1.push(m);
            } else {
                tier2.push(m);
            }
        }

        // Build candidate list: combos always first, then balance create/activate
        // by PU density — scarce PUs → show creation moves before activation moves.
        var selected = tierCombo.slice();
        var rem = topK - selected.length;
        if (rem > 0) {
            var firstPU  = preferCreation ? tierCreate   : tierActivate;
            var secondPU = preferCreation ? tierActivate : tierCreate;
            selected = selected.concat(_llmSample(firstPU, rem));
            rem = topK - selected.length;
            if (rem > 0) {
                selected = selected.concat(_llmSample(secondPU, rem));
                rem = topK - selected.length;
            }
        }
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
        var sep       = "    " + new Array(cols * 2 + 1).join("-");
        var boardLines = [colHeader, sep];
        for (var r = rows - 1; r >= 0; r--) {
            var cells = [];
            for (var c = 0; c < cols; c++) {
                cells.push(_llmCellChar(board[r][c]));
            }
            boardLines.push(_llmPad(r, 2) + " | " + cells.join("  "));
        }
        var boardStr = boardLines.join("\n");

        // Objectives — track how many target types still have remaining units
        var objLines = [];
        var activeTargetLabels = [];
        for (var tid in state.targets) {
            var total = state.targets[tid];
            var done  = state.targets_cleared[tid] || 0;
            var rem   = total - done;
            var bar   = _llmRepeat("#", done) + _llmRepeat(".", rem);
            var label = _llmTargetLabel(tid);
            var suffix = "";
            if (rem > 0) {
                activeTargetLabels.push(label);
                if (rem <= 2) suffix = "  <- ALMOST DONE";
            }
            objLines.push("  " + label + ": " + done + "/" + total +
                          " [" + bar + "]  (" + rem + " remaining)" + suffix);
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
                           " <> (" + mv[2] + "," + mv[3] + ")" + l2 +
                           "  -> " + matchNote);
        }
        var candStr = candLines.length ? candLines.join("\n") : "  (none)";

        // Critical end-game focus prefix — fires when ≤2 targets remain with few moves
        var criticalPrefix = "";
        if (activeTargetLabels.length <= 2 && activeTargetLabels.length > 0) {
            var focusStr = activeTargetLabels.join(" and ");
            criticalPrefix = "(!) ENDGAME FOCUS: only " + focusStr +
                             " target(s) remain. EVERY move MUST advance clearing " +
                             focusStr + ". Do NOT waste moves on unrelated matches.\n";
        }

        var strategyStr, reviewNote;
        if (!strategy) {
            strategyStr = "(EMPTY — you MUST write a strategy in revised_strategy before picking a move)";
            reviewNote  = criticalPrefix + "Write a full strategy in revised_strategy, then call select_move.";
        } else if (needsReview) {
            strategyStr = strategy + "\n\n⚠ A blocker was just destroyed. You MUST update revised_strategy to reflect the new board state.";
            reviewNote  = criticalPrefix + "A blocker was just destroyed — update revised_strategy to reflect the new situation, then call select_move.";
        } else {
            strategyStr = strategy;
            reviewNote  = criticalPrefix + "Review the Active Strategy. If it needs updating, set revised_strategy.\nThen choose the move that best advances it and call select_move.";
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

        // PU pairs section: show distances between all PUs on board (≥2 PUs only)
        var puPairsStr = "";
        var puCells = [];
        for (var pr = 0; pr < rows; pr++) {
            for (var pc = 0; pc < cols; pc++) {
                if (_LLM_POWER_UPS[board[pr][pc]]) {
                    puCells.push([pr, pc, _llmCellChar(board[pr][pc])]);
                }
            }
        }
        if (puCells.length >= 2) {
            var pairLines = [];
            for (var pi = 0; pi < puCells.length; pi++) {
                for (var pj = pi + 1; pj < puCells.length; pj++) {
                    var pa = puCells[pi], pb = puCells[pj];
                    var pdist = Math.abs(pa[0] - pb[0]) + Math.abs(pa[1] - pb[1]);
                    var ptag = pdist === 1
                        ? "  <- ADJACENT -> swap NOW for combo!"
                        : pdist === 2
                            ? "  <- 2 apart (near-combo: 1 setup move may close gap)"
                            : "";
                    pairLines.push("  " + pa[2] + "(" + pa[0] + "," + pa[1] + ")" +
                                   " + " + pb[2] + "(" + pb[0] + "," + pb[1] + ")" +
                                   "  dist=" + pdist + ptag);
                }
            }
            // Urgency note when moves are running low
            var moveRatio = state.total_moves > 0
                ? state.moves_remaining / state.total_moves : 1;
            var urgencyNote = moveRatio <= 0.25
                ? "\n  (!) URGENT (<=25% moves left): activate ALL PUs now — no time to save for combos."
                : "";
            puPairsStr = "## Power-Up pairs on board\n" +
                         pairLines.join("\n") + urgencyNote + "\n\n";
        }

        return (
            "## Current board  (row 0 = bottom)\n\n" +
            boardStr + "\n\n" +
            grassStr +
            "## Objectives\n" + objStr + "\n\n" +
            "## Resources\nMoves remaining: " +
            state.moves_remaining + " / " + state.total_moves + "\n\n" +
            puPairsStr +
            "## Active Strategy\n" + strategyStr + "\n\n" +
            "## Valid moves (" + candidates.length + " total)\n" + candStr + "\n\n" +
            reviewNote
        );
    },

    // ── LLM API calls ─────────────────────────────────────────────────────────

    /**
     * cb(err, index, reasoning, elem1, elem2, minCleared, revisedStrategy)
     */
    _callLLM: function (userMsg, cb) {
        var provider = LLMConfig.provider;
        if (provider === "local") {
            this._callLocalService(userMsg, cb);
        } else if (provider === "anthropic") {
            this._callAnthropic(userMsg, cb);
        } else {
            // openai / deepseek — OpenAI-compatible
            var baseUrl = (provider === "deepseek")
                ? "https://api.deepseek.com/v1"
                : "https://api.openai.com/v1";
            this._callOpenAICompat(userMsg, baseUrl, cb);
        }
    },

    _callLocalService: function (userMsg, cb) {
        var self = this;
        var url  = (LLMConfig.serviceUrl || "http://127.0.0.1:7860") + "/llm/select_move";
        var body = JSON.stringify({
            user_message: userMsg,
        });

        _llmXHR("POST", url, {"Content-Type": "application/json"}, body,
            function (err, data) {
                if (err) return cb(err);
                try {
                    if (data.error) return cb("Service error: " + data.error);
                    self._tokenStats.in    += (data.tokens_in  || 0);
                    self._tokenStats.out   += (data.tokens_out || 0);
                    self._tokenStats.calls++;
                    cc.log("[LLMAgent] tokens  in=" + (data.tokens_in  || 0)
                        + "  out=" + (data.tokens_out || 0)
                        + "  total=" + self._tokenStats.in + "/" + self._tokenStats.out
                        + "  calls=" + self._tokenStats.calls);
                    return cb(null,
                        parseInt(data.index, 10),
                        data.reasoning           || "",
                        data.elem1               || "",
                        data.elem2               || "",
                        parseInt(data.min_target_cleared, 10) || 0,
                        data.revised_strategy    || "");
                } catch (e) {
                    cb("Local service parse error: " + e);
                }
            }
        );
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

            // If swap was rejected (no match / board changed since LLM call),
            // playerMoved stays false and turnFinished will never fire.
            // Re-read board and retry after a short delay.
            if (!bm.playerMoved) {
                cc.warn("[LLMAgent]   swap rejected (board changed?) — will re-read and retry");
                setTimeout(function () {
                    if (self._running) self.onTurnReady();
                }, 800);
            }
        }, delayMs);
    },

});

// ── Utility helpers ───────────────────────────────────────────────────────────

/** Async XHR helper. cb(err, parsedJson) */
function _llmXHR(method, url, headers, body, cb) {
    try {
        var xhr = cc.loader.getXMLHttpRequest();
        xhr.open(method, url, true);
        for (var key in headers) {
            xhr.setRequestHeader(key, headers[key]);
        }
        var _done = false;
        function _finish(err, data) {
            if (_done) return;
            _done = true;
            cb(err, data);
        }
        xhr.onreadystatechange = function () {
            if (xhr.readyState !== 4) return;
            if (xhr.status >= 200 && xhr.status <= 207) {
                try {
                    _finish(null, JSON.parse(xhr.responseText));
                } catch (e) {
                    _finish("JSON parse error: " + e);
                }
            } else {
                _finish("HTTP " + xhr.status + " " + xhr.statusText);
            }
        };
        xhr.onerror   = function () { _finish("XHR onerror");   };
        xhr.ontimeout = function () { _finish("XHR timeout");   };
        xhr.onabort   = function () { _finish("XHR aborted");   };
        xhr.timeout = 60000;  // 60s — LLM calls can be slow
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

    // PU activation: swapping a PU with any gem activates it.
    // The PU fires from its DESTINATION (post-swap cell), not from its origin.
    if (_LLM_POWER_UPS[t1] || _LLM_POWER_UPS[t2]) {
        if (_LLM_POWER_UPS[t1] && _LLM_POWER_UPS[t2]) {
            var la = _llmCellChar(t1), lb = _llmCellChar(t2);
            if (t1 === 103 || t2 === 103) {
                // Rainbow + any PU: converts all gems of one color into that PU, fires them all
                var puLabel = (t1 === 103) ? lb : la;
                return "(!) SUPER COMBO: *+" + puLabel + " -> ALL gems => " + puLabel + " + fires ALL [ALWAYS pick this]";
            }
            return "PU+PU combo " + la + "+" + lb;
        }
        var puType = _LLM_POWER_UPS[t1] ? t1 : t2;
        var puOriR = _LLM_POWER_UPS[t1] ? r1 : r2;
        var puOriC = _LLM_POWER_UPS[t1] ? c1 : c2;
        var destR  = _LLM_POWER_UPS[t1] ? r2 : r1;
        var destC  = _LLM_POWER_UPS[t1] ? c2 : c1;
        // Find nearest PU within 2 cells of origin — prefer rainbow at d=1
        var nearPUDist = 9, nearPUType = 0;
        for (var anr = 0; anr < rows; anr++) {
            for (var anc = 0; anc < cols; anc++) {
                if (anr === puOriR && anc === puOriC) continue;
                if (_LLM_POWER_UPS[board[anr][anc]]) {
                    var nd = Math.abs(anr - puOriR) + Math.abs(anc - puOriC);
                    if (nd <= 2) {
                        // Always prefer rainbow at d=1 over anything else
                        var isRainbow = (board[anr][anc] === 103);
                        if (nd < nearPUDist || (isRainbow && nd <= nearPUDist)) {
                            nearPUDist = nd;
                            nearPUType = board[anr][anc];
                        }
                    }
                }
            }
        }
        var nearPUNote = "";
        if (nearPUType) {
            var nearLabel = _llmCellChar(nearPUType);
            if (nearPUDist === 1 && nearPUType === 103) {
                nearPUNote = " [(!): *d1 -> SUPER COMBO avail, do NOT activate alone!]";
            } else if (nearPUDist === 1) {
                nearPUNote = " [COMBO avail: " + nearLabel + "d1 -> swap them instead]";
            } else {
                nearPUNote = " (near " + nearLabel + "d" + nearPUDist + ")";
            }
        }
        if (puType === 101) {  // h rocket: fires along destination ROW
            var xInRow = false;
            for (var ci = 0; ci < cols; ci++) {
                if (_LLM_BLOCKERS[board[destR][ci]]) { xInRow = true; break; }
            }
            return "activates h -> fires row " + destR + (xInRow ? " [X!]" : "") + nearPUNote;
        }
        if (puType === 106) {  // v rocket: fires along destination COL
            var xInCol = false;
            for (var ri = 0; ri < rows; ri++) {
                if (_LLM_BLOCKERS[board[ri][destC]]) { xInCol = true; break; }
            }
            return "activates v -> fires col " + destC + (xInCol ? " [X!]" : "") + nearPUNote;
        }
        return "activates " + _llmCellChar(puType) + " at (" + destR + "," + destC + ")" + nearPUNote;
    }

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
        var hLen = runLen(r, c, 0, 1);
        var vLen = runLen(r, c, 1, 0);
        // Determine PU created (if any)
        var puTag = "";
        if (hLen >= 3 && vLen >= 3) {
            puTag = "->PU:+";          // T/L bomb (cross shape)
        } else if (hLen >= 5 || vLen >= 5) {
            puTag = "->PU:*";          // rainbow
        } else if (hLen === 4) {
            puTag = "->PU:h";          // rocket horizontal
        } else if (vLen === 4) {
            puTag = "->PU:v";          // rocket vertical
        }
        if (hLen >= 3) {
            var hs = runStart(r, c, 0, 1);
            return lbl + "x" + hLen + " row" + r + ":c" + hs.c + "-" + (hs.c + hLen - 1) + puTag;
        }
        if (vLen >= 3) {
            var vs = runStart(r, c, 1, 0);
            return lbl + "x" + vLen + " col" + c + ":r" + vs.r + "-" + (vs.r + vLen - 1) + puTag;
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

/**
 * Returns true if swapping (r1,c1)↔(r2,c2) creates a NEW Power-Up via 4/5-match.
 * Skips moves where either cell is already a PU (those are activations, not creations).
 */
function _llmCreatesNewPU(board, rows, cols, r1, c1, r2, c2) {
    var t1 = board[r1][c1], t2 = board[r2][c2];
    if (t1 <= 0 || t2 <= 0) return false;
    if (_LLM_POWER_UPS[t1] || _LLM_POWER_UPS[t2]) return false;
    // Simulate swap on a shallow copy
    var tmp = [];
    for (var rr = 0; rr < rows; rr++) tmp.push(board[rr].slice());
    tmp[r1][c1] = t2;
    tmp[r2][c2] = t1;
    function runLen(r, c, dr, dc) {
        var typ = tmp[r][c];
        if (typ <= 0 || _LLM_POWER_UPS[typ]) return 0;
        var len = 1;
        var nr = r + dr, nc = c + dc;
        while (nr >= 0 && nr < rows && nc >= 0 && nc < cols && tmp[nr][nc] === typ) { len++; nr += dr; nc += dc; }
        nr = r - dr; nc = c - dc;
        while (nr >= 0 && nr < rows && nc >= 0 && nc < cols && tmp[nr][nc] === typ) { len++; nr -= dr; nc -= dc; }
        return len;
    }
    return runLen(r1, c1, 0, 1) >= 4 || runLen(r1, c1, 1, 0) >= 4 ||
           runLen(r2, c2, 0, 1) >= 4 || runLen(r2, c2, 1, 0) >= 4;
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
