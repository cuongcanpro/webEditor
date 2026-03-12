/**
 * RocketPU - Rocket power-up element (4 in a line match)
 * Part of Match-3 Core Game
 */
var CoreGame = CoreGame || {};

CoreGame.RocketPU = CoreGame.PowerUP.extend({

    ctor: function () {
        this._super();
    },

    /**
     * Activate rocket effect
     */
    activeLogic: function () {
        if (this.type === CoreGame.PowerUPType.MATCH_4_H) {
            this.activateRocketH();
        } else if (this.type === CoreGame.PowerUPType.MATCH_4_V) {
            this.activateRocketV();
        }
    },

    /**
     * Activate horizontal rocket - clear entire row
     */
    activateRocketH: function () {
        var listCell = this.boardMgr.getAllGirdInRow(this.position.x);
        let context = { type: "normal" };
        for (var i = 0; i < listCell.length; i++)
            listCell[i].matchElement(context, true);
        this.ui.startActive();
        this.ui = undefined;
    },

    /**
     * Activate vertical rocket - clear entire column
     */
    activateRocketV: function () {
        var listCell = this.boardMgr.getAllGirdInCol(this.position.y);
        let context = { type: "normal" };
        for (var i = 0; i < listCell.length; i++)
            listCell[i].matchElement(context, true);
        this.ui.startActive();
        this.ui = undefined;
    },

    /**
     * Create visual ui
     */
    createUIInstance: function () {
        return new CoreGame.RocketUI(this);
    },
});

// Register RocketPU for Rocket types
CoreGame.ElementObject.register(CoreGame.PowerUPType.MATCH_4_H, CoreGame.RocketPU);
CoreGame.ElementObject.register(CoreGame.PowerUPType.MATCH_4_V, CoreGame.RocketPU);
