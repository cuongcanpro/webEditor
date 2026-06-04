/**
 * CatHiddenShootPuUI — spine visual for the 3x3 "Mèo ẩn thân bắn PU" boss
 * (13020 LỘ/VISIBLE / 13021 ẨN/HIDDEN). Saga 2 finale (L170).
 *
 * Combines two earlier cats on ONE spine (res/newBlock/BlockUI/spine/cat/
 * hidden_shoot_pu_cat, Spine 3.7.94):
 *   - state-driven loop from CatHiddenUI: ẨN(13021) loops 'init', LỘ(13020) loops
 *     'idle'. Pure layer change on swap (no opacity dim — same as CatHidden).
 *   - playAimAndShoot from CatShootPuUI: the LỘ state shoots PUs every endTurn via
 *     FindAndDestroyPowerUpAction, which calls this to time the destroy.
 *
 * Lazy-load guard mirrors CatHiddenUI: the cat spine isn't in resAni, so build only
 * after its page texture (hidden_shoot_pu_cat.png, line 2 of the atlas) is cached.
 *
 * NOTE: spine base name is `hidden_shoot_pu_cat`; the palette icon is
 * `cat_hidden_shoot_pu` (reordered) — do not mix them up.
 *
 * Color-blind: every damaging match plays the hit reaction. Death -> defeat. Grass
 * overlay / dim look for ẨN is an effect-layer concern, out of this logic-first pass.
 */
var CoreGame = CoreGame || {};

CoreGame.CatHiddenShootPuUI = CoreGame.ElementUI.extend({
    spine: null,

    // BlockerFactory wiring: new UIClass(element, path, scale). path/scale unused.
    ctor: function (element, spritePath, spriteScale) {
        this._super(element);
    },

    // Build the spine instead of a sprite. (Called by ElementUI.ctor.)
    initSprite: function () {
        if (typeof gv === 'undefined' || !gv.createSpineAnimation) return;

        var path = CoreGame.CatHiddenShootPuUI.SPINE_PATH;
        var tex = CoreGame.CatHiddenShootPuUI.TEXTURE_PATH;

        // Gate on the PAGE TEXTURE (not the atlas) — see CatHiddenUI for the why.
        var texCached = (typeof cc !== 'undefined' && cc.loader && cc.loader.getRes)
            ? !!cc.loader.getRes(tex)
            : true;

        if (texCached) {
            this._buildSpine();
            return;
        }

        var self = this;
        cc.loader.load([path + ".json", path + ".atlas", tex], function () {
            if (cc.sys.isObjectValid(self)) self._buildSpine();
        });
    },

    // Actual spine construction (assets cached by now). Guarded so a build failure
    // can't blank out the editor palette, which builds every block in a loop.
    _buildSpine: function () {
        try {
            this.spine = gv.createSpineAnimation(CoreGame.CatHiddenShootPuUI.SPINE_PATH);
            if (!this.spine) {
                cc.log("CatHiddenShootPuUI: createSpineAnimation returned null for " + CoreGame.CatHiddenShootPuUI.SPINE_PATH);
                return;
            }

            this.spine.setScale(CoreGame.CatHiddenShootPuUI.SCALE);
            this.spine.setPosition(CoreGame.CatHiddenShootPuUI.OFFSET_X, CoreGame.CatHiddenShootPuUI.OFFSET_Y);
            this.addChild(this.spine);
            // Anchor near the bottom of the 3x3 footprint. gridToPixel returns the
            // CENTRE of the single anchor cell (no size-centering), so the spine must
            // drop to cover the taller box: the 2x2 cats use 0.65 cell; the 3x3 sits
            // one extra cell lower. Tunable.
            this.spine.y = -CoreGame.Config.CELL_SIZE * CoreGame.CatHiddenShootPuUI.Y_OFFSET_CELLS;

            if (this.spine.setToSetupPose) this.spine.setToSetupPose();
            else if (this.spine.setSlotsToSetupPose) this.spine.setSlotsToSetupPose();

            // State drives the loop (both at level-init and after a ReplaceSelfAction
            // swap, which rebuilds this UI with the new type): ẨN -> 'init', LỘ -> 'idle'.
            this._playStateLoop();
        } catch (e) {
            this.spine = null;
            cc.log("CatHiddenShootPuUI: spine build failed: " + e);
        }
    },

    _isHidden: function () {
        return this.element && this.element.type === CoreGame.CatHiddenShootPuUI.TYPE_HIDDEN;
    },

    // Loop anim name for the current state: ẨN -> 'init', LỘ -> 'idle'.
    _stateLoopName: function () {
        return this._isHidden()
            ? CoreGame.CatHiddenShootPuUI.ANIM_INIT
            : CoreGame.CatHiddenShootPuUI.ANIM_IDLE;
    },

    // State-driven loop applied at build + after each swap.
    _playStateLoop: function () {
        this._playLoop(this._stateLoopName());
    },

    _playLoop: function (name) {
        if (!this.spine || !this.spine.setAnimation) return;
        try { this.spine.setAnimation(0, name, true); } catch (e) {}
    },

    // One-shot on track 0, then fall back to the STATE loop (hit settles back to
    // 'init' when ẨN, 'idle' when LỘ).
    _playOneShot: function (name) {
        if (!this.spine || !this.spine.setAnimation) return;
        try {
            this.spine.setAnimation(0, name, false);
            if (this.spine.addAnimation)
                this.spine.addAnimation(0, this._stateLoopName(), true, 0);
        } catch (e) {}
    },

    // One-shot with NO follow (death — element is removed right after).
    _playFinal: function (name) {
        if (!this.spine || !this.spine.setAnimation) return;
        try { this.spine.setAnimation(0, name, false); } catch (e) {}
    },

    // REMOVE (death) plays defeat; the state-swap key (action_0) returns 0 — the
    // LỘ<->ẨN change is a pure LAYER switch and the rebuilt UI re-picks its loop by
    // state. The swap's own delay (so it waits for the shoot) lives in
    // ReplaceSelfAction's `delay` config, not here. Other action types are inert.
    playAnimation: function (actionType) {
        if (!this.spine) return this._super(actionType);

        if (actionType === CoreGame.ElementObject.ACTION_TYPE.REMOVE) {
            this._playFinal(CoreGame.CatHiddenShootPuUI.ANIM_DEFEAT);
            return CoreGame.CatHiddenShootPuUI.DEFEAT_DURATION;
        }

        if (actionType === CoreGame.CatHiddenShootPuUI.ACTION_KEY_SWAP) {
            return 0;
        }

        return 0;
    },

    // Any damaging match -> flinch, then back to the state loop.
    playTakeDamageEffect: function (amount, row, col) {
        if (this.spine) this._playOneShot(CoreGame.CatHiddenShootPuUI.ANIM_HIT);
        return 0.2;
    },

    /**
     * Aim + shoot cue (LỘ state only), called by FindAndDestroyPowerUpAction right
     * before it silently destroys the picked PUs. Plays 'attack' and returns the REAL
     * clip length (read off the spine track entry, like SpineElementUI) so the destroy
     * lands when the shoot anim ends. ATTACK_DURATION is the fallback; 0 when the spine
     * is unavailable so the action destroys immediately.
     */
    playAimAndShoot: function (picks, animKey) {
        if (!this.spine || !this.spine.setAnimation) return 0;
        var name = animKey || CoreGame.CatHiddenShootPuUI.ANIM_ATTACK;
        var dur = CoreGame.CatHiddenShootPuUI.ATTACK_DURATION;
        try {
            var entry = this.spine.setAnimation(0, name, false);
            if (entry) {
                dur = entry.duration || (entry.animation ? entry.animation.duration : dur);
            }
            // Return to the state loop after the one-shot attack.
            if (this.spine.addAnimation)
                this.spine.addAnimation(0, this._stateLoopName(), true, 0);
        } catch (e) {}
        return dur;
    }
});

// Logical type ids (mirror res/newBlock/mapID.json + 13020/13021.json).
CoreGame.CatHiddenShootPuUI.TYPE_VISIBLE = 13020; // LỘ
CoreGame.CatHiddenShootPuUI.TYPE_HIDDEN  = 13021; // ẨN

// Spine asset. Base name `hidden_shoot_pu_cat` (NOT cat_hidden_shoot_pu).
CoreGame.CatHiddenShootPuUI.SPINE_PATH = "res/newBlock/BlockUI/spine/cat/hidden_shoot_pu_cat";
// Page texture referenced by hidden_shoot_pu_cat.atlas line 2 — must match exactly.
CoreGame.CatHiddenShootPuUI.TEXTURE_PATH = "res/newBlock/BlockUI/spine/cat/hidden_shoot_pu_cat.png";

// Animation set (names from the spine: init, idle, attack, hit, defeat).
CoreGame.CatHiddenShootPuUI.ANIM_INIT   = "init";   // loop while ẨN
CoreGame.CatHiddenShootPuUI.ANIM_IDLE   = "idle";   // loop while LỘ
CoreGame.CatHiddenShootPuUI.ANIM_ATTACK = "attack"; // aim+shoot baked into one clip
CoreGame.CatHiddenShootPuUI.ANIM_HIT    = "hit";
CoreGame.CatHiddenShootPuUI.ANIM_DEFEAT = "defeat";

// Custom action key (mirrors 13020/13021.json action_0). Dispatched by
// CheckAttributeAction once phaseTurn hits 2 -> ReplaceSelfAction swaps the state.
CoreGame.CatHiddenShootPuUI.ACTION_KEY_SWAP = "action_0";

// Layout for the 3x3 footprint + timings — starting values, tune in-game.
CoreGame.CatHiddenShootPuUI.SCALE = 0.7;
CoreGame.CatHiddenShootPuUI.OFFSET_X = 0;
CoreGame.CatHiddenShootPuUI.OFFSET_Y = 0;
// How far down (in cells) to drop the spine so it covers the 3x3 box. 2x2 cats use
// 0.65; the 3x3 needs ~1 cell more (the boss looked shifted up by 1 cell at 0.65).
CoreGame.CatHiddenShootPuUI.Y_OFFSET_CELLS = 1.3;
CoreGame.CatHiddenShootPuUI.DEFEAT_DURATION = 0.5;
CoreGame.CatHiddenShootPuUI.ATTACK_DURATION = 0.4; // FALLBACK only — real clip length read off the spine
