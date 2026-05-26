/**
 * ColumnLockMgr - Column lock system used by Mỏ Neo Rỉ Sét (id 30100).
 *
 * While an anchor is alive in column C, gravity is suspended for C: gems
 * already at rest in that column do not fall, and no new gems spawn into
 * it. Horizontal matches still work normally (matched gems leave holes
 * that stay open until the anchor dies).
 *
 * Reference-counted by anchor identity so multiple anchors in the same
 * column only unlock when the last one is destroyed.
 *
 * Spec: docs/superpowers/specs/2026-05-26-phase1-blockers-design.md §1, §5, §9.
 *
 * Part of Match-3 Core Game.
 */
var CoreGame = CoreGame || {};

CoreGame.ColumnLockMgr = cc.Class.extend({
    blockerMgr: null,

    // Map "col" -> object map of anchor uid -> true.
    // Column is locked iff its set is non-empty.
    _lockedColumns: null,

    // Map anchor uid -> cc.DrawNode overlay on the board.
    _overlayNodes: null,

    ctor: function (blockerMgr) {
        this.blockerMgr = blockerMgr;
        this._lockedColumns = {};
        this._overlayNodes = {};
    },

    /**
     * Lock `col` on behalf of `anchor`. Idempotent per (col, anchor uid).
     */
    lockColumn: function (col, anchor) {
        if (col == null || !anchor) return;
        var key = String(col);
        var set = this._lockedColumns[key];
        if (!set) {
            set = {};
            this._lockedColumns[key] = set;
        }
        var uid = this._uidOf(anchor);
        set[uid] = true;
        this._addOverlay(col, anchor, uid);
    },

    /**
     * Remove `anchor`'s contribution. Unlocks the column only when the
     * last contributing anchor is removed.
     */
    unlockColumn: function (col, anchor) {
        if (col == null || !anchor) return;
        var key = String(col);
        var set = this._lockedColumns[key];
        if (!set) return;
        var uid = this._uidOf(anchor);
        delete set[uid];
        if (this._isEmptyObj(set)) {
            delete this._lockedColumns[key];
        }
        this._removeOverlay(uid);
    },

    isColumnLocked: function (col) {
        return !!this._lockedColumns[String(col)];
    },

    /**
     * Draw a semi-transparent orange strip along the locked column with
     * dashed chain-link segments. Attached to anchor.ui (z=-1).
     * Coordinates are local to anchor.ui; localCenterY shifts the strip
     * so it covers the full board column regardless of which row the anchor is in.
     */
    _addOverlay: function (col, anchor, uid) {
        if (!anchor || !anchor.ui) return;
        var bm = this.blockerMgr && this.blockerMgr.boardMgr;
        var rows = bm ? (bm.rows || 0) : 0;
        var cellSize = CoreGame.Config.CELL_SIZE;
        var halfW = cellSize / 2;
        var halfH = rows * cellSize / 2;
        var anchorRow = anchor.position.x;
        var localCenterY = cellSize * ((rows - 1) / 2 - anchorRow);

        var node = new cc.DrawNode();
        node.drawRect(
            cc.p(-halfW + 2, localCenterY - halfH + 2),
            cc.p(halfW - 2, localCenterY + halfH - 2),
            cc.color(255, 160, 30, 45),
            2,
            cc.color(255, 200, 50, 200)
        );

        var segLen = cellSize * 0.35;
        var gap = cellSize * 0.15;
        var y = localCenterY + halfH - segLen / 2;
        while (y > localCenterY - halfH + segLen / 2) {
            node.drawSegment(cc.p(0, y), cc.p(0, y - segLen), 2, cc.color(255, 200, 50, 160));
            y -= segLen + gap;
        }

        anchor.ui.addChild(node, -1);
        this._overlayNodes[uid] = node;
    },

    _removeOverlay: function (uid) {
        var node = this._overlayNodes[uid];
        if (node) {
            node.removeFromParent(true);
            delete this._overlayNodes[uid];
        }
    },

    _uidOf: function (anchor) {
        if (anchor._columnLockMgrUid === undefined) {
            CoreGame.ColumnLockMgr._nextUid = (CoreGame.ColumnLockMgr._nextUid || 0) + 1;
            anchor._columnLockMgrUid = CoreGame.ColumnLockMgr._nextUid;
        }
        return anchor._columnLockMgrUid;
    },

    _isEmptyObj: function (o) {
        for (var k in o) return false;
        return true;
    }
});

CoreGame.ColumnLockMgr._nextUid = 0;
