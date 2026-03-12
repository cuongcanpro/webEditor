/**
 * Random.js
 * Deterministic pseudo-random number generator based on xorshift32.
 *
 * Usage:
 *   var rng = new CoreGame.Random(42);
 *   rng.nextInt32()         // signed 32-bit integer  (any value in [-2147483648, 2147483647])
 *   rng.nextInt32Bound(n)   // integer in [0, n)  — n is excluded
 *   rng.nextFloat32()       // float in [0, 1)
 *   rng.seed(newSeed)       // reset with a new seed
 */
var CoreGame = CoreGame || {};

/**
 * @constructor
 * @param {number} seed  Integer seed (non-zero; 0 is remapped to 1)
 */
CoreGame.Random = function (seed) {
    this._state = (seed | 0) || 1;   // xorshift32 must never hold state 0
};

CoreGame.Random.prototype = {

    /**
     * Reset the generator to a new seed.
     * @param {number} seed
     */
    seed: function (seed) {
        this._state = (seed | 0) || 1;
    },

    /**
     * Advance the state and return a signed 32-bit integer.
     * Distribution is uniform over all 2^32 non-zero states.
     * @returns {number}
     */
    nextInt32: function () {
        var s = this._state;
        s ^= s << 13;
        s ^= s >> 17;
        s ^= s << 5;
        this._state = s;
        return s | 0;
    },

    /**
     * Advance the state and return an integer in [0, bound).
     * The bound itself is never returned.
     * @param {number} bound  Positive integer upper limit (exclusive)
     * @returns {number}
     */
    nextInt32Bound: function (bound) {
        return Math.floor(this.nextFloat32() * (bound | 0));
    },

    /**
     * Advance the state and return a 32-bit float in [0, 1).
     * @returns {number}
     */
    nextFloat32: function () {
        return (this.nextInt32() >>> 0) / 4294967296;
    }
};
