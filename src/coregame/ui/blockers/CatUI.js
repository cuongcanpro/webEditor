/**
 * CatUI - visual for Mèo Ẩn Thân (13000 Lộ / 13001 Ẩn).
 *
 * Extends CustomElementUI. Two jobs beyond the placeholder art:
 *   1. A "⏱N" countdown label = turns remaining before the next state flip,
 *      so the player can commit a match before the cat hides/reveals (spec
 *      edge case: show ⏱2 / ⏱1 one turn before flip).
 *   2. Dim the body in the Hidden state (type 13001) and play a short
 *      sink/rise on (re)spawn so a flip reads as the cat diving / surfacing.
 *
 * The flip itself is ReplaceSelfAction (13000↔13001), which rebuilds the UI;
 * each fresh CatUI sets its own opacity + plays the entry anim in onEnter.
 */
var CoreGame = CoreGame || {};

CoreGame.CatUI = CoreGame.CustomElementUI.extend({

    // turnsInState target before a flip (mirrors CheckAttributeAction targetValue=2).
    FLIP_AT: 2,

    ctor: function (element, jsonPath) {
        this._super(element, jsonPath);
        this._buildCounter();
        this.updateStateCounter();
        this._applyStateOpacity();
    },

    _isHidden: function () {
        return this.element && this.element.type === 13001;
    },

    _node: function () {
        return this.jsonNode || this.sprite || this;
    },

    _buildCounter: function () {
        this._counter = new cc.LabelTTF("", "font/BalooPaaji2-Bold.ttf", 20);
        this._counter.setColor(cc.color(240, 200, 90));
        this._counter.enableStroke(cc.color(30, 30, 30), 2);
        this._counter.setPosition(cc.p(30, 30));
        this.addChild(this._counter, 500);
    },

    /** remaining = FLIP_AT - turnCount; shown as ⏱2 / ⏱1, hidden at 0. */
    updateStateCounter: function () {
        if (!this._counter) return;
        // No counter in the static element picker (no board context).
        if (!this.element || !this.element.boardMgr) { this._counter.setString(""); return; }
        var tc = (this.element.customData && this.element.customData.turnCount)
            ? this.element.customData.turnCount : 0;
        var remain = this.FLIP_AT - tc;
        this._counter.setString(remain > 0 ? ("⏱" + remain) : "");
    },

    _applyStateOpacity: function () {
        var n = this._node();
        if (n && n.setOpacity) n.setOpacity(this._isHidden() ? 110 : 255);
    },

    /** Keep the counter live whenever any anim ticks (endTurn included). */
    playAnimation: function (actionType, state, callback) {
        var dur = this._super(actionType, state, callback);
        this.updateStateCounter();
        return dur;
    },

    onEnter: function () {
        this._super();
        this._applyStateOpacity();
        // Sink/surface feedback only in a real board context. onEnter also runs
        // in the static element picker (blocker created without a boardMgr), where
        // a scale animation would leave the cat oversized vs its neighbours.
        if (!this.element || !this.element.boardMgr) return;
        var n = this._node();
        if (!n || n === this) return; // need the child art node, not the UI root
        if (this._isHidden()) {
            n.setScale(1.0);
            n.runAction(cc.sequence(
                cc.scaleTo(0.2, 1.0, 0.6).easing(cc.easeIn(2.0)),
                cc.scaleTo(0.2, 1.0, 1.0).easing(cc.easeOut(2.0))
            ));
        } else {
            n.setScale(0.7);
            n.runAction(cc.scaleTo(0.25, 1.0).easing(cc.easeBackOut()));
        }
    }
});
