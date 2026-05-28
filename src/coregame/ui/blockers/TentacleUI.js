/**
 * TentacleUI - Visual for the Xúc Tú Bạch Tuộc (tentacle octopus) multi-cell blocker.
 *
 * Draws a tapered tentacle body using cc.DrawNode in the board root's coordinate
 * space (same pattern as CloudUI — the node sits at origin and each segment is
 * drawn at the absolute gridToPixel position of its cell).
 *
 * Visual anatomy:
 *   cells[0]    — whirlpool (large purple circle + concentric ring)
 *   cells[1..n-1] — body (teal/green, tapering)
 *   cells[last] — tip (small bright circle)
 *
 * Editor clarity features (always-on so placement is unambiguous):
 *   • Semi-transparent cell background rect for each occupied cell
 *   • White outline around the whole body for contrast on busy boards
 *   • Gold directional arrow extending past the tip
 */
var CoreGame = CoreGame || {};

CoreGame.TentacleUI = cc.Node.extend({
    element: null,
    sprite: null,       // null — kept for interface compatibility with ElementUI consumers
    lbState: null,
    isElementUI: true,
    _drawNode: null,

    ctor: function (element) {
        this._super();
        this.element = element;
        this.setCascadeOpacityEnabled(true);

        this._drawNode = new cc.DrawNode();
        this.addChild(this._drawNode, 1);

        var hp = element.cells ? element.cells.length : 1;
        this.lbState = ccui.Text.create(String(hp), "font/BalooPaaji2-Bold.ttf", 22);
        this.lbState.enableOutline(cc.color(30, 10, 60, 255), 3);
        this.lbState.setColor(cc.color(255, 240, 80));
        this.lbState.setVisible(true);
        this.addChild(this.lbState, 100);

        return true;
    },

    _px: function (r, c) {
        if (this.element && this.element.boardMgr) {
            return this.element.boardMgr.gridToPixel(r, c);
        }
        // Preview mode (button selector, no boardMgr): draw relative to cells[0]
        // so the icon stays centered inside the button regardless of board position.
        var cs = CoreGame.Config.CELL_SIZE;
        var cells = this.element && this.element.cells;
        var baseR = (cells && cells.length > 0) ? cells[0].r : 0;
        var baseC = (cells && cells.length > 0) ? cells[0].c : 0;
        return cc.p((c - baseC) * cs, (r - baseR) * cs);
    },

    _redraw: function () {
        if (!this._drawNode) return;
        this._drawNode.clear();

        var cells = this.element && this.element.cells;
        if (!cells || cells.length === 0) return;

        var cs = CoreGame.Config.CELL_SIZE;
        var hw = cs * 0.46;  // half-cell size for background rects

        // ── Colors ───────────────────────────────────────────────────────────
        var CELL_BG      = cc.color(120,  60, 210,  60);   // translucent purple fill
        var CELL_BORDER  = cc.color(200, 160, 255, 180);   // purple border
        var OUTLINE      = cc.color(255, 255, 255, 210);   // white outline
        var SEG_COLOR    = cc.color( 20,  90, 110, 230);   // teal body segment
        var BODY_COLOR   = cc.color( 30, 160, 170, 245);   // teal body circle
        var WHIRL_COLOR  = cc.color(100,  40, 200, 255);   // deep purple whirlpool
        var TIP_COLOR    = cc.color( 80, 220, 180, 240);   // bright cyan tip
        var SUCKER_COLOR = cc.color(200, 255, 240, 130);   // light sucker highlight
        var ARROW_COLOR  = cc.color(255, 215,  30, 250);   // gold arrow

        // ── Step 1: Cell background rectangles ──────────────────────────────
        for (var i = 0; i < cells.length; i++) {
            var p = this._px(cells[i].r, cells[i].c);
            var verts = [
                cc.p(p.x - hw, p.y - hw),
                cc.p(p.x + hw, p.y - hw),
                cc.p(p.x + hw, p.y + hw),
                cc.p(p.x - hw, p.y + hw)
            ];
            this._drawNode.drawPoly(verts, CELL_BG, 2, CELL_BORDER);
        }

        // ── Step 2: White outline (slightly oversize body, drawn first) ─────
        if (cells.length > 1) {
            for (var i = 0; i < cells.length - 1; i++) {
                var p1 = this._px(cells[i].r, cells[i].c);
                var p2 = this._px(cells[i + 1].r, cells[i + 1].c);
                var frac = i / (cells.length - 1);
                var outW = cs * (0.34 - frac * 0.07);
                this._drawNode.drawSegment(p1, p2, outW, OUTLINE);
            }
        }
        for (var i = cells.length - 1; i >= 0; i--) {
            var pos = this._px(cells[i].r, cells[i].c);
            var outR;
            if (i === 0)                     outR = cs * 0.47;
            else if (i === cells.length - 1) outR = cs * 0.27;
            else { var frac = i / (cells.length - 1); outR = cs * (0.41 - frac * 0.10); }
            this._drawNode.drawDot(pos, outR, OUTLINE);
        }

        // ── Step 3: Colored body segments (tapered) ──────────────────────────
        if (cells.length > 1) {
            for (var i = 0; i < cells.length - 1; i++) {
                var p1 = this._px(cells[i].r, cells[i].c);
                var p2 = this._px(cells[i + 1].r, cells[i + 1].c);
                var frac = i / (cells.length - 1);
                var segW = cs * (0.28 - frac * 0.06);
                this._drawNode.drawSegment(p1, p2, segW, SEG_COLOR);
            }
        }

        // ── Step 4: Body circles (tail → head, so whirlpool is on top) ──────
        for (var i = cells.length - 1; i >= 0; i--) {
            var pos = this._px(cells[i].r, cells[i].c);
            var dotR, dotColor;
            if (i === 0) {
                dotR = cs * 0.42;  dotColor = WHIRL_COLOR;
            } else if (i === cells.length - 1) {
                dotR = cs * 0.22;  dotColor = TIP_COLOR;
            } else {
                var frac = i / (cells.length - 1);
                dotR = cs * (0.36 - frac * 0.10);
                dotColor = BODY_COLOR;
            }
            this._drawNode.drawDot(pos, dotR, dotColor);
        }

        // ── Step 5: Sucker highlights ─────────────────────────────────────────
        for (var i = 1; i < cells.length; i++) {
            var suckerPos = this._px(cells[i].r, cells[i].c);
            var isLast = (i === cells.length - 1);
            this._drawNode.drawDot(suckerPos, cs * (isLast ? 0.07 : 0.10), SUCKER_COLOR);
        }

        // ── Step 6: Whirlpool concentric rings ────────────────────────────────
        var anchorPos = this._px(cells[0].r, cells[0].c);
        this._drawNode.drawDot(anchorPos, cs * 0.22, cc.color(180, 130, 255, 160));
        this._drawNode.drawDot(anchorPos, cs * 0.10, cc.color(230, 200, 255, 220));

        // ── Step 7: Direction arrow past the tip, pointing back toward whirlpool ─
        if (cells.length >= 2) {
            var tipCell  = cells[cells.length - 1];
            var prevCell = cells[cells.length - 2];

            // Direction unit vector: extension direction (whirlpool → tip)
            var dr = tipCell.r - prevCell.r;   // -1, 0, or +1
            var dc = tipCell.c - prevCell.c;

            var tipPos = this._px(tipCell.r, tipCell.c);

            // Arrow tail: 0.80 cells beyond the tip (further from tentacle body)
            var tailX = tipPos.x + dc * cs * 0.80;
            var tailY = tipPos.y + dr * cs * 0.80;

            // Arrow head: 0.38 cells beyond the tip (just outside tip circle radius 0.22)
            // Arrowhead points back toward the whirlpool (retraction direction).
            var headX = tipPos.x + dc * cs * 0.38;
            var headY = tipPos.y + dr * cs * 0.38;

            // Shaft: tail → head (pointing toward whirlpool)
            this._drawNode.drawSegment(
                cc.p(tailX, tailY),
                cc.p(headX, headY),
                cs * 0.07,
                ARROW_COLOR
            );

            // Arrowhead wings: back-point is on the tail side of the head
            var headLen  = cs * 0.20;
            var headBack = cs * 0.16;
            var backX = headX + dc * headBack;  // toward the tail
            var backY = headY + dr * headBack;
            var perpX = dr;   // perpendicular (swapped axes)
            var perpY = -dc;

            this._drawNode.drawSegment(
                cc.p(backX + perpX * headLen, backY + perpY * headLen),
                cc.p(headX, headY),
                cs * 0.06,
                ARROW_COLOR
            );
            this._drawNode.drawSegment(
                cc.p(backX - perpX * headLen, backY - perpY * headLen),
                cc.p(headX, headY),
                cs * 0.06,
                ARROW_COLOR
            );

            // Bright dot at arrow tip (closest point to tentacle body)
            this._drawNode.drawDot(cc.p(headX, headY), cs * 0.10, ARROW_COLOR);
        }

        // ── Step 8: HP / length label at whirlpool ────────────────────────────
        if (this.lbState) {
            this.lbState.setPosition(anchorPos);
            this.lbState.setString(String(cells.length));
        }
    },

    onEnter: function () {
        this._super();
        this._redraw();
    },

    updateVisual: function () {
        this._redraw();
    },

    updateLabelState: function (content) {
        if (this.lbState) this.lbState.setString(content);
    },

    setVisibleLbState: function (val) {
        if (this.lbState) this.lbState.setVisible(val);
    },

    /**
     * Flash burst at the tip cell being removed.
     * Called BEFORE cells.splice in TentacleBlocker.takeDamage.
     */
    playExplodeEffect: function (cellsLen, row, col) {
        if (!this.element || !this.element.boardMgr) return 0.25;

        var cs  = CoreGame.Config.CELL_SIZE;
        var pos = this._px(row, col);

        var flash = new cc.DrawNode();
        flash.drawDot(cc.p(0, 0), cs * 0.38, cc.color(255, 230, 60, 230));
        flash.setPosition(pos);
        this.addChild(flash, 10);
        flash.runAction(cc.sequence(
            cc.spawn(
                cc.scaleTo(0.12, 1.5),
                cc.fadeTo(0.12, 0)
            ),
            cc.removeSelf()
        ));

        return 0.25;
    },

    playTakeDamageEffect: function (amount, row, col) {
        this.runAction(cc.sequence(
            cc.scaleTo(0.06, 1.08),
            cc.scaleTo(0.06, 1.0)
        ));
        return 0.12;
    },

    playAnimation: function (actionType) {
        return 0;
    },

    collectType: function (typeId) {},

    playMatchAnim: function () { return 0; },

    playDestroyEffect: function () {
        var self = this;
        this.runAction(cc.sequence(
            cc.scaleTo(0.15, 1.2).easing(cc.easeOut(2)),
            cc.scaleTo(0.10, 0).easing(cc.easeIn(2)),
            cc.callFunc(function () {
                if (self._drawNode) self._drawNode.clear();
            })
        ));
        return 0.25;
    }
});
