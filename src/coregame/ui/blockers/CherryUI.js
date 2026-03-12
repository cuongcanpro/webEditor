/**
 * CherryUI - Visual for Cherry
 * Part of Match-3 Core Game
 */
var CoreGame = CoreGame || {};

CoreGame.CherryUI = CoreGame.ElementUI.extend({

    spr: null,

    ctor: function (element) {
        this._super(element);
        this.initSprite();
        return true;
    },

    initSprite: function () {
        this.spr = new cc.Sprite();
        this.addChild(this.spr);

        this.spr.setScale(0.5); // Logic from legacy
    },

    updateVisual: function () {
        var hp = this.element.hitPoints;
        if (hp <= 0) return;

        var id = this.element.type + hp;
        var path = "game/element/" + id + ".png";

        cc.log("CherryUI updateVisual", path);
        if (cc.sys.isNative) {
            // Native check?
            this.spr.setTexture(path);
        } else {
            // Web
            this.spr.setTexture(path);
        }
    },

    playExplodeEffect: function () {
        // if (typeof gv !== 'undefined' && gv.createTLFXWithScale) {
        //     let posEff = this.getParent().convertToWorldSpace(this.getPosition());
        //     gv.createTLFXWithScale("ice_fish", posEff, this.getParent(), 50, 0.7);
        // }

        // if (typeof fr !== 'undefined') {
        //     fr.Sound.playSoundEffect(resSound.cherry, false);
        // }
    }
});
