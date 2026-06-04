/**
 * CatHiddenUI — spine visual for the 2x2 "Mèo ẩn thân" boss
 * (13000 VISIBLE / 13001 HIDDEN).
 *
 * Both states share ONE spine (res/newBlock/BlockUI/spine/cat/hidden_cat), Spine
 * 3.7.94. The looping animation is driven purely by element.type / state:
 *
 *   HIDDEN  (13001, BACKGROUND layer under the gems) : loops 'init'.
 *   VISIBLE (13000, top layer)                       : loops 'idle'.
 *
 * Applied in _playStateLoop, called from _buildSpine at level-init AND after every
 * ReplaceSelfAction state swap (the swap is a pure LAYER change with no movement cue
 * — playAnimation(action_0) returns 0 and the rebuilt UI re-picks the loop by state).
 *
 * Color-blind: every adjacent / over match deals damage, so playTakeDamageEffect
 * always plays the hit reaction (no "miss" branch like ColorCrab). Death -> defeat.
 *
 * Scale / offset / transition timings are starting values — tune in-game.
 */
var CoreGame = CoreGame || {};

CoreGame.CatHiddenUI = CoreGame.ElementUI.extend({
    spine: null,

    // Matches BlockerFactory wiring: new UIClass(element, path, scale).
    // path / scale unused — the spine drives the whole visual.
    ctor: function (element, spritePath, spriteScale) {
        this._super(element);
    },

    // Build the spine instead of a sprite. (Called by ElementUI.ctor.)
    //
    // The cat spine is NOT registered in resAni (unlike ColorCrab's spine_11010),
    // so it isn't covered by the resAni-driven spine preload. When its atlas/json
    // aren't already in cc.loader's cache, gv.createSpineAnimation throws inside the
    // engine ("getRes(atlas) === undefined" -> TextureAtlas split crash). So we make
    // sure the 3 spine files are loaded first, THEN build. cc.loader.load is a fast
    // no-op when they're already cached.
    initSprite: function () {
        if (typeof gv === 'undefined' || !gv.createSpineAnimation) return;

        var path = CoreGame.CatHiddenUI.SPINE_PATH;
        var tex = CoreGame.CatHiddenUI.TEXTURE_PATH;
        // Gate on the PAGE TEXTURE, not the atlas. The engine resolves the atlas's
        // page texture via sp._atlasLoader.load -> cc.textureCache.addImage(dir +
        // page-name). If that png isn't cached yet, addImage kicks off an async load
        // and the first render binds a null GL texture ("no texture bound to target"
        // -> blank/missing attachments). So the page texture must be ready first.
        var texCached = (typeof cc !== 'undefined' && cc.loader && cc.loader.getRes)
            ? !!cc.loader.getRes(tex)
            : true; // can't tell -> assume cached, build directly

        if (texCached) {
            this._buildSpine();
            return;
        }

        // Load json + atlas + the atlas's page texture (hidden_cat.png) before
        // building, so the page texture resolves from cache on the first frame.
        var self = this;
        cc.loader.load([path + ".json", path + ".atlas", tex], function () {
            if (cc.sys.isObjectValid(self)) self._buildSpine();
        });
    },

    // Actual spine construction (assets are cached by now). Guarded so a build
    // failure can't blank out the editor palette, which builds every block in a loop.
    _buildSpine: function () {
        try {
            this.spine = gv.createSpineAnimation(CoreGame.CatHiddenUI.SPINE_PATH);
            if (!this.spine) {
                cc.log("CatHiddenUI: createSpineAnimation returned null for " + CoreGame.CatHiddenUI.SPINE_PATH);
                return;
            }

            this.spine.setScale(CoreGame.CatHiddenUI.SCALE);
            this.spine.setPosition(CoreGame.CatHiddenUI.OFFSET_X, CoreGame.CatHiddenUI.OFFSET_Y);
            this.addChild(this.spine);
            this.spine.y = -CoreGame.Config.CELL_SIZE * 0.65; // anchor near bottom of 2x2 box

            // Apply the setup pose immediately so the textured attachments show on
            // the first frame (mirror ColorCrabUI).
            if (this.spine.setToSetupPose) this.spine.setToSetupPose();
            else if (this.spine.setSlotsToSetupPose) this.spine.setSlotsToSetupPose();

            // Animation is driven purely by STATE (both at level-init and after a
            // ReplaceSelfAction swap, which rebuilds this UI with the new type):
            //   HIDDEN  -> loop 'init'
            //   VISIBLE -> loop 'idle'
            this._playStateLoop();
        } catch (e) {
            this.spine = null;
            cc.log("CatHiddenUI: spine build failed: " + e);
        }
    },

    _isHidden: function () {
        return this.element && this.element.type === CoreGame.CatHiddenUI.TYPE_HIDDEN;
    },

    _playLoop: function (name) {
        if (!this.spine || !this.spine.setAnimation) return;
        try { this.spine.setAnimation(0, name, true); } catch (e) {}
    },

    // One-shot on track 0, then fall back to the STATE loop (HIDDEN -> 'init',
    // VISIBLE -> 'idle'). Used by the hit reaction, so hit settles back to the
    // correct per-state loop instead of always idle.
    _playOneShot: function (name) {
        if (!this.spine || !this.spine.setAnimation) return;
        try {
            this.spine.setAnimation(0, name, false);
            if (this.spine.addAnimation)
                this.spine.addAnimation(0, this._stateLoopName(), true, 0);
        } catch (e) {}
    },

    // One-shot with NO idle follow (death — element is removed right after).
    _playFinal: function (name) {
        if (!this.spine || !this.spine.setAnimation) return;
        try { this.spine.setAnimation(0, name, false); } catch (e) {}
    },

    // Loop anim name for the current state: HIDDEN -> 'init', VISIBLE -> 'idle'.
    _stateLoopName: function () {
        return this._isHidden()
            ? CoreGame.CatHiddenUI.ANIM_INIT
            : CoreGame.CatHiddenUI.ANIM_IDLE;
    },

    // State-driven loop applied at build + after each swap.
    _playStateLoop: function () {
        this._playLoop(this._stateLoopName());
    },

    // REMOVE (death) plays defeat; the state-swap key (action_0) returns 0 — the
    // visible<->hidden change is a pure LAYER switch with no movement animation, and
    // the rebuilt UI re-picks its loop by state. Other action types are inert (entrance
    // handled in initSprite, damage in playTakeDamageEffect).
    playAnimation: function (actionType) {
        if (!this.spine) return this._super(actionType);

        if (actionType === CoreGame.ElementObject.ACTION_TYPE.REMOVE) {
            this._playFinal(CoreGame.CatHiddenUI.ANIM_DEFEAT);
            return CoreGame.CatHiddenUI.DEFEAT_DURATION;
        }

        if (actionType === CoreGame.CatHiddenUI.ACTION_KEY_SWAP) {
            // Pure layer change — no movement cue. Return 0 (swap immediately);
            // ReplaceSelfAction rebuilds this UI and _playStateLoop picks the right
            // loop ('init' for HIDDEN, 'idle' for VISIBLE) from the new state.
            return 0;
        }

        return 0;
    },

    // Any match that deals damage (color-blind) -> flinch.
    playTakeDamageEffect: function (amount, row, col) {
        if (this.spine) this._playOneShot(CoreGame.CatHiddenUI.ANIM_HIT);
        return 0.2;
    }
});

// Logical type ids (mirror res/newBlock/mapID.json + 13000/13001.json).
CoreGame.CatHiddenUI.TYPE_VISIBLE = 13000;
CoreGame.CatHiddenUI.TYPE_HIDDEN  = 13001;

// Spine asset (full path from res root; preloaded via WebResource.js).
CoreGame.CatHiddenUI.SPINE_PATH = "res/newBlock/BlockUI/spine/cat/hidden_cat";
// Texture the atlas references by its page-name (first line of hidden_cat.atlas =
// hidden_cat.png). Must match that page-name exactly so the engine resolves the same
// cached file that sp._atlasLoader.load requests.
CoreGame.CatHiddenUI.TEXTURE_PATH = "res/newBlock/BlockUI/spine/cat/hidden_cat.png";

// Animation set (names straight from the spine, Spine 3.7.94). The state swap is a
// pure layer change (no move_out/move_in cue), so only these are used.
CoreGame.CatHiddenUI.ANIM_INIT   = "init";   // level-entrance one-shot
CoreGame.CatHiddenUI.ANIM_IDLE   = "idle";
CoreGame.CatHiddenUI.ANIM_HIT    = "hit";
CoreGame.CatHiddenUI.ANIM_DEFEAT = "defeat";

// Custom action key (mirrors res/newBlock/13000.json + 13001.json). Dispatched by
// CheckAttributeAction once turnCount hits 2 -> ReplaceSelfAction swaps the state.
CoreGame.CatHiddenUI.ACTION_KEY_SWAP = "action_0";

// Layout for the 2x2 footprint — starting values, tune in-game.
CoreGame.CatHiddenUI.SCALE = 0.5;
CoreGame.CatHiddenUI.OFFSET_X = 0;
CoreGame.CatHiddenUI.OFFSET_Y = 0;
CoreGame.CatHiddenUI.DEFEAT_DURATION = 0.5;
