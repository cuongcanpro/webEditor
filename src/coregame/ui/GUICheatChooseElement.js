/**
 * GUICheatChooseElement - UI for selecting an ElementObject to spawn in Cheat Mode
 */
var CoreGame = CoreGame || {};

CoreGame.GUICheatChooseElement = cc.LayerColor.extend({
    boardMgr: null,
    targetRow: -1,
    targetCol: -1,

    ctor: function (boardMgr) {
        this._super(cc.color(0, 0, 0, 200));
        this.boardMgr = boardMgr;
        var self = this;

        // Block touches underneath
        cc.eventManager.addListener({
            event: cc.EventListener.TOUCH_ONE_BY_ONE,
            swallowTouches: true,
            onTouchBegan: function () {
                if (!self.isVisible())
                    return false;
                return true;
            }
        }, this);

        this.initUI();
    },

    initUI: function () {
        var winSize = cc.winSize;

        // Close button
        var btnClose = new ccui.Button("res/tool/res/btn_red_2.png", "res/tool/res/btn_red_2.png");
        btnClose.setScale9Enabled(true);
        btnClose.setContentSize(cc.size(100, 50));
        btnClose.setTitleText("Close");
        btnClose.setTitleFontSize(24);
        btnClose.setPosition(winSize.width - 80, winSize.height - 50);
        btnClose.addClickEventListener(this.hide.bind(this));
        this.addChild(btnClose);

        var title = new cc.LabelTTF("Choose Element to Spawn", "Arial", 30);
        title.setPosition(winSize.width / 2, winSize.height - 50);
        this.addChild(title);

        // Scroll view for elements
        var scrollView = new ccui.ScrollView();
        scrollView.setDirection(ccui.ScrollView.DIR_VERTICAL);
        scrollView.setTouchEnabled(true);
        scrollView.setBounceEnabled(true);
        scrollView.setContentSize(cc.size(winSize.width * 0.8, winSize.height * 0.7));
        scrollView.setPosition(winSize.width * 0.1, winSize.height * 0.1);
        this.addChild(scrollView);

        var types = this.getAvailableTypes();

        var cols = 6;
        var padding = 15;
        var btnWidth = 90;
        var btnHeight = 90;

        var rows = Math.ceil(types.length / cols);
        var innerHeight = rows * (btnHeight + padding) + padding;
        if (innerHeight < scrollView.getContentSize().height) {
            innerHeight = scrollView.getContentSize().height;
        }
        scrollView.setInnerContainerSize(cc.size(scrollView.getContentSize().width, innerHeight));

        var startX = padding + btnWidth / 2;
        var startY = innerHeight - padding - btnHeight / 2;

        for (var i = 0; i < types.length; i++) {
            var typeId = types[i];
            var r = Math.floor(i / cols);
            var c = i % cols;

            var btn = new ccui.Button("res/tool/res/bgCell.png", "res/tool/res/bgCell.png");
            btn.setScale9Enabled(true);
            btn.setContentSize(cc.size(btnWidth, btnHeight));
            btn.setPosition(startX + c * (btnWidth + padding), startY - r * (btnHeight + padding));

            (function (id, button) {
                button.addClickEventListener(function () {
                    this.onChooseElement(id);
                }.bind(this));

                // Add element visual
                var elementObject = null;
                if (CoreGame.ElementObject.map[id]) {
                    elementObject = CoreGame.ElementObject.create(0, 0, id);
                } else if (CoreGame.BlockerFactory && CoreGame.BlockerFactory.createBlocker) {
                    elementObject = CoreGame.BlockerFactory.createBlocker(0, 0, id, 1);
                }

                if (elementObject) {
                    elementObject.createUI(button);
                    elementObject.ui.setPosition(btnWidth / 2, btnHeight / 2);
                    var scale = elementObject.getScaleToFit(btnWidth * 0.8, btnHeight * 0.8);
                    elementObject.ui.setScale(scale);

                    // Optional: Small label for ID
                    var lbId = new cc.LabelTTF(id.toString(), "Arial", 12);
                    lbId.setPosition(btnWidth / 2, 10);
                    lbId.setOpacity(150);
                    button.addChild(lbId);
                } else {
                    button.setTitleText(id.toString());
                    button.setTitleFontSize(20);
                }
            }.bind(this))(typeId, btn);

            scrollView.addChild(btn);
        }
    },

    getAvailableTypes: function () {
        var types = [];
        var gemIds = [];
        var powerIds = [];
        var blockerIds = [];

        var GEM_MAX = 7;

        // Scan CoreGame.ElementObject.map
        if (CoreGame.ElementObject && CoreGame.ElementObject.map) {
            for (var typeId in CoreGame.ElementObject.map) {
                var id = parseInt(typeId, 10);
                var Cls = CoreGame.ElementObject.map[typeId];
                if (id >= 1 && id <= GEM_MAX) {
                    if (gemIds.indexOf(id) === -1) gemIds.push(id);
                } else if (CoreGame.PowerUP && Cls.prototype instanceof CoreGame.PowerUP) {
                    if (powerIds.indexOf(id) === -1) powerIds.push(id);
                } else {
                    if (blockerIds.indexOf(id) === -1) blockerIds.push(id);
                }
            }
        }

        // BlockerFactory mapID
        if (CoreGame.BlockerFactory && CoreGame.BlockerFactory._mapIdData) {
            for (var key in CoreGame.BlockerFactory._mapIdData) {
                var id = CoreGame.BlockerFactory._mapIdData[key];
                if (typeof id === 'number' && !isNaN(id)) {
                    if (blockerIds.indexOf(id) === -1 && gemIds.indexOf(id) === -1 && powerIds.indexOf(id) === -1) {
                        blockerIds.push(id);
                    }
                }
            }
        }

        // Hardcoded fallbacks for common PowerUps if not detected
        [101, 102, 103, 104, 105, 106].forEach(function (id) {
            if (powerIds.indexOf(id) === -1) powerIds.push(id);
        });

        // Ensure Gems 1-7 are always present
        for (var i = 1; i <= 7; i++) {
            if (gemIds.indexOf(i) === -1) gemIds.push(i);
        }

        gemIds.sort(function (a, b) { return a - b; });
        powerIds.sort(function (a, b) { return a - b; });
        blockerIds.sort(function (a, b) { return a - b; });

        return gemIds.concat(powerIds).concat(blockerIds);
    },

    show: function (gridPos) {
        this.targetRow = gridPos.x;
        this.targetCol = gridPos.y;
        this.setVisible(true);
    },

    hide: function () {
        this.setVisible(false);
    },

    onChooseElement: function (typeId) {
        if (this.targetRow < 0 || this.targetCol < 0) {
            this.hide();
            return;
        }

        var row = this.targetRow;
        var col = this.targetCol;

        var tempElem = null;
        if (CoreGame.ElementObject.map[typeId]) {
            tempElem = CoreGame.ElementObject.create(row, col, typeId);
        } else {
            tempElem = CoreGame.BlockerFactory.createBlocker(row, col, typeId, 1);
        }

        if (!tempElem) {
            cc.log("Could not create element for typeId:", typeId);
            return;
        }

        var w = tempElem.size ? tempElem.size.width : 1;
        var h = tempElem.size ? tempElem.size.height : 1;

        // Check bounds (doesn't spill out)
        if (row + h - 1 >= this.boardMgr.rows || col + w - 1 >= this.boardMgr.cols) {
            cc.log("Element spills out of board bounds. Cannot place.");
            if (fr && fr.Sound) fr.Sound.playSoundEffect(resSound.error);
            if (tempElem.ui) tempElem.ui.removeFromParent();
            return;
        }

        // Remove overlapping elements of same layer behavior
        var cells = tempElem.getGridCells();
        var elementsToRemove = [];
        for (var i = 0; i < cells.length; i++) {
            var slot = this.boardMgr.getSlot(cells[i].x, cells[i].y);
            if (slot) {
                if (tempElem.layerBehavior === CoreGame.LayerBehavior.CONTENT ||
                    tempElem.layerBehavior === CoreGame.LayerBehavior.EXCLUSIVE) {
                    for (var j = 0; j < slot.listElement.length; j++) {
                        var el = slot.listElement[j];
                        if (el.layerBehavior === tempElem.layerBehavior && elementsToRemove.indexOf(el) === -1) {
                            elementsToRemove.push(el);
                        }
                    }
                }
            }
        }

        for (var i = 0; i < elementsToRemove.length; i++) {
            elementsToRemove[i].remove();
        }

        // Add to board
        this.boardMgr.addElement(tempElem, row, col);

        if (tempElem.updateVisualByActions) {
            tempElem.updateVisualByActions();
        }
        if (tempElem.ui && tempElem.ui.setVisibleLbState) {
            tempElem.ui.setVisibleLbState(true);
        }

        this.hide();
    }
});
