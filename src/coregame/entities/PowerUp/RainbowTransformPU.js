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

        CoreGame.TimedActionMgr.addAction(duration, this._super.bind(this, typeToClear));
    },

    removeAfterActivate: function () {
        CoreGame.TimedActionMgr.addAction(this.transformDuration, function () {
            this.remove();
        }.bind(this));
    },

    onTargetHit: function (index) {
        // Hide the original gem visual at this position
        var data = this.subPUData[index];
        if (data) {
            var slot = this.boardMgr.getSlot(data.posX, data.posY);
            if (slot) {
                var gem = slot.getMatchableElement();
                if (gem && gem.ui) {
                    gem.ui.setVisible(false);
                }
            }
        }
        // Show the transformed power-up
        this.listSubPU[index].ui.setVisible(true);
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
