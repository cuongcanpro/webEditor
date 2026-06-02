/**
 * ElementSelectorUI - Scrollable element selector for map editor
 * Displays gems and blockers in a grid layout (6 items per row)
 */
var ElementSelectorUI = cc.Node.extend({
    scrollView: null,
    container: null,

    selectedType: null,
    onSelectCallback: null,

    // Layout config
    ITEMS_PER_ROW: 6,
    ITEM_WIDTH: 60,
    ITEM_HEIGHT: 60,
    ITEM_PADDING: 5,

    /**
     * Constructor
     * @param {cc.Size} size - Size of the scroll view
     * @param {Function} onSelectCallback - Callback when element is selected
     */
    ctor: function (size, onSelectCallback) {
        this._super();
        this.elements = [];        // Combined list of {type: number, name: string, isGem: boolean}
        this.onSelectCallback = onSelectCallback;
        this.setContentSize(size);

        // Dynamically calculate items per row based on container width
        this.ITEMS_PER_ROW = Math.max(1, Math.floor((size.width - this.ITEM_PADDING) / (this.ITEM_WIDTH + this.ITEM_PADDING)));

        this.initScrollView(size);
        this.setupMouseWheel();
        this.loadElements();
    },

    /**
     * Enable mouse wheel scrolling for the scroll view (web/desktop).
     * ccui.ScrollView only handles touch drag, so we manually move the inner
     * container on wheel events — but only while the cursor is over the list,
     * so we don't hijack scrolling elsewhere on screen.
     */
    setupMouseWheel: function () {
        var self = this;
        // Pixels scrolled per wheel notch. Browser wheelDelta is usually ±120,
        // so 0.5 ≈ one item row per notch. Flip the sign of SPEED if it feels reversed.
        var SPEED = -0.5;

        var listener = cc.EventListener.create({
            event: cc.EventListener.MOUSE,
            onMouseScroll: function (event) {
                if (!self.scrollView) return;

                // Is the cursor over the scroll view? (work in scrollView node space)
                var loc = event.getLocation();
                var p = self.scrollView.convertToNodeSpace(loc);
                var s = self.scrollView.getContentSize();
                if (p.x < 0 || p.x > s.width || p.y < 0 || p.y > s.height) return;

                var inner = self.scrollView.getInnerContainer();
                var innerH = inner.getContentSize().height;
                var viewH = s.height;
                if (innerH <= viewH) return; // nothing to scroll

                // Inner container (anchor bottom-left): y ranges from (viewH-innerH)
                // [top of content visible] to 0 [bottom of content visible].
                var minY = viewH - innerH;
                var maxY = 0;
                var newY = inner.getPositionY() + event.getScrollY() * SPEED;
                if (newY < minY) newY = minY;
                if (newY > maxY) newY = maxY;
                inner.setPositionY(newY);
            }
        });
        // Scene-graph priority: auto-removed when this node is cleaned up.
        cc.eventManager.addListener(listener, this);
        this._mouseListener = listener;
    },

    /**
     * Initialize scroll view container
     */
    initScrollView: function (size) {
        // Create scroll view filling the full panel.
        this.scrollView = new ccui.ScrollView();
        this.scrollView.setDirection(ccui.ScrollView.DIR_VERTICAL);
        this.scrollView.setContentSize(cc.size(size.width, size.height));
        this.scrollView.setAnchorPoint(cc.p(0, 0));
        this.scrollView.setPosition(0, 0);
        this.scrollView.setBounceEnabled(true);
        this.addChild(this.scrollView);

        // Create inner container
        this.container = new ccui.Layout();
        this.container.setContentSize(size.width, 100); // Will be updated
        this.scrollView.addChild(this.container);
    },

    /**
     * Load all elements (gems + blockers)
     */
    loadElements: function () {
        var self = this;

        // Add gems first (type 1 to NUM_COLORS, default 6)
        // Scan CoreGame.ElementObject.map for all registered element types.
        // Gems: typeId 1-7 (GemObject). PowerUps: subclass of CoreGame.PowerUP.
        // Other registered types: code-defined blockers (TrafficLight, Grass, etc.)
        var GEM_MAX = 7; // typeIds 1..7 are gem colors (7 = Gem Random)
        var gemIds = [];
        var powerIds = [];
        var blockerIds = [];

        // Readable per-type names for power-ups (PowerUP.getTypeName() returns a
        // generic 'powerup' for all of them, so every entry looked identical).
        var PU_NAMES = {};
        // Power-up type ids to hide from the palette: MATCH_L is the SAME class
        // (BombPU) and produces the exact same bomb as MATCH_T — a pure
        // duplicate when placing a pre-made power-up, so we only list one.
        var PU_HIDE = {};
        if (CoreGame.PowerUPType) {
            PU_NAMES[CoreGame.PowerUPType.MATCH_4_H]   = "Rocket H"; // horizontal rocket
            PU_NAMES[CoreGame.PowerUPType.MATCH_4_V]   = "Rocket V"; // vertical rocket
            PU_NAMES[CoreGame.PowerUPType.MATCH_SQUARE] = "Plane";
            PU_NAMES[CoreGame.PowerUPType.MATCH_5]     = "Rainbow";
            PU_NAMES[CoreGame.PowerUPType.MATCH_T]     = "Bomb";
            PU_HIDE[CoreGame.PowerUPType.MATCH_L]      = true;
        }

        for (var typeId in CoreGame.ElementObject.map) {
            if (!CoreGame.ElementObject.map.hasOwnProperty(typeId)) continue;
            var id = parseInt(typeId, 10);
            var Cls = CoreGame.ElementObject.map[typeId];

            if (id >= 1 && id <= GEM_MAX) {
                gemIds.push(id);
            } else if (CoreGame.PowerUP && Cls.prototype instanceof CoreGame.PowerUP) {
                if (!PU_HIDE[id]) powerIds.push(id);
            } else {
                blockerIds.push(id);
            }
        }

        // Sort for stable display order
        gemIds.sort(function (a, b) { return a - b; });
        powerIds.sort(function (a, b) { return a - b; });
        blockerIds.sort(function (a, b) { return a - b; });

        // Helper: get display name from class prototype
        var getDisplayName = function (id) {
            var Cls = CoreGame.ElementObject.map[id];
            if (Cls && Cls.prototype && typeof Cls.prototype.getTypeName === 'function') {
                return Cls.prototype.getTypeName();
            }
            return 'type_' + id;
        };

        // Add gems
        for (var g = 0; g < gemIds.length; g++) {
            var gId = gemIds[g];
            this.elements.push({
                type: gId,
                name: gId === GEM_MAX ? 'Gem Rand' : 'Gem ' + gId,
                isGem: true
            });
        }
        // Add power-ups (readable names; falls back to generic if unmapped)
        for (var p = 0; p < powerIds.length; p++) {
            this.elements.push({
                type: powerIds[p],
                name: PU_NAMES[powerIds[p]] || getDisplayName(powerIds[p]),
                isPowerUp: true
            });
        }

        // Add code-defined blockers
        for (var b = 0; b < blockerIds.length; b++) {
            this.elements.push({
                type: blockerIds[b],
                name: getDisplayName(blockerIds[b]),
                isGem: false
            });
        }

        // Load blockers from mapID.json
        cc.loader.loadJson("res/newBlock/mapID.json", function (err, data) {
            if (err) {
                cc.log("Error loading mapID.json:", err);
                self.populateGrid();
                return;
            }

            // Add all blockers
            for (var name in data) {
                self.elements.push({
                    type: data[name],
                    name: name,
                    isGem: false
                });
            }

            // cc.log("Loaded " + self.elements.length + " total elements (" + numColors + " gems + " + (self.elements.length - numColors) + " blockers)");

            // Populate the grid
            self.populateGrid();
        });
    },

    /**
     * Populate grid with element buttons (6 per row)
     */
    populateGrid: function () {
        this.container.removeAllChildren();

        var visible = this.elements;

        var numRows = Math.ceil(visible.length / this.ITEMS_PER_ROW);
        var containerHeight = numRows * (this.ITEM_HEIGHT + this.ITEM_PADDING) + this.ITEM_PADDING;

        this.container.setContentSize(this.scrollView.getContentSize().width, containerHeight);
        this.scrollView.setInnerContainerSize(cc.size(this.scrollView.getContentSize().width, containerHeight));

        // Create buttons in grid layout
        for (var i = 0; i < visible.length; i++) {
            var element = visible[i];
            var row = Math.floor(i / this.ITEMS_PER_ROW);
            var col = i % this.ITEMS_PER_ROW;

            var btn = this.createElementButton(element, row, col);
            this.container.addChild(btn);
        }
    },

    /**
     * Create a single element button
     */
    createElementButton: function (element, row, col) {
        var self = this;

        var btn = new ccui.Button();
        btn.loadTextureNormal("res/tool/res/bgCell.png");
        btn.setScale9Enabled(true);
        btn.setContentSize(this.ITEM_WIDTH, this.ITEM_HEIGHT);

        // Position (top-left origin in container, invert Y)
        var x = col * (this.ITEM_WIDTH + this.ITEM_PADDING) + this.ITEM_PADDING + this.ITEM_WIDTH / 2;
        var y = this.container.getContentSize().height - (row * (this.ITEM_HEIGHT + this.ITEM_PADDING) + this.ITEM_PADDING + this.ITEM_HEIGHT / 2);
        btn.setPosition(x, y);

        // Compute display name (the label node itself is created below, on top of the item)
        var displayName = element.name;
        if (displayName.length > 8) {
            displayName = displayName.substring(0, 7) + "..";
        }

        // Visual indicator for gem vs blocker. Remember the base color so the
        // selection highlight can be reverted on deselect.
        btn._baseColor = element.isGem
            ? cc.color(200, 255, 200)   // Light green for gems
            : cc.color(255, 220, 200);  // Light orange for blockers
        btn.setColor(btn._baseColor);


        // Store element data
        btn.elementType = element.type;
        btn.elementName = element.name;

        // Add click handler
        btn.addTouchEventListener(function (sender, type) {
            if (type === ccui.Widget.TOUCH_ENDED) {
                self.selectElement(sender.elementType, sender.elementName);
            }
        });

        // add blocker
        var elementObject;
        if (CoreGame.ElementObject.map[element.type]) {
            // Use standard creation for registered types
            elementObject = CoreGame.ElementObject.create(row, col, element.type, 1);
        } else {
            // Fallback to BlockerFactory for unregistered types (JSON-based blockers)
            elementObject = CoreGame.BlockerFactory.createBlocker(row, col, element.type, 1);
        }
        
        elementObject.createUI(btn);
        elementObject.ui.setPosition(btn.getContentSize().width / 2, btn.getContentSize().height / 2);


        // Scale elementObject.ui to fit with btn
        var scale = elementObject.getScaleToFit(btn.getContentSize().width, btn.getContentSize().height);
        elementObject.ui.setScale(scale);

        // Name label: rendered ON TOP of the item (high z-order) and anchored to the
        // bottom edge of the cell instead of being vertically centered.
        var nameLabel = new ccui.Text(displayName, "font/BalooPaaji2-Regular.ttf", 14);
        nameLabel.enableOutline(cc.color(0, 0, 0, 255), 2);
        nameLabel.setAnchorPoint(0.5, 0);
        nameLabel.setPosition(btn.getContentSize().width / 2, 2);
        // z-order above any item layer (LayerBehavior tops out at ATTACHMENT=30)
        btn.addChild(nameLabel, 1000);

        return btn;
    },

    /**
     * Handle element selection
     */
    selectElement: function (type, name) {
        this.selectedType = type;

        // Update visual state of all buttons
        var buttons = this.container.getChildren();
        for (var i = 0; i < buttons.length; i++) {
            var btn = buttons[i];
            if (btn.elementType === type) {
                btn.setColor(ElementSelectorUI.SELECTED_COLOR); // highlight selected
            } else {
                btn.setColor(btn._baseColor); // revert to base tint
            }
        }

        cc.log("Selected element:", name, "Type:", type);

        // Trigger callback
        if (this.onSelectCallback) {
            this.onSelectCallback(type, name);
        }
    },

    /**
     * Clear selection
     */
    clearSelection: function () {
        this.selectedType = null;

        // Reset all buttons to normal state
        var buttons = this.container.getChildren();
        for (var i = 0; i < buttons.length; i++) {
            buttons[i].setColor(buttons[i]._baseColor);
        }

        cc.log("Cleared element selection");
    },

    /**
     * Reload the element list and refresh the grid
     * Clears current selection and reloads all elements from scratch
     */
    reload: function () {
        this.elements = [];
        this.selectedType = null;
        this.clearSelection();
        this.loadElements();
        cc.log("[ElementSelectorUI] Reloaded element list");
    },

    /**
     * Get currently selected type
     */
    getSelectedType: function () {
        return this.selectedType;
    }
});

// Highlight tint applied to the currently selected element cell.
ElementSelectorUI.SELECTED_COLOR = cc.color(100, 255, 100); // bright green
