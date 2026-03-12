/**
 * GridSlot - Single cell on the game board
 * Part of Match-3 Core Game
 */
var CoreGame = CoreGame || {};

CoreGame.GridSlot = cc.Class.extend({
    // Properties from UML
    listElement: null,  // Array of elements in this slot

    // Grid position
    row: 0,
    col: 0,

    // References
    boardMgr: null,

    // State
    enable: true,  // Whether this slot is active/playable
    canSpawn: false, // Whether new gems can be spawned from this slot

    // Visual
    background: null,

    ctor: function (row, col, boardMgr, enable) {
        this.row = row;
        this.col = col;
        this.boardMgr = boardMgr;
        this.enable = (enable !== undefined) ? enable : true;
        this.canSpawn = false;
        this.listElement = [];

        this.renderBackground();

        // Debug Label
        // var pixelPos = this.boardMgr.gridToPixel(row, col);
        // var label = new cc.LabelTTF(row + "," + col, "Arial", 20);
        // label.setPosition(pixelPos);
        // label.setColor(cc.color(255, 255, 255));
        //
        // // Add to board UI root (assuming boardMgr->boardUI->rootNode exists)
        // if (this.boardMgr && this.boardMgr.boardUI) {
        //     this.boardMgr.boardUI.addChild(label, 10); // High Z-order to be visible
        // }
    },

    /**
     * Render background for this slot
     */
    renderBackground: function () {

        // if (!this.boardMgr || !this.boardMgr.boardUI) {
        //     return;
        // }

        var root = this.boardMgr.boardUI;
        var pixelPos = this.boardMgr.gridToPixel(this.row, this.col);

        // light_1.png background
        this.bg = fr.createSprite(BoardConst.BG_COLOR === 'light' ? "light_1.png" : "dark_1.png");
        // this.bg.setScale(1.2);
        this.bg.setPosition(pixelPos);
        root.addChild(this.bg, 0);

        // Alternating visibility for bg2
        this.bg2 = fr.createSprite("light_nen_hat.png");
        this.bg2.setPosition(pixelPos);
        this.bg2.setOpacity(this.row % 2 != this.col % 2? 255 : 0);
        root.addChild(this.bg2, 0);

        this.setEnable(this.enable);
    },

    /**
     * Get first interactable element (gem or power-up that can be swapped)
     */
    getFirstInteractable: function (type) {
        for (var i = 0; i < this.listElement.length; i++) {
            if (this.listElement[i].hasAction(type)) {
                if (this.listElement[i].isStopActionByAttachment(type)) {
                    return null;
                }
                return this.listElement[i];
            }
            if (this.listElement[i].isStopAction(type)) return null;
        }
        return null
    },

    /**
     * Get element that can be matched
     */
    getMatchableElement: function () {
        for (var i = 0; i < this.listElement.length; i++) {
            var element = this.listElement[i];
            if (element instanceof CoreGame.GemObject && element.canMatch()) {
                return element;
            }
        }
        return null;
    },

    /**
     * Called when slot is kicked/activated by user
     */
    onActive: function () {
        var element = this.getFirstInteractable(CoreGame.ElementObject.Action.ACTIVE);
        if (element) {
            element.active();
            return element;
        }
        return null;
    },

    /**
     * Match element in this slot
     * @param {Object} matchContext - Optional context for match behavior
     *   - type: 'normal' (default) or 'powerup'
     *   - targetPos: {row, col} for converge animation (if type='powerup')
     *   - group: array of all matched positions
     */
    matchElement: function (matchContext= { type: "normal" }, forceMatch = false) {
        var dumpElement = this.listElement.slice();
        for (var i = 0; i < dumpElement.length; i++) {
            var element = dumpElement[i];

            // if (element.hasAction(CoreGame.ElementObject.Action.ACTIVE)) {
            if (forceMatch || element.isIdle()) {
                element.active();
                // if (element.hasAction(CoreGame.ElementObject.Action.MATCH)) {
                let isStop = element.isStopAction(CoreGame.ElementObject.Action.MATCH) || element.isStopActionByAttachment(CoreGame.ElementObject.Action.MATCH);
                // if (element.hasAction(CoreGame.ElementObject.Action.MATCH))
                    element.onMatch(matchContext);
                if (isStop)
                    return;
            }
        }
    },

    onFinishTurn: function () {
        var dumpElement = this.listElement.slice();
        for (var i = 0; i < dumpElement.length; i++) {
            dumpElement[i].onFinishTurn();
        }
    },

    /**
     * Update element (after drop/refill)
     */
    updateElement: function () {
        for (var i = 0; i < this.listElement.length; i++) {
            this.listElement[i].updateVisualPosition();
        }
    },

    /**
     * Notify nearby match occurred
     */
    onMatchNearby: function (context) {
        context.row = this.row;
        context.col = this.col;
        var dumpElement = this.listElement.slice();
        for (var i = 0; i < dumpElement.length; i++) {
            var element = dumpElement[i];
            element.getTypeName();
            // Blocker (or element) onMatchNearby now receives context
            if (element.onMatchNearby) {
                element.onMatchNearby(context);
            }
        }
    },

    /**
     * Add element to slot
     * @param {ElementObject} element - Element to add
     * @param {boolean} silent - If true, skip clearElements (for temporary grid updates)
     */
    addElement: function (element, silent) {
        if (this.listElement.indexOf(element) !== -1) return;

        // Default behavior if undefined
        var behavior = (typeof element.layerBehavior !== 'undefined') ?
            element.layerBehavior : CoreGame.LayerBehavior.CONTENT;

        // 1. Exclusive Check (Box/Cloud/Cookie)
        if (behavior === CoreGame.LayerBehavior.EXCLUSIVE) {
            // Skip clearElements if in silent mode (temporary grid update)
            if (!silent) {
                this.clearElements();
            }
            this.listElement.push(element);
            element.boardMgr = this.boardMgr;
            return;
        }

        // 2. Handle OVERLAY elements - attach to CONTENT element instead of adding to list
        if (behavior === CoreGame.LayerBehavior.OVERLAY) {
            // Find CONTENT element to attach to
            var contentElement = null;
            for (var i = 0; i < this.listElement.length; i++) {
                var existingBehavior = (typeof this.listElement[i].layerBehavior !== 'undefined') ?
                    this.listElement[i].layerBehavior : CoreGame.LayerBehavior.CONTENT;

                if (existingBehavior === CoreGame.LayerBehavior.CONTENT) {
                    contentElement = this.listElement[i];
                    break;
                }
            }

            // If we found a CONTENT element, attach overlay to it
            if (contentElement) {
                element.boardMgr = this.boardMgr;
                contentElement.addAttachment(element);
                return;
            }
            // If no CONTENT element found, fall through to add to list normally
        }


        // 2.5. Remove existing element with same layerBehavior
        // (Each slot can only have one BACKGROUND, one CONTENT, etc.)
        // OVERLAY is handled separately via attachments above
        if (!silent && behavior !== CoreGame.LayerBehavior.OVERLAY &&
            behavior !== CoreGame.LayerBehavior.EXCLUSIVE) {
            for (var i = this.listElement.length - 1; i >= 0; i--) {
                var existingBehavior = (typeof this.listElement[i].layerBehavior !== 'undefined') ?
                    this.listElement[i].layerBehavior : CoreGame.LayerBehavior.CONTENT;

                // If same layer behavior, remove the old element
                if (existingBehavior === behavior) {
                    this.listElement[i].remove();
                    break; // Only remove one element
                }
            }
        }

        // 3. Insert based on Priority Descending (Higher Priority = Lower Index = Top of Stack)
        // Priority: OVERLAY (3) > CONTENT (2) > BACKGROUND (1)
        // List: [Chain, Gem, Grass]
        // Chain (3) comes before Gem (2). Gem (2) comes before Grass (1).

        var inserted = false;
        for (var i = 0; i < this.listElement.length; i++) {
            var existingBehavior = (typeof this.listElement[i].layerBehavior !== 'undefined') ?
                this.listElement[i].layerBehavior : CoreGame.LayerBehavior.CONTENT;

            // If new element has higher layer value, insert before current
            if (behavior > existingBehavior) {
                this.listElement.splice(i, 0, element);
                inserted = true;
                break;
            }
        }

        if (!inserted) {
            this.listElement.push(element); // Lowest priority or empty list
        }

        // element.gridSlot = this; // REMOVED
        element.boardMgr = this.boardMgr;
    },

    /**
     * Remove element from slot
     */
    removeElement: function (element) {
        var index = this.listElement.indexOf(element);
        if (index !== -1) {
            this.listElement.splice(index, 1);
            // element.gridSlot = null; // REMOVED
        }
    },

    /**
     * Check if slot is empty (no matchable elements)
     */
    isEmptyToDrop: function () {
        if (this.listElement.length === 0) return true;
        for (let i = 0; i < this.listElement.length; i++) {
            if (!this.listElement[i].isBackground()) {
                return false;
            }
        }
        return true;
    },

    /**
     * Check if slot is empty (no matchable elements)
     */
    isEmpty: function () {
        return this.listElement.length === 0;
    },

    /**
     * Check if slot has any elements
     */
    hasElements: function () {
        return this.listElement.length > 0;
    },

    /**
     * Check if slot has a blocker
     */
    hasBlocker: function () {
        for (var i = 0; i < this.listElement.length; i++) {
            if (this.listElement[i] instanceof CoreGame.Blocker) {
                return true;
            }
        }
        return false;
    },

    /**
     * Get gem type in this slot (-1 if no gem)
     */
    getType: function () {
        var gem = this.getMatchableElement();
        return gem ? gem.type : -1;
    },

    /**
     * Check if slot has an element of specific type
     */
    hasElementType: function (type) {
        for (var i = 0; i < this.listElement.length; i++) {
            if (this.listElement[i].type === type) return true;
        }
        return false;
    },

    /**
     * Get pixel position for this slot
     */
    getPosition: function () {
        return this.boardMgr.gridToPixel(this.row, this.col);
    },

    /**
     * Check if all elements are idle
     */
    isIdle: function () {
        for (var i = 0; i < this.listElement.length; i++) {
            if (!this.listElement[i].isIdle()) {
                return false;
            }
        }
        return true;
    },

    /**
     * Clear all elements
     */
    clearElements: function () {
        cc.log("Lenght Element " + this.listElement.length);
        for (var i = this.listElement.length - 1; i >= 0; i--) {
            this.listElement[i].remove();
        }
        this.listElement = [];
    },

    setEnable: function (enable) {
        this.enable = enable;
        this.bg.setVisible(enable);
        this.bg2.setVisible(enable);
    }
});
