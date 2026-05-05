/**
 * Blocker - Obstacle element that blocks gem movement
 * Part of Match-3 Core Game
 */
var CoreGame = CoreGame || {};

CoreGame.Blocker = CoreGame.ElementObject.extend({
    cooldownSpawn: 0,

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
        this.hitPoints -= amount;
        cc.log("take Damage " + this.hitPoints);
        if (this.hitPoints < 0)
            return;

        // this.avatar.playExplodeEffect(this.hitPoints);
        this.updateHPBar();
        if (this.isMonster()) {
            dispatcherMgr.dispatchEvent('updateHpMonster', { element: this, hp: this.hitPoints, maxHp: this.maxHP || this.configData.maxHP });
        }
        if (this.hitPoints <= 0) {
            this.doExplode(row, col);
        } else {
            this.ui.playTakeDamageEffect(amount, row, col);
            this.updateVisual();
        }
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
    }
});


CoreGame.Blocker.BlockerType = {
    NORMAL_BLOCKER: "Blocker",
    DYNAMIC_BLOCKER: "DynamicBlocker"
}