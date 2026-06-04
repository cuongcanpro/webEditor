/**
 * CatShootPuUI — spine visual for the 2x2 "Mèo bắn PU" boss (13010).
 *
 * Single state (no visible/hidden swap like CatHiddenUI). The spine
 * (res/newBlock/BlockUI/spine/cat/shoot_pu_cat, Spine 3.7.94) drives the whole
 * visual; the JSON's static `visual.path` is only the editor-palette icon.
 *
 * Lazy-load guard copied from CatHiddenUI: the cat spine is NOT in resAni, so its
 * atlas/json/page-texture may not be cached when the UI builds. Building before the
 * PAGE TEXTURE (shoot_pu_cat.png, first line of shoot_pu_cat.atlas) is cached crashes
 * the engine, so we load the 3 files first when needed, then build.
 *
 * NOTE: spine base name is `shoot_pu_cat` while the palette icon is `cat_shoot_pu`
 * (reversed) — do not mix them up.
 *
 * Color-blind: every adjacent / over match deals damage, so playTakeDamageEffect
 * always plays the hit reaction. Death -> defeat. The PU-destroy ability lives in
 * FindAndDestroyPowerUpAction, which calls playAimAndShoot() here to time the kill.
 *
 * Scale / offset / timings are starting values — tune in-game.
 */
var CoreGame = CoreGame || {};

CoreGame.CatShootPuUI = CoreGame.ElementUI.extend({
    spine: null,

    // BlockerFactory wiring: new UIClass(element, path, scale). path/scale unused.
    ctor: function (element, spritePath, spriteScale) {
        this._super(element);
    },

    // Build the spine instead of a sprite. (Called by ElementUI.ctor.)
    initSprite: function () {
        if (typeof gv === 'undefined' || !gv.createSpineAnimation) return;

        var path = CoreGame.CatShootPuUI.SPINE_PATH;
        var tex = CoreGame.CatShootPuUI.TEXTURE_PATH;

        // Gate on the PAGE TEXTURE (not the atlas): the engine resolves the page via
        // sp._atlasLoader.load -> cc.textureCache.addImage(dir + page-name). If the
        // png isn't cached the first render binds a null GL texture (blank attachments).
        var texCached = (typeof cc !== 'undefined' && cc.loader && cc.loader.getRes)
            ? !!cc.loader.getRes(tex)
            : true; // can't tell -> assume cached, build directly

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
            this.spine = gv.createSpineAnimation(CoreGame.CatShootPuUI.SPINE_PATH);
            if (!this.spine) {
                cc.log("CatShootPuUI: createSpineAnimation returned null for " + CoreGame.CatShootPuUI.SPINE_PATH);
                return;
            }

            this.spine.setScale(CoreGame.CatShootPuUI.SCALE);
            this.spine.setPosition(CoreGame.CatShootPuUI.OFFSET_X, CoreGame.CatShootPuUI.OFFSET_Y);
            this.addChild(this.spine);
            this.spine.y = -CoreGame.Config.CELL_SIZE * 0.65; // anchor near bottom of 2x2 box

            if (this.spine.setToSetupPose) this.spine.setToSetupPose();
            else if (this.spine.setSlotsToSetupPose) this.spine.setSlotsToSetupPose();

            this._playInitThenIdle();
        } catch (e) {
            this.spine = null;
            cc.log("CatShootPuUI: spine build failed: " + e);
        }
    },

    _playLoop: function (name) {
        if (!this.spine || !this.spine.setAnimation) return;
        try { this.spine.setAnimation(0, name, true); } catch (e) {}
    },

    // One-shot on track 0, then fall back to the looping idle.
    _playOneShot: function (name) {
        if (!this.spine || !this.spine.setAnimation) return;
        try {
            this.spine.setAnimation(0, name, false);
            if (this.spine.addAnimation)
                this.spine.addAnimation(0, CoreGame.CatShootPuUI.ANIM_IDLE, true, 0);
        } catch (e) {}
    },

    // One-shot with NO idle follow (death — element is removed right after).
    _playFinal: function (name) {
        if (!this.spine || !this.spine.setAnimation) return;
        try { this.spine.setAnimation(0, name, false); } catch (e) {}
    },

    // Level-entrance: play 'init' once, then loop idle.
    _playInitThenIdle: function () {
        if (!this.spine || !this.spine.setAnimation) return;
        try {
            this.spine.setAnimation(0, CoreGame.CatShootPuUI.ANIM_INIT, false);
            if (this.spine.addAnimation)
                this.spine.addAnimation(0, CoreGame.CatShootPuUI.ANIM_IDLE, true, 0);
        } catch (e) {}
    },

    // REMOVE (death) plays defeat. Other action types are inert.
    playAnimation: function (actionType) {
        if (!this.spine) return this._super(actionType);

        if (actionType === CoreGame.ElementObject.ACTION_TYPE.REMOVE) {
            this._playFinal(CoreGame.CatShootPuUI.ANIM_DEFEAT);
            return CoreGame.CatShootPuUI.DEFEAT_DURATION;
        }

        return 0;
    },

    // Any match that deals damage (color-blind) -> flinch.
    playTakeDamageEffect: function (amount, row, col) {
        if (this.spine) this._playOneShot(CoreGame.CatShootPuUI.ANIM_HIT);
        return 0.2;
    },

    /**
     * Aim + shoot cue, called by FindAndDestroyPowerUpAction right before it
     * silently destroys the picked PUs. Plays the 'attack' clip (aim+shoot are baked
     * into one spine animation here) and returns how long the action should wait
     * before the PUs vanish, so the destroy lands on the "shoot" beat.
     *
     * `picks` = [{row, col, pu}] target list (kept for a future laser-line VFX —
     * effect layer, out of scope for the logic-first pass).
     *
     * Returns the REAL length of the attack clip (read off the spine track entry, same
     * way SpineElementUI does) so the caller destroys the PUs exactly when the shoot
     * animation ends — not on a guessed constant. ATTACK_DURATION is only the fallback
     * when the entry doesn't expose a duration; 0 when the spine is unavailable so the
     * action destroys immediately.
     */
    playAimAndShoot: function (picks, animKey) {
        if (!this.spine || !this.spine.setAnimation) return 0;
        var name = animKey || CoreGame.CatShootPuUI.ANIM_ATTACK;
        var dur = CoreGame.CatShootPuUI.ATTACK_DURATION;
        try {
            var entry = this.spine.setAnimation(0, name, false);
            if (entry) {
                dur = entry.duration || (entry.animation ? entry.animation.duration : dur);
            }
            // Return to idle after the one-shot attack.
            if (this.spine.addAnimation)
                this.spine.addAnimation(0, CoreGame.CatShootPuUI.ANIM_IDLE, true, 0);
        } catch (e) {}
        return dur;
    }
});

// Logical type id (mirror res/newBlock/mapID.json + 13010.json).
CoreGame.CatShootPuUI.TYPE = 13010;

// Spine asset (full path from res root). Base name `shoot_pu_cat` (NOT cat_shoot_pu).
CoreGame.CatShootPuUI.SPINE_PATH = "res/newBlock/BlockUI/spine/cat/shoot_pu_cat";
// Page texture referenced by shoot_pu_cat.atlas line 1 — must match exactly so the
// engine resolves the same cached file sp._atlasLoader.load requests.
CoreGame.CatShootPuUI.TEXTURE_PATH = "res/newBlock/BlockUI/spine/cat/shoot_pu_cat.png";

// Animation set (names from the spine: init, idle, attack, hit, defeat).
// move_in/move_out/run exist in the spine but this boss never moves.
CoreGame.CatShootPuUI.ANIM_INIT   = "init";   // level-entrance one-shot
CoreGame.CatShootPuUI.ANIM_IDLE   = "idle";
CoreGame.CatShootPuUI.ANIM_ATTACK = "attack"; // aim+shoot baked into one clip
CoreGame.CatShootPuUI.ANIM_HIT    = "hit";
CoreGame.CatShootPuUI.ANIM_DEFEAT = "defeat";

// Layout for the 2x2 footprint + timings — starting values, tune in-game.
CoreGame.CatShootPuUI.SCALE = 0.5;
CoreGame.CatShootPuUI.OFFSET_X = 0;
CoreGame.CatShootPuUI.OFFSET_Y = 0;
CoreGame.CatShootPuUI.DEFEAT_DURATION = 0.5;
CoreGame.CatShootPuUI.ATTACK_DURATION = 0.4; // FALLBACK only — real attack-clip length is read off the spine at runtime
