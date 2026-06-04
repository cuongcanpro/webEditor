/**
 * SlimeUI - per-cell visual for the cell-loss slimes, rendered as a real Spine
 * autotile using the DUAL-GRID technique (ported from m3rpg SlimeTilesetHandler).
 *
 *   Slime Hiền  (12000) → res/modules/game/animation/spine/slime/01  (green)
 *   Slime Ác    (12001) → res/modules/game/animation/spine/slime/06
 *   Slime Chúa  (12002) → SlimeKingUI (folder 07, tinted per match color) + crown
 *
 * Dual-grid: instead of one tile per cell, a tile spine is placed at every CELL
 * CORNER (the grid offset by half a cell). Each corner samples the 4 cells around
 * it (2×2) → a 4-bit mask → DUAL_TILE picks the tileset whose membrane/quadrants
 * match. Because a corner only depends on its 4 neighbours, the footprint always
 * reads as one connected jelly and re-shapes seamlessly when a cell is lost/regrown
 * — no seams, no clipping, no per-cell whole-tile mismatch. The tile spines self-
 * position their content at the node (RECENTER not needed); the same bone layout
 * ships in folders 01/04/06, so this is folder-independent.
 *
 * Eyes: one eye spine per column on the TOP row of the body's centre block — TWO
 * eyes (eye_01 + eye_02) when the footprint has a solid 2×2, a single eye on a thin
 * body (ported from the reference _refreshCenter). Cell loss / regen play eye-hit +
 * expand. If Spine is unavailable each cell falls back to a tinted tile so logic
 * never depends on the art loading.
 *
 * Hooks from logic (unchanged contract):
 *   - updateVisual()                 ← adds new cells (spawn/regen) + retile
 *   - playExplodeEffect(hp,row,col)  ← drops the lost cell + "−1" + retile
 *   - playRegenFx(row,col)           ← expand FX + "+1" pop on the regrown cell
 *   - playRegenFail()                ← shake the body
 */
var CoreGame = CoreGame || {};

CoreGame.SlimeUI = CoreGame.CustomElementUI.extend({

    ctor: function (element, jsonPath) {
        this._cellTiles = [];   // [{ r, c, obj }] — footprint; obj = persisted prop id
        this._dualSpines = [];  // active dual-grid tile spines (pooled)
        this._fallbackTiles = [];
        this._objectMap = {};   // "r_c" → decorative prop spine (barrels/cans), persisted
        this._eyeNodes = [];    // 1–2 eye spines (2 when the body has a solid 2×2 block)
        this._eyeCells = [];    // [{ r, c }] — cell each eye sits on (top row of the centre block)
        this._eyeFront = null;  // first eye cell — decor anchor (e.g. King crown)
        this._super(element, jsonPath);
        // We render our own layers, so hide the single-node placeholders that would
        // otherwise sit at the board origin (stray corner box + "1" HP label).
        if (this.jsonNode) this.jsonNode.setVisible(false);
        if (this.sprBg) this.sprBg.setVisible(false);
        if (this.lbState) this.lbState.setVisible(false);

        this._dualLayer = new cc.Node();
        this._dualLayer.setCascadeOpacityEnabled(true);
        this.addChild(this._dualLayer, this._zCell());

        this.updateVisual();
    },

    TILE_PATH: "res/modules/game/board/nen/tile_BG.png",

    // type → spine asset folder. King (12002 → 07) tints its slate body per match color.
    SLIME_FOLDER: { 12000: "01", 12001: "06", 12002: "07" },

    /** True for slimes that have real Spine art. */
    _usesSpine: function () {
        return !!(this._slimeFolder() &&
            typeof gv !== "undefined" && gv.createSpineAnimation &&
            typeof sp !== "undefined" && sp.SkeletonAnimation);
    },

    _slimeFolder: function () {
        var t = this.element ? this.element.type : 0;
        return this.SLIME_FOLDER[t] || null;
    },

    _spineBase: function (num) {
        return "res/modules/game/animation/spine/slime/" + this._slimeFolder() + "/tileset_" + num;
    },

    // The tiles were exported on a 120u cell pitch; map the board CELL_SIZE to it.
    _spineScale: function () {
        var cell = (CoreGame.Config && CoreGame.Config.CELL_SIZE) || 73;
        return (cell / CoreGame.SlimeUI.CELL_UNITS) * CoreGame.SlimeUI.SPINE_SCALE;
    },

    _tilePath: function () {
        return (this.element && this.element.configData && this.element.configData.grid_path)
            || this.TILE_PATH;
    },

    /** Tint for the placeholder tile path (King + Spine-less fallback). */
    _cellColor: function () {
        var t = this.element ? this.element.type : 0;
        if (t === 12002) { // Slime Chúa — follow the active match color (level palette)
            var rgb = CoreGame.ElementUI.MATCH_COLOR_TINT[this._kingColor()];
            if (rgb) return cc.color(rgb[0], rgb[1], rgb[2]);
            return cc.color(120, 232, 130);
        }
        if (t === 12001) return cc.color(120, 96, 150);  // Slime Ác — murky purple
        return cc.color(120, 232, 130);                  // Slime Hiền — green
    },

    /** King's active match color, clamped to the level gem palette (boardMgr.gemTypes)
     *  and stored back on the element so the tint and the side-match gate always
     *  agree — even at spawn before the first CycleMatchColorAction tick. */
    _kingColor: function () {
        var el = this.element;
        var mc = (el && typeof el._matchColor === 'number') ? el._matchColor : null;
        var gt = el && el.boardMgr && el.boardMgr.gemTypes;
        var pool = [];
        if (Array.isArray(gt)) {
            for (var i = 0; i < gt.length; i++) {
                var g = gt[i];
                if (g >= 1 && g <= 6 && pool.indexOf(g) < 0) pool.push(g);
            }
        }
        if (mc !== null && (pool.length === 0 || pool.indexOf(mc) >= 0)) return mc;
        var init = pool.length ? pool[0] : (mc !== null ? mc : 1);
        if (el) el._matchColor = init;
        return init;
    },

    /** Per-tile Spine body tint (null = leave the art untinted). King overrides this
     *  to recolor its slate body to the active match color. */
    _bodyTint: function () { return null; },

    _zCell: function () {
        return (CoreGame.LayerBehavior && CoreGame.LayerBehavior.EXCLUSIVE) || 1;
    },

    // ── cell bookkeeping ──────────────────────────────────────────────────────
    _hasCell: function (r, c) {
        for (var i = 0; i < this._cellTiles.length; i++) {
            if (this._cellTiles[i].r === r && this._cellTiles[i].c === c) return true;
        }
        return false;
    },

    _maskAt: function (r, c) { return this._hasCell(r, c) ? 1 : 0; },

    /** Static icon path (target panel / editor palette use the same art). */
    _iconPath: function () {
        var t = this.element ? this.element.type : 0;
        return "res/modules/game/element/icon/" + t + ".png";
    },

    /** Render an icon when there's no board (editor palette, target list, element
     *  picker). Prefer the real Spine — a single 1×1 slime is just its 4 convex
     *  corner tiles + the eye, laid out in local space (no gridToPixel needed) — so
     *  the icon animates exactly like the in-board body. Falls back to the flat PNG
     *  when Spine is unavailable. */
    _drawIcon: function () {
        if (this._iconBuilt) return;
        this._iconBuilt = true;
        if (this._usesSpine() && this._drawIconSpine()) return;
        var spr = null;
        try { spr = new cc.Sprite(this._iconPath()); } catch (e) { spr = null; }
        if (spr) { this.addChild(spr, this._zCell()); this._iconSpr = spr; }
    },

    _drawIconSpine: function () {
        var CS = (CoreGame.Config && CoreGame.Config.CELL_SIZE) || 73;
        var sc = this._spineScale();
        var bt = this._bodyTint();
        // The 4 corners of one isolated cell → convex tiles, forming a rounded blob.
        // {dx,dy} = corner offset (cells), mask = its 4-cell signature → DUAL_TILE.
        var corners = [
            { dx: -0.5, dy: -0.5, mask: "0100" }, { dx: 0.5, dy: -0.5, mask: "1000" },
            { dx: -0.5, dy: 0.5, mask: "0001" }, { dx: 0.5, dy: 0.5, mask: "0010" }
        ];
        var made = 0;
        for (var i = 0; i < corners.length; i++) {
            var num = this._pad2(CoreGame.SlimeUI.DUAL_TILE[corners[i].mask]);
            var spine = null;
            try { spine = gv.createSpineAnimation(this._spineBase(num)); } catch (e) { spine = null; }
            if (!spine) continue;
            spine.setScale(sc);
            spine.setPosition(corners[i].dx * CS, corners[i].dy * CS);
            this._safeSetAnim(spine, "tileset_" + num, true);
            this._stripDecor(spine);
            if (bt) spine.setColor(bt);
            this.addChild(spine, this._zCell());
            this._dualSpines.push(spine);
            made++;
        }
        if (!made) return false;
        // A 1×1 icon has no 2×2 block → a single eye (index 0 → eye_01) centred.
        var eye = null;
        try { eye = gv.createSpineAnimation(this._spineBase("eye")); } catch (e2) { eye = null; }
        if (eye) {
            eye.setScale(sc);
            eye.setPosition(0, 0);
            this._safeSetAnim(eye, this._eyeIdleAnim(0), true);
            this.addChild(eye, this._zCell() + 1000);
            this._eyeNodes = [eye];
        }
        return true;
    },

    /** Add a record for every current cell that doesn't have one yet, then retile. */
    updateVisual: function () {
        if (!this.element) return;
        if (!this.element.boardMgr) { this._drawIcon(); return; }
        var cells = this.element.cells;
        if (!cells) return;
        for (var i = 0; i < cells.length; i++) {
            if (!this._hasCell(cells[i].r, cells[i].c)) {
                this._cellTiles.push({ r: cells[i].r, c: cells[i].c });
            }
        }
        this._refreshBody();
        this._refreshEye();
        this._refreshObjects();
        this._refreshDecor();
    },

    _refreshBody: function () {
        if (this._usesSpine()) this._refreshDual();
        else this._refreshFallback();
    },

    // ── dual-grid autotile ────────────────────────────────────────────────────
    /** Pixel position of the cell CORNER shared by cells (r,c) (r-1,c) (r,c-1)
     *  (r-1,c-1) = the bottom-left corner of cell (r,c). */
    _dualPos: function (r, c) {
        var p = this.element.boardMgr.gridToPixel(r, c);
        var h = ((CoreGame.Config && CoreGame.Config.CELL_SIZE) || 73) * 0.5;
        return cc.p(p.x - h, p.y - h);
    },

    _pad2: function (n) { return ("0" + n).slice(-2); },

    /** Rebuild every dual-grid tile spine for the current footprint. */
    _refreshDual: function () {
        for (var i = 0; i < this._dualSpines.length; i++) this._releaseSpine(this._dualSpines[i]);
        this._dualSpines = [];
        this._clearFallback();
        if (this._cellTiles.length === 0) return;

        var minR = Infinity, maxR = -Infinity, minC = Infinity, maxC = -Infinity;
        for (var k = 0; k < this._cellTiles.length; k++) {
            var e = this._cellTiles[k];
            if (e.r < minR) minR = e.r; if (e.r > maxR) maxR = e.r;
            if (e.c < minC) minC = e.c; if (e.c > maxC) maxC = e.c;
        }

        var sc = this._spineScale();
        var bt = this._bodyTint();
        // One corner per (row, col) over the footprint + a one-cell border so the
        // outer membranes get their edge/convex tiles. Corner (y,x) samples cells
        // (y,x-1)(y,x)(y-1,x-1)(y-1,x) → screen-up = row+1 (board row axis is up).
        for (var y = minR; y <= maxR + 1; y++) {
            for (var x = minC; x <= maxC + 1; x++) {
                var mask = "" + this._maskAt(y, x - 1) + this._maskAt(y, x)
                    + this._maskAt(y - 1, x - 1) + this._maskAt(y - 1, x);
                var type = CoreGame.SlimeUI.DUAL_TILE[mask];
                if (type === undefined || type < 0) continue;

                var num = this._pad2(type);
                var spine = null;
                try { spine = gv.createSpineAnimation(this._spineBase(num)); } catch (ex) { spine = null; }
                if (!spine) continue;
                spine.setScale(sc);
                spine.setPosition(this._dualPos(y, x));
                this._safeSetAnim(spine, "tileset_" + num, true);
                this._stripDecor(spine);
                if (bt) spine.setColor(bt);
                this._dualLayer.addChild(spine, 0);
                this._dualSpines.push(spine);
            }
        }
    },

    // ── fallback (no Spine) ───────────────────────────────────────────────────
    _refreshFallback: function () {
        this._clearFallback();
        var cellSize = (CoreGame.Config && CoreGame.Config.CELL_SIZE) || 60;
        var col = this._cellColor();
        for (var i = 0; i < this._cellTiles.length; i++) {
            var e = this._cellTiles[i];
            var p = this.element.boardMgr.gridToPixel(e.r, e.c);
            var tile = new cc.Scale9Sprite(this._tilePath());
            tile.setContentSize(cellSize * 0.96, cellSize * 0.96);
            tile.setColor(col);
            tile.setPosition(p);
            this._dualLayer.addChild(tile, 0);
            this._fallbackTiles.push(tile);
        }
    },

    _clearFallback: function () {
        for (var i = 0; i < this._fallbackTiles.length; i++) this._fallbackTiles[i].removeFromParent(true);
        this._fallbackTiles = [];
    },

    _safeSetAnim: function (spine, name, loop) {
        try { spine.setAnimation(0, name, !!loop); } catch (e) { }
    },

    /** Hide the loose decoration slots (ambient bubbles + attack tendrils) on a body
     *  tile. On border/corner tiles these float OUTSIDE the footprint, so a freshly
     *  spawned slime looks like it has stray bits beyond its cells. We only keep the
     *  jelly body (slot "tileset_NN"). Toggle via HIDE_TILE_DECOR. */
    _stripDecor: function (spine) {
        if (!CoreGame.SlimeUI.HIDE_TILE_DECOR) return;
        try {
            var sk = spine._skeleton;
            var slots = sk ? sk.slots : null;
            if (!slots) return;
            for (var i = 0; i < slots.length; i++) {
                var s = slots[i];
                var nm = (s && s.data && s.data.name) ? s.data.name : "";
                if (CoreGame.SlimeUI.DECOR_RE.test(nm)) {
                    try { spine.setAttachment(nm, null); } catch (e) { }
                }
            }
        } catch (e) { }
    },

    /** Detach a pooled spine and return it to gv's pool (retained on create). */
    _releaseSpine: function (spine) {
        if (!spine) return;
        try {
            spine.stopAllActions();
            spine.removeFromParent(false);
            var key = spine._poolKey;
            if (key && gv.spinePools && gv.spinePools[key] &&
                gv.spinePools[key].indexOf(spine) === -1) {
                gv.spinePools[key].push(spine);
            }
        } catch (e) { }
    },

    // ── eyes ──────────────────────────────────────────────────────────────────
    /** Place the eye pair on the body exactly like the reference _refreshCenter:
     *  find the centre block (the most-interior solid 2×2, or the centroid-nearest
     *  live cell for thin shapes), then drop ONE eye spine per column on the TOP row
     *  of that block. So a body with a solid 2×2 shows TWO eyes (left = eye_01,
     *  right = eye_02) side by side; a thin/1-wide body shows a single eye. The block
     *  is always solid, so eyes never land in a concave hole. */
    _refreshEye: function () {
        if (!this._usesSpine() || this._cellTiles.length === 0) {
            this._releaseEyes();
            this._eyeCells = [];
            this._eyeFront = null;
            return;
        }
        var bm = this.element.boardMgr;
        var c = this._findCenter();              // { size, x, y } — block bottom-left (x=col, y=row)
        // Eyes sit on the TOP row of the block (reference: y + size-1), one per column.
        var cells = [];
        for (var i = 0; i < c.size; i++) cells.push({ r: c.y + (c.size - 1), c: c.x + i });
        this._eyeCells = cells;
        this._eyeFront = cells[0];               // first eye = decor anchor (King crown)

        for (var k = 0; k < cells.length; k++) {
            var eye = this._eyeNodes[k];
            if (!eye) {
                try { eye = gv.createSpineAnimation(this._spineBase("eye")); } catch (e2) { eye = null; }
                if (!eye) continue;
                eye.setScale(this._spineScale());
                this._safeSetAnim(eye, this._eyeIdleAnim(k), true);
                this.addChild(eye, this._zCell() + 1000);
                this._eyeNodes[k] = eye;
            }
            var p = bm.gridToPixel(cells[k].r, cells[k].c);
            eye.setPosition(p.x, p.y);
        }
        // Release any eyes beyond the current size (e.g. body shrank 2×2 → thin).
        for (var m = this._eyeNodes.length - 1; m >= cells.length; m--) {
            this._releaseSpine(this._eyeNodes[m]);
            this._eyeNodes.splice(m, 1);
        }
        if (CoreGame.SlimeUI.OBJECT_DEBUG) {
            cc.log("[SlimeEye] type=" + (this.element && this.element.type) +
                " folder=" + this._slimeFolder() +
                " size=" + c.size + " front=(" + cells[0].r + "," + cells[0].c + ")" +
                " cells=" + this._cellTiles.length);
        }
    },

    /** Centre block for the eyes (ported from the reference _refreshCenter):
     *  { size, x, y } where (x=col, y=row) is the bottom-left cell of the chosen
     *  block. size=2 when the body contains any solid 2×2 (the most-interior one is
     *  picked); else size=1 on the centroid-nearest live cell for thin shapes. */
    _findCenter: function () {
        var cells = this._cellTiles, n = cells.length;
        var best = null, bestDist = -1;
        for (var i = 0; i < n; i++) {
            var x = cells[i].c, y = cells[i].r;          // col, row (row up)
            // (y,x) as bottom-left of a 2×2 (rows y,y+1 · cols x,x+1).
            if (this._hasCell(y, x + 1) && this._hasCell(y + 1, x) && this._hasCell(y + 1, x + 1)) {
                var dist = 1;
                while (this._hasCell(y, x - dist) && this._hasCell(y + 1, x - dist) &&        // left
                    this._hasCell(y - dist, x) && this._hasCell(y - dist, x + 1) &&           // bottom
                    this._hasCell(y, x + 1 + dist) && this._hasCell(y + 1, x + 1 + dist) &&   // right
                    this._hasCell(y + 1 + dist, x) && this._hasCell(y + 1 + dist, x + 1)) {   // top
                    dist++;
                }
                if (dist > bestDist) { best = { x: x, y: y }; bestDist = dist; }
            }
        }
        if (best) return { size: 2, x: best.x, y: best.y };
        // Thin shape (no 2×2): centroid-nearest live cell keeps the eye on a cell.
        var bm = this.element.boardMgr, sx = 0, sy = 0;
        for (var k = 0; k < n; k++) { var p = bm.gridToPixel(cells[k].r, cells[k].c); sx += p.x; sy += p.y; }
        var cx = sx / n, cy = sy / n, fb = cells[0], fbD = Infinity;
        for (var m = 0; m < n; m++) {
            var pm = bm.gridToPixel(cells[m].r, cells[m].c);
            var dm = (pm.x - cx) * (pm.x - cx) + (pm.y - cy) * (pm.y - cy);
            if (dm < fbD) { fbD = dm; fb = cells[m]; }
        }
        return { size: 1, x: fb.c, y: fb.r };
    },

    /** Per-eye idle anim: left eye (idx 0) = eye_01, right eye (idx 1) = eye_02,
     *  matching the reference's "eye_0" + (idx+1). */
    _eyeIdleAnim: function (idx) {
        return "eye_0" + ((idx || 0) + 1);
    },

    /** Play the hit reaction on every eye, then fall back to its idle. */
    _eyeHit: function () {
        for (var i = 0; i < this._eyeNodes.length; i++) {
            var eye = this._eyeNodes[i];
            if (!eye) continue;
            var idle = this._eyeIdleAnim(i);
            this._safeSetAnim(eye, idle + "_hit", false);
            try { eye.addAnimation(0, idle, true); } catch (e) { }
        }
    },

    /** Release all eye spines back to the pool. */
    _releaseEyes: function () {
        for (var i = 0; i < this._eyeNodes.length; i++) this._releaseSpine(this._eyeNodes[i]);
        this._eyeNodes = [];
    },

    /** Re-tint the whole body for the Slime Chúa color rotation — morph to the new
     *  color over COLOR_MORPH_TIME (0.4s) rather than snapping, so the repaint reads
     *  as a smooth transition on the next-color tick. */
    _retintCells: function () {
        var col = this._cellColor();
        var bt = this._bodyTint();
        var d = CoreGame.SlimeUI.COLOR_MORPH_TIME;
        var morph = function (node, c) {
            if (!node || !c) return;
            node.stopActionByTag(CoreGame.SlimeUI.TINT_TAG);
            var a = cc.tintTo(d, c.r, c.g, c.b);
            a.setTag(CoreGame.SlimeUI.TINT_TAG);
            node.runAction(a);
        };
        for (var i = 0; i < this._fallbackTiles.length; i++) morph(this._fallbackTiles[i], col);
        if (bt) for (var j = 0; j < this._dualSpines.length; j++) morph(this._dualSpines[j], bt);
    },

    // ── decorative props (barrels / cans) ──────────────────────────────────────
    /** Number of random prop variants (tileset_objects → object_01..NN). The plain
     *  Slime Hiền has none; Ác/King scatter props like the reference (objectCount
     *  default 5, 0 for the basic slime). */
    _objectCount: function () {
        var t = this.element ? this.element.type : 0;
        return t === 12000 ? 0 : CoreGame.SlimeUI.OBJECT_COUNT;
    },

    /** Scatter props on the body like the reference _refreshObjects: each cell rolls
     *  once (persisted on cell.obj) for a prop with OBJECT_CHANCE; the eye cell stays
     *  clear. Spines are PERSISTED per cell (created once, popped in with a 0.25s
     *  back-ease, kept across refreshes) so they don't restart/flicker on cell loss —
     *  and drawn at full cell scale (the prop is centred on the node by its anim). */
    _refreshObjects: function () {
        var cnt = this._objectCount();
        if (!this._usesSpine() || cnt <= 0 || !this.element.boardMgr || this._cellTiles.length === 0) {
            this._clearObjects(); return;
        }
        var eyes = this._eyeCells || [];
        var bm = this.element.boardMgr;

        // Which cells should hold a prop right now.
        var want = {};
        for (var i = 0; i < this._cellTiles.length; i++) {
            var cell = this._cellTiles[i];
            if (cell.obj === undefined) {
                cell.obj = (Math.random() < CoreGame.SlimeUI.OBJECT_CHANCE)
                    ? (1 + Math.floor(Math.random() * cnt)) : 0;
            }
            if (!cell.obj) continue;
            var onEye = false;                          // leave every eye cell clear
            for (var ei = 0; ei < eyes.length; ei++) {
                if (eyes[ei].r === cell.r && eyes[ei].c === cell.c) { onEye = true; break; }
            }
            if (onEye) continue;
            want[cell.r + "_" + cell.c] = cell;
        }
        // Drop props whose cell is gone / now hosts the eye.
        for (var key in this._objectMap) {
            if (this._objectMap.hasOwnProperty(key) && !want[key]) {
                this._releaseSpine(this._objectMap[key]);
                delete this._objectMap[key];
            }
        }
        // Add the new ones (pop-in once). Existing ones are kept as-is.
        var target = this._spineScale() * CoreGame.SlimeUI.OBJECT_SCALE;
        for (var k in want) {
            if (!want.hasOwnProperty(k) || this._objectMap[k]) continue;
            var c2 = want[k];
            var spine = null;
            try { spine = gv.createSpineAnimation(this._spineBase("objects")); } catch (e) { spine = null; }
            if (!spine) continue;
            var p = bm.gridToPixel(c2.r, c2.c);
            spine.setPosition(p.x, p.y);
            this._safeSetAnim(spine, "object_" + this._pad2(c2.obj), true);
            this._isolateObject(spine, c2.obj); // hide the OTHER scattered prop slots
            spine.setScale(0);
            spine.runAction(cc.scaleTo(0.25, target).easing(cc.easeBackOut()));
            this.addChild(spine, this._zCell() + 50);
            this._objectMap[k] = spine;
            if (CoreGame.SlimeUI.OBJECT_DEBUG) {
                var folder = this._slimeFolder();
                var keep = (CoreGame.SlimeUI.OBJECT_KEEP[folder] || {})[String(c2.obj)];
                cc.log("[SlimeObj] type=" + (this.element && this.element.type) +
                    " folder=" + folder +
                    " cell=(" + c2.r + "," + c2.c + ")" +
                    " pos=(" + Math.round(p.x) + "," + Math.round(p.y) + ")" +
                    " anim=object_" + this._pad2(c2.obj) +
                    " keepSlot=" + keep +
                    " scale=" + target.toFixed(3));
            }
        }
    },

    _clearObjects: function () {
        for (var key in this._objectMap) {
            if (this._objectMap.hasOwnProperty(key)) this._releaseSpine(this._objectMap[key]);
        }
        this._objectMap = {};
    },

    /** The tileset_objects skeleton shows ALL prop slots in setup and the object_NN
     *  anim only scales the non-chosen props to 0 — which doesn't reliably hide them
     *  here, so the off-centre props render at their bone offsets (the stray bits
     *  outside the slime). Hide every prop slot except the one this object_NN centres
     *  (setAttachment null sticks — the anim doesn't keyframe attachments). Keep slot
     *  per folder differs; see OBJECT_KEEP. */
    _isolateObject: function (spine, objIdx) {
        try {
            var map = CoreGame.SlimeUI.OBJECT_KEEP[this._slimeFolder()] || {};
            var keep = map[String(objIdx)] || null;
            var slots = spine._skeleton && spine._skeleton.slots;
            if (!slots) return;
            for (var i = 0; i < slots.length; i++) {
                var nm = slots[i].data && slots[i].data.name;
                if (!nm) continue;
                // hide every prop slot that isn't the chosen one (leave non-prop slots alone)
                if (/^obj/i.test(nm) && nm !== keep) {
                    try { spine.setAttachment(nm, null); } catch (e) { }
                }
            }
        } catch (e) { }
    },

    /** Optional per-type decoration (King crown). No-op for the small slimes. */
    _refreshDecor: function () { },

    // ── hooks ───────────────────────────────────────────────────────────────--
    /** A cell was removed: drop it from the footprint, re-shape, "−1". */
    playExplodeEffect: function (hitpoints, row, col) {
        for (var i = 0; i < this._cellTiles.length; i++) {
            if (this._cellTiles[i].r === row && this._cellTiles[i].c === col) {
                this._cellTiles.splice(i, 1);
                break;
            }
        }
        this._eyeHit();
        this._refreshBody();
        this._refreshEye();
        this._refreshObjects();
        this._refreshDecor();
        this._floatLabelAt("-1", cc.color(190, 248, 188), row, col);
        return 0.3;
    },

    /** Regen +1: the new cell is added by updateVisual; play expand + "+1" on it. */
    playRegenFx: function (row, col) {
        if (this._usesSpine() && this.element && this.element.boardMgr) {
            var p = this.element.boardMgr.gridToPixel(row, col);
            var fx = null;
            try { fx = gv.createSpineAnimation(this._spineBase("expand")); } catch (e) { fx = null; }
            if (fx) {
                fx.setScale(this._spineScale());
                fx.setPosition(p);
                this.addChild(fx, this._zCell() + 500);
                this._safeSetAnim(fx, "tileset_expand", false);
                gv.removeSpineAfterRun(fx);
            }
        }
        this._floatLabelAt("+1", cc.color(255, 176, 255), row, col);
    },

    /** Surrounded — regen failed: a small shake across the whole body. */
    playRegenFail: function () {
        var n = this._dualLayer;
        n.stopActionByTag(CoreGame.SlimeUI.SHAKE_TAG);
        var sh = cc.sequence(
            cc.moveBy(0.04, cc.p(3, 0)), cc.moveBy(0.08, cc.p(-6, 0)),
            cc.moveBy(0.08, cc.p(6, 0)), cc.moveBy(0.04, cc.p(-3, 0))
        );
        sh.setTag(CoreGame.SlimeUI.SHAKE_TAG);
        n.runAction(sh);
    },

    /** Float a short colored label up from a board cell (~0.6s). */
    _floatLabelAt: function (text, color, row, col) {
        if (!this.element || !this.element.boardMgr) return;
        if (typeof row === 'undefined' || typeof col === 'undefined') return;
        var p = this.element.boardMgr.gridToPixel(row, col);
        var lbl = new cc.LabelTTF(text, "font/BalooPaaji2-Bold.ttf", 22);
        lbl.setColor(color || cc.color(255, 255, 255));
        lbl.enableStroke(cc.color(30, 40, 30), 2);
        lbl.setPosition(p.x, p.y);
        var z = (CoreGame.Config && CoreGame.Config.zOrder && CoreGame.Config.zOrder.MATCH_4_EXPLODE)
            ? CoreGame.Config.zOrder.MATCH_4_EXPLODE + 200 : 9999;
        this.addChild(lbl, z);
        lbl.runAction(cc.sequence(
            cc.spawn(
                cc.moveBy(0.6, cc.p(0, 40)).easing(cc.easeOut(2.0)),
                cc.sequence(cc.delayTime(0.25), cc.fadeOut(0.35))
            ),
            cc.removeSelf()
        ));
    }
});

CoreGame.SlimeUI.SHAKE_TAG = 9943;
CoreGame.SlimeUI.TINT_TAG = 9944;
// Hide ambient bubble / attack-tendril decoration slots on the body tiles so a
// fresh slime shows nothing outside its footprint (border/corner tiles float these
// out). false = keep them (matches the reference's looser look).
CoreGame.SlimeUI.HIDE_TILE_DECOR = true;
CoreGame.SlimeUI.DECOR_RE = /^(bubble|attack_tex)/i;
// Slime Chúa color rotation: morph the body to the new color over this many
// seconds (spec: 0.4s repaint) instead of snapping.
CoreGame.SlimeUI.COLOR_MORPH_TIME = 0.4;
// Decorative props (tileset_objects → object_01..NN): how many variants, and the
// per-cell chance one appears. Ported from m3rpg SlimeTilesetHandler (objectCount
// default 5, 25% per cell; the basic slime passes 0 → none).
CoreGame.SlimeUI.OBJECT_COUNT = 5;
CoreGame.SlimeUI.OBJECT_CHANCE = 0.25;
// Prop scale on top of the cell scale. The anim centres ONE prop on the node, but at
// full size (~1 cell) its fronds spill past the cell — and our slimes are small
// (2×2/3×3) so every cell is an edge → it spills outside the slime. Shrink it so the
// prop sits inside its (slime) cell and never pokes out. (Reference uses ~full size
// because its slime clusters are larger, with interior cells to absorb the overflow.)
CoreGame.SlimeUI.OBJECT_SCALE = 0.6;
// Log each prop placement ([SlimeObj] cell/pos/anim/keepSlot). Flip on to debug
// where objects land vs the slime footprint.
CoreGame.SlimeUI.OBJECT_DEBUG = true;
// Per-folder: object_NN → the ONE prop slot that anim centres (keep visible). All
// other prop slots are hidden so their off-centre setup positions don't leak outside
// the slime. Derived from each tileset_objects skeleton (translate-to-origin bone).
CoreGame.SlimeUI.OBJECT_KEEP = {
    "01": { "1": null, "2": "obj_03", "3": "obj_04", "4": "obj_05", "5": "obj_06" },
    "06": { "1": "obj_01", "2": "obj_4", "3": "obj_6", "4": "obj_6", "5": "obj_6" },
    "07": { "1": "obj_02", "2": "obj_03", "3": "obj_04", "4": "obj_05", "5": "obj_6" }
};
// Source cell pitch of the tileset master grid (skeleton units).
CoreGame.SlimeUI.CELL_UNITS = 120;
// Tile spine scale on top of CELL_SIZE/CELL_UNITS. 1.0 = exact cell pitch (dual grid
// is seamless by construction); nudge >1 only if hairline seams show.
CoreGame.SlimeUI.SPINE_SCALE = 1.0;
// Dual-grid lookup (ported from m3rpg SlimeTilesetHandler): the 4-cell corner mask
// "TL TR BL BR" (1 = slime) → tileset index. TL=(r,c-1) TR=(r,c) BL=(r-1,c-1)
// BR=(r-1,c) for a corner at the bottom-left of cell (r,c); screen-up = row+1.
CoreGame.SlimeUI.DUAL_TILE = {
    "0000": -1, "0001": 0, "0010": 2, "0011": 1,
    "0100": 14, "0101": 3, "0110": 12, "0111": 20,
    "1000": 16, "1001": 13, "1010": 9, "1011": 11,
    "1100": 15, "1101": 5, "1110": 4, "1111": 8
};
