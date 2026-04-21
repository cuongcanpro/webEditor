CoreGame.RocketUI = CoreGame.PowerUpUI.extend({
    resAnim: resAni.pu4,
    bullet_rot: 90,

    targetSlot: null,

    ANGLE: 30,
    TIME_FLY: 1.5,
    RADIUS: 200,

    stepStart: false,
    stepEnd: false,

    rocketScale: 1,

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
        this._super();

        for (let anim of this.anims) {
            anim.setScale(CoreGame.RocketUI.SCALE);
        }

        if (this.isHorizontal()) {
            this.bullet_rot = 0;

            for (let anim of this.anims) {
                anim.setRotation(90);
            }
        }
    },

    isHorizontal: function () {
        return this.type == CoreGame.PowerUPType.MATCH_4_H;
    },

    startActive: function () {
        this.setLocalZOrder(CoreGame.ZORDER_BOARD_EFFECT);

        for (let anim of this.anims) {
            anim.setAnimation(0, "active", false);
        }

        this.runAction(cc.sequence(
            cc.delayTime(CoreGame.RocketUI.DELAY),
            cc.callFunc(function () {
                this.showEffectExplode();
            }.bind(this)),
            cc.delayTime(CoreGame.RocketUI.WAIT_TIME),
            cc.removeSelf()
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
        fr.Sound.playSoundEffect(resSound.active_rocket, false);
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
        // let anims = [this.mainSpr_0, this.mainSpr_1];
        for (let i = 0; i < bulletNum; i++) {
            let bullet = gv.createSpineAnimation(resAni.pu4_h_bullet);
            bullet.setPosition(this.x, this.y);
            bullet.setRotation(this.bullet_rot);
            bullet.setScale(this.rocketScale);

            this.getParent().addChild(bullet, this.getLocalZOrder() - 1);
            bullet.setScaleX(flip);

            bullet.setAnimation(0, "tail", false);
            bullet.setVisible(true);
            gv.removeSpineAfterRun(bullet);

            // let dis = Math.max(Math.abs(distances[i].y), Math.abs(distances[i].x));
            // anims[i].runAction(cc.sequence(
            //     cc.spawn(
            //         cc.moveBy(
            //             times[i],
            //             0,
            //             dis * (anims[i].getScaleY() / Math.abs(anims[i].getScaleY()))
            //         ),
            //         cc.fadeOut(times[i]).easing(cc.easeIn(2.5))
            //     ),
            //     cc.delayTime(CoreGame.RocketUI.WAIT_TIME),
            //     cc.hide()
            // ));

            flip *= -1;
        }
    }
});
CoreGame.RocketUI.TIME_MOVE = 0.001;
CoreGame.RocketUI.DELAY = 0.25;
CoreGame.RocketUI.WAIT_TIME = 1;
CoreGame.RocketUI.SCALE = 0.6;