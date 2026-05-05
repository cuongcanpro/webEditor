/**
 * RocketPU - Rocket power-up element (4 in a line match)
 * Part of Match-3 Core Game
 */
var CoreGame = CoreGame || {};

CoreGame.CustomCreatorPU = CoreGame.PowerUP.extend({

    ctor: function () {
        this._super();
    },

    setCreateData: function (data) {
        this.subPUData = data;
    },

    createUIInstance: function () {
        return new CoreGame.ElementUI(this);
    },

    activeLogic: function () {
        if (!this.listSubPU) return;

        for (var i = 0; i < this.listSubPU.length; i++) {
            var subPU = this.listSubPU[i];
            var delay = (this.subPUData[i].delay || 0);

            CoreGame.TimedActionMgr.addAction(delay, function (targetPU) {
                targetPU.active();
            }.bind(this, subPU));
        }
    },

    createUI: function (parent) {
        this._super(parent);

        this.listSubPU = [];
        if (this.subPUData) {
            for (var i = 0; i < this.subPUData.length; i++) {
                var data = this.subPUData[i];
                // ElementObject.create(row, col, type)
                var subPU = CoreGame.ElementObject.create(data.posX, data.posY, data.type);
                if (subPU) {
                    subPU.boardMgr = this.boardMgr;
                    subPU.isSubPU = data.isSubPU;
                    subPU.createUI(parent);
                    subPU.ui.setLocalZOrder(CoreGame.ZORDER_BOARD_EFFECT);
                    this.listSubPU.push(subPU);
                }
            }
        }
        return this.ui;
    }
});


CoreGame.RocketBombPU = CoreGame.CustomCreatorPU.extend({
    init: function (row, col, type) {
        this._super(row, col, type);

        var data = [
            // Horizontal Rockets (clearing rows: row-1, row, row+1)
            { posX: row - 1, posY: col, type: CoreGame.PowerUPType.MATCH_4_H, delay: 0 },
            { posX: row, posY: col, type: CoreGame.PowerUPType.MATCH_4_H, delay: 0 },
            { posX: row + 1, posY: col, type: CoreGame.PowerUPType.MATCH_4_H, delay: 0 },

            // Vertical Rockets (clearing columns: col+1, col, col-1)
            { posX: row, posY: col + 1, type: CoreGame.PowerUPType.MATCH_4_V, delay: 0.3 },
            { posX: row, posY: col, type: CoreGame.PowerUPType.MATCH_4_V, delay: 0.3 },
            { posX: row, posY: col - 1, type: CoreGame.PowerUPType.MATCH_4_V, delay: 0.3 }
        ];

        this.setCreateData(data);
        return this;
    },

    createUI: function (parent) {
        this._super(parent);

        for (let subPU of this.listSubPU) {
            subPU.ui.setVisible(false);
        }

        return this.ui;
    },

    /**
     * Create visual ui
     */
    createUIInstance: function () {
        return new CoreGame.BombUI(this);
    }
});


CoreGame.PlanePlusPU = CoreGame.CustomCreatorPU.extend({
    init: function (row, col, type) {
        this._super(row, col, type);

        let data = [];
        for (let i = 0; i < CoreGame.PlanePlusPU.NUM_GEN; i++) {
            data.push({
                posX: row, posY: col,
                type: CoreGame.PowerUPType.MATCH_SQUARE,
                delay: CoreGame.PlanePlusPU.DELAY_GEN * i,
                isSubPU: i !== 0
            });
        }

        this.setCreateData(data);
        return this;
    }
});
CoreGame.PlanePlusPU.NUM_GEN = 4;
CoreGame.PlanePlusPU.DELAY_GEN = 0.25;

// Register Rocket + Bomb combinations
CoreGame.PowerUP.registerCombined(CoreGame.PowerUPType.MATCH_4_H, CoreGame.PowerUPType.MATCH_T, CoreGame.RocketBombPU);
CoreGame.PowerUP.registerCombined(CoreGame.PowerUPType.MATCH_4_H, CoreGame.PowerUPType.MATCH_L, CoreGame.RocketBombPU);
CoreGame.PowerUP.registerCombined(CoreGame.PowerUPType.MATCH_4_V, CoreGame.PowerUPType.MATCH_T, CoreGame.RocketBombPU);
CoreGame.PowerUP.registerCombined(CoreGame.PowerUPType.MATCH_4_V, CoreGame.PowerUPType.MATCH_L, CoreGame.RocketBombPU);

// Register Plane + Plane combinations
CoreGame.PowerUP.registerCombined(CoreGame.PowerUPType.MATCH_SQUARE, CoreGame.PowerUPType.MATCH_SQUARE, CoreGame.PlanePlusPU);