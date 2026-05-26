/**
 * ShieldMgr - AOE shield system used by Đèn Lồng Hắc Ám (id 30000) blockers.
 *
 * Owns a board-level map of which cells are currently inside an aura.
 * `TakeDamageAction.checkCondition` queries `isCellShielded(r, c)`:
 * non-PU damage on a shielded cell is blocked (text "CHẶN"); PU damage
 * passes through.
 *
 * Spec: docs/superpowers/specs/2026-05-26-phase1-blockers-design.md §1, §8, §9.
 *
 * Part of Match-3 Core Game.
 */
var CoreGame = CoreGame || {};

CoreGame.ShieldMgr = cc.Class.extend({
    blockerMgr: null,

    // Map "r,c" -> object map of source-lantern uid -> true.
    // (Object-as-set because ES5 has no Set, and we need ref-counting
    //  by source so overlapping auras only fully clear when every lantern
    //  inside them dies.)
    _shieldedCells: null,

    // Map lantern uid -> cc.DrawNode overlay on the board.
    _overlayNodes: null,

    ctor: function (blockerMgr) {
        this.blockerMgr = blockerMgr;
        this._shieldedCells = {};
        this._overlayNodes = {};
    },

    /**
     * Register the aura of `lantern`. Reads radius/shape from `cfg` (action
     * configData) with sensible defaults — currently only `radius` (1 -> 3x3)
     * is used; `shape` is a doc field for art layer to read later.
     *
     * Safe to call multiple times for the same lantern — idempotent per
     * (lantern.row, lantern.col, lantern uid).
     */
    addShield: function (lantern, cfg) {
        if (!lantern) return;
        var radius = (cfg && typeof cfg.radius === 'number') ? cfg.radius : 1;
        var uid = this._uidOf(lantern);
        // ElementObject stores grid position as position.x = row, position.y = col.
        var cells = this._computeAuraCells(lantern.position.x, lantern.position.y, radius);
        for (var i = 0; i < cells.length; i++) {
            var key = cells[i];
            var set = this._shieldedCells[key];
            if (!set) {
                set = {};
                this._shieldedCells[key] = set;
            }
            set[uid] = true;
        }
        this._addOverlay(lantern, radius, uid);
    },

    /**
     * Remove `lantern`'s contribution to every cell. Cells become
     * unshielded only when the last contributing lantern is removed.
     */
    removeShield: function (lantern) {
        if (!lantern) return;
        var uid = this._uidOf(lantern);
        // Walk the full map — auras are small (3x3 each, ≤5 lanterns/map),
        // so a per-key scan is fine and avoids tracking per-lantern cell
        // lists that could drift if a lantern moved.
        for (var key in this._shieldedCells) {
            var set = this._shieldedCells[key];
            if (set && set[uid]) {
                delete set[uid];
                if (this._isEmptyObj(set)) {
                    delete this._shieldedCells[key];
                }
            }
        }
        this._removeOverlay(uid);
    },

    isCellShielded: function (row, col) {
        return !!this._shieldedCells[row + ',' + col];
    },

    /**
     * Visual feedback when an attack is blocked. Hook for ShieldBlockedFx
     * (toast "CHẶN") — placeholder logs until the FX class lands.
     */
    showBlockedFx: function (row, col) {
        // TODO Step C: spawn a 0.6s "CHẶN" toast above (row, col).
        // For now just log so QA can see the rule fired.
        cc.log("ShieldMgr: blocked non-PU damage at", row, col);
    },

    /**
     * Draw a semi-transparent purple square showing the aura zone.
     * Attached to lantern.ui so coordinates are cell-local (no gridToPixel needed).
     */
    _addOverlay: function (lantern, radius, uid) {
        if (!lantern || !lantern.ui) return;

        var cellSize = CoreGame.Config.CELL_SIZE;
        var side = (radius * 2 + 1) * cellSize;
        var half = side / 2;

        var node = new cc.DrawNode();
        var inset = cellSize * 0.1;
        node.drawRect(
            cc.p(-half + inset, -half + inset),
            cc.p(half - inset, half - inset),
            cc.color(120, 80, 200, 60),
            2,
            cc.color(160, 100, 255, 220)
        );

        lantern.ui.addChild(node, -1);
        this._overlayNodes[uid] = node;
    },

    _removeOverlay: function (uid) {
        var node = this._overlayNodes[uid];
        if (node) {
            node.removeFromParent(true);
            delete this._overlayNodes[uid];
        }
    },

    /**
     * Compute the 3x3 (or radius-extended) aura cells around (r, c), cropped
     * to the board. radius=1 -> 3x3 square; radius=2 -> 5x5.
     * `shape` (e.g. 'rounded_square') is a hint for the render layer; the
     * gameplay shield itself is always a square mask (corners count too,
     * per spec — "blocker trong vùng" = any blocker inside the rounded
     * silhouette, which contains the 3x3 grid).
     */
    _computeAuraCells: function (r, c, radius) {
        var out = [];
        var bm = this.blockerMgr && this.blockerMgr.boardMgr;
        var rows = bm ? bm.rows : Infinity;
        var cols = bm ? bm.cols : Infinity;
        for (var dr = -radius; dr <= radius; dr++) {
            for (var dc = -radius; dc <= radius; dc++) {
                var rr = r + dr;
                var cc_ = c + dc;
                if (rr < 0 || rr >= rows || cc_ < 0 || cc_ >= cols) continue;
                out.push(rr + ',' + cc_);
            }
        }
        return out;
    },

    /**
     * Stable identity for a lantern. Falls back to a per-instance auto id
     * when the engine has no uid scheme.
     */
    _uidOf: function (lantern) {
        if (lantern._shieldMgrUid === undefined) {
            CoreGame.ShieldMgr._nextUid = (CoreGame.ShieldMgr._nextUid || 0) + 1;
            lantern._shieldMgrUid = CoreGame.ShieldMgr._nextUid;
        }
        return lantern._shieldMgrUid;
    },

    _isEmptyObj: function (o) {
        for (var k in o) return false;
        return true;
    }
});

CoreGame.ShieldMgr._nextUid = 0;
