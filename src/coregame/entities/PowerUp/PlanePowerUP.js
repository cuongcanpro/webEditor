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
     * Activate square/paper plane effect - clear 2x2 area
     */
    activeLogic: function () {
        const EXPLODE = [[-1, 0], [1, 0], [0, -1], [0, 1]];
        let context = { type: "normal" };
        for (var i = 0; i < EXPLODE.length; i++) {
            var slot = this.boardMgr.getSlot(this.position.x + EXPLODE[i][0], this.position.y + EXPLODE[i][1]);
            if (slot) {
                slot.matchElement(context);
            }
        }
        var listTarget = this.boardMgr.findListPriorityTarget();
        if (listTarget.length > 0) {
            this.targetSlot = listTarget[this.boardMgr.random.nextInt32Bound(listTarget.length)];
        }
        this.ui.startActive(this.targetSlot);
        this.ui = undefined;
        //WARNING, need recheck, should activce slot atleast once
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
                this.matchElement();
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
