/**
 * SpawnElementAction - Strategy to spawn elements
 * Part of Match-3 Core Game
 */
var CoreGame = CoreGame || {};
CoreGame.Strategies = CoreGame.Strategies || {};

CoreGame.Strategies.SpawnElementAction = CoreGame.Strategies.NormalAction.extend({
    /**
     * Constructor
     * @param {number} type - The type of element to spawn
     * @param {number} row - The row position/offset
     * @param {number} col - The col position/offset
     */
    ctor: function (type, row, col) {
        this._super();
        this.type = type;
        this.row = row;
        this.col = col;
    },

    /**
     * Execute action
     * @param {ElementObject} element - The element instance
     * @param {Object} context - Context data for execution
     */
    execute: function (element, context, time) {
        this._super(element, context);
        // Spawn logic to be implemented
        cc.log("SpawnElementAction execute" + this.row + " " + this.col + " " + this.type);
        var newElement = element.boardMgr.addNewElement(this.row, this.col, this.type);
    }

});


CoreGame.Strategies.AroundSpawnElementAction = CoreGame.Strategies.NormalAction.extend({
    configData: {
        type: 0
    },

    ctor: function () {
        this._super();
    },

    /**
     * Check if condition is met
     * @param {ElementObject} element - The element instance
     * @param {Object} context - Context data for evaluation
     * @returns {boolean} true if condition is met
     */
    checkCondition: function (element, context) {
        if (element.cooldownSpawn <= 0)
            return true;
        return false;
    },

    /**
     * Execute action
     * @param {ElementObject} element - The element instance
     * @param {Object} context - Context data for execution
     */
    /**
     * Execute action - spawn elements under and around the parent element
     * @param {ElementObject} element - The element instance
     * @param {Object} context - Context data for execution
     */
    execute: function (element, context) {
        cc.log("Execute Spawn Element Around");
        this._super(element, context);

        var r = element.position.x;
        var c = element.position.y;
        this.boardMgr = element.boardMgr;

        // Get element size (default to 1x1 if not specified)
        var width = element.size ? element.size.width : 1;
        var height = element.size ? element.size.height : 1;

        cc.log("Element size:", width, "x", height);

        // Spawn elements UNDER the parent element (level 2)
        // Cover area from (r, c) to (r + height - 1, c + width - 1)
        for (var i = 0; i < height; i++) {
            for (var j = 0; j < width; j++) {
                this.createElementAtSlot(r + i, c + j, 2);
            }
        }

        // Spawn elements AROUND the parent element (ring, level 1)
        // Top row: from (r - 1, c - 1) to (r - 1, c + width)
        // Bottom row: from (r + height, c - 1) to (r + height, c + width)
        for (var j = -1; j <= width; j++) {
            this.createElementAtSlot(r - 1, c + j, 1);          // Top ring
            this.createElementAtSlot(r + height, c + j, 1);     // Bottom ring
        }

        // Left and Right columns (excluding corners already covered)
        // Left col: from (r, c - 1) to (r + height - 1, c - 1)
        // Right col: from (r, c + width) to (r + height - 1, c + width)
        for (var i = 0; i < height; i++) {
            this.createElementAtSlot(r + i, c - 1, 1);          // Left ring
            this.createElementAtSlot(r + i, c + width, 1);      // Right ring
        }
    },

    /**
     * Create or upgrade element at specific slot
     * @param {number} row - Grid row
     * @param {number} col - Grid column
     * @param {number} level - Element level (hitPoints)
     */
    createElementAtSlot: function (row, col, level) {
        cc.log("Create Element At Slot", row, col, "level:", level);
        if (!this.boardMgr) return;

        var slot = this.boardMgr.getSlot(row, col);
        if (!slot) return;

        // Find existing element of same type in slot
        var existingElement = null;
        for (var i = 0; i < slot.listElement.length; i++) {
            if (slot.listElement[i].type === this.configData.type) {
                existingElement = slot.listElement[i];
                break;
            }
        }

        if (existingElement) {
            // Keep higher level, upgrade if lower
            if (existingElement.hitPoints >= level) return;
            existingElement.hitPoints = level;
            existingElement.updateVisual();
            cc.log("  Upgraded existing element to level", level);
            return;
        }

        // Create new element at this slot
        var newElement = this.boardMgr.addNewElement(row, col, this.configData.type, level);
        cc.log("  Created new element at level", level);
    }
});

CoreGame.Strategies.RandomSpawnElementAction = CoreGame.Strategies.NormalAction.extend({
    configData: {
        type: 0,
        numRandom: 3,
        range: 1000,
        priorityTarget: [] // List of element types to prioritize for spawning
    },

    ctor: function () {
        this._super();
    },
    /**
     * Check if condition is met
     * @param {ElementObject} element - The element instance
     * @param {Object} context - Context data for evaluation
     * @returns {boolean} true if condition is met
     */
    checkCondition: function (element, context) {
        // var boardMgr = element.boardMgr;
        // var removedElementTypes = boardMgr.removedElementTypes;
        // if (removedElementTypes.indexOf(this.configData.type) !== -1) return false;
        // return true;
        if (element.cooldownSpawn <= 0)
            return true;
        return false;
    },

    /**
     * Execute action
     * @param {ElementObject} element - The element instance
     * @param {Object} context - Context data for execution
     */
    execute: function (element, context, time) {
        cc.log("Execute Random Spawn Element Action");
        this._super(element, context);

        if (!element.boardMgr) return;

        var boardMgr = element.boardMgr;
        var numToSpawn = this.configData.numRandom || 3;
        var typeConfig = this.configData.type;
        if (!Array.isArray(typeConfig)) {
            typeConfig = [typeConfig];
        }

        var priorityTargets = this.configData.priorityTarget || [];
        if (!Array.isArray(priorityTargets)) {
            priorityTargets = [priorityTargets];
        }

        // Collect all valid slots
        var prioritySlots = [];
        var normalSlots = [];
        
        for (var r = 0; r < boardMgr.rows; r++) {
            for (var c = 0; c < boardMgr.cols; c++) {
                if (Math.abs(r - element.position.x) > this.configData.range || Math.abs(c - element.position.y) > this.configData.range)
                    continue;
                var slot = boardMgr.getSlot(r, c);
                if (!slot) continue;
                
                if (slot.isEmpty()) {
                    normalSlots.push({ row: r, col: c });
                } else {
                    var hasPriority = false;
                    var hasNormal = false;
                    
                    for (var i = 0; i < slot.listElement.length; i++) {
                        var elem = slot.listElement[i];
                        if (!elem.isIdle()) continue;

                        // Check for priority targets first
                        if (priorityTargets.length > 0 && priorityTargets.indexOf(elem.type) !== -1) {
                            hasPriority = true;
                            break;
                        }

                        // Normal valid targets: GEM or PowerUP (CONTENT layer)
                        if (elem instanceof CoreGame.GemObject || elem instanceof CoreGame.PowerUP) {
                            hasNormal = true;
                        }
                    }
                    
                    if (hasPriority) {
                        prioritySlots.push({ row: r, col: c });
                    } else if (hasNormal) {
                        normalSlots.push({ row: r, col: c });
                    }
                }
            }
        }

        // Combine slots based on priority
        var finalSlots = [];
        this.shuffleArray(prioritySlots, boardMgr.random);
        this.shuffleArray(normalSlots, boardMgr.random);
        
        finalSlots = prioritySlots.concat(normalSlots);

        if (finalSlots.length === 0) return;

        var numSpawned = Math.min(numToSpawn, finalSlots.length);
        var targetSlots = finalSlots.slice(0, numSpawned);

        var delayTime = Math.max(0, time - 0.05);

        CoreGame.TimedActionMgr.addAction(delayTime, function () {
            var endPointNode = null;
            if (element.ui) {
                endPointNode = UIUtils.seekWidgetByName(element.ui, "endPointSpawn");
            }

            if (endPointNode) {
                var boardUI = boardMgr.boardUI;
                var startWorldPos = UIUtils.getWorldPosition(endPointNode);
                var startPos = boardUI.root.convertToNodeSpace(startWorldPos);

                var lastFlyTime = 0;
                for (var i = 0; i < targetSlots.length; i++) {
                    (function (index) {
                        var pos = targetSlots[index];
                        var targetPixelPos = boardMgr.gridToPixel(pos.row, pos.col);
                        var currentTypeToSpawn = typeConfig[boardMgr.random.nextInt32Bound(typeConfig.length)];

                        var tempElem = null;
                        if (CoreGame.ElementObject.map[currentTypeToSpawn]) {
                            tempElem = CoreGame.ElementObject.create(-1, -1, currentTypeToSpawn);
                        } else {
                            tempElem = CoreGame.BlockerFactory.createBlocker(-1, -1, currentTypeToSpawn);
                        }

                        if (tempElem) {
                            var flyUI = tempElem.createUIInstance();
                            if (flyUI) {
                                boardUI.root.addChild(flyUI, 100);
                                flyUI.setPosition(startPos);
                                flyUI.rawScale = flyUI.getScale();

                                var flyTimeOrg = 0.6;
                                var flyTime = flyTimeOrg + index * 0.1;
                                var cp1 = cc.p(startPos.x + (targetPixelPos.x - startPos.x) * 0.25, startPos.y + 150);
                                var cp2 = cc.p(startPos.x + (targetPixelPos.x - startPos.x) * 0.5, startPos.y + 150);
                                var bezier = cc.bezierTo(flyTime, [cp1, cp2, targetPixelPos]).easing(
                                    cc.easeBezierAction(0, 0.1, 0.9, 1.0)
                                );
                                flyUI.runAction(cc.sequence(
                                    cc.spawn(
                                        bezier,
                                        cc.sequence(
                                            cc.scaleTo(
                                                flyTime * 0.5, flyUI.rawScale * 1.5 * (flyTime / flyTimeOrg)
                                            ).easing(cc.easeOut(2.5)),
                                            cc.scaleTo(flyTime * 0.5, flyUI.rawScale).easing(cc.easeIn(2.5))
                                        ),
                                        cc.rotateBy(flyTime, 360 * 3).easing(cc.easeIn(2.5))
                                    ),
                                    cc.scaleTo(0.1, 1.1 * flyUI.rawScale).easing(cc.easeOut(2.5)),
                                    cc.scaleTo(0.1, flyUI.rawScale).easing(cc.easeIn(2.5)),
                                    cc.callFunc(function () {
                                        this.removeFromParent(true);
                                    }.bind(flyUI))
                                ));

                                CoreGame.TimedActionMgr.addAction(flyTime, function () {
                                    boardMgr.addNewElement(pos.row, pos.col, currentTypeToSpawn);
                                }, this);
                            }
                        }
                    })(i);
                    lastFlyTime = 0.6 + i * 0.1;
                }

                // Check for available moves after all spawned elements land
                CoreGame.TimedActionMgr.addAction(lastFlyTime + 0.05, function () {
                    if (!boardMgr.gameEnded && boardMgr.hasPossibleMoves && !boardMgr.hasPossibleMoves()) {
                        cc.log("No possible moves after spawn! Shuffling board...");
                        boardMgr.shuffleBoard();
                    }
                });
            } else {
                // Fallback to immediate spawn if no emitter node found
                for (var i = 0; i < targetSlots.length; i++) {
                    var pos = targetSlots[i];
                    var currentTypeToSpawn = typeConfig[boardMgr.random.nextInt32Bound(typeConfig.length)];
                    var newElement = boardMgr.addNewElement(pos.row, pos.col, currentTypeToSpawn);
                }

                // Check for available moves after immediate spawn
                if (!boardMgr.gameEnded && boardMgr.hasPossibleMoves && !boardMgr.hasPossibleMoves()) {
                    cc.log("No possible moves after spawn! Shuffling board...");
                    boardMgr.shuffleBoard();
                }
            }
        }, this);
    },

    /**
     * Shuffle array in place (Fisher-Yates algorithm)
     * @param {Array} array - Array to shuffle
     */
    shuffleArray: function (array, random) {
        for (var i = array.length - 1; i > 0; i--) {
            var j = random.nextInt32Bound(i + 1);
            var temp = array[i];
            array[i] = array[j];
            array[j] = temp;
        }
    }
});
CoreGame.Strategies.RandomSpawnElementAction.executedOnTurnEnd = false;

