/**
 * BombPU - Bomb power-up element (T or L shape match)
 * Part of Match-3 Core Game
 */
var CoreGame = CoreGame || {};

CoreGame.BombPU = CoreGame.PowerUP.extend({
    ctor: function () {
        this._super();
        this.area = CoreGame.BombPU.AREA;
    },

    /**
     * Activate bomb - clear 5x5 area
     */
    activeLogic: function () {
        var listCell = this.boardMgr.getAllGridInArea(this.position.x, this.position.y, this.area);

        this.activeDuration = CoreGame.BombPU.EXPLODE_DELAY;
        if (this.area === CoreGame.BombPUPlus.AREA) {
            this.activeDuration = CoreGame.BombPUPlus.EXPLODE_DELAY;
        }

        CoreGame.TimedActionMgr.addAction(this.activeDuration, function (listCell) {
            for (var i = 0; i < listCell.length; i++)
                listCell[i].matchElement({type: "normal"});
        }.bind(null, listCell));

        this.ui.startActive();
        this.ui = undefined;
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

    /**
     * Create visual ui
     */
    createUIInstance: function () {
        return new CoreGame.BombUI(this);
    },
});
CoreGame.BombPU.EXPLODE_DELAY = 0.2;
CoreGame.BombPU.AREA = 2;

CoreGame.BombPUPlus = CoreGame.BombPU.extend({
    ctor: function () {
        this._super();
        this.area = CoreGame.BombPUPlus.AREA;
    },

    createUI: function (parent) {
        this._super(parent);
        this.ui.setScale(1);
        this.ui.runAction(cc.scaleTo(CoreGame.BombPUPlus.EXPLODE_DELAY, 2).easing(cc.easeBackIn()));
        return this.ui;
    },
});
CoreGame.BombPUPlus.AREA = 3;
CoreGame.BombPUPlus.EXPLODE_DELAY = 0.55;

// Register BombPU for Bomb types
CoreGame.ElementObject.register(CoreGame.PowerUPType.MATCH_T, CoreGame.BombPU);
CoreGame.ElementObject.register(CoreGame.PowerUPType.MATCH_L, CoreGame.BombPU);

CoreGame.PowerUP.registerCombined(CoreGame.PowerUPType.MATCH_T, CoreGame.PowerUPType.MATCH_T, CoreGame.BombPUPlus);
CoreGame.PowerUP.registerCombined(CoreGame.PowerUPType.MATCH_L, CoreGame.PowerUPType.MATCH_L, CoreGame.BombPUPlus);
CoreGame.PowerUP.registerCombined(CoreGame.PowerUPType.MATCH_L, CoreGame.PowerUPType.MATCH_T, CoreGame.BombPUPlus);