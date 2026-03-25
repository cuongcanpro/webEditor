CoreGame.RocketUI = CoreGame.PowerUpUI.extend({
    resAnim: resAni.pu4_v,
    bullet_rot: 0,

    targetSlot: null,

    ANGLE: 30,
    TIME_FLY: 1.5,
    RADIUS: 200,

    stepStart: false,
    stepEnd: false,

    ctor: function (element) {
        this._super(element);
        this.targetSlot = null;
        this.stepStart = false;
        this.stepEnd = false;
        this.prePos = this.getPosition();
        this.desPos = null;
        return true;
    },

    initSprite: function () {
        this.root = new cc.Node();
        if (this.isHorizontal()) {
            this.resAnim = resAni.pu4_h;
            this.bullet_rot = 90;
        }

        this._super();
    },

    isHorizontal: function () {
        return this.type == CoreGame.PowerUPType.MATCH_4_H;
    },

    startActive: function () {
        this.setLocalZOrder(CoreGame.ZORDER_BOARD_EFFECT);

        fr.Sound.playSoundEffect(resSound.active_rocket, false);

        this.mainSpr.setAnimation(0, "active", false);
        gv.removeSpineAfterRun(this.mainSpr);

        this.runAction(cc.sequence(
            cc.delayTime(CoreGame.PowerUpUI.DEFAULT_DELAY),
            cc.callFunc(function () {
                this.showEffectExplode();
                this.removeFromParent();
            }.bind(this))
        ));

        return true;
    },

    calculateFirstDistance: function () {
        var wPos = this.getParent().convertToWorldSpace(this.getPosition());

        if (this.isHorizontal()) {
            return (cc.winSize.width - wPos.x + 300);
        } else {
            return (cc.winSize.height - wPos.y + 300);
        }
    },

    calculateNextDistance: function () {
        var wPos = this.getParent().convertToWorldSpace(this.getPosition());

        if (this.isHorizontal()) {
            return (-(wPos.x + 300));
        } else {
            return (-(wPos.y + 300));
        }
    },

    getDistanceList: function (distFirst, distNext) {
        if (this.isHorizontal()) {
            return [cc.p(distFirst, 0), cc.p(distNext, 0)];
        } else {
            return [cc.p(0, distFirst), cc.p(0, distNext)];
        }
    },

    showEffectExplode: function () {
        // calculate time move
        var timeMove = CoreGame.RocketUI.TIME_MOVE;

        var distFirst = this.calculateFirstDistance();
        var timeFirst = distFirst * timeMove;

        var distNext = this.calculateNextDistance();
        var timeNext = -distNext * timeMove;

        let times = [timeFirst, timeNext];
        let distances = this.getDistanceList(distFirst, distNext);

        // moveBullet
        let bulletNum = 2;
        let flip = 1;
        for (let i = 0; i < bulletNum; i++) {
            let bullet = gv.createSpineAnimation(resAni.pu4_h_bullet);
            bullet.setPosition(this.x, this.y);
            bullet.setRotation(this.bullet_rot);
            bullet.setScale(this.getScale());

            this.getParent().addChild(bullet, BoardConst.zOrder.MATCH_4_EXPLODE);
            bullet.setScaleY(flip);

            bullet.setAnimation(0, "run", false);
            bullet.setVisible(true);
            bullet.runAction(cc.sequence(
                cc.moveBy(times[i], distances[i].x, distances[i].y),
                cc.hide()
            ));
            gv.removeSpineAfterRun(bullet);

            flip *= -1;
        }
    }
});
CoreGame.RocketUI.TIME_MOVE = 0.001;
