/**
 * SpriteElementUI - Visual representation of game elements using a custom sprite path
 * Extends ElementUI to allow dynamic sprite image assignment
 */
var CoreGame = CoreGame || {};

CoreGame.SpriteElementUI = CoreGame.ElementUI.extend({
    /**
     * @param {CoreGame.ElementObject} element - Reference to the logically represented element
     * @param {string} spritePath - Full path to the sprite image file
     * @param {number} [spriteScale] - Optional scale to apply to the sprite (default 1)
     */
    ctor: function (element, spritePath, spriteScale) {
        this.spritePath = spritePath;
        this._spriteScale = spriteScale || 1;
        this._super(element);
    },

    /**
     * Override initSprite to use the custom sprite path
     */
    initSprite: function () {
        if (this.spritePath) {
            this.sprite = new cc.Sprite(this.spritePath);
            if (this._spriteScale !== 1) {
                this.sprite.setScale(this._spriteScale);
            }
            this.addChild(this.sprite);
        }
    }
});
