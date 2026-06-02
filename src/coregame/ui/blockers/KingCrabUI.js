/**
 * KingCrabUI - visual for King Crab (11020), the color-rotating 3x3 boss.
 *
 * Extends FactoryBlockerUI (HP-aware placeholder sprite + setColor tint) and
 * layers on the King's signature feedback. All effects run on the single
 * placeholder PNG and are intentionally lightweight — they approximate the spec
 * (crown blink, aura glow, water-bubble death) until the real animated asset
 * (block_king_crab CSB with a crown + aura node) ships, at which point these
 * can drive named sub-nodes instead.
 */
var CoreGame = CoreGame || {};

CoreGame.KingCrabUI = CoreGame.FactoryBlockerUI.extend({

    ctor: function (element, spritePath, spriteScale) {
        this._super(element, spritePath, spriteScale);
        if (this.sprite && this.sprite.setCascadeColorEnabled) {
            this.sprite.setCascadeColorEnabled(true);
        }
    },

    /**
     * 1-turn warning before a color rotate: a quick brighten + scale pulse to
     * read as the crown blinking. Placeholder for the crown sub-node blink.
     */
    playRotateWarning: function () {
        if (!this.sprite) return;
        var s = this.sprite;
        var base = this._spriteScale || 1;
        s.stopActionByTag(CoreGame.KingCrabUI.WARN_TAG);
        var pulse = cc.sequence(
            cc.scaleTo(0.18, base * 1.12).easing(cc.easeOut(2.0)),
            cc.scaleTo(0.18, base).easing(cc.easeIn(2.0))
        );
        var act = cc.sequence(cc.repeat(pulse, 2), cc.callFunc(function () {
            if (cc.sys.isObjectValid(s)) s.setScale(base);
        }));
        act.setTag(CoreGame.KingCrabUI.WARN_TAG);
        s.runAction(act);
    },

    /**
     * 0.5s cross-fade from the old color tint to the new one.
     * @param {number} fromColorId
     * @param {number} toColorId
     */
    playColorShift: function (fromColorId, toColorId) {
        if (!this.sprite) return;
        var rgb = CoreGame.ElementUI.MATCH_COLOR_TINT[toColorId];
        if (!rgb) { this.refreshMatchColorTint(); return; }
        this.sprite.stopActionByTag(CoreGame.KingCrabUI.SHIFT_TAG);
        var tint = cc.tintTo(0.5, rgb[0], rgb[1], rgb[2]);
        tint.setTag(CoreGame.KingCrabUI.SHIFT_TAG);
        this.sprite.runAction(tint);
    },

    /**
     * Float a grey "CHẶN" label up over 0.4s when a wrong-color match hits.
     * Mirrors the damage-number drift but uses text instead of the bitmap font.
     */
    showBlockText: function () {
        var parent = this.getParent();
        if (!parent) return;
        var lbl = new cc.LabelTTF("CHẶN", "font/BalooPaaji2-Bold.ttf", 22);
        lbl.setColor(cc.color(220, 220, 220)); // #dcdcdc
        lbl.enableStroke(cc.color(60, 60, 60), 2);
        lbl.setPosition(cc.p(this.getPositionX(), this.getPositionY() + 20));
        lbl.setOpacity(255);
        parent.addChild(lbl, CoreGame.Config.zOrder.MATCH_4_EXPLODE + 200);
        lbl.runAction(cc.sequence(
            cc.spawn(
                cc.moveBy(0.4, cc.p(0, 40)).easing(cc.easeOut(2.0)),
                cc.sequence(cc.delayTime(0.15), cc.fadeOut(0.25))
            ),
            cc.removeSelf()
        ));
    },

    /**
     * One-shot hint pointing at the aura after 3 wrong matches in a row.
     * Placeholder: a short instruction label that fades after a couple seconds.
     */
    showColorHint: function () {
        var parent = this.getParent();
        if (!parent) return;
        var lbl = new cc.LabelTTF("Match đúng màu phát sáng để gây sát thương",
            "font/BalooPaaji2-Bold.ttf", 18);
        lbl.setColor(cc.color(255, 240, 180));
        lbl.enableStroke(cc.color(50, 50, 50), 2);
        lbl.setPosition(cc.p(this.getPositionX(), this.getPositionY() + 70));
        lbl.setOpacity(0);
        parent.addChild(lbl, CoreGame.Config.zOrder.MATCH_4_EXPLODE + 200);
        lbl.runAction(cc.sequence(
            cc.fadeIn(0.3),
            cc.delayTime(2.2),
            cc.fadeOut(0.5),
            cc.removeSelf()
        ));
    },

    /**
     * Death FX placeholder: pop + fade. Real asset should drop the crown and
     * burst a large water bubble; clear of the 9 cells is handled by the core
     * remove/refill flow.
     */
    playAnimation: function (actionType, visualState) {
        var REMOVE = CoreGame.ElementObject.ACTION_TYPE.REMOVE;
        if (actionType === REMOVE && this.sprite) {
            var s = this.sprite;
            var base = this._spriteScale || 1;
            s.stopAllActions();
            s.runAction(cc.spawn(
                cc.scaleTo(0.5, base * 1.4).easing(cc.easeOut(2.0)),
                cc.fadeOut(0.5)
            ));
            return 0.5;
        }
        return this._super(actionType, visualState);
    }
});

CoreGame.KingCrabUI.WARN_TAG = 9931;
CoreGame.KingCrabUI.SHIFT_TAG = 9932;
