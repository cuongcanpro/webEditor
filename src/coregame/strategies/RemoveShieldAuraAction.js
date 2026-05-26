/**
 * RemoveShieldAuraAction - Unregister `element` from ShieldMgr.
 *
 * Fired by Đèn Lồng Hắc Ám's `onDeath` hook (Blocker.takeDamage just before
 * removeElement) so the aura tears down BEFORE cascade — letting blockers
 * inside the dying aura take side-match damage on the same turn.
 *
 * Spec: docs/superpowers/specs/2026-05-26-phase1-blockers-design.md §2 (lifecycle ordering), §6.1.
 * Part of Match-3 Core Game.
 */
var CoreGame = CoreGame || {};
CoreGame.Strategies = CoreGame.Strategies || {};

CoreGame.Strategies.RemoveShieldAuraAction = CoreGame.Strategies.NormalAction.extend({
    ctor: function () {
        this._super();
    },

    execute: function (element, context) {
        var bm = element && element.boardMgr && element.boardMgr.blockerMgr;
        if (!bm || !bm.shieldMgr) return;
        bm.shieldMgr.removeShield(element);
    }
});
