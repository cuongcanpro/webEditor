/**
 * EventMgr - Simple event bus for decoupled communication
 * Part of Match-3 Core Game
 */
var CoreGame = CoreGame || {};

CoreGame.EventMgr = {
    _listeners: {},

    /**
     * Register a callback for an event
     * @param {string} event - Event name
     * @param {function} callback - Callback function
     * @param {object} target - Context for callback
     */
    on: function (event, callback, target) {
        if (!this._listeners[event]) {
            this._listeners[event] = [];
        }
        this._listeners[event].push({ callback: callback, target: target });
    },

    /**
     * Unregister a callback
     * @param {string} event - Event name
     * @param {function} callback - Callback to remove
     * @param {object} target - Context for callback
     */
    off: function (event, callback, target) {
        var listeners = this._listeners[event];
        if (!listeners) return;

        for (var i = listeners.length - 1; i >= 0; i--) {
            if (listeners[i].callback === callback && listeners[i].target === target) {
                listeners.splice(i, 1);
            }
        }
    },

    /**
     * Emit an event to all listeners
     * @param {string} event - Event name
     * @param {*} data - Event data
     */
    emit: function (event, data) {
        var listeners = this._listeners[event];
        if (!listeners) return;

        for (var i = 0; i < listeners.length; i++) {
            var listener = listeners[i];
            listener.callback.call(listener.target, data);
        }
    },

    /**
     * Clear all listeners for a specific target
     * @param {object} target - Context for callbacks to remove
     */
    offTarget: function (target) {
        if (!target) return;
        for (var event in this._listeners) {
            var listeners = this._listeners[event];
            for (var i = listeners.length - 1; i >= 0; i--) {
                if (listeners[i].target === target) {
                    listeners.splice(i, 1);
                }
            }
        }
    },
    /**
     * Clear all listeners
     */
    clear: function () {
        this._listeners = {};
    }
};
