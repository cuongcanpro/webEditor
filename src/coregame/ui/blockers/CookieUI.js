/**
 * CookieUI - Specialized visual representation for Cookie
 * Part of Match-3 Core Game
 */
var CoreGame = CoreGame || {};

CoreGame.CookieUI = CoreGame.ElementUI.extend({

    ctor: function (element) {
        this._super(element);
        // Ensure scale is 1.0 based on recent BoxUI changes
        if (this.sprite) {
            // this.sprite.setScale(0.5);
        }

        // Initial visual update based on HP
        this.updateVisual();
        return true;
    },

    /**
     * Update cookie sprite based on current hit points
     */
    updateVisual: function () {
        // We need the base type. Let's assume the passed 'type' in ctor was useful or we use BoardConst if available.
        // Better: Wait for setElement to be sure of type, OR pass type correctly.
        // WORKAROUND: In ctor, we might have loaded a wrong initial sprite if 302.png doesn't exist.
        // Let's correct it if we have the type from element or context.

        // Let's assume we can access this.element.type if available.
        var type = this.element.type;
        var fileName = type + "_" + this.element.hitPoints + ".png";
        fileName = type + this.element.hitPoints + ".png";
        cc.log("File Name " + fileName);
        if (this.sprite) {
            fr.changeSprite(this.sprite, fileName, "res/high/game/element/" + fileName);
        }
    },

    /**
     * Play explosion effect for Cookie
     */
    playTakeDamageEffect: function () {
        // Sound effect (rock_0 + hp)
        if (typeof resSound !== 'undefined') {
            var soundName = "rock_0" + this.element.hitPoints;
            if (resSound[soundName]) {
                fr.Sound.playSoundEffect(resSound[soundName], false);
            }
        }

        // VFX: rock_blocker
        if (typeof gv !== 'undefined' && typeof gv.createTLFX === 'function') {
            let eggSpine = gv.createSpineAnimation(resAni.egg_spine);
            this.getParent().addChild(eggSpine);
            eggSpine.setPosition(this.getParent().convertToWorldSpace(this.getPosition()));
            eggSpine.setAnimation(0, "animation", false);
            eggSpine.setLocalZOrder(BoardConst.zOrder.EFF_MATCHING);
            gv.removeSpineAfterRun(eggSpine);

            this.setVisible(false);

            // gv.createTLFX(
            //     "runEgg1",
            //     this.getParent().convertToWorldSpace(this.getPosition()),
            //     this.getParent(),
            //     BoardConst.zOrder.EFF_MATCHING
            // );
        }
    },

    playAnimation: function (animationName) {
        this.playTakeDamageEffect();
    }
});
