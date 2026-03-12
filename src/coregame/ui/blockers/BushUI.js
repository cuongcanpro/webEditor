/**
 * BushUI - Visual for 2x2 Bush using Spine
 * Part of Match-3 Core Game
 */
var CoreGame = CoreGame || {};

CoreGame.BushUI = CoreGame.ElementUI.extend({

    animBush: null,

    ctor: function (element) {
        this._super(element);
        this.sprite.setVisible(false);
        this.initSpine();
        this.updateVisual();
        return true;
    },

    initSpine: function () {
        if (typeof gv === 'undefined' || !resAni.spine_4000) return;

        this.nodeSpine = new cc.Node();
        this.addChild(this.nodeSpine);

        // Create Spine
        this.animBush = gv.createSkeletonSpine(resAni.spine_4000);
        this.nodeSpine.addChild(this.animBush);
        this.animBush.setAnimation(0, "idle", true);

        // Position alignment for 2x2
        // Adjust based on visual testing similar to MilkCabinet
        // If 0,0 is center of 2x2 block (after updateVisualPosition offset).
        // Legacy: setPosition(SlotSize/2, -SlotSize/2) inside 2x2 node?
        // We can tweak this if visual is off.
        //  this.nodeSpine.setPosition(0, -20); // Guessing offset
    },

    /**
     * Update visual based on HP
     * HP: 3 (Full) -> 2 (Hit1) -> 1 (Hit2) -> 0 (Destroy)
     */
    updateVisual: function () {
        if (!this.animBush) return;
        var hitPoints = this.element.hitPoints;
        if (hitPoints >= 3) {
            this.animBush.setAnimation(0, "idle", true);
        } else if (hitPoints == 2) {
            this.animBush.setAnimation(0, "hit1", false);
            this.animBush.addAnimation(0, "idle", true);
        } else if (hitPoints == 1) {
            this.animBush.setAnimation(0, "hit2", false);
            this.animBush.addAnimation(0, "idle", true);
        }
    },

    /**
     * Play destroy effect
     */
    playExplodeEffect: function () {
        return;
        if (typeof gv !== 'undefined' && gv.createTLFX) {
            let posEff = this.getParent().convertToWorldSpace(this.getPosition());
            posEff = cc.pAdd(posEff, cc.p(0, -30));
            gv.createTLFX("hit03", posEff, this.getParent(), 100);
        }
    }
});
