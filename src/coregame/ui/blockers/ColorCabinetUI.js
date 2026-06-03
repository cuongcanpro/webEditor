/**
 * ColorCabinetUI — visual for the 2x2 ColorCabinet (18000).
 * Frame sprite (18000.png) is loaded by the base ElementUI.initSprite.
 * On top we lay out the four bottles using one of four pre-colored bottle
 * PNGs (carbinet_color_<color>.png) chosen by the gem color that breaks each
 * bottle — no more setColor tint on a single white sprite. Gem color map
 * (see PinwheelUI): 1=green, 2=yellow, 3=red, 4=blue. Any color outside those
 * four (5=pink, 6=orange) falls back to carbinet_color_na.png.
 * Quadrants: TL=1, TR=2, BL=3, BR=4.
 */
var CoreGame = CoreGame || {};

CoreGame.ColorCabinetUI = CoreGame.ElementUI.extend({
    _cells: null, // slot index (0..3) -> bottle sprite node

    // Pre-colored bottle art per gem color. Colors without a dedicated PNG
    // (5=pink, 6=orange, or anything unexpected) use the NA fallback below.
    BOTTLE_TEXTURES: {
        1: "carbinet_color_green.png",
        2: "carbinet_color_yellow.png",
        3: "carbinet_color_red.png",
        4: "carbinet_color_blue.png"
    },
    BOTTLE_TEXTURE_NA: "carbinet_color_na.png",

    /** Filename of the bottle art for a gem color (NA fallback off-palette). */
    _bottleTextureName: function (color) {
        return this.BOTTLE_TEXTURES[color] || this.BOTTLE_TEXTURE_NA;
    },

    ctor: function (element) {
        this._super(element);
        this._cells = {};
        this._buildCells();
        return true;
    },

    _buildCells: function () {
        var cell = CoreGame.Config.CELL_SIZE;
        var half = cell * 0.5;
        // slot index -> quadrant offset: 0=TL, 1=TR, 2=BL, 3=BR (+y is up in Cocos).
        var layout = [
            { x: -half, y: half },
            { x: half, y: half },
            { x: -half, y: -half },
            { x: half, y: -half }
        ];
        // Each slot's color comes from the level palette (may repeat across slots).
        var slotColors = this.element.getSlotColors();
        for (var i = 0; i < 4; i++) {
            // fr.createSprite (not gv.getSprite) so each quadrant is its OWN
            // sprite instance. The four bottles can use different pre-colored
            // textures depending on the slot color, so they can't share a pooled
            // instance. Pick the per-color art (NA fallback for off-palette).
            var fileName = this._bottleTextureName(slotColors[i]);
            var filePath = "res/modules/game/element/" + fileName;
            var spr = fr.createSprite(fileName, filePath);
            spr.setAnchorPoint(0.5, 0.5);
            spr.setPosition(layout[i].x, layout[i].y);
            this.addChild(spr, 1);
            this._cells[i] = spr;
            // Each bottle occupies one quadrant of the 2x2 (~one cell). Fit the
            // WHOLE bottle inside a 0.7-cell box (its larger dimension), so the
            // tall bottle art doesn't overflow into the neighbouring quadrant.
            // The png isn't preloaded, so on web getContentSize() may still be 0
            // here (texture loading async) — apply now if ready, else on load.
            this._fitToQuadrant(spr, cell * 0.7);
        }
    },

    /**
     * Scale a bottle sprite so its LARGER dimension == target (fits the whole
     * bottle in a target x target box — important because the bottle art is
     * taller than wide). Handles the web case where the texture hasn't loaded
     * yet (contentSize 0) by deferring to the texture 'load' event.
     */
    _fitToQuadrant: function (spr, target) {
        var apply = function () {
            if (!spr.getContentSize) return false;
            var sz = spr.getContentSize();
            var maxDim = Math.max(sz.width, sz.height);
            if (maxDim <= 0) return false;
            spr.setScale(target / maxDim);
            return true;
        };
        if (apply()) return;
        var tex = spr.getTexture && spr.getTexture();
        if (tex && tex.addEventListener) {
            tex.addEventListener("load", function () { apply(); }, spr);
        }
    },

    /**
     * Vị trí (toạ độ trong board, cùng hệ với plane đang bay) của chai một màu —
     * = vị trí node tủ + offset sprite chai đó. Dùng để PU Plane bay đúng vào chai
     * nó sẽ phá thay vì luôn bay vào tâm/góc tủ.
     */
    getBottlePosition: function (color) {
        var base = this.getPosition();
        // Map the color to a bottle slot (first one of that color), then its node.
        var slotColors = this.element.getSlotColors();
        for (var i = 0; i < 4; i++) {
            if (slotColors[i] === color && this._cells[i]) {
                var p = this._cells[i].getPosition();
                return cc.p(base.x + p.x, base.y + p.y);
            }
        }
        return base;
    },

    /** Break one bottle (by slot index): fade + scale out its gem sprite. */
    breakBottle: function (slotIndex) {
        var spr = this._cells[slotIndex];
        if (!spr) return;
        spr.stopAllActions();
        spr.runAction(cc.sequence(
            cc.spawn(cc.fadeOut(0.18), cc.scaleTo(0.18, 0.1)),
            cc.callFunc(function () { spr.setVisible(false); })
        ));
        if (typeof fr !== 'undefined' && fr.Sound && typeof resSound !== 'undefined' && resSound.block_milk_pantry_2) {
            fr.Sound.playSoundEffect(resSound.block_milk_pantry_2, false);
        }
    },

    /** Swap every (alive) bottle to the art for a new slot-color array. Editor use. */
    applyBottleColors: function (colors) {
        var cell = CoreGame.Config.CELL_SIZE;
        for (var i = 0; i < 4; i++) {
            var spr = this._cells[i];
            if (!spr) continue;
            var fileName = this._bottleTextureName(colors[i]);
            var filePath = "res/modules/game/element/" + fileName;
            fr.changeSprite(spr, fileName, filePath);
            // Texture (and thus contentSize) changed — re-fit to the quadrant.
            this._fitToQuadrant(spr, cell * 0.7);
        }
    },

    /** Wrong-color feedback: small horizontal shake of the whole cabinet. */
    shakeWrong: function () {
        this.stopActionByTag(7788);
        var a = cc.sequence(
            cc.moveBy(0.04, cc.p(4, 0)),
            cc.moveBy(0.04, cc.p(-8, 0)),
            cc.moveBy(0.04, cc.p(8, 0)),
            cc.moveBy(0.04, cc.p(-4, 0))
        );
        a.setTag(7788);
        this.runAction(a);
    }
});
