/**
 * ElementObject - Base class for all game elements
 * Part of Match-3 Core Game
 */
var CoreGame = CoreGame || {};

CoreGame.ElementState = {
    IDLE: 0,
    MOVING: 1,
    SWAPPING: 2,
    MATCHING: 3,
    DROPPING: 4,
    REMOVING: 5
};

CoreGame.LayerBehavior = {
    BACKGROUND: 10, // Grass
    CONTENT: 20,    // Gem
    OVERLAY: 30,    // Chain
    EXCLUSIVE: 40   // Box, Cookie, Cloud (Clears others)
};

CoreGame.ElementObject = cc.Class.extend({
    // Properties from UML
    position: null,     // cc.p(x, y)
    size: null,         // cc.size(w, h)
    ui: null,       // ElementUI - visual representation
    state: 0,           // Current state

    // Behaviors Map
    actions: null, // { "actionName": [actionList] }
    type: -1,
    // gridSlot: null,  // REMOVED: Element does not keep reference to slot(s)
    boardMgr: null,     // Reference to BoardMgr

    hitPoints: 1,
    layerBehavior: 2, // CoreGame.LayerBehavior.CONTENT

    // Attachment System
    attachments: null, // List of attached elements (e.g., Soap)
    holder: null,      // The element holding this one
    rawConfig: null,
    configData: {
        maxHP: 1
    },
    ctor: function () {
        this.layerBehavior = CoreGame.LayerBehavior.CONTENT;
        this.position = cc.p(0, 0); // Logic grid position (x: row, y: col)
        this.size = cc.size(1, 1);  // Logic grid size (width, height)
        this.state = CoreGame.ElementState.IDLE;
        this.ui = null;
        this.attachments = [];
        this.actions = {};
        this.holder = null;
        this.customData = {};
        this.haveBaseAction = [1, 1, 1, 1];
        this.blockBaseAction = [0, 0, 0, 0]; // prevent base action to under layer
    },

    /**
     * Add an action to the element
     * @param {string} key - Action type (e.g., 'match', 'remove', 'sideMatch')
     * @param {Object} action - The action strategy instance
     */
    addAction: function (key, action) {
        if (!this.actions[key]) {
            this.actions[key] = [];
            CoreGame.EventMgr.on("custom" + key, this.doActionsType.bind(this, key), this);
        }
        this.actions[key].push(action);
        if (action.setTargetElement) {
            action.setTargetElement(this);
        }
    },

    clearAllEvents: function () {
        CoreGame.EventMgr.offTarget(this);
    },
    onExit: function () {
        this.clearAllEvents();
    },

    /**
     * Get actions for a specific key
     * @param {string} key - Action type
     * @returns {Array} List of actions
     */
    getActions: function (key) {
        return this.actions[key] || [];
    },

    updateVisualByActions: function () {
        for (var key in this.actions) {
            for (var i = 0; i < this.actions[key].length; i++) {
                this.actions[key][i].updateVisual(this);
            }
        }
    },

    /**
     * Initialize element at position
     */
    init: function (row, col, type) {
        this.position.x = row;
        this.position.y = col;
        this.type = type;
        return this;
    },

    /**
     * Move element to target grid position logic and visual
     */
    moveTo: function (row, col, duration, delayTime = 0) {
        var oldRow = this.position.x;
        var oldCol = this.position.y;

        this.position.x = row;
        this.position.y = col;

        if (this.boardMgr) {
            // Tell board manager to update grid slots based on new position/size
            this.boardMgr.updateGridForElement(this, oldRow, oldCol);

            var targetPixelPos = this.boardMgr.gridToPixel(row, col);
            this.visualMoveTo(targetPixelPos, duration, delayTime);
        }
    },

    /**
     * Drop element to target grid position logic and visual
     */
    dropTo: function (row, col, duration, delayTime = 0) {
        var oldRow = this.position.x;
        var oldCol = this.position.y;

        this.position.x = row;
        this.position.y = col;

        if (this.boardMgr) {
            // Tell board manager to update grid slots based on new position/size
            this.boardMgr.updateGridForElement(this, oldRow, oldCol);

            var targetPixelPos = this.boardMgr.gridToPixel(row, col);

            // Adjust for multi-cell element visual offset
            if (this.size && (this.size.width > 1 || this.size.height > 1)) {
                var offsetX = (this.size.width - 1) * CoreGame.Config.CELL_SIZE / 2;
                var offsetY = (this.size.height - 1) * CoreGame.Config.CELL_SIZE / 2;
                targetPixelPos.x += offsetX;
                targetPixelPos.y += offsetY;
            }

            this.setState(CoreGame.ElementState.MOVING);
            if (!this.ui) {
                return;
            }

            this.ui.playDropToAnim(targetPixelPos, duration, delayTime);
        }
    },

    /**
     * Move element to target pixel position (Visual only)
     */
    visualMoveTo: function (targetPixelPos, duration, delayTime = 0) {
        this.setState(CoreGame.ElementState.MOVING);

        if (!this.ui) {
            this.setState(CoreGame.ElementState.IDLE);
            return;
        }

        this.ui.playMoveToAnim(targetPixelPos, duration, delayTime);

        CoreGame.TimedActionMgr.addAction(duration, function () {
            this.setState(CoreGame.ElementState.IDLE);
        }.bind(this));
    },

    /**
     * Animate swap to target and back (Visual only)
     */
    visualSwapBack: function (targetPixelPos, duration) {
        if (!this.ui) {
            return;
        }

        var originalPixelPos = this.boardMgr.gridToPixel(this.position.x, this.position.y);
        this.ui.playMoveAnBackAnim(targetPixelPos, originalPixelPos, duration);
    },

    /**
     * Activate element (when tapped/selected)
     */
    active: function () {
        // Override in subclasses
    },

    /**
     * Called when move fails (swap back)
     */
    moveFail: function () {
        this.setState(CoreGame.ElementState.IDLE);
    },

    doActionsType: function (type, extraData) {
        var time = 0;
        if (this.rawConfig && this.ui) {
            var visualState = (this.customData && this.customData.visualState) ? this.customData.visualState : "";
            time = this.ui.playAnimation(type, visualState) || 0;
            cc.log("run action " + type + " " + time)
        }
        // CoreGame.TimedActionMgr.addAction(time, function (type, extraData) {
        var actions = this.getActions(type);
        for (var i = 0; i < actions.length; i++) {
            if (actions[i].checkCondition(this, extraData)) {
                actions[i].execute(this, extraData, time);
            }
        }
        //set visual state again because action may changed it
        if(this.ui && this.ui.setVisualState)
            this.ui.setVisualState((this.customData && this.customData.visualState) ? this.customData.visualState : "");
        // }.bind(this, type, extraData));
    },

    /**
     * Called when element is matched
     * @param {Object} matchContext - Optional context for match action
     *   - type: 'normal' (explode) or 'powerup' (converge to target)
     *   - targetPos: {row, col} for converge animation
     *   - group: array of all matched positions
     */
    onMatch: function (matchContext) {
        // Process attachments first (e.g., Chain on Gem)
        if (this.attachments && this.attachments.length > 0) {
            var dumpAttachments = this.attachments.slice();
            for (var i = 0; i < dumpAttachments.length; i++) {
                dumpAttachments[i].onMatch(matchContext);
                if (dumpAttachments[i].isStopAction(CoreGame.ElementObject.Action.MATCH)) {
                    return;
                }
            }
        }

        // Then process this element itself
        this.doActionsType(CoreGame.ElementObject.ACTION_TYPE.MATCH, matchContext);
    },

    /**
     * React to nearby match
     */
    onMatchNearby: function (extraData) {
        // Process attachments first
        if (this.attachments && this.attachments.length > 0) {
            var dumpAttachments = this.attachments.slice();
            for (var i = 0; i < dumpAttachments.length; i++) {
                if (dumpAttachments[i].onMatchNearby) {
                    dumpAttachments[i].onMatchNearby(extraData);
                }
            }
        }

        // Then process this element itself
        this.doActionsType(CoreGame.ElementObject.ACTION_TYPE.SIDE_MATCH, extraData);
    },

    /**
     * Do explode animation, when element is destroyed
     */
    doExplode: function (row, col) {
        if (!this.ui) {
            this.remove();
            return;
        }
        var timeRemove = this.ui.playAnimation(CoreGame.ElementObject.ACTION_TYPE.REMOVE);
        if (timeRemove == undefined)
            timeRemove = 0.2;
        CoreGame.TimedActionMgr.addAction(timeRemove, function () {
            this.remove();
        }.bind(this));
    },

    /**
     * Play converge animation (powerup match)
     * Gem moves to targetPos and waits for PowerUp spawn
     */
    playConvergeAnimation: function (targetPos) {
        if (!this.ui || !this.boardMgr) {
            this.remove();
            return;
        }

        var self = this;
        var targetPixelPos = this.boardMgr.gridToPixel(targetPos.row, targetPos.col);
        var duration = CoreGame.Config.CONVERGE_DURATION;

        // Move to target position with scale effect
        duration = this.ui.playConvergeAnim(targetPixelPos, duration);

        CoreGame.TimedActionMgr.addAction(duration + 0.1, function () {
            self.remove();
        }.bind(this));
    },

    onFinishTurn: function () {
        // Process attachments first
        if (this.attachments && this.attachments.length > 0) {
            var dumpAttachments = this.attachments.slice();
            for (var i = 0; i < dumpAttachments.length; i++) {
                dumpAttachments[i].onFinishTurn();
            }
        }

        // Then process this element itself
        this.doActionsType(CoreGame.ElementObject.ACTION_TYPE.END_TURN, {});
    },

    /**
     * Drop element to new position
     */
    drop: function (targetRow, duration) {
        this.setState(CoreGame.ElementState.DROPPING);
        this.moveTo(targetRow, this.position.y, duration);
    },

    /**
     * Set element state
     */
    setState: function (state) {
        if(this.state == CoreGame.ElementState.REMOVING)
            return;
        this.state = state;
    },

    /**
     * Get current state
     */
    getState: function () {
        return this.state;
    },

    /**
     * Check if element is idle
     */
    isIdle: function () {
        return this.state === CoreGame.ElementState.IDLE;
    },

    /**
     * Check if element is background
     */
    isBackground: function () {
        return this.layerBehavior === CoreGame.LayerBehavior.BACKGROUND;
    },

    /**
     * Set remove action
     * @param {CoreGame.Strategies.NormalAction} action - The remove action
     */
    setRemoveAction: function (action) {
        this.addAction(CoreGame.ElementObject.ACTION_TYPE.REMOVE, action);
    },

    /**
     * Remove element from game
     */
    remove: function () {
       // cc.log("Remove Element === " + JSON.stringify(this.position) + " Name " + this.getTypeName());
        this.setState(CoreGame.ElementState.REMOVING);
        var boardUI = this.boardMgr ? this.boardMgr.boardUI : null;


        // Attachment cleanup
        if (this.holder) {
            this.holder.removeAttachment(this);
        }
        // Destroy my attachments?
        // Cloning list because destroy modifies the array
        var myAttachments = this.attachments.slice();
        for (var i = 0; i < myAttachments.length; i++) {
            myAttachments[i].remove();
        }

        if (this.ui) {
            this.ui.removeFromParent(true);
            this.ui = null;
        }

        // Remove from board
        // OVERLAY elements are attached to CONTENT elements, not in GridSlot.listElement
        // So we only call removeElementFromBoard for non-OVERLAY elements
        if (this.boardMgr) {
            if (this.layerBehavior !== CoreGame.LayerBehavior.OVERLAY) {
                this.boardMgr.removeElementFromBoard(this);
            }
        }

        //Update targetElements
        this.boardMgr.removedElement(this);

        if (this.isConnectedUI && boardUI) {
            boardUI.refreshBorders();
        }
        this.doActionsType(CoreGame.ElementObject.ACTION_TYPE.REMOVE);
        this.boardMgr.setRefillRequired(true);
    },

    /**
     * Get element type name (for subclass identification)
     */
    getTypeName: function () {
        return 'element';
    },

    /**
     * Create ui (visual representation) - Template Method
     */
    createUI: function (parent) {
        this.ui = this.createUIInstance();
        if (this.ui) {
            if (this.boardMgr) {
                // Use centralized positioning logic including size offset
                this.updateVisualPosition();
                this.initSubUI();
            }

            // Determine parent for OVERLAY elements
            if (this.layerBehavior === CoreGame.LayerBehavior.OVERLAY) {
                // Try to find CONTENT element in same slot
                if (this.boardMgr) {
                    var slot = this.boardMgr.getSlot(this.position.x, this.position.y);
                    if (slot) {
                        // Search for CONTENT element
                        for (var i = 0; i < slot.listElement.length; i++) {
                            var elem = slot.listElement[i];
                            if (elem.layerBehavior === CoreGame.LayerBehavior.CONTENT && elem.ui) {
                                // Use content element UI as parent
                                parent = elem.ui;
                                cc.log("OVERLAY element", this.getTypeName(), "attached to CONTENT", elem.getTypeName());
                                break;
                            }
                        }
                    }
                }
            }

            if (parent) {
                parent.addChild(this.ui, this.layerBehavior);
            }
        }
        this.updateVisual();
        return this.ui;
    },

    /**
     * Create specific ui instance - Factory Method
     * Override in subclasses
     */
    createUIInstance: function () {
        if (this.rawConfig && this.rawConfig.visual.path != "") {
            if (this.rawConfig.visual.type == 0) {
                cc.log("createUIInstance", JSON.stringify(this.rawConfig));
                return new CoreGame.SpriteElementUI(this, this.rawConfig.visual.path);
            }

            if (this.rawConfig.visual.type == 1)
                return new CoreGame.SpineElementUI(this, this.rawConfig.visual.path);

            if (this.rawConfig.visual.type == 2)
                return new CoreGame.CustomElementUI(this, this.rawConfig.visual.path);
        }
        return new CoreGame.ElementUI(this);
    },

    initSubUI: function () {
        if (this.ui) {
            var spawnRoot = UIUtils.seekWidgetByName(this.ui, "spawnRoot");
            if (spawnRoot && this.customData && this.customData.spawnElementType) {
                if (!spawnRoot.getChildByName("SpawnedElementUI")) {
                    var spawnType = this.customData.spawnElementType;
                    var tempElem = null;
                    if (CoreGame.ElementObject.map[spawnType]) {
                        tempElem = CoreGame.ElementObject.create(-1, -1, spawnType);
                    } else {
                        tempElem = CoreGame.BlockerFactory.createBlocker(-1, -1, spawnType);
                    }
                    if (tempElem) {
                        var spawnUI = tempElem.createUIInstance();
                        if (spawnUI) {
                            spawnUI.setName("SpawnedElementUI");
                            spawnRoot.addChild(spawnUI);
                        }
                    }
                }
            }
        }
        this.updateHPBar();
    },

    updateHPBar: function () {
        if (this.ui) {
            var hpBar = UIUtils.seekWidgetByName(this.ui, "hpBar");
            if (hpBar && hpBar instanceof ccui.LoadingBar) {
                this.configData.maxHP = Math.max(this.configData.maxHP || 1, this.hitPoints);
                var maxHP = this.configData.maxHP || 1;
                var percent = (this.hitPoints / maxHP) * 100;
                hpBar.setPercent(percent);
            }

            var hpLabel = UIUtils.seekWidgetByName(this.ui, "HPLabel");
            if (hpLabel) {
                hpLabel.setString(this.hitPoints);
            }
        }
    },
    /**
     * Update visual based on hit points
     */
    updateVisual: function () {
    },

    /**
     * Set ui (visual representation)
     */
    setUI: function (ui) {
        this.ui = ui;
    },

    /**
     * Update position from grid coordinates with size handling
     */
    updateVisualPosition: function () {
        if (!this.ui) return;

        // OVERLAY elements attached to CONTENT parent use relative positioning
        if (this.layerBehavior === CoreGame.LayerBehavior.OVERLAY) {
            // Check if UI parent is a content element (not BoardUI)
            var parent = this.ui.getParent();
            if (parent && parent !== this.boardMgr.boardUI) {
                // Relative position - center on parent
                this.ui.setPosition(0, 0);
                return;
            }
        }

        // Standard absolute positioning for all other cases
        if (this.boardMgr) {
            var pixelPos = this.boardMgr.gridToPixel(this.position.x, this.position.y);

            // Adjust for size (centering for multi-slot elements)
            if (this.size && (this.size.width > 1 || this.size.height > 1)) {
                // gridToPixel returns center of top-left cell (row, col)
                // We need to shift to center of the block
                // For 2x2: shift by +0.5 width, +0.5 height in grid units
                // pixel offset = (size - 1) * CELL_SIZE / 2
                var offsetX = (this.size.width - 1) * CoreGame.Config.CELL_SIZE / 2;
                var offsetY = (this.size.height - 1) * CoreGame.Config.CELL_SIZE / 2;

                pixelPos.x += offsetX;
                pixelPos.y += offsetY;
            }

            this.ui.setPosition(pixelPos);
        }
    },

    hasAction: function (type) {
        // First check if any attachment blocks this action
        // if (this.isStopAction(type)) {
        //     return false;
        // }

        switch (type) {
            case CoreGame.ElementObject.Action.SWAP:
                return this.state != CoreGame.ElementState.MOVING && this.haveBaseAction[type];
            case CoreGame.ElementObject.Action.MATCH:
                return this.haveBaseAction[type];
            case CoreGame.ElementObject.Action.ACTIVE:
                return this.haveBaseAction[type];
            case CoreGame.ElementObject.Action.DROP:
                return this.haveBaseAction[type];
            default:
                return false;
        }
    },

    isStopAction: function (type) {
        // Check if this element blocks the action
        if (this.blockBaseAction[type]) {
            return true;
        }

        // // Check if any attachment blocks the action
        // if (this.attachments) {
        //     for (var i = 0; i < this.attachments.length; i++) {
        //         if (this.attachments[i].blockBaseAction && this.attachments[i].blockBaseAction[type]) {
        //             return true;
        //         }
        //     }
        // }

        return false;
    },

    isStopActionByAttachment: function (type) {
        if (this.attachments) {
            for (var i = 0; i < this.attachments.length; i++) {
                if (this.attachments[i].blockBaseAction && this.attachments[i].blockBaseAction[type]) {
                    return true;
                }
            }
        }

        return false;
    },

    /**
     * Attachment System Methods
     */
    addAttachment: function (element) {
        if (!element) return;
        if (this.attachments.indexOf(element) === -1) {
            this.attachments.push(element);
            element.holder = this;

            // Visual attachment
            if (this.ui && element.ui) {
                // Remove from boardUI (or previous parent) and add to this ui
                element.ui.removeFromParent(false);
                this.ui.addChild(element.ui);
                element.ui.setPosition(0, 0); // Center on holder
            }
        }
    },

    removeAttachment: function (element) {
        var index = this.attachments.indexOf(element);
        if (index !== -1) {
            this.attachments.splice(index, 1);
            element.holder = null;
        }
    },

    getAttachments: function () {
        return this.attachments;
    },
    /**
     * Get list of grid cells occupied by this element
     * Default: Rectangular area based on position and size
     * @returns {Array} List of {x: row, y: col} objects
     */
    getGridCells: function () {
        var cells = [];
        var spanX = this.size.width || 1;
        var spanY = this.size.height || 1;

        for (var r = 0; r < spanY; r++) {
            for (var c = 0; c < spanX; c++) {
                cells.push({ x: this.position.x + r, y: this.position.y + c });
            }
        }
        return cells;
    },

    /**
     * Calculate scale to fit element within target dimensions
     * @param {number} targetWidth - Target container width
     * @param {number} targetHeight - Target container height
     * @param {number} padding - Optional padding factor (0-1), default 0.8
     * @returns {number} Scale value to fit element in target size
     */
    getScaleToFit: function (targetWidth, targetHeight, padding) {
        padding = padding !== undefined ? padding : 0.8;

        var elementWidth = (this.size ? this.size.width : 1) * CoreGame.Config.CELL_SIZE;
        var elementHeight = (this.size ? this.size.height : 1) * CoreGame.Config.CELL_SIZE;

        var scaleX = targetWidth / elementWidth;
        var scaleY = targetHeight / elementHeight;

        if (this.layerBehavior == CoreGame.LayerBehavior.OVERLAY || this.layerBehavior == CoreGame.LayerBehavior.BACKGROUND) {
            // For overlay elements, we want to ensure they don't exceed the target size even after scaling
            // So we take the smaller scale and apply padding to it
            if (this.ui && this.ui.sprBg) {
                this.ui.sprBg.setScale(0.8);
            }
        }

        return Math.min(scaleX, scaleY) * padding;
    }
});

CoreGame.ElementObject.Action = {
    SWAP: 0,
    MATCH: 1,
    ACTIVE: 2,
    DROP: 3
}

CoreGame.ElementObject.ACTION_TYPE = {
    SPAWN: "spawn",
    MATCH: "match",
    SIDE_MATCH: "sideMatch",
    END_TURN: "endTurn",
    REMOVE: "remove",
    CUSTOM_ACTION_0: "action_0",
    CUSTOM_ACTION_1: "action_1",
    CUSTOM_ACTION_2: "action_2",
    CUSTOM_ACTION_3: "action_3",
}

CoreGame.ElementObject.map = {}

CoreGame.ElementObject.register = function (type, cls) {
    CoreGame.ElementObject.map[type] = cls;
}

/**
 * Factory method to create element by type
 * @param {number} row - Grid row
 * @param {number} col - Grid column
 * @param {number} type - Element type
 * @param {...*} args - Additional arguments (e.g., hitPoints for Blocker)
 * @returns {CoreGame.ElementObject} Created element instance
 */
CoreGame.ElementObject.create = function (row, col, type) {
    // cc.log("Create Type ====== " + type);
    if (CoreGame.ElementObject.map[type]) {
        //cc.log("Have type ====== " + type);
        var element = new CoreGame.ElementObject.map[type]();

        // Forward all arguments to init (including extra params like hitPoints)
        // Convert arguments to array and slice off first 3 (row, col, type already handled)
        var initArgs = Array.prototype.slice.call(arguments);
        if (type == 900) {
            cc.log("ARGUMENTS " + JSON.stringify(initArgs));
        }
        return element.init.apply(element, initArgs);
    }
    return null;
}