/**
 * GrassUI - Specialized visual representation for Grass
 * Part of Match-3 Core Game
 */
var CoreGame = CoreGame || {};

CoreGame.GrassUI = CoreGame.ElementUI.extend({
    sprBg: null,

    ctor: function (element) {
        this._super(element);

        // Ensure standard scale
        if (this.sprite) {
            this.sprite.setScale(1.0); // Assuming standard size like Box/Cookie
        }

        this.setCascadeOpacityEnabled(true);

        // 1. Background piece (grass_piece_0.png) - Stationary base
        this.sprBg = fr.createSprite("grass_piece_0.png");
        // this.sprBg.setScale(1.0); 

        // this.sprBg.setVisible(false);

        // 2. Initial Visual Update
        this.updateVisual();

        return true;
    },

    /**
     * Update grass sprite based on current hit points
     */
    updateVisual: function () {
        // Pattern: grass_layer_X.png
        var layerName = "grass_layer_" + (this.element.hitPoints) + ".png";

        // Update main sprite
        if (this.sprite) {
            fr.changeSprite(this.sprite, layerName, "res/high/game/element/" + (500 + this.element.hitPoints));
        }

        if (this.getParent()) {
            if (!this.sprBg.getParent()) {
                this.getParent().addChild(this.sprBg, CoreGame.LayerBehavior.BACKGROUND - 2); // Behind the main layer
                this.sprBg.setPosition(this.getPosition());
            }
        }
    },

    setPosition: function (posX, posY) {
        if (posY == undefined) {
            this._super(posX);
            this.sprBg.setPosition(posX);
        }
        else {
            this._super(posX, posY);
            this.sprBg.setPosition(posX, posY);
        }

    },

    /**
     * Play explosion effect for Grass
     */
    playTakeDamageEffect: function () {
        cc.log("Run here playTakeDamageEffect Grass ========  ");
        // VFX: "grass_block"
        if (typeof gv !== 'undefined' && typeof gv.createTLFX === 'function') {
            var posEff = this.getParent().convertToWorldSpace(this.getPosition());
            posEff = cc.pAdd(posEff, cc.p(0, -30)); // Offset from original code

            gv.createTLFX(
                "grass_block",
                posEff,
                this.getParent(),
                BoardConst.zOrder.EFF_MATCHING
            );
        }
    },

    playAnimation: function (animationName) {
        cc.log("Run here === 2 ");
        this.playTakeDamageEffect();
    },

    removeFromParent: function (clean) {
        this.sprBg.removeFromParent(clean);
        this._super(clean);
    }
});
