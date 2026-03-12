/**
 * GemObject - Colored gem element
 * Part of Match-3 Core Game
 */
var CoreGame = CoreGame || {};

CoreGame.GemObject = CoreGame.ElementObject.extend({

    ctor: function () {
        this._super();
        this.addAction(CoreGame.ElementObject.ACTION_TYPE.MATCH, new CoreGame.Strategies.MatchAction());
    },

    /**
     * Initialize gem with color
     */
    init: function (row, col, type) {
        this._super(row, col, type);
        return this;
    },

    /**
     * Check if this gem matches another gem
     */
    matchesWith: function (other) {
        if (!other || !(other instanceof CoreGame.GemObject)) {
            return false;
        }
        return this.type === other.type;
    },

    /**
     * Override - gems can always be matched when idle
     */
    canMatch: function () {
        return this.state === CoreGame.ElementState.IDLE;
    },

    /**
     * Override - gems can be swapped when idle
     */
    canSwap: function () {
        return this.state === CoreGame.ElementState.IDLE;
    },

    /**
     * Get type name
     */
    getTypeName: function () {
        return 'gem';
    }

});

/**
 * Factory to create a random gem
 */

CoreGame.ElementObject.register(1, CoreGame.GemObject);
CoreGame.ElementObject.register(2, CoreGame.GemObject);
CoreGame.ElementObject.register(3, CoreGame.GemObject);
CoreGame.ElementObject.register(4, CoreGame.GemObject);
CoreGame.ElementObject.register(5, CoreGame.GemObject);
CoreGame.ElementObject.register(6, CoreGame.GemObject);
CoreGame.ElementObject.register(7, CoreGame.GemObject); // Gem Random (type randomised at spawn)
