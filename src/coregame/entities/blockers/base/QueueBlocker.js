/**
 * QueueBlocker - Base class for blockers that require collecting specific types in order
 * Part of Match-3 Core Game
 */
var CoreGame = CoreGame || {};

CoreGame.QueueBlocker = CoreGame.Blocker.extend({
    queueTypeIds: null,      // List of type IDs that need to be collected (in order)

    ctor: function () {
        this._super();
        this.queueTypeIds = [];
    },

    /**
     * Initialize QueueBlocker with queue types
     * @param {number} row
     * @param {number} col
     * @param {number} type
     * @param {number} hitPoints
     * @param {Array} queueTypeIds - List of type IDs to collect in order
     */
    init: function (row, col, type, hitPoints, queueTypeIds) {
        this._super(row, col, type, hitPoints);
        // this.queueTypeIds = queueTypeIds ? queueTypeIds.slice() : []; // Copy array
        return this;
    },

    /**
     * Get the list of required type IDs
     * @returns {Array}
     */
    getQueueTypeIds: function () {
        return this.queueTypeIds;
    },

    /**
     * Get the next type ID to collect (first in queue)
     * @returns {number|null}
     */
    getNextTypeId: function () {
        if (this.queueTypeIds.length === 0) return null;
        return this.queueTypeIds[0];
    },

    /**
     * Check if a type ID can be collected
     * Only matches if it's the first item in queue
     * @param {number} typeId
     * @returns {boolean}
     */
    canTakeDamage: function (typeId) {
        return this.queueTypeIds.length > 0 && this.queueTypeIds[0] === typeId;
    },

    takeDamage: function (hitpoints, typeId, row, column) {
        if (!this.canTakeDamage(typeId)) return false;

        // ── Scoring (per §3.1, one payout per item collected) ───────────────
        // QueueBlocker collects one queued item per damage call (e.g. Pinwheel
        // collecting a sequence of gem types). Score one event per shift,
        // regardless of whether this completes the queue.
        if (this.boardMgr && this.boardMgr.scoreMgr) {
            this.boardMgr.scoreMgr.addClearEvent({
                elementType: this.type,
                hp: 1,
                isObjective: this.boardMgr.isObjectiveType(this.type),
                clearMethod: this.boardMgr.getCurrentClearMethod(),
                cascadeDepth: this.boardMgr.getCurrentCascadeDepth()
            });
        }

        // Remove first item from queue
        this.queueTypeIds.shift();

        cc.log("QueueBlocker collected type:", typeId, "| Remaining:", this.queueTypeIds.length);

        // Update visual if UI has collectType method
        if (this.ui && typeof this.ui.collectType === 'function') {
            this.ui.collectType(typeId);
        }

        // Check if queue is empty (collection complete)
        if (this.queueTypeIds.length === 0) {
            this.onCollectionComplete();
        } else {
            this.updateVisual();
        }

        return true;
    },

    /**
     * Check if collection is complete (queue is empty)
     * @returns {boolean}
     */
    isCollectionComplete: function () {
        return this.queueTypeIds.length === 0;
    },

    /**
     * Called when queue is empty (collection complete)
     * Override in subclasses for specific behavior
     */
    onCollectionComplete: function () {
        cc.log("QueueBlocker collection complete! Destroying blocker.");
        this.doExplode(this.position.x, this.position.y);
    },

    /**
     * Update visual
     */
    updateVisual: function () {
        this._super();
        this.ui.updateLabelState(JSON.stringify(this.queueTypeIds));
    },

    getTypeName: function () {
        return 'queue_blocker';
    }
});
