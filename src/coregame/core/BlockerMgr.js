/**
 * BlockerMgr - Manages complex blocker logic (spreading, movement, etc.)
 * Decouples blocker-specific logic from BoardMgr
 * Part of Match-3 Core Game
 */
var CoreGame = CoreGame || {};

CoreGame.BlockerMgr = cc.Class.extend({
    boardMgr: null,
    cloudExplodedThisTurn: false,

    ctor: function (boardMgr) {
        this.boardMgr = boardMgr;
        this.cloudExplodedThisTurn = false;
        this.initEventListeners();
    },

    /**
     * Listen for events that affect blocker logic
     */
    initEventListeners: function () {
        var self = this;
        CoreGame.EventMgr.on('elementMatched', function (element) {
            if (element instanceof CoreGame.Cloud) {
                self.setCloudExploded(true);
            }
        }, this);
    },

    /**
     * Handle turn-based blocker logic
     */
    onFinishTurn: function () {
        var context = {
            boardMgr: this.boardMgr,
            cloudExploded: this.cloudExplodedThisTurn
        };

        var removedElementTypes = this.boardMgr.removedElementTypes;


        // 1. Group all elements by type to handle collective logic
        var elementsByType = this.getElementsGroupedByType();

        // 2. Dispatch turn logic to each type handler
        for (var type in elementsByType) {
            var elements = elementsByType[type];
            var firstElement = elements[0];

            // If the element class has a static turn handler, call it
            // var cls = CoreGame.ElementObject.map[type];
            // if (cls && typeof cls.onTurnEnd === 'function') {
            //     if (removedElementTypes.indexOf(firstElement.type) === -1)
            //         cls.onTurnEnd(elements, context);
            // }

            if (removedElementTypes.indexOf(firstElement.type) === -1)
                firstElement.onFinishTurn(elements, context);
        }

        // Reset turn-based flags
        this.resetTurnFlags();
    },

    /**
     * Group board elements by their type
     */
    getElementsGroupedByType: function () {
        var groups = {};
        var rows = this.boardMgr.rows;
        var cols = this.boardMgr.cols;

        for (var r = 0; r < rows; r++) {
            for (var c = 0; c < cols; c++) {
                var slot = this.boardMgr.getSlot(r, c);
                if (slot) {
                    for (var i = 0; i < slot.listElement.length; i++) {
                        var el = slot.listElement[i];
                        if (!groups[el.type]) {
                            groups[el.type] = [];
                        }
                        groups[el.type].push(el);
                    }
                }
            }
        }
        return groups;
    },

    setCloudExploded: function (value) {
        this.cloudExplodedThisTurn = value;
    },

    resetTurnFlags: function () {
        this.cloudExplodedThisTurn = false;
    }
});
