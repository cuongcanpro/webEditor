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

    DELAY_PER_CELL: 0.1,

    /**
     * Activate horizontal rocket - clear entire row one by one outward
     */
    activateRocketH: function () {
        var row = this.position.x;
        var originCol = this.position.y;
        var listCell = this.boardMgr.getAllGirdInRow(row);
        this._activateSequential(listCell, function (slot) {
            return Math.abs(slot.col - originCol);
        });
        this.ui.startActive();
        this.ui = undefined;

        CoreGame.BoardUI.getInstance().boardMgr.setDelayRefill(
            (CoreGame.Config.DROP_DELAY_POWER_UP + this.DELAY_PER_CELL * listCell.length) * 0.5
        );
    },

    /**
     * Activate vertical rocket - clear entire column one by one outward
     */
    activateRocketV: function () {
        var col = this.position.y;
        var originRow = this.position.x;
        var listCell = this.boardMgr.getAllGirdInCol(col);
        this._activateSequential(listCell, function (slot) {
            return Math.abs(slot.row - originRow);
        });
        this.ui.startActive();
        this.ui = undefined;

        CoreGame.BoardUI.getInstance().boardMgr.setDelayRefill(
            (CoreGame.Config.DROP_DELAY_POWER_UP + this.DELAY_PER_CELL * listCell.length) * 0.5
        );
    },

    /**
     * Match cells one by one with staggered delay based on distance
     */
    _activateSequential: function (listCell, distanceFn) {
        var delayPerCell = this.DELAY_PER_CELL;
        var puType = this.type;
        var context = { type: "normal", puType: puType };

        // Sort by distance from rocket origin
        listCell.sort(function (a, b) {
            return distanceFn(a) - distanceFn(b);
        });

        for (var i = 0; i < listCell.length; i++) {
            var dist = distanceFn(listCell[i]);
            var delay = dist * delayPerCell;

            if (delay <= 0) {
                listCell[i].matchElement(context, true);
            } else {
                CoreGame.TimedActionMgr.addAction(delay, function (slot) {
                    slot.matchElement({ type: "normal", puType: puType }, true);
                }.bind(null, listCell[i]));
            }
        }
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
