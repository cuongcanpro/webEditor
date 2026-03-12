/**
 * SpriteElementUI - Visual representation of game elements using a custom sprite path
 * Extends ElementUI to allow dynamic sprite image assignment
 */
var CoreGame = CoreGame || {};

CoreGame.SpriteElementUI = CoreGame.ElementUI.extend({
    /**
     * @param {CoreGame.ElementObject} element - Reference to the logically represented element
     * @param {string} spritePath - Full path to the sprite image file
     */
    ctor: function (element, spritePath) {
        this.spritePath = spritePath;
        this._super(element);
    },

    /**
     * Override initSprite to use the custom sprite path
     */
    initSprite: function () {
        if (this.spritePath) {
            this.sprite = new cc.Sprite(this.spritePath);
            // this.sprite.setScale(0.5);
            this.addChild(this.sprite);
        }
    }
});
