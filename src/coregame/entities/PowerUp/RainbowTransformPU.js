/**
 * RainbowBombPU - Combination of Rainbow + Bomb
 * Picks a random color and transforms all gems of that color into bombs.
 * Inherits from CustomCreatorPU to handle multi-PU management.
 */
var CoreGame = CoreGame || {};

CoreGame.RainbowTransformPU = CoreGame.CustomCreatorPU.extend({
    typeTransform: [1],
    init: function (row, col, type) {
        this._super(row, col, type);
        return this;
    },

    createUIInstance: function () {
        return new CoreGame.RainbowUI(this.type);
    },

    /**
     * Scan board, pick a color, and prepare subPUData for transformation
     */
    prepareTransformData: function () {
        if (!this.boardMgr) return;

        // 1. Pick a color present on board
        var colorCounts = {};
        for (var r = 0; r < this.boardMgr.rows; r++) {
            for (var c = 0; c < this.boardMgr.cols; c++) {
                var slot = this.boardMgr.getSlot(r, c);
                var gem = slot ? slot.getMatchableElement() : null;
                // Only count normal gems
                if (gem && gem instanceof CoreGame.GemObject) {
                    colorCounts[gem.type] = (colorCounts[gem.type] || 0) + 1;
                }
            }
        }

        var availableColors = Object.keys(colorCounts);
        if (availableColors.length === 0) {
            this.setCreateData([]);
            return;
        }

        // Pick the most abundant color
        var targetColor = parseInt(availableColors[0]);
        var maxCount = colorCounts[targetColor];
        for (var k = 1; k < availableColors.length; k++) {
            var col = parseInt(availableColors[k]);
            if (colorCounts[col] > maxCount) {
                maxCount = colorCounts[col];
                targetColor = col;
            }
        }

        // 2. Build subPUData for all occurrences of that color
        var data = [{
            posX: this.position.x,
            posY: this.position.y,
            type: this.typeTransform[this.boardMgr.random.nextInt32Bound(this.typeTransform.length)],
            delay: 0,
            isSelf: true
        }];
        var count = 0;
        for (var r = 0; r < this.boardMgr.rows; r++) {
            for (var c = 0; c < this.boardMgr.cols; c++) {
                var slot = this.boardMgr.getSlot(r, c);
                var gem = slot ? slot.getMatchableElement() : null;

                if (gem && gem instanceof CoreGame.GemObject && gem.type === targetColor) {
                    data.push({
                        posX: r,
                        posY: c,
                        type: this.typeTransform[this.boardMgr.random.nextInt32Bound(this.typeTransform.length)],
                        delay: count * 0.05 // Staggered delay for logic activation
                    });
                    count++;
                }
            }
        }

        this.setCreateData(data);
    },

    activeLogic: function (typeToClear) {
        this.ui.setOnTargetHit(this.onTargetHit.bind(this));
        var targets = this.subPUData.map(function (slot) {
            return this.boardMgr.gridToPixel(slot.posX, slot.posY);
        }.bind(this));

        var duration = 0;
        this.ui.setTargets(targets);
        duration = this.ui.startActive();
        this.ui = undefined;
        this.transformDuration = duration;

        // Don't call _super (CustomCreatorPU.activeLogic) — we replace it
        // with a version that, alongside firing each sub-PU, also force-
        // removes the gem we hid earlier in onTargetHit. This guarantees
        // every hidden gem is cleaned up regardless of whether the
        // sub-rocket's row/column clear happens to include its current
        // slot (drops during the staggered burst can move it off the line).
        var self = this;
        CoreGame.TimedActionMgr.addAction(duration, function () {
            self._activateSubPUsWithCleanup();
        });
    },

    /**
     * Variant of CustomCreatorPU.activeLogic that, before each sub-PU's
     * active(), removes the originally-hidden gem saved on the sub-PU.
     * This avoids the race where a hidden gem ends up off the rocket's
     * clear line and is left invisibly orphaned at end of cascade.
     */
    _activateSubPUsWithCleanup: function () {
        if (!this.listSubPU) return;
        for (var i = 0; i < this.listSubPU.length; i++) {
            var subPU = this.listSubPU[i];
            var delay = (this.subPUData[i].delay || 0);
            CoreGame.TimedActionMgr.addAction(delay, function (targetPU) {
                // Remove the gem hidden by onTargetHit, if it's still alive
                // and not already being matched/removed by a concurrent
                // path. Use doExplode so the cleanup goes through the
                // normal removal pipeline (slot cleanup + UI teardown +
                // refill trigger).
                var hidden = targetPU.hiddenGem;
                if (hidden && hidden.boardMgr
                    && hidden.state !== CoreGame.ElementState.REMOVING
                    && hidden.state !== CoreGame.ElementState.MATCHING) {
                    if (typeof hidden.doExplode === 'function') {
                        hidden.doExplode();
                    } else if (typeof hidden.remove === 'function') {
                        hidden.remove();
                    }
                }
                targetPU.hiddenGem = null;

                targetPU.active();
            }.bind(null, subPU));
        }
    },

    removeAfterActivate: function () {
        CoreGame.TimedActionMgr.addAction(this.transformDuration, function () {
            this.remove();
            // Kick board state back to MATCHING so checkFinishTurn's
            // `state !== IDLE` gate can pass after the last sub-PU settles,
            // otherwise the board can finish with every target cleared but
            // onFinishTurn never fires => no victory GUI.
            var mgr = CoreGame.BoardUI.getInstance().boardMgr;
            mgr.state = CoreGame.BoardState.MATCHING;
        }.bind(this));
    },

    onTargetHit: function (index) {
        // Hide the original gem visual at this position AND save the gem
        // reference on the matching sub-PU. The sub-PU's activation later
        // explicitly removes this gem (see _activateSubPUsWithCleanup),
        // which guarantees the hidden gem can't be orphaned even if the
        // rocket's row/column clear doesn't reach its current slot.
        var data = this.subPUData[index];
        if (data) {
            var slot = this.boardMgr.getSlot(data.posX, data.posY);
            if (slot) {
                var gem = slot.getMatchableElement();
                if (gem && gem.ui) {
                    gem.ui.setVisible(false);
                    if (this.listSubPU && this.listSubPU[index]) {
                        this.listSubPU[index].hiddenGem = gem;
                    }
                }
            }
        }

        // Show the transformed power-up
        if (this.listSubPU && this.listSubPU[index] && this.listSubPU[index].ui) {
            this.listSubPU[index].ui.setVisible(true);
        }
    },
    /**
     * Override createUI to remove the target gems before creating bomb uis
     */
    createUI: function (parent) {
        this.prepareTransformData();
        var res = this._super(parent);
        if (this.listSubPU) {
            for (var i = 0; i < this.listSubPU.length; i++) {
                if (this.listSubPU[i].ui) {
                    this.listSubPU[i].ui.setVisible(false);
                }
            }
        }
        return res;
    }
});


CoreGame.RainbowBombPU = CoreGame.RainbowTransformPU.extend({
    ctor: function () {
        this._super();
        this.typeTransform = [CoreGame.PowerUPType.MATCH_T];
    }
});

CoreGame.RainbowPlanePU = CoreGame.RainbowTransformPU.extend({
    ctor: function () {
        this._super();
        this.typeTransform = [CoreGame.PowerUPType.MATCH_SQUARE];
    }
});

CoreGame.RainbowRocketPU = CoreGame.RainbowTransformPU.extend({
    ctor: function () {
        this._super();
        this.typeTransform = [CoreGame.PowerUPType.MATCH_4_H, CoreGame.PowerUPType.MATCH_4_V];
    }
});
// Register Rainbow + Bomb combinations
CoreGame.PowerUP.registerCombined(CoreGame.PowerUPType.MATCH_5, CoreGame.PowerUPType.MATCH_T, CoreGame.RainbowBombPU);
CoreGame.PowerUP.registerCombined(CoreGame.PowerUPType.MATCH_5, CoreGame.PowerUPType.MATCH_L, CoreGame.RainbowBombPU);
CoreGame.PowerUP.registerCombined(CoreGame.PowerUPType.MATCH_5, CoreGame.PowerUPType.MATCH_SQUARE, CoreGame.RainbowPlanePU);
CoreGame.PowerUP.registerCombined(CoreGame.PowerUPType.MATCH_5, CoreGame.PowerUPType.MATCH_4_H, CoreGame.RainbowRocketPU);
CoreGame.PowerUP.registerCombined(CoreGame.PowerUPType.MATCH_5, CoreGame.PowerUPType.MATCH_4_V, CoreGame.RainbowRocketPU);
