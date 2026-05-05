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

        let spine = gv.createSpineAnimation(resAni['spine_' + 900]);
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
        if (!this.arrayBg) this.arrayBg = [];

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
                var spriteTop = fr.createSprite(path);

                path = "cloud_piece_00.png";
                var spriteBottom = fr.createSprite(path);

                // var sprBg = fr.createSprite("cloud_piece_00.png");
                // //sprBg.setScale(0.5); // Following Gem/Box scale convention
                // sprite.addChild(sprBg, -1);
                // sprBg.setPosition(sprite.getContentSize().width * 0.5, sprite.getContentSize().height * 0.5);

                // Get Pixel Position from BoardMgr
                // Ensure element exists to access boardMgr
                if (this.element && this.element.boardMgr) {
                    var pixelPos = this.element.boardMgr.gridToPixel(newCell.r, newCell.c);

                    spriteTop.setPosition(pixelPos);
                    this.addChild(spriteTop);

                    spriteBottom.setPosition(pixelPos);
                    this.getParent().addChild(spriteBottom, CoreGame.LayerBehavior.EXCLUSIVE - 3); // Behind the main layer

                    // Play run_1 spine animation when a new cell is added
                    if (resAni['spine_900']) {
                        var spineAdd = gv.createSpineAnimation(resAni['spine_900']);
                        spineAdd.setPosition(pixelPos);
                        this.addChild(spineAdd, CoreGame.LayerBehavior.EXCLUSIVE - 4);
                        spineAdd.setAnimation(0, 'run_2', false);
                        spineAdd.setScale(CoreGame.CloudUI.SPINE_SCALE);
                        gv.removeSpineAfterRun(spineAdd);
                    }

                    // Add to trackers
                    this.cellsData.push({ r: newCell.r, c: newCell.c });
                    this.cellsNode.push(spriteTop);
                    this.arrayBg.push(spriteBottom);
                    this.sprite.setVisible(false); // Hide default sprite since we're using custom visuals
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
                        // Play run_2 spine animation on explode
                        if (resAni['spine_900']) {
                            var spineExplode = gv.createSpineAnimation(resAni['spine_900']);
                            spineExplode.setPosition(node.getPosition());
                            spineExplode.setScale(CoreGame.CloudUI.SPINE_SCALE);
                            if (this.getParent()) {
                                this.getParent().addChild(spineExplode, 2000);
                            } else {
                                this.addChild(spineExplode, 2000);
                            }
                            spineExplode.setAnimation(0, 'run_1', false);
                            gv.removeSpineAfterRun(spineExplode);
                        }
                        node.removeFromParent();
                    }
                    this.arrayBg[i].removeFromParent(); // Remove background piece immediately  
                    // Remove from arrays
                    this.cellsData.splice(i, 1);
                    this.cellsNode.splice(i, 1);
                    this.arrayBg.splice(i, 1);
                    break;
                }
            }
        }
    },

    removeFromParent: function (clean) {
        for (var i = 0; i < this.arrayBg.length; i++) {
            if (this.arrayBg[i] && this.arrayBg[i].getParent()) {
                this.arrayBg[i].removeFromParent(clean);
            }
        }

        this._super(clean);
    }
});
CoreGame.CloudUI.SPINE_SCALE = 0.8;