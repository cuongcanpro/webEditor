/**
 * LockColumnAction - Suspend gravity on `element`'s column via ColumnLockMgr.
 *
 * Fired by Mỏ Neo Rỉ Sét's `onSpawn` hook. Ref-counted by anchor, so two
 * anchors in the same column both contribute to the lock.
 *
 * Spec: docs/superpowers/specs/2026-05-26-phase1-blockers-design.md §3, §5, §6.2.
 * Part of Match-3 Core Game.
 */
var CoreGame = CoreGame || {};
CoreGame.Strategies = CoreGame.Strategies || {};

CoreGame.Strategies.LockColumnAction = CoreGame.Strategies.NormalAction.extend({
    ctor: function () {
        this._super();
    },

    execute: function (element, context) {
        var bm = element && element.boardMgr && element.boardMgr.blockerMgr;
        if (!bm || !bm.columnLockMgr) return;
        // ElementObject grid position: position.x = row, position.y = col.
        bm.columnLockMgr.lockColumn(element.position.y, element);
    }
});
