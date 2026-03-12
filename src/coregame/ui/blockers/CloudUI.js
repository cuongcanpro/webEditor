/**
 * CloudUI - Specialized visual representation for Clouds
 * Part of Match-3 Core Game
 */
var CoreGame = CoreGame || {};

CoreGame.CloudUI = CoreGame.ElementUI.extend({
    sprBg: null,    // Background piece (under the cloud)
    spineInit: null, // Initial spine animation
    offsetsData: null,
    offsetsNode: null,

    ctor: function (element) {
        // Base constructor doesn't need type here as we handle multi-layers
        this._super(element);
        this.offsetsData = []; // Store {r,c}
        this.offsetsNode = []; // Store cc.Nodes
        this.setCascadeOpacityEnabled(true);

        // // 1. Background piece (Z-order lower)
        // this.sprBg = fr.createSprite("cloud_piece_00.png");
        // // this.sprBg.setScale(0.5); // Following Gem/Box scale convention
        // this.addChild(this.sprBg, -1);
        //
        // // 2. Cloud layer (Z-order higher)
        // // Handled dynamically by updateVisual based on offsets
        //
        // // 3. Spine initialization (if available)
        // if (typeof resAni !== 'undefined' && resAni['spine_' + type]) {
        //     this.spineInit = gv.createSpineAnimation(resAni['spine_' + type]);
        //     if (this.spineInit) {
        //         //  this.spineInit.setScale(0.375); // Half of 0.75 from original to match 0.5 overall scale
        //         this.addChild(this.spineInit, 1);
        //
        //         this.spineInit.clearTracks();
        //         this.spineInit.setAnimation(0, "run_2", false);
        //         this.spineInit.setCompleteListener(function () {
        //             // Small delay to ensure frame update before removal
        //             setTimeout(function () {
        //                 if (this.spineInit && cc.sys.isObjectValid(this.spineInit)) {
        //                     this.spineInit.runAction(cc.sequence(
        //                         cc.fadeOut(0.2),
        //                         cc.removeSelf()
        //                     ));
        //                 }
        //             }.bind(this));
        //         }.bind(this));
        //     }
        // }

        return true;
    },

    /**
     * Update cloud sprite based on current hit points
     */
    /**
     * Update cloud sprite based on offsets list
     * @param {Array} offsets - List of {r,c} objects
     */
    /**
     * Update cloud sprite based on cells list
     */
    updateVisual: function () {
        var cells = this.element.cells;
        if (!cells) return;

        // Initialize arrays if null
        if (!this.cellsData) this.cellsData = []; // Still using same name for internal storage? Let's keep it or rename.
        // Let's keep internal names to minimize diffs unless requested.

        if (!this.cellsNode) this.cellsNode = [];

        for (var i = 0; i < cells.length; i++) {
            var newCell = cells[i];

            // Check if this cell is already handled
            var exists = false;
            for (var j = 0; j < this.cellsData.length; j++) {
                if (this.cellsData[j].r === newCell.r && this.cellsData[j].c === newCell.c) {
                    exists = true;
                    break;
                }
            }

            if (!exists) {
                var path = "cloud_layer_1.png";
                var sprite = fr.createSprite(path);

                var sprBg = fr.createSprite("cloud_piece_00.png");
                //sprBg.setScale(0.5); // Following Gem/Box scale convention
                sprite.addChild(sprBg, -1);
                sprBg.setPosition(sprite.getContentSize().width * 0.5, sprite.getContentSize().height * 0.5);

                // Get Pixel Position from BoardMgr
                // Ensure element exists to access boardMgr
                if (this.element && this.element.boardMgr) {
                    var pixelPos = this.element.boardMgr.gridToPixel(newCell.r, newCell.c);
                    sprite.setPosition(pixelPos);
                    this.addChild(sprite);

                    // Add to trackers
                    this.cellsData.push({ r: newCell.r, c: newCell.c });
                    this.cellsNode.push(sprite);
                }
            }
        }
    },

    /**
     * Play explosion effect for Cloud part
     * @param {number} hitPoints - Remaining HP (unused for part removal logic)
     * @param {number} row - Grid row
     * @param {number} col - Grid col
     */
    playExplodeEffect: function (hitPoints, row, col) {
        // Sound effect
        if (typeof resSound !== 'undefined' && resSound.cloud_break) {
            fr.Sound.playSoundEffect(resSound.cloud_break, false);
        }

        if (this.element && typeof row !== 'undefined' && typeof col !== 'undefined') {
            // Find and remove the matching part
            for (var i = 0; i < this.cellsData.length; i++) {
                if (this.cellsData[i].r === row && this.cellsData[i].c === col) {
                    var node = this.cellsNode[i];
                    if (node) {
                        // Play effect on node
                        var seq = cc.sequence(
                            cc.scaleTo(0.1, 1.2),
                            cc.scaleTo(0.1, 0),
                            cc.removeSelf()
                        );
                        node.runAction(seq);
                    }
                    // Remove from arrays
                    this.cellsData.splice(i, 1);
                    this.cellsNode.splice(i, 1);
                    break;
                }
            }
        }
    }
});
