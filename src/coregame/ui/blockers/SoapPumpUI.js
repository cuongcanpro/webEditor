/**
 * SoapPumpUI - Visual for Soap Pump (1x2)
 * Part of Match-3 Core Game
 */
var CoreGame = CoreGame || {};

CoreGame.SoapPumpUI = CoreGame.ElementUI.extend({

    anim: null,

    ctor: function (element) {
        this._super(element);
        this.initSpine();
        return true;
    },

    initSpine: function () {
        if (typeof gv === 'undefined' || !resAni.spine_3300) return;

        this.nodeSpine = new cc.Node();
        this.addChild(this.nodeSpine);

        this.anim = gv.createSpineAnimation(resAni.spine_3300);
        this.nodeSpine.addChild(this.anim);
        this.anim.setAnimation(0, 'idle', true);

        this.nodeSpine.setPosition(0, -35); // Adjust as needed
    },

    playExplodeEffect: function () {
        // Effect
    },

    playShootEffect: function (startPos, endPos, callback) {
        // Create projectile

        if (typeof fr !== 'undefined') {
            var projectile = fr.createSprite("game/element/108.png"); // Soap Image ID? Using placeholder or reuse spine
            // Actually use Spine for consistency

            projectile.setPosition(startPos);
            projectile.setScale(0.5);
            this.getParent().addChild(projectile, 100); // High Z

            var bezierConfig = [
                startPos,
                cc.p((startPos.x + endPos.x) / 2 + 50, (startPos.y + endPos.y) / 2 + 50), // Curve control
                endPos
            ];

            projectile.runAction(cc.sequence(
                cc.bezierTo(0.6, bezierConfig),
                cc.callFunc(function () {
                    projectile.removeFromParent();
                    if (callback) callback();
                })
            ));
        } else if (callback) {
            callback();
        }
    },
});
