/**
 * Blocker - Obstacle element that blocks gem movement
 * Part of Match-3 Core Game
 */
var CoreGame = CoreGame || {};

CoreGame.Blocker = CoreGame.ElementObject.extend({
    cooldownSpawn: 0,

    configData: {
        maxHP: 1
    },
    ctor: function () {
        this._super();
        this.haveBaseAction = [0, 0, 0, 0];
        this.blockBaseAction = [1, 1, 1, 1]; // prevent base action to under layer
    },

    /**
     * Initialize blocker
     * @param {number} row - Grid row
     * @param {number} col - Grid column  
     * @param {number} type - Blocker type (e.g., BOX, CLOUD, CHAIN)
     * @param {number} hitPoints - Number of hits to destroy
     */
    init: function (row, col, type, hitPoints) {
        this._super(row, col, type);
        if (hitPoints) {
            this.hitPoints = hitPoints;
            if (hitPoints > this.configData.maxHP) {
                this.configData.maxHP = hitPoints;
            }
        } else if (this.configData && this.configData.maxHP) {
            // Map did not specify hp — spawn at full HP from config.
            this.hitPoints = 1;
        } else {
            this.hitPoints = 1;
        }
        // Snapshot the spawn HP as the bar's "full" value.
        // Whatever HP the element spawns with IS its max — so the HP bar
        // reads 100% at spawn regardless of whether the map overrode hp
        // (e.g. Kong boss with map hp=20 against a config-declared maxHP=30).
        this.maxHP = this.hitPoints;
        return this;
    },

    /**
     * Blockers cannot be swapped
     */
    canSwap: function () {
        return this.haveBaseAction[CoreGame.ElementObject.Action.SWAP];
    },

    /**
     * Blockers cannot be matched directly
     */
    canMatch: function () {
        return this.haveBaseAction[CoreGame.ElementObject.Action.MATCH];
    },

    isStopAction: function (type) {
        return this.blockBaseAction[type];
    },

    canTakeDamage: function (typeId) {
        return true;
    },

    /**
     * Take damage from nearby matches
     */
    takeDamage: function (amount, typeId, row, col) {
        if (this.hitPoints <= 0) return;
        // Clamp overkill so HP never goes negative — otherwise the old
        // `if (hitPoints < 0) return` path fired before doExplode() and the
        // monster got stuck alive at negative HP (invincible).
        if (amount > this.hitPoints) amount = this.hitPoints;
        this.hitPoints -= amount;
        cc.log("take Damage " + this.hitPoints);

        // ── Scoring (per §3.1 of the 3-Star design) ─────────────────────────
        // Score every damage event, not just the killing hit. Multi-HP
        // blockers (Box, Chain) and bosses pay out `baseValue × amount` per
        // damage call, which matches the doc's "per HP" semantics.
        // Killing hits are scored here too; removedElement intentionally
        // skips Blocker instances to avoid double-counting.
        if (this.boardMgr && this.boardMgr.scoreMgr) {
            this.boardMgr.scoreMgr.addClearEvent({
                elementType: this.type,
                hp: amount,
                isObjective: this.boardMgr.isObjectiveType(this.type),
                clearMethod: this.boardMgr.getCurrentClearMethod(),
                cascadeDepth: this.boardMgr.getCurrentCascadeDepth()
            });
        }

        // this.avatar.playExplodeEffect(this.hitPoints);
        this.updateHPBar();
        if (this.isMonster()) {
            dispatcherMgr.dispatchEvent(
                'updateHpMonster',
                { element: this, hp: this.hitPoints, maxHp: this.maxHP || this.configData.maxHP }
            );

            // Floating damage number feedback (monsters/bosses only).
            // Fires for both non-killing and killing hits so the final HP loss
            // is still visible before the explode animation.
            if (this.ui && typeof this.ui.playLoseLifeEffect === 'function') {
                this.ui.playLoseLifeEffect(amount);
            }

            //Play Monster Sound
            fr.Sound.playMonsterSound(this.type, this.hitPoints <= 0 ? "defeated" : "hurt");
        }
        if (this.hitPoints <= 0) {
            // Lifecycle hook: fire `onDeath` BEFORE removal so shield/lock
            // tear-down (Đèn Lồng aura, Mỏ Neo column lock) happens before
            // cascade — letting same-turn damage / drop flow through correctly.
            // See docs/superpowers/specs/2026-05-26-phase1-blockers-design.md §2.
            this._fireCustomHook('onDeath');
            this.doExplode(row, col);
        } else {
            this.ui.playTakeDamageEffect(amount, row, col);
            this.updateVisual();

            // Connected-UI blockers (e.g. Grass) may render different border
            // tiers per HP — when HP changes but the element is still alive,
            // the existing add/remove triggers don't fire, so adjacency
            // patterns keyed off `hasElementTypeWithHP` would go stale. Force
            // a border refresh here so the visual matches the new HP tier.
            if (this.isConnectedUI && this.boardMgr && this.boardMgr.boardUI) {
                this.boardMgr.boardUI.refreshBorders();
            }
        }
    },

    /**
     * Heal the blocker. Used by inversion mechanics (e.g. Anubis L215
     * where PU hits restore HP instead of dealing damage). Clamped to maxHP
     * so heals can't push past the spawn-time bar size.
     */
    heal: function (amount, sourceTypeId, row, col) {
        if (this.hitPoints <= 0) return;
        if (amount <= 0) return;
        var cap = this.maxHP || (this.configData && this.configData.maxHP) || this.hitPoints;
        var actual = Math.min(amount, cap - this.hitPoints);
        if (actual <= 0) return;
        this.hitPoints += actual;
        this.updateHPBar();
        if (this.isMonster()) {
            dispatcherMgr.dispatchEvent(
                'updateHpMonster',
                { element: this, hp: this.hitPoints, maxHp: this.maxHP || this.configData.maxHP }
            );
            if (this.ui && typeof this.ui.playHealEffect === 'function') {
                this.ui.playHealEffect(actual);
            } else if (this.ui && typeof this.ui.playLoseLifeEffect === 'function') {
                this.ui.playLoseLifeEffect(-actual);
            }
            if (typeof fr !== 'undefined' && fr.Sound) fr.Sound.playMonsterSound(this.type, "heal");
        }
        this.updateVisual();
    },

    /**
     * Update visual based on remaining hit points
     */
    updateVisual: function () {
        // Override in subclasses for different blocker visuals
        if (this.ui) {
            if (typeof this.ui.updateVisual === 'function') {
                this.ui.updateVisual();
            } else {
                // Show damage state (fallback)
                var alpha = 0.5 + (this.hitPoints * 0.5 / 3);
                this.ui.setOpacity(alpha * 255);
            }
        }
    },

    /**
     * Get type name
     */
    getTypeName: function () {
        return 'blocker';
    },

    /**
     * Fire all actions registered under a custom hook key (e.g. 'onSpawn',
     * 'onDeath'). Mirrors the dispatch pattern used by sideMatch / match /
     * endTurn — looks up `this.actions[hookName]` (populated by
     * BlockerFactory from the JSON `customAction` map) and runs each action
     * whose `checkCondition` passes.
     *
     * Backward compatible: blockers that don't declare a hook get an empty
     * array from getActions() and this is a no-op.
     *
     * See docs/superpowers/specs/2026-05-26-phase1-blockers-design.md §2.
     */
    _fireCustomHook: function (hookName) {
        var actions = this.getActions ? this.getActions(hookName) : (this.actions && this.actions[hookName]);
        if (!actions || !actions.length) return;
        var ctx = { hook: hookName };
        for (var i = 0; i < actions.length; i++) {
            var act = actions[i];
            if (!act) continue;
            if (typeof act.checkCondition === 'function' && !act.checkCondition(this, ctx)) continue;
            if (typeof act.execute === 'function') act.execute(this, ctx);
        }
    }
});


CoreGame.Blocker.BlockerType = {
    NORMAL_BLOCKER: "Blocker",
    DYNAMIC_BLOCKER: "DynamicBlocker"
}