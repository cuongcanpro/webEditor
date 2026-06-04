/**
 * FindAndDestroyPowerUpAction — shared endTurn ability: scan the board for
 * live power-ups and silently destroy a random few (NO explosion).
 *
 * "Build once, use thrice": the cat boss Mèo bắn PU (13010), L478 Kraken Bạch
 * Tuộc and L620 Thuyền Trưởng Bóng Ma all reuse THIS class — they differ only
 * by config (period / numDestroy / animKey) and their UI class. Keep this module
 * free of any boss-specific logic.
 *
 * Cadence model (self-contained, like KingCrabTurnAction — NOT the config-driven
 * ChangeAttributeAction+CheckAttributeAction pair) because the no-PU case needs a
 * CONDITIONAL reset that the generic counter actions can't express:
 *
 *   - Charges 1 per endTurn. While charging (< period) the cat is idle.
 *   - When armed (>= period) it scans:
 *       · ≥1 PU found  -> LOCK input, play the aim+shoot anim, then destroy
 *                         `numDestroy` random PUs WITHOUT triggering them on the
 *                         shoot beat (`shootTime` sec into the clip, or the full clip
 *                         length when unset); unlock, then reset the timer (consume).
 *                         The input lock (boardMgr._abilityInputLock, honoured by
 *                         canInteract) stops the player swapping mid-shot.
 *       · 0 PU found    -> RETRY-ARMED: hold the timer at `period`, no anim, no
 *                         SFX, ability NOT consumed. It re-scans every following
 *                         endTurn and fires the instant a PU appears. This avoids
 *                         "cat raises the gun but shoots nothing" looking like a bug.
 *
 * Counter lives in element.customData (per-instance, survives turns). It is NOT
 * stored in configData — that object is shared across every instance via the
 * BlockerFactory config cache, so writing cadence there would leak between bosses
 * (same class of bug as the KingCrab maxHP shared-prototype leak).
 *
 * Destroy-without-explosion: PowerUP.active() is the ONLY path that detonates.
 * Plain element.remove() unlinks the PU and refills the board without ever calling
 * active() — exactly the "PU tan biến như chưa từng có" behaviour. Scanning only
 * idle PUs (isIdle()) means a PU the player is currently flying/triggering is never
 * touched (the PU-bypass rule falls out for free).
 */
var CoreGame = CoreGame || {};
CoreGame.Strategies = CoreGame.Strategies || {};

CoreGame.Strategies.FindAndDestroyPowerUpAction = CoreGame.Strategies.NormalAction.extend({
    // Defaults — overwritten wholesale by setConfigData when the JSON supplies a
    // config block, so execute() always reads each field defensively with a fallback.
    configData: {
        period: 2,                  // endTurns between ability windows
        numDestroy: 1,              // PUs destroyed per fire (random pick)
        timerField: "_fdpuTimer",   // customData key (rename if two FDPU actions share one element)
        animKey: "attack",          // anim name passed to ui.playAimAndShoot
        shootTime: 0                // sec into the clip when the shot lands (destroy + input unlock).
                                    // 0/unset -> wait the full clip. Set to the muzzle-flash beat.
    },

    ctor: function () {
        this._super();
    },

    checkCondition: function (element, context) {
        return true;
    },

    // Bound to the "endTurn" action list. Fires once per endTurn.
    execute: function (element, context) {
        if (!element || !element.boardMgr) return;

        var cfg = this.configData || {};
        var period = parseInt(cfg.period) || 2;
        var numDestroy = parseInt(cfg.numDestroy) || 1;
        var timerField = cfg.timerField || "_fdpuTimer";

        if (!element.customData) element.customData = {};
        var cd = element.customData;

        // Reset the shared cue length each turn so a same-turn swap (delayFromCue) only
        // waits when THIS turn actually shoots — a no-PU/charging turn must not inherit
        // a stale 4s wait from an earlier shot.
        cd._abilityCueDur = 0;

        var t = (cd[timerField] || 0) + 1;
        if (t < period) {
            // Still charging — cat stays idle this turn.
            cd[timerField] = t;
            return;
        }

        // Armed. Try to fire.
        var targets = this._scanPowerUps(element.boardMgr);
        if (targets.length === 0) {
            // Retry-armed: hold the charge, no anim, ability NOT consumed.
            cd[timerField] = period;
            return;
        }

        // Pick `numDestroy` random distinct PUs.
        var boardMgr = element.boardMgr;
        this._shuffle(targets, boardMgr.random);
        var picks = targets.slice(0, Math.min(numDestroy, targets.length));

        // Lock player/AI input while the cat is shooting: no swap/move until the shot
        // lands. canInteract() honours this flag; we clear it on the shoot beat, after
        // which the refill/cascade keeps the board busy on its own.
        boardMgr._abilityInputLock = true;

        // Play the aim+shoot anim (runs full-length back to idle). dur = real clip length.
        var dur = 0;
        if (element.ui && element.ui.playAimAndShoot) {
            dur = element.ui.playAimAndShoot(picks, cfg.animKey) || 0;
        }

        // The shot LANDS at `shootTime` sec into the clip (the muzzle-flash beat). The
        // anim keeps playing its recoil tail afterwards, but the PU vanishes and input
        // unlocks here so the player isn't frozen for the whole clip. shootTime unset
        // (<=0) -> wait the full clip length (dur).
        var shootTime = parseFloat(cfg.shootTime);
        var destroyAt = (!isNaN(shootTime) && shootTime > 0) ? shootTime : Math.max(0, dur);

        // Publish the cue length so a same-turn follow-up action can sync to it — e.g.
        // the hidden shoot-pu cat's ReplaceSelfAction (delayFromCue) waits for the shot
        // to land before swapping to HIDDEN, so the swap doesn't cut the attack anim.
        if (!element.customData) element.customData = {};
        element.customData._abilityCueDur = destroyAt;

        var self = this;
        CoreGame.TimedActionMgr.addAction(destroyAt, function () {
            for (var i = 0; i < picks.length; i++) {
                var pu = picks[i].pu;
                if (self._stillDestroyable(pu, element)) {
                    pu.remove(); // silent: no active() -> no explosion
                }
            }
            boardMgr._abilityInputLock = false; // unlock on the shoot beat
        });

        // Consume the ability -> restart the cycle.
        cd[timerField] = 0;
    },

    /**
     * Collect every idle power-up currently on the board.
     * @returns {Array<{row:number, col:number, pu:CoreGame.PowerUP}>}
     */
    _scanPowerUps: function (boardMgr) {
        var list = [];
        for (var r = 0; r < boardMgr.rows; r++) {
            for (var c = 0; c < boardMgr.cols; c++) {
                var slot = boardMgr.getSlot(r, c);
                if (!slot || !slot.listElement) continue;
                for (var i = 0; i < slot.listElement.length; i++) {
                    var e = slot.listElement[i];
                    // isIdle() => state IDLE (excludes flying/triggering/removing PUs,
                    // so the player's in-flight PU is never intercepted).
                    if (e instanceof CoreGame.PowerUP && e.isIdle() &&
                        !(e.attachments && e.attachments.length)) {
                        list.push({ row: r, col: c, pu: e });
                    }
                }
            }
        }
        return list;
    },

    // Re-check at destroy time: a PU the player activated mid-aim, or the cat dying
    // mid-aim, must NOT be force-destroyed (PU survives — "mèo chết giữa aim").
    _stillDestroyable: function (pu, element) {
        return pu && pu.isIdle && pu.isIdle() &&
            element.state !== CoreGame.ElementState.REMOVING;
    },

    // Fisher-Yates with the deterministic board RNG (mirrors RandomSpawnElementAction).
    _shuffle: function (arr, random) {
        for (var i = arr.length - 1; i > 0; i--) {
            var j = random.nextInt32Bound(i + 1);
            var tmp = arr[i];
            arr[i] = arr[j];
            arr[j] = tmp;
        }
    }
});
