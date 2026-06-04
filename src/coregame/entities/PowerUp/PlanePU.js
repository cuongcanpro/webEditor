/**
 * PlanePU - Paper Plane power-up element (2x2 square match)
 * Part of Match-3 Core Game
 */
var CoreGame = CoreGame || {};

CoreGame.PlanePU = CoreGame.PowerUP.extend({
    ctor: function () {
        this._super();
        this.preserveUI = null;
    },

    /**
     * Activate paper plane effect - explode adjacent cells,
     * then fly to a priority target (level objectives first, random gem as fallback).
     */
    activeLogic: function () {

        // ── Step 1: Launch burst + track exploded slots ───────────────────
        // [IMPROVEMENT] Collect slots hit by launch so we can exclude them from
        // target selection. matchElement is visually async — the element stays in
        // listElement during its death animation, so findListPriorityTarget would
        // still see it as a valid target without this exclusion.
        var explodedByLaunch = [];

        if (!this.isSubPU) {
            const EXPLODE = [[-1, 0], [1, 0], [0, 0], [0, -1], [0, 1]];
            for (var i = 0; i < EXPLODE.length; i++) {
                var slot = this.boardMgr.getSlot(
                    this.position.x + EXPLODE[i][0],
                    this.position.y + EXPLODE[i][1]
                );
                if (slot) {
                    explodedByLaunch.push(slot);
                }
            }
        }

        var puType = this.type;
        var damage = this.damage;
        // Launch burst counts as one activation; the final on-target hit
        // generates its own id in onFly() so a monster clipped by both
        // phases can be damaged twice (per design).
        var launchActivationId = CoreGame.PowerUP.nextActivationId();
        CoreGame.TimedActionMgr.addAction(0.2, function (explodedByLaunch) {
            var context = { type: "normal", puType: puType, damage: damage, puActivationId: launchActivationId };
            for (var i = 0; i < explodedByLaunch.length; i++)
                explodedByLaunch[i].matchElement(context);
        }.bind(null, explodedByLaunch));

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

        // [PLANE-DEBUG] Temporary — what did this plane lock onto, and what is in
        // that slot at PICK time? Compare against the ARRIVE log in onFly.
        if (this.targetSlot) {
            var pickTypes = [];
            for (var pdi = 0; pdi < this.targetSlot.listElement.length; pdi++) {
                pickTypes.push(this.targetSlot.listElement[pdi].type);
            }
            cc.log("[PLANE-DEBUG] PICK target slot(" + this.targetSlot.row + "," + this.targetSlot.col
                + ") types=" + JSON.stringify(pickTypes));
        } else {
            cc.log("[PLANE-DEBUG] PICK target = NULL (no target found)");
        }

        this.ui.startActive(this.targetSlot);
        this.preserveUI = this.ui;
        this.ui = null;

        CoreGame.TimedActionMgr.addAction(CoreGame.PlaneUI.DELAY, this.onFly, this);
    },

    /**
     * Create visual ui
     */
    createUIInstance: function () {
        return new CoreGame.PlaneUI(this);
    },

    onFly: function () {
        if (this.targetSlot) {
            // Nếu target là Tủ nước màu (ColorCabinet): đặt chỗ đúng chai mà cú bay
            // này sẽ phá, bay thẳng vào ô chai đó (thay vì luôn vào góc tủ) và truyền
            // bottleColor xuống để chai vỡ khớp với điểm plane đáp.
            var cabinet = this._findColorCabinet(this.targetSlot);
            var bottleColor = 0;
            var destOverride = null;
            if (cabinet) {
                bottleColor = cabinet.reserveBottleColor();
                if (bottleColor && cabinet.ui && typeof cabinet.ui.getBottlePosition === 'function') {
                    destOverride = cabinet.ui.getBottlePosition(bottleColor);
                }
            }

            let timeFly = 0;
            if (this.preserveUI) {
                timeFly = this.preserveUI.startFlyTo(this.targetSlot, destOverride);
            }

            var puType = this.type;
            var damage = this.damage;
            var flyActivationId = CoreGame.PowerUP.nextActivationId();
            cc.log("Time Fly ======= " + timeFly);
            CoreGame.TimedActionMgr.addAction(timeFly, function () {
                // [PLANE-DEBUG] Temporary — what is actually in the slot when the
                // plane lands? If this differs from the PICK log, the objective
                // dropped/cleared mid-flight and the plane is hitting a refilled gem.
                var arriveTypes = [];
                for (var adi = 0; adi < this.listElement.length; adi++) {
                    arriveTypes.push(this.listElement[adi].type);
                }
                cc.log("[PLANE-DEBUG] ARRIVE slot(" + this.row + "," + this.col
                    + ") types=" + JSON.stringify(arriveTypes) + " empty=" + this.isEmpty());
                if (this.isEmpty()) return;
                this.matchElement({ type: "normal", puType: puType, damage: damage, puActivationId: flyActivationId, bottleColor: bottleColor });
            }, this.targetSlot);
        }
    },

    /** Tìm ColorCabinet trong một slot (nếu có). */
    _findColorCabinet: function (slot) {
        if (!slot || !slot.listElement) return null;
        for (var i = 0; i < slot.listElement.length; i++) {
            var el = slot.listElement[i];
            if (el && typeof el.reserveBottleColor === 'function' && typeof el.getRemainingColors === 'function') {
                return el;
            }
        }
        return null;
    },

    onTargetReached: function () {
        //nothing
    }
});

// Register PlanePU for MATCH_SQUARE type
CoreGame.ElementObject.register(CoreGame.PowerUPType.MATCH_SQUARE, CoreGame.PlanePU);

/**
 * PlaneMergePU - Combination of Plane + Bomb
 * Flies to target and explodes in a area x area.
 */
CoreGame.PlaneMergePU = CoreGame.PlanePU.extend({
    onFly: function () {
        if (this.targetSlot) {
            let timeFly = 0;
            if (this.preserveUI) {
                timeFly = this.preserveUI.startFlyTo(this.targetSlot);
            }
            cc.log("Time Fly 2======= " + timeFly);
            CoreGame.TimedActionMgr.addAction(timeFly, function () {
                this.onTargetReached();
            }, this);
        }
    }
});

/**
 * PlaneBoomPU - Combination of Plane + Bomb
 * Flies to target and explodes in a area x area.
 */
CoreGame.PlaneBombPU = CoreGame.PlaneMergePU.extend({
    onTargetReached: function () {
        if (this.targetSlot) {
            var row = this.targetSlot.row;
            var col = this.targetSlot.col;
            var subPU = CoreGame.ElementObject.create(row, col, CoreGame.PowerUPType.MATCH_T);
            if (subPU) {
                subPU.boardMgr = this.boardMgr;
                var parent = this.boardMgr.boardUI;
                if (parent) subPU.createUI(parent).setVisible(false);
                subPU.active();
            }
        }
    }
});

/**
 * PlaneRocketPU - Combination of Plane + Rocket
 * Flies to target and triggers horizontal rocket effects.
 */
CoreGame.PlaneRocketHPU = CoreGame.PlaneMergePU.extend({
    onTargetReached: function () {
        if (this.targetSlot) {
            var row = this.targetSlot.row;
            var col = this.targetSlot.col;
            var subPU = CoreGame.ElementObject.create(row, col, CoreGame.PowerUPType.MATCH_4_H);
            if (subPU) {
                subPU.boardMgr = this.boardMgr;
                var parent = this.boardMgr.boardUI;
                if (parent) subPU.createUI(parent).setVisible(false);
                subPU.damage = CoreGame.Config.PU_DAMAGE[CoreGame.Config.ElementType.PUS_PU];
                subPU.active();
            }
        }
    }
});

/**
 * PlaneRocketPU - Combination of Plane + Rocket
 * Flies to target and triggers vertical rocket effects.
 */
CoreGame.PlaneRocketVPU = CoreGame.PlaneMergePU.extend({
    onTargetReached: function () {
        if (this.targetSlot) {
            var row = this.targetSlot.row;
            var col = this.targetSlot.col;
            var subPU = CoreGame.ElementObject.create(row, col, CoreGame.PowerUPType.MATCH_4_V);
            if (subPU) {
                subPU.boardMgr = this.boardMgr;
                var parent = this.boardMgr.boardUI;
                if (parent) subPU.createUI(parent).setVisible(false);
                subPU.damage = CoreGame.Config.PU_DAMAGE[CoreGame.Config.ElementType.PUS_PU];
                subPU.active();
            }
        }
    }
});

// Register Plane combinations
CoreGame.PowerUP.registerCombined(CoreGame.PowerUPType.MATCH_SQUARE, CoreGame.PowerUPType.MATCH_T, CoreGame.PlaneBombPU);
CoreGame.PowerUP.registerCombined(CoreGame.PowerUPType.MATCH_SQUARE, CoreGame.PowerUPType.MATCH_L, CoreGame.PlaneBombPU);
CoreGame.PowerUP.registerCombined(CoreGame.PowerUPType.MATCH_SQUARE, CoreGame.PowerUPType.MATCH_4_H, CoreGame.PlaneRocketHPU);
CoreGame.PowerUP.registerCombined(CoreGame.PowerUPType.MATCH_SQUARE, CoreGame.PowerUPType.MATCH_4_V, CoreGame.PlaneRocketVPU);
