/**
 * ColorCabinet (type 18000) — 2x2 blocker with four fixed-color bottles.
 * Bottles: color 1 (TL), 2 (TR), 3 (BL), 4 (BR). Each HP 1; the whole
 * cabinet clears only when all four bottles are broken.
 * See docs/superpowers/specs/2026-05-31-color-cabinet-design.md
 */
var CoreGame = CoreGame || {};

CoreGame.ColorCabinet = CoreGame.Blocker.extend({
    // NOTE: bottle state (`_slotAlive`) is the source of truth for this blocker,
    // not `hitPoints`. The cabinet never routes through Blocker.takeDamage /
    // updateHPBar; ColorBottleTakeDamageAction calls breakBottle() directly.
    // maxHP:4 is kept only so the 2x2 footprint reads as a 4-"hit" object.
    configData: {
        maxHP: 4
    },

    ctor: function () {
        this._super();
        this.layerBehavior = CoreGame.LayerBehavior.EXCLUSIVE;
        this.size = cc.size(2, 2);
        // Bottles are tracked per SLOT (0..3 = TL,TR,BL,BR), not per color, so two
        // slots may share a color when the level has fewer than 4 gem colors.
        // Slot colors are resolved lazily from the board palette — see
        // getSlotColors() — once boardMgr is available (set before the UI builds).
        this._slotAlive = [true, true, true, true];
        this._slotColors = null;
        // Slots "đã được Plane đặt chỗ" trong lượt này (key = slot index). Mỗi PU
        // Plane reserve một slot riêng (reserveBottleColor) để bay đúng vào chai nó
        // sẽ phá và để nhiều Plane không cùng nhắm một chai. Reset ở onFinishTurn.
        this._reserved = {};
        // SIDE_MATCH: adjacent gem matches (onMatchNearby) — the normal break path.
        this.addAction(
            CoreGame.ElementObject.ACTION_TYPE.SIDE_MATCH,
            new CoreGame.Strategies.ColorBottleTakeDamageAction()
        );
        // MATCH: PUs damage cells via matchElement() which dispatches MATCH, not
        // SIDE_MATCH. Without this a bomb/rocket sweeping the cabinet breaks no
        // bottle. PU activations are deduped on the element, so registering both
        // never double-breaks for one activation.
        this.addAction(
            CoreGame.ElementObject.ACTION_TYPE.MATCH,
            new CoreGame.Strategies.ColorBottleTakeDamageAction()
        );
    },

    init: function (row, col, type, hitPoints) {
        // Tủ nước màu LUÔN 4 máu (4 chai), cố định — bỏ qua hitPoints designer
        // đặt trong config level (không cho tăng/giảm).
        this._super(row, col, type, 4);
        return this;
    },

    // 18000 >= BASE_MONSTER_TYPE (10000): must NOT be treated as a monster.
    isMonster: function () { return false; },

    /**
     * The 4 bottle colors (one per slot), derived from the level's available gem
     * colors instead of a fixed 1..4. Rule: always 4 bottles — repeat colors when
     * the level has fewer than 4 colors, take the first 4 (in gemTypes order) when
     * it has more. Resolved once boardMgr.gemTypes is known; falls back to 1..4.
     */
    getSlotColors: function () {
        if (this._slotColors) return this._slotColors;
        var gt = this.boardMgr && this.boardMgr.gemTypes;
        var pool = [];
        if (Array.isArray(gt)) {
            for (var i = 0; i < gt.length; i++) {
                var t = gt[i];
                if (t >= 1 && t <= 6 && pool.indexOf(t) < 0) pool.push(t);
            }
        }
        if (pool.length === 0) {
            // Palette not resolved yet — return a transient fallback WITHOUT caching
            // so a later call (after gemTypes is set) can pick up the real palette.
            if (!this.boardMgr) return [1, 2, 3, 4];
            pool = [1, 2, 3, 4];
        }
        var n = pool.length;
        this._slotColors = [pool[0 % n], pool[1 % n], pool[2 % n], pool[3 % n]];
        return this._slotColors;
    },

    getRemainingColors: function () {
        var colors = this.getSlotColors();
        var out = [];
        for (var i = 0; i < 4; i++) {
            if (this._slotAlive[i] && out.indexOf(colors[i]) < 0) out.push(colors[i]);
        }
        return out;
    },

    /**
     * Re-derive bottle colors from the current board palette and re-tint the UI.
     * Used by the editor when the designer toggles the active gem colors after the
     * cabinet was already placed (runtime resolves colors once, so it needs a nudge).
     */
    refreshPalette: function () {
        this._slotColors = null;
        var colors = this.getSlotColors();
        if (this.ui && typeof this.ui.applyBottleColors === 'function') {
            this.ui.applyBottleColors(colors);
        }
    },

    /**
     * Đặt chỗ chai tiếp theo cho một PU Plane: trả về màu nhỏ nhất còn sống và
     * CHƯA bị Plane khác đặt chỗ trong lượt này, để Plane bay đúng vào chai đó.
     * Nếu mọi chai còn lại đã được đặt chỗ thì dùng lại chai nhỏ nhất. 0 = hết.
     */
    reserveBottleColor: function () {
        var colors = this.getSlotColors();
        if (!this._reserved) this._reserved = {};
        // First alive, unreserved slot.
        for (var i = 0; i < 4; i++) {
            if (this._slotAlive[i] && !this._reserved[i]) {
                this._reserved[i] = true;
                return colors[i];
            }
        }
        // All alive slots already reserved → reuse the first alive one. 0 = none left.
        for (var k = 0; k < 4; k++) {
            if (this._slotAlive[k]) return colors[k];
        }
        return 0;
    },

    breakBottle: function (color, row, col) {
        var colors = this.getSlotColors();
        // Break the first still-alive slot whose color matches (so duplicate-color
        // bottles break one at a time across repeated matches of that color).
        var idx = -1;
        for (var i = 0; i < 4; i++) {
            if (this._slotAlive[i] && colors[i] === color) { idx = i; break; }
        }
        if (idx < 0) return;
        this._slotAlive[idx] = false;
        if (this._reserved) this._reserved[idx] = false;
        if (this.ui && typeof this.ui.breakBottle === 'function') {
            this.ui.breakBottle(idx);
        }
        var anyAlive = false;
        for (var j = 0; j < 4; j++) {
            if (this._slotAlive[j]) { anyAlive = true; break; }
        }
        if (!anyAlive) {
            this.doExplode(
                row !== undefined ? row : (this.position ? this.position.x : -1),
                col !== undefined ? col : (this.position ? this.position.y : -1)
            );
        }
    },

    /**
     * End-of-turn anti-stuck. Called by BoardMgr's per-element onFinishTurn
     * loop. For each still-alive bottle color absent from the board, queue a
     * forced spawn of that color and ensure the spawn strategy is wrapped so
     * the queue is drained.
     */
    onFinishTurn: function () {
        this._super();
        // Lượt đã giải quyết xong — xoá mọi đặt chỗ chai để lượt sau bắt đầu sạch.
        this._reserved = {};
        var bm = this.boardMgr;
        if (!bm) return;
        this._ensureAntiStuckStrategy(bm);

        var remaining = this.getRemainingColors();
        if (remaining.length === 0) return;

        var present = this._boardColorsPresent(bm);
        if (!bm._forceSpawnColors) bm._forceSpawnColors = [];
        for (var i = 0; i < remaining.length; i++) {
            var color = remaining[i];
            if (!present[color] && bm._forceSpawnColors.indexOf(color) === -1) {
                bm._forceSpawnColors.push(color);
                if (typeof CoreGame.RemoteLog !== 'undefined') {
                    CoreGame.RemoteLog.log("[AntiStuck] ColorCabinet queueing missing color " + color);
                }
            }
        }
    },

    _boardColorsPresent: function (bm) {
        var present = {};
        for (var r = 0; r < bm.rows; r++) {
            for (var c = 0; c < bm.cols; c++) {
                var slot = bm.getSlot(r, c);
                if (!slot || !slot.listElement) continue;
                for (var k = 0; k < slot.listElement.length; k++) {
                    var el = slot.listElement[k];
                    if (el && el.type >= 1 && el.type <= 6) present[el.type] = true;
                }
            }
        }
        return present;
    },

    _ensureAntiStuckStrategy: function (bm) {
        if (bm._antiStuckInstalled) return;
        if (!bm.dropMgr || typeof bm.dropMgr.setSpawnStrategy !== 'function') {
            if (typeof CoreGame.RemoteLog !== 'undefined') {
                CoreGame.RemoteLog.log("[AntiStuck] cannot install strategy: dropMgr.setSpawnStrategy unavailable");
            }
            return;
        }
        var base = bm.dropMgr.spawnStrategy;
        var wrapped = new CoreGame.DropStrategy.AntiStuckSpawnStrategy(base);
        bm.dropMgr.setSpawnStrategy(wrapped);
        bm._antiStuckInstalled = true;
    },

    createUIInstance: function () {
        return new CoreGame.ColorCabinetUI(this);
    },

    getTypeName: function () {
        return 'color_cabinet';
    }
});

if (CoreGame.Config.ElementType && CoreGame.Config.ElementType.COLOR_CABINET) {
    CoreGame.ElementObject.register(CoreGame.Config.ElementType.COLOR_CABINET, CoreGame.ColorCabinet);
}
