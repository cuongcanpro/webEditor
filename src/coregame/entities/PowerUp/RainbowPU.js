/**
 * RainbowPU - Rainbow power-up element (5 in a line match)
 * Part of Match-3 Core Game
 */
var CoreGame = CoreGame || {};

CoreGame.RainbowPU = CoreGame.PowerUP.extend({
    ctor: function () {
        this._super();
    },

    /**
     * Activate power-up effect
     */
    active: function (data) {
        cc.log("Active Size attachments " + this.attachments.length);
        if (this.state === CoreGame.ElementState.REMOVING) {
            return;
        }
        if (this.attachments.length > 0) {
            cc.log("State === " + JSON.stringify(this.attachments[0].blockBaseAction));
        }
        if (this.isStopActionByAttachment(CoreGame.ElementObject.Action.ACTIVE)) {
            cc.log("Stop ====================== ");
            return;
        }

        this.setState(CoreGame.ElementState.REMOVING);
        CoreGame.TimedActionMgr.addAction(0.25, function () {
            this.activeLogic(data);
        }.bind(this));
    },

    /**
     * Clear all gems of target color and deal damage to orthogonally adjacent blockers.
     */
    activeLogic: function (typeToClear) {
        var targetSlots = this.collectTargets(typeToClear);
        var targets = targetSlots.map(function (slot) {
            return this.boardMgr.gridToPixel(slot.row, slot.col);
        }.bind(this));

        // Reserve target gems: set to MATCHING state to prevent drop and normal matching
        var reservedGems = [];
        for (var i = 0; i < targetSlots.length; i++) {
            var gem = targetSlots[i].getMatchableElement();
            if (gem && gem.state === CoreGame.ElementState.IDLE) {
                gem.setState(CoreGame.ElementState.MATCHING);
                reservedGems.push(gem);
            }
        }

        var duration = 0;
        if (this.ui && typeof this.ui.setTargets === 'function') {
            this.ui.setTargets(targets);
            duration = this.ui.startActive();
            this.ui = undefined;
        }
        this.activeDuration = duration;

        var boardMgr = this.boardMgr;
        var selfRow = this.position.x;
        var selfCol = this.position.y;

        CoreGame.TimedActionMgr.addAction(this.activeDuration, function () {
            let context = { type: "normal" };
            for (var i = 0; i < targetSlots.length; i++) {
                targetSlots[i].matchElement(context, true);
                boardMgr.matchMgr.notifyNearbySlots(targetSlots[i].row, targetSlots[i].col, context);
            }
            var selfSlot = boardMgr.getSlot(selfRow, selfCol);
            if (selfSlot) selfSlot.matchElement(context);
        });

        this.removeAfterActivate();
    },

    removeAfterActivate: function () {
        CoreGame.TimedActionMgr.addAction(this.activeDuration, function () {
            this.remove();
            var mgr = CoreGame.BoardUI.getInstance().boardMgr;
            if (!mgr.gameEnded) {
                mgr.state = CoreGame.BoardState.MATCHING;
            }
        }.bind(this));
    },

    collectTargets: function (typeToClear) {
        // First pass: count gems per color to determine the most common
        var colorCount = {};
        for (var r = 0; r < this.boardMgr.rows; r++) {
            for (var c = 0; c < this.boardMgr.cols; c++) {
                var slot = this.boardMgr.getSlot(r, c);
                if (!slot) continue;
                var matchable = slot.getMatchableElement();
                if (matchable && matchable instanceof CoreGame.GemObject) {
                    colorCount[matchable.type] = (colorCount[matchable.type] || 0) + 1;
                }
            }
        }

        // If typeToClear is not a valid gem color on the board (e.g. swapped with a Blocker),
        // fall back to the most common gem color
        if (typeToClear === null || typeToClear === undefined || colorCount[typeToClear] === undefined) {
            var bestType = null;
            var bestCount = 0;
            for (var t in colorCount) {
                if (colorCount[t] > bestCount) {
                    bestCount = colorCount[t];
                    bestType = parseInt(t);
                }
            }
            typeToClear = bestType;
        }

        // Second pass: collect all slots matching the target color
        var targetSlots = [];
        for (var r = 0; r < this.boardMgr.rows; r++) {
            for (var c = 0; c < this.boardMgr.cols; c++) {
                var slot = this.boardMgr.getSlot(r, c);
                if (!slot) continue;
                if (typeToClear !== null && typeToClear !== undefined && slot.getType() === typeToClear) {
                    targetSlots.push(slot);
                }
            }
        }
        return targetSlots;
    },

    /**
     * Create specific avatar instance for RainbowPU
     */
    createUIInstance: function () {
        return new CoreGame.RainbowUI(this);
    },
});

CoreGame.RainbowPUPlus = CoreGame.RainbowPU.extend({
    /**
     * Collect all slots on the board (gems + blockers)
     */
    collectTargets: function () {
        var targetSlots = [];
        for (var r = 0; r < this.boardMgr.rows; r++) {
            for (var c = 0; c < this.boardMgr.cols; c++) {
                var slot = this.boardMgr.getSlot(r, c);
                if (!slot) continue;

                targetSlots.push(slot);
            }
        }
        return targetSlots;
    },

    removeAfterActivate: function () {
        CoreGame.TimedActionMgr.addAction(CoreGame.RainbowPlusUI.EXPLODE_TIME, function () {
            this.remove();
            var mgr = CoreGame.BoardUI.getInstance().boardMgr;
            if (!mgr.gameEnded) {
                mgr.state = CoreGame.BoardState.MATCHING;
            }
        }.bind(this));
    },

    /**
     * Override activeLogic: match gems normally, but only deal 1 damage to blockers
     */
    activeLogic: function (typeToClear) {
        var targetSlots = this.collectTargets(typeToClear);
        var targets = targetSlots.map(function (slot) {
            return this.boardMgr.gridToPixel(slot.row, slot.col);
        }.bind(this));

        // Reserve target gems: set to MATCHING state to prevent drop and normal matching
        for (var i = 0; i < targetSlots.length; i++) {
            var gem = targetSlots[i].getMatchableElement();
            if (gem && gem.state === CoreGame.ElementState.IDLE) {
                gem.setState(CoreGame.ElementState.MATCHING);
            }
        }

        var duration = 0;
        if (this.ui && typeof this.ui.setTargets === 'function') {
            this.ui.setTargets(targets);
            duration = this.ui.startActive();
            this.ui = undefined;
        }

        var boardMgr = this.boardMgr;
        var selfRow = this.position.x;
        var selfCol = this.position.y;

        CoreGame.TimedActionMgr.addAction(duration, function () {
            let context = { type: "normal" };
            for (var i = 0; i < targetSlots.length; i++) {
                var slot = targetSlots[i];

                if (slot.hasBlocker()) {
                    for (var j = 0; j < slot.listElement.length; j++) {
                        var el = slot.listElement[j];
                        if (el instanceof CoreGame.Blocker && el.canTakeDamage()) {
                            el.takeDamage(1, null, slot.row, slot.col);
                        }
                    }
                } else {
                    slot.matchElement(context, true);
                }
            }
            var selfSlot = boardMgr.getSlot(selfRow, selfCol);
            if (selfSlot) selfSlot.matchElement(context);
        });

        this.removeAfterActivate();
    },

    createUIInstance: function () {
        return new CoreGame.RainbowPlusUI(this);
    }
});

// Register RainbowPU for MATCH_5 type
CoreGame.ElementObject.register(CoreGame.PowerUPType.MATCH_5, CoreGame.RainbowPU);

// Register RainbowPU + RainbowPU combination
CoreGame.PowerUP.registerCombined(CoreGame.PowerUPType.MATCH_5, CoreGame.PowerUPType.MATCH_5, CoreGame.RainbowPUPlus);
