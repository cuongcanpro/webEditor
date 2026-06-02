/**
 * SpriteElementUI - Visual representation of game elements using a custom sprite path
 * Extends ElementUI to allow dynamic sprite image assignment
 */
var CoreGame = CoreGame || {};

CoreGame.SpriteElementUI = CoreGame.ElementUI.extend({
    /**
     * @param {CoreGame.ElementObject} element - Reference to the logically represented element
     * @param {string} spritePath - Full path to the sprite image file
     * @param {number} [spriteScale] - Optional scale to apply to the sprite (default 1)
     */
    ctor: function (element, spritePath, spriteScale) {
        this.spritePath = spritePath;
        this._spriteScale = spriteScale || 1;
        this._super(element);
    },

    /**
     * Override initSprite to use the custom sprite path.
     * Auto-fits the sprite into the element's cell footprint
     * (CELL_SIZE * element.size) preserving aspect ratio — so a 256x256
     * PNG on a 2x2 blocker renders as 2*CELL_SIZE, not 256 raw pixels.
     */
    initSprite: function () {
        if (!this.spritePath) return;
        this.sprite = new cc.Sprite(this.spritePath);
        this.sprite.setAnchorPoint(0.5, 0.5);
        this.addChild(this.sprite);

        var self = this;
        var attempts = 0;
        var applyFit = function () {
            attempts++;
            if (!self.sprite || !self.element || !self.element.size) return true;
            var cellSize = (CoreGame.Config && CoreGame.Config.CELL_SIZE) || 57;
            var ss = self.sprite.getContentSize();
            if (!ss || ss.width <= 0 || ss.height <= 0) {
                if (attempts < 30) setTimeout(applyFit, 50);
                return false;
            }
            var targetW = cellSize * self.element.size.width;
            var targetH = cellSize * self.element.size.height;
            var scale = Math.min(targetW / ss.width, targetH / ss.height);
            self.sprite.setScale(scale);
            return true;
        };
        applyFit();

        // Add monster HP bar for any type >= 10000. Uses raw cc.Sprite for
        // both BG and fill (bypassing ccui.LoadingBar / ccui.ImageView quirks
        // where async texture loading offset the LoadingBar relative to the
        // ImageView track). Fill is clipped via setTextureRect to simulate
        // a horizontal progress bar.
        var cfgDataForHP = this.element && this.element.configData;
        var skipHPBar = cfgDataForHP && cfgDataForHP.noMonsterHPBar;
        if (!skipHPBar && this.element && CoreGame.ElementObject.isMonsterType &&
            CoreGame.ElementObject.isMonsterType(this.element.type)) {
            try {
                var cellSizeHP = (CoreGame.Config && CoreGame.Config.CELL_SIZE) || 57;
                var elemH = (this.element.size && this.element.size.height) || 1;
                // Match Kong placement: bar overlaps the bottom edge of the
                // sprite footprint. Tuned to +20 (between flush and mid-row).
                var hpY = -cellSizeHP * elemH * 0.5 + 20;

                // BG track sprite.
                var hpBarBg = new cc.Sprite("res/newBlock/BlockUI/img/UI/bunny_progress_bar_bg.png");
                hpBarBg.setAnchorPoint(0.5, 0.5);
                hpBarBg.setPosition(cc.p(0, hpY));
                this.addChild(hpBarBg, 50);

                // Fill sprite, anchored top-left so cropping via textureRect
                // shrinks from the right (LEFT_TO_RIGHT bar).
                var hpFill = new cc.Sprite("res/newBlock/BlockUI/img/UI/bunny_progress_bar.png");
                hpFill.setAnchorPoint(0, 0.5);
                hpFill.setName("hpBar"); // satisfies engine's seekWidgetByName
                this.addChild(hpFill, 51);

                // HPLabel inside the round cap on the LEFT end of the bar.
                var hpLabel = ccui.Text.create("", "font/BalooPaaji2-SemiBold.ttf", 20);
                hpLabel.setName("HPLabel");
                hpLabel.setColor(cc.color(255, 255, 255));
                hpLabel.enableShadow(cc.color(0, 0, 0, 180), cc.size(2, -2), 0);
                hpLabel.setAnchorPoint(0.5, 0.5);
                this.addChild(hpLabel, 52);

                // ccui.LoadingBar.setPercent compatibility shim so the
                // engine's updateHPBar() (which calls hpBar.setPercent on
                // change) works on a plain Sprite.
                var fullTexRect = null;
                hpFill.setPercent = function (pct) {
                    var t = this.getTexture();
                    if (!t) return;
                    var sz = t.getContentSize();
                    if (sz.width <= 0) return;
                    if (!fullTexRect) fullTexRect = cc.rect(0, 0, sz.width, sz.height);
                    var w = Math.max(0, fullTexRect.width * Math.max(0, Math.min(100, pct)) / 100);
                    this.setTextureRect(cc.rect(0, 0, w, fullTexRect.height));
                };

                var elem = this.element;
                var hpAttempts = 0;
                var initHP = function () {
                    hpAttempts++;
                    var bgSize = hpBarBg.getContentSize();
                    var fillSize = hpFill.getContentSize();
                    if (bgSize.width <= 0 || fillSize.width <= 0) {
                        if (hpAttempts < 30) setTimeout(initHP, 50);
                        return;
                    }
                    // Position fill at bg's left edge, vertically centered on bg.
                    hpFill.setPosition(cc.p(hpBarBg.x - bgSize.width / 2, hpBarBg.y));
                    // Label in the bg's left circle cap.
                    hpLabel.setPosition(cc.p(hpBarBg.x - bgSize.width / 2 + 17.5, hpBarBg.y));
                    var hp = elem.hitPoints || (elem.configData && elem.configData.hitPoints) || 1;
                    var max = elem.maxHP || (elem.configData && elem.configData.maxHP) || hp;
                    hpFill.setPercent((hp / max) * 100);
                    hpLabel.setString(String(hp));
                };
                initHP();
            } catch (e) {
                cc.log("SpriteElementUI: HP bar setup failed", e && e.message);
            }
        }
    },

    /**
     * Suppress the default MATCH animation. ElementUI.playAnimation(MATCH)
     * → playMatchAnim() → playDestroyEffect() which scale-to-0 the sprite
     * — fine for gems (they're being matched-and-destroyed), but wrong for
     * Anubis / L193 where MATCH means "PU heals me" or "advance queue, may
     * not die yet". Custom actions decide whether to kill; the engine's
     * doExplode at HP=0 still fires the REMOVE animation properly.
     */
    playAnimation: function (actionType) {
        if (actionType === CoreGame.ElementObject.ACTION_TYPE.MATCH) {
            return 0;
        }
        return this._super(actionType);
    },

    /**
     * Override updateVisual to support configData._hpVisualPaths: a map of
     * hitPoints → sprite path. Lets layered blockers (e.g. L193 Hieroglyph
     * Stone) show the current required colour by swapping the whole sprite
     * per HP tier — same pattern Box uses, just data-driven.
     */
    updateVisual: function () {
        this._super();
        if (!this.sprite || !this.element || !this.element.configData) return;
        var paths = this.element.configData._hpVisualPaths;
        if (!paths) return;
        var hp = this.element.hitPoints;
        var path = paths[hp];
        if (!path) return;
        try {
            var tex = cc.textureCache.addImage(path);
            if (tex) this.sprite.setTexture(tex);
        } catch (e) {
            cc.log("SpriteElementUI: hpVisualPaths swap failed", e && e.message);
        }
    }
});
