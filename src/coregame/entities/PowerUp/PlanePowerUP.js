/**
 * PlanePowerUP - Paper Plane power-up element (2x2 square match)
 * Part of Match-3 Core Game
 */
var CoreGame = CoreGame || {};

CoreGame.PlaneUP = CoreGame.PowerUP.extend({

    ctor: function () {
        this._super();
    },

    /**
     * Activate paper plane effect - explode adjacent cells,
     * then fly to a priority target (level objectives first, random gem as fallback).
     */
    activeLogic: function () {
        const EXPLODE = [[-1, 0], [1, 0], [0, -1], [0, 1]];
        let context = { type: "normal" };

        // ── Step 1: Launch burst + track exploded slots ───────────────────
        // [IMPROVEMENT] Collect slots hit by launch so we can exclude them from
        // target selection. matchElement is visually async — the element stays in
        // listElement during its death animation, so findListPriorityTarget would
        // still see it as a valid target without this exclusion.
        var explodedByLaunch = [];
        for (var i = 0; i < EXPLODE.length; i++) {
            var slot = this.boardMgr.getSlot(
                this.position.x + EXPLODE[i][0],
                this.position.y + EXPLODE[i][1]
            );
            if (slot) {
                explodedByLaunch.push(slot);
                slot.matchElement(context);
            }
        }

        // ── Step 2: Get priority targets (excludes launch-exploded slots) ──
        var listTarget = this.boardMgr.findListPriorityTarget(explodedByLaunch);

        // ── Step 3: Filter by claim counts (multi-plane overkill prevention) ──
        // _planeClaimCounts is reset in onFinishTurn, so it accumulates across
        // all planes in the same turn (including staggered PlanePlusPU planes).
        if (!this.boardMgr._planeClaimCounts) {
            this.boardMgr._planeClaimCounts = [];
        }
        var claimCounts = this.boardMgr._planeClaimCounts;
        var available = [];
        var availableScores = [];

        for (var i = 0; i < listTarget.length; i++) {
            var tSlot = listTarget[i];
            var claimedCount = 0;
            for (var j = 0; j < claimCounts.length; j++) {
                if (claimCounts[j].slot === tSlot) {
                    claimedCount = claimCounts[j].count;
                    break;
                }
            }
            // maxClaims = highest HP among elements in slot (default 1 for gems/unknown)
            var maxClaims = 1;
            for (var e = 0; e < tSlot.listElement.length; e++) {
                var el = tSlot.listElement[e];
                if (el.hitPoints && el.hitPoints > maxClaims) {
                    maxClaims = el.hitPoints;
                }
            }
            if (claimedCount < maxClaims) {
                available.push(tSlot);
                // [IMPROVEMENT] Score: position in sorted list (findListPriorityTarget
                // now returns sorted by priority). Earlier index = higher score.
                // Reverse-index weight: first slot gets weight N, last gets 1.
                availableScores.push(listTarget.length - i);
            }
        }

        // Fallback: if all targets fully claimed, use full list (original behavior)
        if (available.length === 0) {
            available = listTarget.slice();
            availableScores = available.map(function (_, idx) {
                return available.length - idx;
            });
        }

        if (available.length > 0) {
            // [IMPROVEMENT] Weighted random: prefers earlier (higher-priority) slots
            // but keeps variety so planes don't all stack on the same target.
            var rdIdx = this.boardMgr._weightedRandomIndex(availableScores);
            this.targetSlot = available[rdIdx];

            // Update claim count
            var found = false;
            for (var k = 0; k < claimCounts.length; k++) {
                if (claimCounts[k].slot === this.targetSlot) {
                    claimCounts[k].count++;
                    found = true;
                    break;
                }
            }
            if (!found) {
                claimCounts.push({ slot: this.targetSlot, count: 1 });
            }
        }

        this.ui.startActive(this.targetSlot);
        this.ui = undefined;
        // WARNING: should activate slot at least once (original comment preserved)
        this.boardMgr.getSlot(this.position.x, this.position.y).matchElement(context);
        this.onMatch();
    },

    /**
     * Create visual ui
     */
    createUIInstance: function () {
        return new CoreGame.PlaneUI(this);
    },

    onMatch: function () {
        CoreGame.TimedActionMgr.addAction(0.2, this._super, this);
        if (this.targetSlot) {
            CoreGame.TimedActionMgr.addAction(1.4, function () {
                // this = targetSlot (GridSlot), bound by 3rd arg of addAction
                // [IMPROVEMENT] Validate target is still alive before matching.
                // Handles two cases:
                //   a) Launch explosion already destroyed the target element (async visual,
                //      element still in listElement at pick-time but gone by arrival)
                //   b) Another plane or chain reaction cleared it between T+0 and T+1.4s

                // Guard: slot completely empty
                if (this.isEmpty()) return;

                // Check if slot still has a live objective element
                // var bm = this.boardMgr;
                // var remainingTypes = [];
                // for (var i = 0; i < bm.targetElements.length; i++) {
                //     if (bm.targetElements[i].current > 0) {
                //         remainingTypes.push(bm.targetElements[i].id);
                //     }
                // }
                // var hasLiveTarget = false;
                // for (var e = 0; e < this.listElement.length; e++) {
                //     var el = this.listElement[e];
                //     if (remainingTypes.indexOf(el.type) >= 0) {
                //         // Additional HP check: if element has hitPoints, ensure it's still > 0
                //         if (el.hitPoints === undefined || el.hitPoints > 0) {
                //             hasLiveTarget = true;
                //             break;
                //         }
                //     }
                // }

                // // Match if: still has live objective, OR at minimum a matchable gem
                // if (hasLiveTarget || this.getMatchableElement()) {
                    this.matchElement();
                // }
                // If neither, plane lands silently — VFX still plays in PlaneUI.onArrive
            }, this.targetSlot);
        }
    },
});

// Register PlaneUP for MATCH_SQUARE type
CoreGame.ElementObject.register(CoreGame.PowerUPType.MATCH_SQUARE, CoreGame.PlaneUP);

/**
 * PlaneBoomPU - Combination of Plane + Bomb
 * Flies to target and explodes in a 3x3 area.
 */
CoreGame.PlaneBombPU = CoreGame.PlaneUP.extend({
    onMatch: function () {
        CoreGame.TimedActionMgr.addAction(0.2, this._super, this);
        CoreGame.TimedActionMgr.addAction(1.4, function () {
            if (this.targetSlot) {
                var row = this.targetSlot.row;
                var col = this.targetSlot.col;
                var subPU = CoreGame.ElementObject.create(row, col, CoreGame.PowerUPType.MATCH_T);
                if (subPU) {
                    subPU.boardMgr = this.boardMgr;
                    var parent = this.boardMgr.boardUI;
                    if (parent) subPU.createUI(parent);
                    subPU.active();
                }
            }
        }, this);
    }
});

/**
 * PlaneRocketPU - Combination of Plane + Rocket
 * Flies to target and triggers both horizontal and vertical rocket effects.
 */
CoreGame.PlaneRocketHPU = CoreGame.PlaneUP.extend({
    onMatch: function () {
        CoreGame.TimedActionMgr.addAction(0.2, this._super, this);
        CoreGame.TimedActionMgr.addAction(1.4, function () {
            if (this.targetSlot) {
                var row = this.targetSlot.row;
                var col = this.targetSlot.col;
                var subPU = CoreGame.ElementObject.create(row, col, CoreGame.PowerUPType.MATCH_4_H);
                if (subPU) {
                    subPU.boardMgr = this.boardMgr;
                    var parent = this.boardMgr.boardUI;
                    if (parent) subPU.createUI(parent);
                    subPU.active();
                }
            }
        }, this);
    }
});

CoreGame.PlaneRocketVPU = CoreGame.PlaneUP.extend({
    onMatch: function () {
        CoreGame.TimedActionMgr.addAction(0.2, this._super, this);
        CoreGame.TimedActionMgr.addAction(1.4, function () {
            if (this.targetSlot) {
                var row = this.targetSlot.row;
                var col = this.targetSlot.col;
                var subPU = CoreGame.ElementObject.create(row, col, CoreGame.PowerUPType.MATCH_4_V);
                if (subPU) {
                    subPU.boardMgr = this.boardMgr;
                    var parent = this.boardMgr.boardUI;
                    if (parent) subPU.createUI(parent);
                    subPU.active();
                }
            }
        }, this);
    }
});

// Register Plane combinations
CoreGame.PowerUP.registerCombined(CoreGame.PowerUPType.MATCH_SQUARE, CoreGame.PowerUPType.MATCH_T, CoreGame.PlaneBombPU);
CoreGame.PowerUP.registerCombined(CoreGame.PowerUPType.MATCH_SQUARE, CoreGame.PowerUPType.MATCH_L, CoreGame.PlaneBombPU);
CoreGame.PowerUP.registerCombined(CoreGame.PowerUPType.MATCH_SQUARE, CoreGame.PowerUPType.MATCH_4_H, CoreGame.PlaneRocketHPU);
CoreGame.PowerUP.registerCombined(CoreGame.PowerUPType.MATCH_SQUARE, CoreGame.PowerUPType.MATCH_4_V, CoreGame.PlaneRocketVPU);
