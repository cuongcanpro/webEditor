/**
 * UnlockColumnAction - Release the anchor's contribution to ColumnLockMgr.
 *
 * Fired by Mỏ Neo Rỉ Sét's `onDeath` hook just before removeElement so the
 * column is already unlocked when cascade kicks in on the same turn.
 *
 * Spec: docs/superpowers/specs/2026-05-26-phase1-blockers-design.md §2 (lifecycle ordering), §6.2.
 * Part of Match-3 Core Game.
 */
var CoreGame = CoreGame || {};
CoreGame.Strategies = CoreGame.Strategies || {};

CoreGame.Strategies.UnlockColumnAction = CoreGame.Strategies.NormalAction.extend({
    ctor: function () {
        this._super();
    },

    execute: function (element, context) {
        var bm = element && element.boardMgr && element.boardMgr.blockerMgr;
        if (!bm || !bm.columnLockMgr) return;
        // ElementObject grid position: position.x = row, position.y = col.
        bm.columnLockMgr.unlockColumn(element.position.y, element);
    }
});
