CoreGame.RocketPlusPU = CoreGame.RocketPU.extend({

    ctor: function () {
        this._super();
    },

    createUI: function (parent) {
        this._super(parent);
        this.createUI2(parent);
        return this.ui;
    },

    createUI2: function (parent) {
        if (this.type === CoreGame.PowerUPType.MATCH_4_V) {
            this.type = CoreGame.PowerUPType.MATCH_4_H;
        } else {
            this.type = CoreGame.PowerUPType.MATCH_4_V;
        }

        this.ui2 = new CoreGame.RocketUI(this);
        if (this.boardMgr) {
            this.ui2.setPosition(this.boardMgr.gridToPixel(this.position.x, this.position.y));
        }

        if (parent) {
            parent.addChild(this.ui2, this.layerBehavior);
        }
        return this.ui2;
    },

    /**
     * Activate square/paper plane effect - clear 2x2 area
     */
    activeLogic: function () {
        this.activateRocketH();
        this.ui = this.ui2;
        this.activateRocketV();
        this.ui = undefined;
    },
});

// Register PlanePU for MATCH_SQUARE type
CoreGame.PowerUP.registerCombined(CoreGame.PowerUPType.MATCH_4_H, CoreGame.PowerUPType.MATCH_4_V, CoreGame.RocketPlusPU);
CoreGame.PowerUP.registerCombined(CoreGame.PowerUPType.MATCH_4_H, CoreGame.PowerUPType.MATCH_4_H, CoreGame.RocketPlusPU);
CoreGame.PowerUP.registerCombined(CoreGame.PowerUPType.MATCH_4_V, CoreGame.PowerUPType.MATCH_4_V, CoreGame.RocketPlusPU);
