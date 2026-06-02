/**
 * ColorCrabUI — spine visual for the 2x2 Color Crab variants (11010-11015).
 *
 * Renders the shared `creep_snail_01` spine. The blocker's required match
 * color (element._matchColor / customAction) selects one skin so all six
 * color variants reuse a single skeleton:
 *
 *   1 green  -> creep_G_cell_0     4 blue   -> creep_B_cell_0
 *   2 yellow -> creep_Y_cell_0     5 pink   -> creep_V_cell_0
 *   3 red    -> creep_R_cell_0     6 orange -> creep_W_cell_0
 *
 * Color ids follow ElementUI.MATCH_COLOR_TINT (the palette ColorCrab already
 * used for tinting) — NOT ResourceAnimation.colorName, which numbers 4/6
 * differently. Keep these two in sync if either changes.
 *
 * Only three states are shown, per the art spec:
 *   idle               -> out_idle           (looped, resting)
 *   hit  (right color) -> out_hit            (took damage)
 *   miss (wrong color) -> out_hit_nodamage   (adjacent match, no damage)
 *
 * Dispatch flow (ElementObject.doActionsType for SIDE_MATCH): playAnimation is
 * called FIRST for every adjacent match — the gem color is NOT known at that
 * point — then MatchColorTakeDamageAction runs. So playAnimation plays the
 * "no damage" reaction unconditionally; when the color is correct, takeDamage
 * -> playTakeDamageEffect overrides it with out_hit in the SAME synchronous
 * dispatch (setAnimation replaces track 0 before any render, so no flicker).
 * Both reactions queue out_idle to loop afterwards.
 */
var CoreGame = CoreGame || {};

CoreGame.ColorCrabUI = CoreGame.ElementUI.extend({
    spine: null,

    // ctor signature matches BlockerFactory's `new UIClass(element, path, scale)`
    // wiring (visual.type 0 + uiClass). path/scale are unused here — the spine
    // and per-color skin drive the visual entirely.
    ctor: function (element, spritePath, spriteScale) {
        this._super(element);
    },

    // Override: build the spine instead of a sprite. (Called by ElementUI.ctor.)
    initSprite: function () {
        var path = (typeof resAni !== 'undefined' && resAni.spine_11010) || null;
        if (!path || typeof gv === 'undefined' || !gv.createSpineAnimation) return;

        // Guard the whole build: if the spine asset failed to preload, do NOT
        // let the throw escape — the editor palette builds every block in one
        // loop and an uncaught error there blanks out all blocks after this one.
        try {
            this.spine = gv.createSpineAnimation(path);
            if (!this.spine) return;

            this.spine.setScale(CoreGame.ColorCrabUI.SCALE);
            this.spine.setPosition(CoreGame.ColorCrabUI.OFFSET_X, CoreGame.ColorCrabUI.OFFSET_Y);
            this.addChild(this.spine);
            this.spine.y = -CoreGame.Config.CELL_SIZE * 0.65; // anchor to bottom edge of 2x2 footprint
            this._applySkin();
            this._playLoop(CoreGame.ColorCrabUI.ANIM_IDLE);
        } catch (e) {
            this.spine = null;
            cc.log("ColorCrabUI: spine build failed (" + path + "): " + e);
        }
    },

    // Pick the skin for the blocker's required match color.
    _applySkin: function () {
        if (!this.spine || !this.spine.setSkin) return;
        var color = this._findMatchColor(this.element && this.element.rawConfig);
        var skin = CoreGame.ColorCrabUI.COLOR_SKIN[color] || CoreGame.ColorCrabUI.COLOR_SKIN[1];
        try {
            this.spine.setSkin(skin);
            if (this.spine.setSlotsToSetupPose) this.spine.setSlotsToSetupPose();
        } catch (e) {
            cc.log("ColorCrabUI: failed to set skin " + skin);
        }
    },

    // Re-apply the skin if the required color ever changes at runtime (future
    // color-cycling variants, à la King Crab). No-op for the static 11010-11015.
    refreshMatchColorTint: function () {
        this._applySkin();
    },

    _playLoop: function (name) {
        if (!this.spine || !this.spine.setAnimation) return;
        try { this.spine.setAnimation(0, name, true); } catch (e) {}
    },

    // One-shot reaction on track 0, then fall back to the looping idle.
    _playOneShot: function (name) {
        if (!this.spine || !this.spine.setAnimation) return;
        try {
            this.spine.setAnimation(0, name, false);
            if (this.spine.addAnimation)
                this.spine.addAnimation(0, CoreGame.ColorCrabUI.ANIM_IDLE, true, 0);
        } catch (e) {}
    },

    // SIDE_MATCH fires for every adjacent match (color unknown here) -> show the
    // "no damage" miss reaction. A correct-color match overrides it via
    // playTakeDamageEffect within the same dispatch. Every other action type is
    // intentionally inert (the crab is never matched directly; its destroy uses
    // the inherited scale-out effect).
    playAnimation: function (actionType) {
        if (!this.spine) return this._super(actionType);
        if (actionType === CoreGame.ElementObject.ACTION_TYPE.SIDE_MATCH) {
            this._playOneShot(CoreGame.ColorCrabUI.ANIM_MISS);
        }
        return 0;
    },

    // Correct-color hit: real damage was dealt -> out_hit (overrides the
    // out_hit_nodamage queued by playAnimation this same tick).
    playTakeDamageEffect: function (amount, row, col) {
        if (this.spine) this._playOneShot(CoreGame.ColorCrabUI.ANIM_HIT);
        return 0.2;
    }
});

// Color id -> skin. Anchored to ElementUI.MATCH_COLOR_TINT:
// 1=green 2=yellow 3=red 4=blue 5=pink 6=orange.
CoreGame.ColorCrabUI.COLOR_SKIN = {
    1: "creep_G_cell_0",
    2: "creep_Y_cell_0",
    3: "creep_R_cell_0",
    4: "creep_B_cell_0",
    5: "creep_V_cell_0",
    6: "creep_W_cell_0"
};

CoreGame.ColorCrabUI.ANIM_IDLE = "out_idle";
CoreGame.ColorCrabUI.ANIM_HIT  = "out_hit";
CoreGame.ColorCrabUI.ANIM_MISS = "out_hit_nodamage";

// Layout for the 2x2 footprint (CELL_SIZE 73 -> ~146px box). The skeleton has
// a small internal bone scale, so these are starting values — tune in-game.
CoreGame.ColorCrabUI.SCALE = 0.5;
CoreGame.ColorCrabUI.OFFSET_X = 0;
CoreGame.ColorCrabUI.OFFSET_Y = 0;
