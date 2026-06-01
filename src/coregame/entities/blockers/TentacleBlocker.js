/**
 * TentacleBlocker - Octopus tentacle spanning multiple cells.
 *
 * cells[0]   = xoáy nước (whirlpool / origin)
 * cells[last] = đuôi (tip, farthest from whirlpool)
 *
 * Each takeDamage(1) removes the tip cell (shrinks from the tail).
 * Exception: when only 2 cells remain, one hit kills both (skips the 1-cell stub).
 * When cells.length reaches 0 the tentacle disappears.
 *
 * Đèn Lồng protection: handled automatically by shieldMgr inside
 * TakeDamageAction.checkCondition — no extra logic needed here.
 *
 * Map format for a 5-cell rightward tentacle at (3,2):
 *   { "row":3,"col":2,"type":30200,"hp":5,
 *     "cells":[{"r":3,"c":2},{"r":3,"c":3},{"r":3,"c":4},
 *              {"r":3,"c":5},{"r":3,"c":6}] }
 */
var CoreGame = CoreGame || {};

CoreGame.TentacleBlocker = CoreGame.DynamicBlocker.extend({

    ctor: function () {
        this._super();
        // One sideMatch event removes at most 1 cell, regardless of how many
        // cells are adjacent to the matched gems (dedup via matchActivationId
        // in TakeDamageAction.execute).
        this._dedupPerMatch = true;
    },

    createUIInstance: function () {
        return new CoreGame.TentacleUI(this);
    },

    /**
     * Always remove the tip (last cell) regardless of which cell was hit.
     */
    takeDamage: function (amount, color, row, col) {
        if (this.cells.length === 0) return;

        var tipIdx = this.cells.length - 1;
        var tipCell = { r: this.cells[tipIdx].r, c: this.cells[tipIdx].c };

        if (this.boardMgr && this.boardMgr.scoreMgr) {
            this.boardMgr.scoreMgr.addClearEvent({
                elementType: this.type,
                hp: 1,
                isObjective: this.boardMgr.isObjectiveType(this.type),
                clearMethod: this.boardMgr.getCurrentClearMethod(),
                cascadeDepth: this.boardMgr.getCurrentCascadeDepth()
            });
        }

        if (this.ui) {
            this.ui.playExplodeEffect(this.cells.length, tipCell.r, tipCell.c);
        }

        if (this.boardMgr) {
            this.boardMgr.removeElementAt(this, tipCell.r, tipCell.c);
        }
        this.cells.splice(tipIdx, 1);

        // When only 1 cell remains after the hit (was 2), kill the whole tentacle
        // in one shot — the player shouldn't need to hit a single-cell stub.
        if (this.cells.length === 1) {
            var lastCell = this.cells[0];
            if (this.boardMgr) this.boardMgr.removeElementAt(this, lastCell.r, lastCell.c);
            this.cells.splice(0, 1);
        }

        if (this.cells.length === 0) {
            this.doExplode(tipCell.r, tipCell.c);
        } else {
            this.updateVisual();
            if (this.boardMgr) this.boardMgr.setRefillRequired(true);
        }

        var boardUI = this.boardMgr ? this.boardMgr.boardUI : null;
        if (boardUI) boardUI.refreshBorders();
    },

    getTypeName: function () {
        return 'tentacle';
    }
});
