/**
 * SoapUI - Visual for Soap Attachment
 * Part of Match-3 Core Game
 */
var CoreGame = CoreGame || {};

CoreGame.SoapUI = CoreGame.ElementUI.extend({

    anim: null,

    ctor: function (element) {
        this._super(element);
        this.initSpine();
        return true;
    },

    initSpine: function () {
        if (typeof gv === 'undefined' || !resAni.spine_3400) return;

        this.nodeSpine = new cc.Node();
        this.addChild(this.nodeSpine);

        this.anim = gv.createSpineAnimation(resAni.spine_3400);
        this.nodeSpine.addChild(this.anim);
        this.anim.setAnimation(0, 'idle', true);

        // Scale/Pos adjustment for attachment
        // When attached to Gem, (0,0) is center of Gem.
    },

    playExplodeEffect: function () {
        // if (typeof gv !== 'undefined' && gv.createTLFX) {
        //     let posEff = this.getParent().convertToWorldSpace(this.getPosition());
        //     gv.createTLFX("fx_soap_break", posEff, this.getParent(), 100);
        // }
    }
});
