/**
 * SlimeKingUI - visual for Slime Chúa (12002), the 3×3 ColorMatch boss.
 *
 * Extends SlimeUI, so the body is the real Spine autotile (folder 07 — dark slate
 * jelly) + the eye pair on the centre block, exactly like Slime Hiền/Ác. Two
 * boss-only additions on top:
 *
 *   1. Color cue — the boss read is "match THIS color". _bodyTint() returns the
 *      active match color, so every cell's Spine body is setColor()'d to it and
 *      the whole jelly recolors when the color rotates (refreshMatchColorTint →
 *      _retintCells). The slate base is intentionally desaturated so the tint
 *      shows through; expect a darker shade than the small-slime art.
 *   2. Crown — one crown spine on the front cell. The crown lives in the shared
 *      folder-07 "tileset_objects" skeleton alongside barrel/can props, so those
 *      prop slots are hidden (_isolateCrown) leaving just the crown (region obj_03).
 *
 * NOTE: CROWN_OFFSET and CROWN_HIDE_SLOTS are authored from the atlas/skeleton but
 * not yet verified in-engine — eyeball the crown position/contents on first run and
 * tune the constants at the bottom if the barrel/can leak through or it sits off.
 */
var CoreGame = CoreGame || {};

CoreGame.SlimeKingUI = CoreGame.SlimeUI.extend({

    ctor: function (element, jsonPath) {
        this._crownNode = null;
        this._super(element, jsonPath);
    },

    /** King's slate body recolors to the active match color (_cellColor maps
     *  12002 → MATCH_COLOR_TINT[_matchColor]). null elsewhere keeps art untinted. */
    _bodyTint: function () {
        return this._cellColor();
    },

    /** Called by CycleMatchColorAction after rotating element._matchColor:
     *  re-tints every live Spine body (and any fallback tile) to the new color. */
    refreshMatchColorTint: function () {
        this._retintCells();
    },

    // ── crown ─────────────────────────────────────────────────────────────────
    /** Keep one crown spine on the front (top-most, then left-most) live cell.
     *  _refreshEye runs first and sets _eyeFront, so reuse it for placement. */
    _refreshDecor: function () {
        if (!CoreGame.SlimeKingUI.SHOW_CROWN) return;
        if (!this._usesSpine() || this._cellTiles.length === 0) {
            if (this._crownNode) { this._releaseSpine(this._crownNode); this._crownNode = null; }
            return;
        }
        var front = this._eyeFront || this._cellTiles[0];
        var p = this.element.boardMgr.gridToPixel(front.r, front.c);
        if (!this._crownNode) {
            var crown = null;
            try { crown = gv.createSpineAnimation(this._spineBase("objects")); } catch (e) { crown = null; }
            if (!crown) return;
            crown.setScale(this._spineScale());
            this._isolateCrown(crown);
            this._safeSetAnim(crown, CoreGame.SlimeKingUI.CROWN_ANIM, true);
            this.addChild(crown, this._zCell() + 2000);
            this._crownNode = crown;
        }
        // CROWN_ANIM (object_02) centres the crown prop (obj_03) on the node origin,
        // so just place it on the front cell and lift by CROWN_OFFSET.
        var sc = this._spineScale();
        var o = CoreGame.SlimeKingUI.CROWN_OFFSET;
        this._crownNode.setPosition(p.x + o[0] * sc, p.y + o[1] * sc);
        if (CoreGame.SlimeUI.OBJECT_DEBUG) {
            cc.log("[SlimeCrown] folder=" + this._slimeFolder() +
                " front=(" + front.r + "," + front.c + ")" +
                " pos=(" + Math.round(this._crownNode.getPositionX()) + "," + Math.round(this._crownNode.getPositionY()) + ")" +
                " anim=" + CoreGame.SlimeKingUI.CROWN_ANIM +
                " keepSlot=" + CoreGame.SlimeKingUI.CROWN_SLOT);
        }
    },

    /** Show ONLY the crown prop: hide every other prop slot (the barrels/coral/rocks)
     *  so they don't render at their scattered setup offsets outside the slime.
     *  setAttachment(null) sticks (the anim doesn't keyframe attachments). */
    _isolateCrown: function (crown) {
        var keep = CoreGame.SlimeKingUI.CROWN_SLOT;
        var slots = crown._skeleton && crown._skeleton.slots;
        if (!slots) return;
        for (var i = 0; i < slots.length; i++) {
            var nm = slots[i].data && slots[i].data.name;
            if (nm && /^obj/i.test(nm) && nm !== keep) {
                try { crown.setAttachment(nm, null); } catch (e) { }
            }
        }
    },

    /**
     * 1-turn warning before the color rotates: a quick scale pulse across all
     * cells, plus a matching bob on the crown.
     */
    playRotateWarning: function () {
        if (this._dualLayer) {
            var n = this._dualLayer;
            n.stopActionByTag(CoreGame.SlimeKingUI.WARN_TAG);
            var pulse = cc.sequence(
                cc.scaleTo(0.18, 1.12).easing(cc.easeOut(2.0)),
                cc.scaleTo(0.18, 1.0).easing(cc.easeIn(2.0))
            );
            pulse.setTag(CoreGame.SlimeKingUI.WARN_TAG);
            n.runAction(pulse);
        }
        if (this._crownNode) {
            var sc = this._spineScale();
            this._crownNode.stopActionByTag(CoreGame.SlimeKingUI.WARN_TAG);
            var cpulse = cc.sequence(
                cc.scaleTo(0.18, sc * 1.18).easing(cc.easeOut(2.0)),
                cc.scaleTo(0.18, sc).easing(cc.easeIn(2.0))
            );
            cpulse.setTag(CoreGame.SlimeKingUI.WARN_TAG);
            this._crownNode.runAction(cpulse);
        }
    }
});

CoreGame.SlimeKingUI.WARN_TAG = 9951;
// Crown = prop obj_03 in the shared tileset_objects skeleton. CROWN_ANIM "object_02"
// is the animation that centres obj_03 on the node origin (object_01 instead centres
// obj_02 = the pink coral, which is why the old setup showed coral + leaked props).
// CROWN_SLOT is the only prop slot kept visible (all others hidden in _isolateCrown).
CoreGame.SlimeKingUI.SHOW_CROWN = true;
CoreGame.SlimeKingUI.CROWN_ANIM = "object_02";
CoreGame.SlimeKingUI.CROWN_SLOT = "obj_03";
// Lift above the front-cell centre, in skeleton units (× spineScale). Tune in-engine.
CoreGame.SlimeKingUI.CROWN_OFFSET = [0, 70];
