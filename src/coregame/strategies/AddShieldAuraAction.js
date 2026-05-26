/**
 * AddShieldAuraAction - Register `element` as a shield source in ShieldMgr.
 *
 * Fired by Đèn Lồng Hắc Ám's `onSpawn` hook. The action's `configData`
 * (`{radius, shape}`) is forwarded to ShieldMgr.addShield so designers can
 * tune aura size from JSON without touching code.
 *
 * Spec: docs/superpowers/specs/2026-05-26-phase1-blockers-design.md §3, §6.1.
 * Part of Match-3 Core Game.
 */
var CoreGame = CoreGame || {};
CoreGame.Strategies = CoreGame.Strategies || {};

CoreGame.Strategies.AddShieldAuraAction = CoreGame.Strategies.NormalAction.extend({
    ctor: function () {
        this._super();
    },

    execute: function (element, context) {
        var bm = element && element.boardMgr && element.boardMgr.blockerMgr;
        if (!bm || !bm.shieldMgr) return;   // defensive — see spec §3 "Defensive"
        bm.shieldMgr.addShield(element, this.configData);
    }
});
