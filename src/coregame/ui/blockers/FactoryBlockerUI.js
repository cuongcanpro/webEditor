/**
 * FactoryBlockerUI - HP-aware visual for JSON-driven factory blockers.
 *
 * Sprite swap: when the element takes damage, tries to load
 * `{baseName}_{hp}.{ext}` (e.g. anchor_rusty_3.png).  If that texture
 * is not yet cached, falls back to the base sprite with an opacity
 * gradient so damage is still visually communicated with placeholder art.
 *
 * The HP number label is always visible (unlike normal ElementUI which
 * hides it unless CheatElementMode is on).
 */
var CoreGame = CoreGame || {};

CoreGame.FactoryBlockerUI = CoreGame.SpriteElementUI.extend({
    ctor: function (element, spritePath, spriteScale) {
        this._super(element, spritePath, spriteScale);
        // lbState is created by ElementUI.ctor (called via _super chain above)
        if (this.lbState) this.lbState.setVisible(true);
    },

    updateVisual: function () {
        this._super(); // updates lbState HP number
        this._applyHPVisual();
    },

    _applyHPVisual: function () {
        if (!this.sprite || !this.element) return;
        var hp = Math.max(0, this.element.hitPoints);

        // Blocker tint theo màu (Cua Màu, King Crab): LUÔN giữ màu đậm + opacity
        // đầy đủ ở mọi mức máu để màu yêu cầu dễ nhìn — không làm mờ/đổi theo HP.
        var cfg = this.element.rawConfig;
        if (cfg && cfg.tintByMatchColor) {
            if (this.sprite.getOpacity && this.sprite.getOpacity() !== 255) {
                this.sprite.setOpacity(255);
            }
            return;
        }

        var maxHP = (this.element.configData && this.element.configData.maxHP) ||
                    this.element.maxHP || 1;

        // Try HP-specific sprite first: e.g. anchor_rusty_3.png
        var basePath = this.spritePath;
        var dotIdx = basePath.lastIndexOf('.');
        var hpPath = basePath.substring(0, dotIdx) + '_' + hp + basePath.substring(dotIdx);
        var texture = cc.textureCache.getTextureForKey(hpPath);
        if (texture) {
            this.sprite.setTexture(texture);
        } else {
            // Placeholder fallback: darken sprite as HP drops.
            // Full HP = opacity 255, 0 HP = 80.
            var frac = maxHP > 0 ? hp / maxHP : 1;
            this.sprite.setOpacity(Math.round(80 + 175 * frac));
        }
    },

    /**
     * Suppress the MATCH/SIDE_MATCH destroy animation from doActionsType.
     * Factory blockers that survive a hit must NOT scale to 0 — their
     * take-damage feedback is handled by Blocker.takeDamage → playTakeDamageEffect.
     * Only REMOVE (via doExplode) should play the destroy effect.
     */
    playAnimation: function (actionType) {
        var MATCH     = CoreGame.ElementObject.ACTION_TYPE.MATCH;
        var SIDE_MATCH = CoreGame.ElementObject.ACTION_TYPE.SIDE_MATCH;
        if (actionType === MATCH || actionType === SIDE_MATCH) {
            return 0;
        }
        return this._super(actionType);
    },

    playTakeDamageEffect: function (amount, row, col) {
        this._applyHPVisual();
        if (this.sprite && this.element.hitPoints > 0) {
            var t = 0.06;
            this.sprite.stopAllActions();
            this.sprite.runAction(cc.sequence(
                cc.moveBy(t, cc.p(4, 0)),
                cc.moveBy(t, cc.p(-8, 0)),
                cc.moveBy(t, cc.p(4, 0))
            ));
        }
    }
});
