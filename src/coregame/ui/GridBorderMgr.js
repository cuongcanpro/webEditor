/**
 * GridBorderMgr - Manages border/connective pieces for grid-based elements
 * (Mây, Cỏ, Hàng rào, ...)
 * Decouples specialized UI rendering from BoardUI
 * Part of Match-3 Core Game
 */
var CoreGame = CoreGame || {};

CoreGame.GridBorderMgr = cc.Class.extend({
    boardUI: null,
    boardMgr: null,
    renderedPieces: null, // Map of type -> Array of sprites

    ctor: function (boardUI, boardMgr) {
        this.boardUI = boardUI;
        this.boardMgr = boardMgr;
        this.renderedPieces = {};
    },

    /**
     * Render border pieces for a specific element type
     * @param {number} type - CoreGame.Config.ElementType
     * @param {string} spritePrefix - e.g. "cloud_piece_"
     * @param {object} infoConfig - CoreGame.Config.CloudPieceInfo or similar
     * @param {number} hpFilter - Some layers separate by HP in addition
     */
    render: function (type, spritePrefix, infoConfig, hpFilter) {
        if (!this.boardMgr || !this.boardUI) return;

        // Cache key namespaces by HP filter so two passes for the same type
        // (different HP tiers, e.g. hp=1 vs hp=2 grass) don't clobber each
        // other's sprites.
        var hasFilter = (typeof hpFilter !== 'undefined' && hpFilter !== null);
        var cacheKey = hasFilter ? (type + ':hp' + hpFilter) : type;

        // 1. Clear existing pieces for this cache key
        this.clearType(cacheKey);
        this.renderedPieces[cacheKey] = [];

        var rows = this.boardMgr.rows;
        var cols = this.boardMgr.cols;
        var cellSize = CoreGame.Config.CELL_SIZE;
        // 2. Scan grid intersections
        for (var row = rows - 1; row >= -1; row--) {
            for (var col = 0; col <= cols; col++) {
                var pattern = this.getAdjacencyPattern(row, col, type, hpFilter);
                var info = infoConfig[pattern];
                if (info) {

                    // Intersection at (row, col) is BETWEEN row and row+1
                    // Get pixel position of row, col cell center
                    var pixelPos = this.boardMgr.gridToPixel(row, col);

                    // Adjust to intersection point:
                    // - X: left edge of col (subtract half cell)
                    // - Y: top edge of row = between row and row+1 (ADD half cell)
                    pixelPos.x -= cellSize / 2;
                    pixelPos.y += cellSize / 2;

                    for (var i = 0; i < info.length; i++) {
                        var spriteName = spritePrefix + info[i] + ".png";
                        var spr = fr.createSprite(spriteName);
                        spr.setPosition(pixelPos);
                        // spr.setScale(0.5);

                        // Z-Order logic (keeping current convention)
                        var zOrder = (info[i] == '1_2_3_4') ? (CoreGame.Config.zOrder.CLOUD - 2) : (CoreGame.Config.zOrder.CLOUD - 1);

                        if (type === CoreGame.Config.ElementType.GRASS) {
                            zOrder = CoreGame.LayerBehavior.BACKGROUND
                                - (CoreGame.GridBorderMgr.HP_THRESHOLD - hpFilter);
                        } else {
                            zOrder = CoreGame.LayerBehavior.EXCLUSIVE - 1;
                        }
                        this.boardUI.root.addChild(spr, zOrder);
                        this.renderedPieces[cacheKey].push(spr);
                    }
                }
            }
        }
    },

    /**
     * Get 4-bit adjacency pattern around a grid intersection
     * Pattern bits: [top-left, top-right, bottom-left, bottom-right]
     * 
     * Grid system: row=0 at bottom, increases upward
     * So row+1 is ABOVE intersection, row is BELOW
     */
    getAdjacencyPattern: function (row, col, type, hpFilter) {
        var pattern = "";
        var hasFilter = (typeof hpFilter !== 'undefined' && hpFilter !== null);

        // Pattern for intersection at (row, col):
        // [top-left, top-right, bottom-left, bottom-right]
        var slots = [
            this.boardMgr.getSlot(row + 1, col - 1), // top-left
            this.boardMgr.getSlot(row + 1, col),     // top-right
            this.boardMgr.getSlot(row, col - 1),     // bottom-left
            this.boardMgr.getSlot(row, col)          // bottom-right
        ];

        for (var i = 0; i < slots.length; i++) {
            var occupied = false;
            if (slots[i]) {
                occupied = hasFilter
                    ? slots[i].hasElementTypeWithHP(type, hpFilter)
                    : slots[i].hasElementType(type);
            }
            pattern += occupied ? "1" : "0";
        }

        return pattern;
    },

    /**
     * Clear all pieces of a specific type
     */
    clearType: function (type) {
        if (this.renderedPieces[type]) {
            for (var i = 0; i < this.renderedPieces[type].length; i++) {
                this.renderedPieces[type][i].removeFromParent();
            }
            delete this.renderedPieces[type];
        }
    },

    /**
     * Clear everything
     */
    clearAll: function () {
        for (var type in this.renderedPieces) {
            this.clearType(type);
        }
    }
});
CoreGame.GridBorderMgr.HP_THRESHOLD = 5;