/**
 * DynamicBlocker - Blocker with arbitrary shape defined by a list of relative positions
 * Part of Match-3 Core Game
 */
var CoreGame = CoreGame || {};

CoreGame.DynamicBlocker = CoreGame.Blocker.extend({

    ctor: function () {
        this._super();
        this.cells = [];
    },

    /**
     * Initialize DynamicBlocker
     * @param {number} row - Anchor Row (kept for compatibility/reference, though cells define shape)
     * @param {number} col - Anchor Column
     * @param {number} type - Element Type
     * @param {number} hitPoints - HP
     * @param {Array} cells - List of {r, c} absolute positions
     */
    init: function (row, col, type, hitPoints, cells) {
        this._super(row, col, type, hitPoints);
        
        if (cells) {
            this.cells = [];
            for (var i = 0; i < cells.length; i++) {
                this.cells.push({ r: cells[i].r, c: cells[i].c });
            }
        } else {
            this.cells = [{ r: row, c: col }];
        }
        
        cc.log("List Cell " + JSON.stringify(this.cells));
        //  for (let cell of this.cells) {
        //      this.cells.push(cell);
        //
        //      // Add this element to the new grid slot logic
        //      if (this.boardMgr) {
        //          var slot = this.boardMgr.getSlot(cell.r, cell.c);
        //          if (slot) {
        //              // Ensure slot is cleared or handled as per game rules?
        //              // User's SpreadAction cleared it before calling this.
        //              // Just add self to slot.
        //              slot.addElement(this);
        //          }
        //      }
        //  }

        // Calculate bounding box size for visual centering logic (still useful for UI)
        // Find min/max row/col
        if (this.cells.length > 0) {
            var minR = this.cells[0].r, maxR = this.cells[0].r;
            var minC = this.cells[0].c, maxC = this.cells[0].c;

            for (var i = 1; i < this.cells.length; i++) {
                if (this.cells[i].r < minR) minR = this.cells[i].r;
                if (this.cells[i].r > maxR) maxR = this.cells[i].r;
                if (this.cells[i].c < minC) minC = this.cells[i].c;
                if (this.cells[i].c > maxC) maxC = this.cells[i].c;
            }
            // Size covers the range
            this.size = cc.size(maxC - minC + 1, maxR - minR + 1);
        } else {
            this.size = cc.size(1, 1);
        }


        return this;
    },

    /**
     * Get list of occupied grid cells
     */
    getGridCells: function () {
        // Return cells mapped to x,y property names if needed by BoardMgr
        // BoardMgr expects {x, y} (x=row, y=col) based on previous getGridCells impl
        var result = [];
        for (var i = 0; i < this.cells.length; i++) {
            result.push({
                x: this.cells[i].r,
                y: this.cells[i].c
            });
        }
        return result;
    },

    addCell: function (cell) {
        this.cells.push(cell);

        // Add this element to the new grid slot logic
        if (this.boardMgr) {
            var slot = this.boardMgr.getSlot(cell.r, cell.c);
            if (slot) {
                // Ensure slot is cleared or handled as per game rules?
                // User's SpreadAction cleared it before calling this.
                // Just add self to slot.
                slot.addElement(this);
            }
        }

        this.updateVisual();
        var boardUI = this.boardMgr ? this.boardMgr.boardUI : null;
        if (boardUI)
            boardUI.refreshBorders();
    },

    // Alias for compatibility if needed, but refactoring specifically requested

    /**
     * Take damage from nearby matches
     */
    takeDamage: function (amount, color, row, col) {
        if (this.cells.length === 0)
            return;

        // ── Scoring (per §3.1, "per tile") ──────────────────────────────────
        // Each takeDamage call removes exactly one cell from a multi-cell
        // dynamic blocker (e.g. Cloud), so score one tile-payout per call.
        // The remove-cell flow further down may also hit removedElement when
        // the last cell goes; the BoardMgr.removedElement scorer skips
        // Blocker instances so we don't double-count.
        if (this.boardMgr && this.boardMgr.scoreMgr) {
            this.boardMgr.scoreMgr.addClearEvent({
                elementType: this.type,
                hp: 1,
                isObjective: this.boardMgr.isObjectiveType(this.type),
                clearMethod: this.boardMgr.getCurrentClearMethod(),
                cascadeDepth: this.boardMgr.getCurrentCascadeDepth()
            });
        }

        // Note: Logic here might need to remove specific cell?
        // User previously used offsets.length check.
        // Assuming we remove ONE cell per damage call if hit?
        // OR simply checking total health/parts?

        // Existing logic was:
        // if offsets.length <= 0 explode. else play effect on parts.

        if (this.cells.length <= 0) {
            this.doExplode(row, col);
        } else {
            // Pass row, col to UI to remove specific part
            this.ui.playExplodeEffect(this.cells.length, row, col);

            // DynamicBlocker logic needs to remove the cell from logic too?
            // UI removes visual part. Logic must remove logical part.
            // We do this by finding matching cell and removing it.

            for (var i = 0; i < this.cells.length; i++) {
                if (this.cells[i].r === row && this.cells[i].c === col) {
                    // Remove from grid slot
                    if (this.boardMgr) {
                        this.boardMgr.removeElementAt(this, row, col);
                    }
                    cc.log("DynamicBlocker takeDamage === remove cell");
                    this.cells.splice(i, 1);
                    break;
                }
            }

            // If empty after removal, destroy object
            if (this.cells.length === 0) {
                this.doExplode(row, col);
            } else {
                this.updateVisual();
            }
            this.boardMgr.setRefillRequired(true);
        }
        var boardUI = this.boardMgr ? this.boardMgr.boardUI : null;
        if (boardUI)
            boardUI.refreshBorders();
    },

    updateVisualPosition: function () {

    },

    updateVisual: function () {
        this.ui.updateVisual();
    },

    getTypeName: function () {
        return 'dynamic_blocker';
    }
});
