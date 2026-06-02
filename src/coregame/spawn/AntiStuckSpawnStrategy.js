/**
 * AntiStuckSpawnStrategy — wraps a base spawn strategy and injects specific
 * gem colors requested via boardMgr._forceSpawnColors (a FIFO queue filled by
 * ColorCabinet at end-of-turn when a needed bottle color is missing from the
 * board). Prevents an unwinnable ColorCabinet board.
 */
var CoreGame = CoreGame || {};
CoreGame.DropStrategy = CoreGame.DropStrategy || {};

CoreGame.DropStrategy.AntiStuckSpawnStrategy = CoreGame.DropStrategy.SpawnStrategy.extend({
    _base: null,

    ctor: function (baseStrategy) {
        // NOTE: do NOT call this._super() — the base SpawnStrategy defines no
        // ctor, so cc.Class leaves this._super undefined and calling it throws
        // "this._super is not a function".
        this._base = baseStrategy;
    },

    getGemType: function (row, col, boardMgr) {
        var forced = boardMgr && boardMgr._forceSpawnColors;
        if (forced && forced.length > 0) {
            var color = forced.shift();
            if (typeof CoreGame.RemoteLog !== 'undefined') {
                CoreGame.RemoteLog.log("[AntiStuck] forced spawn color " + color + " at (" + row + "," + col + ")");
            }
            return color;
        }
        if (this._base && typeof this._base.getGemType === 'function') {
            return this._base.getGemType(row, col, boardMgr);
        }
        var types = this._gemTypes(boardMgr);
        return types[Math.floor(Math.random() * types.length)];
    }
});
