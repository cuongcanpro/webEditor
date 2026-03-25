/**
 * TimedActionMgr - Schedule delayed callbacks for animations/effects
 * Part of Match-3 Core Game
 */
var CoreGame = CoreGame || {};

CoreGame.TimedActionMgr = {
    _actions: [],

    /**
     * Add a delayed action
     * @param {number} delay - Delay in seconds
     * @param {function} callback - Callback to execute
     * @param {object} target - Context for callback
     * @returns {object} Action object (can be used to cancel)
     */
    addAction: function (delay, callback, target) {
        var action = {
            time: delay,
            callback: callback,
            target: target,
            cancelled: false
        };
        this._actions.push(action);
        return action;
    },

    /**
     * Cancel a scheduled action
     * @param {object} action - Action object returned from addAction
     */
    cancelAction: function (action) {
        if (action) {
            action.cancelled = true;
        }
    },

    /**
     * Update all actions (call each frame)
     * @param {number} dt - Delta time in seconds
     */
    update: function (dt) {
        for (var i = this._actions.length - 1; i >= 0; i--) {
            var action = this._actions[i];

            if (action.cancelled) {
                this._actions.splice(i, 1);
                continue;
            }

            action.time -= dt;

            if (action.time <= 0) {
                this._actions.splice(i, 1);
                action.callback.call(action.target);
            }
        }
    },

    /**
     * Check if any actions are pending
     * @returns {boolean}
     */
    hasPendingActions: function () {
        return this._actions.length > 0;
    },

    /**
     * Get the minimum time left among all pending actions
     * @returns {number} Minimum time in seconds, or 0 if no actions
     */
    getMinTime: function () {
        if (this._actions.length === 0) return 0;
        var min = this._actions[0].time;
        for (var i = 1; i < this._actions.length; i++) {
            if (this._actions[i].time < min) {
                min = this._actions[i].time;
            }
        }
        return min;
    },

    /**
     * Clear all actions
     */
    clear: function () {
        this._actions = [];
    }
};
