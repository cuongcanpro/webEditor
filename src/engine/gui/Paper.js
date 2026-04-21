
//Confetti effect
var Paper = cc.Node.extend({
    ctor: function (areaWidth) {
        this._super();
        this.areaWidth = areaWidth? areaWidth : cc.winSize.width;
        this.orgWidth = cc.winSize.width;
        this.initChild();
    },

    initChild: function () {
        this.setCascadeOpacityEnabled(true);
        var file = "res/Lobby/Received/particle/p" + Math.floor(Math.random() * Paper.VARIANT) + ".png";
        this.spriteImg = new cc.Sprite(file);
        this.addChild(this.spriteImg);
        this.spriteImg.setRotation(Math.random() * 360);
        this.spriteImg.setScale(Math.random() * 0.2 + 1, Math.random() * 0.2 + 1);
    },

    startEffect: function (delayTime = 0) {
        var rSpin = Math.random() * 0.25 + 0.25;
        var p1 = cc.p(-50, (0.5 - Math.random()) * 50);
        var p2 = cc.p(
            this.areaWidth * 0.75 * (0.25 + Math.random()),
            -250 * Math.random()
        );
        var p3 = cc.p(
            (p1.x + p2.x) / 2 + (0.5 - Math.random()) * 300,
            (p1.y + p2.y) / 2 + (0.5 - Math.random()) * 150
        );
        var rTime = (3.5 + Math.random() * 2.5) * (this.areaWidth / this.orgWidth);

        this.spriteImg.runAction(cc.sequence(
            cc.delayTime(delayTime + rTime / 5),
            cc.callFunc(function () {
                var osX = this.spriteImg.getScaleX();
                var osY = this.spriteImg.getScaleY();
                var r1 = Math.round(Math.random());
                var r2 = Math.round(Math.random());
                if (r1 == r2 && r1 == 0) {
                    r1 = 1;
                }
                if (r1 == r2 && r1 == 1) {
                    r1 = 0;
                }
                this.spriteImg.runAction(cc.sequence(
                    cc.scaleTo(rSpin, r1 * osX, r2 * osY),
                    cc.scaleTo(rSpin, osX, osY)
                ).repeatForever());
            }.bind(this))
        ));

        this.spriteImg.setVisible(false);
        this.spriteImg.runAction(cc.sequence(
            cc.delayTime(delayTime),
            cc.show(),
            cc.bezierTo(rTime, [p1, p3, p2]).easing(cc.easeOut(2))
        ));

        this.runAction(cc.sequence(
            cc.delayTime(Math.max(delayTime + rTime - 0.1, 0)),
            cc.fadeOut(0.1),
            cc.removeSelf()
        ));
    }
});
Paper.VARIANT = 5;