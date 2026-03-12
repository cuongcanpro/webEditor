/**
 * BombPU - Bomb power-up element (T or L shape match)
 * Part of Match-3 Core Game
 */
var CoreGame = CoreGame || {};

CoreGame.BombPU = CoreGame.PowerUP.extend({
    area: 1,
    ctor: function () {
        this._super();
    },

    /**
     * Activate bomb - clear 3x3 area
     */
    activeLogic: function () {
        var listCell = this.boardMgr.getAllGridInArea(this.position.x, this.position.y, this.area);
        let context = { type: "normal" };
        for (var i = 0; i < listCell.length; i++)
            listCell[i].matchElement(context);
        this.ui.startActive();
        this.ui = undefined;
    },

    /**
     * Create visual ui
     */
    createUIInstance: function () {
        return new CoreGame.BombUI(this);
    },
});
CoreGame.BombPUPlus = CoreGame.BombPU.extend({
    area: 2,
    createUI: function (parent) {
        this._super(parent);
        this.ui.setScale(2);
        return this.ui;
    },
})
// Register BombPU for Bomb types
CoreGame.ElementObject.register(CoreGame.PowerUPType.MATCH_T, CoreGame.BombPU);
CoreGame.ElementObject.register(CoreGame.PowerUPType.MATCH_L, CoreGame.BombPU);

CoreGame.PowerUP.registerCombined(CoreGame.PowerUPType.MATCH_T, CoreGame.PowerUPType.MATCH_T, CoreGame.BombPUPlus);
CoreGame.PowerUP.registerCombined(CoreGame.PowerUPType.MATCH_L, CoreGame.PowerUPType.MATCH_L, CoreGame.BombPUPlus);
CoreGame.PowerUP.registerCombined(CoreGame.PowerUPType.MATCH_L, CoreGame.PowerUPType.MATCH_T, CoreGame.BombPUPlus);