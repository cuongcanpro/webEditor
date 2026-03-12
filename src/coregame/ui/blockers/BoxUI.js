/**
 * BoxUI - Specialized visual representation for Boxes
 * Part of Match-3 Core Game
 */
var CoreGame = CoreGame || {};

CoreGame.BoxUI = CoreGame.ElementUI.extend({
    ctor: function (element) {
        this._super(element);
        this.sprite.setScale(1.0);
    },

    /**
     * Update box sprite based on current hit points
     */
    updateVisual: function () {
        // Base type for Box is 700. Visual frames are 701, 702, ...
        var visualType = this.element.type + this.element.hitPoints;
        var fileName = "res/high/game/element/" + visualType + ".png";
        if (this.sprite) {
            if (typeof fr !== 'undefined' && typeof fr.changeSprite === 'function') {
                fr.changeSprite(this.sprite, visualType + ".png", fileName);
            } else {
                var texture = cc.textureCache.addImage(fileName);
                if (texture) {
                    this.sprite.setTexture(texture);
                }
            }
        }
    },

    /**
     * Play explosion effect for Box
     */
    playTakeDamageEffect: function () {
        cc.log("playTakeDamageEffect ");
        var num = this.element.hitPoints <= 0 ? 1 : this.element.hitPoints;

        // Sound effect
        if (typeof resSound !== 'undefined' && resSound["box_0" + num]) {
            fr.Sound.playSoundEffect(resSound["box_0" + num], false);
        }

        // Visual effect (VFX)
        if (cc.sys.platform == cc.sys.WIN32 && typeof gv !== 'undefined' && gv.isForGD) return;

        if (this.getParent()) {
            let posEff = this.getParent().convertToWorldSpace(this.getPosition());
            if (typeof gv !== 'undefined' && typeof gv.createTLFX === 'function') {
                gv.createTLFX("run" + num, posEff, this.getParent(), BoardConst.zOrder.MATCH_4_EXPLODE + 10);
            }
        }
    },

    playAnimation: function (animationName) {
        this.playTakeDamageEffect();
    }

});
