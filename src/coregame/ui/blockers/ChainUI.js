/**
 * ChainUI - Specialized visual representation for Chain
 * Part of Match-3 Core Game
 */
var CoreGame = CoreGame || {};

CoreGame.ChainUI = CoreGame.ElementUI.extend({
    sprChain1: null,
    sprChain2: null,
    chainNode: null,

    ctor: function (element) {
        this._super(element); // Assuming ElementUI handles null type gracefully or we accept an error (it likely won't).

        if (this.sprite) {
            this.sprite.removeFromParent();
            this.sprite = null;
        }

        this.setCascadeOpacityEnabled(true);
        this.setLocalZOrder(100); // Ensure Chain is visually on top of gems

        this.chainNode = new cc.Node();
        this.chainNode.setCascadeOpacityEnabled(true);
        // Center the chain node
        this.chainNode.setPosition(0, 0);
        this.addChild(this.chainNode);

        // Always create first chain layer
        this.sprChain1 = fr.createSprite("601_0.png");
        this.chainNode.addChild(this.sprChain1);

        // Create second chain layer if needed
        if (element.hitPoints >= 2) {
            this.sprChain2 = fr.createSprite("601_1.png");
            this.chainNode.addChild(this.sprChain2);
        }

        return true;
    },

    /**
     * Update chain sprite based on current hit points
     */
    updateVisual: function () {
        // If hit points dropped below 2, remove the second chain
        if (this.element.hitPoints < 2 && this.sprChain2) {
            this.sprChain2.removeFromParent();
            this.sprChain2 = null;
        }
        // Ensure scale/opacity is reset if needed (match original render)
        this.chainNode.setScale(1);
        this.chainNode.setOpacity(255);
    },

    /**
     * Play explosion effect for Chain
     */
    playExplodeEffect: function () {
        
    },

    /**
     * Play explosion effect for Box
     */
    playTakeDamageEffect: function () {
        // Sound effect
        if (typeof resSound !== 'undefined' && resSound.chain) {
            fr.Sound.playSoundEffect(resSound.chain, false);
        }

        // VFX: vines
        // Check if global gv exists and has createTLFX (from original code)
        if (typeof gv !== 'undefined' && typeof gv.createTLFX === 'function') {
            gv.createTLFX(
                "vines",
                this.getParent().convertToWorldSpace(this.getPosition()),
                this.getParent(),
                BoardConst.zOrder.EFF_MATCHING
            );
        }

        // Note: The base Blocker.destroy handles fading out the ui.
    },

    playAnimation: function (animationName) {
        this.playTakeDamageEffect();
    }
});
