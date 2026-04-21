var CoinFallEffect = cc.Layer.extend({

    ctor: function (imageCoin) {
        this._super();
        this.listCoin = [];
        this.numEffect = 0;
        this.numCoinNow = 0;
        this.callBack = null;
        this.timeCount = 0;
        this.positionCoin = [0, 0];
        this.isRun = false;
        this.isAutoRemove = false;
        this.typeEffect = 0;
        if(!imageCoin){
            var cacheFrames = cc.spriteFrameCache;
            cacheFrames.addSpriteFrames("Particles/gold.plist", "Particles/gold.png");
        }
        else{
            this.imageCoin = imageCoin;
        }
    },

    setCallbackFinish: function (cb, target, data) {
        this.callBack = cb;
        this.callBack.target = target;
        this.callBack.data = data;
    },

    setPositionCoin: function (p) {
        this.positionCoin = p;
    },

    setAutoRemove: function (bool) {
        this.isAutoRemove = bool;
    },

    removeAllItem: function(){
        this.removeAllChildren();
        this.listCoin = [];
        this.stopAllActions;
    },

    update: function (dt) {
        this.timeCount += dt;
        if(this.timeCount < 0)return;
        var coin;
        var isFinish = true;
        for (var i = this.numCoinNow; i < this.numEffect; i++) {
            coin = this.listCoin[i];
            if (coin && coin.isVisible()) {
                coin.updateCoin(dt);
                isFinish = false;
            }
        }
        if (this.numCoinNow > 0) {
            if (this.timeCount >= CoinFallEffect.TIME_OUT_COIN) {
                var num = 10;
                if (this.typeEffect == CoinFallEffect.TYPE_FLOW) {
                    num = CoinFallEffect.NUM_COIN_EACH_TIME * this.timeCount;
                    this.timeCount = 0;
                }
                else if (this.typeEffect == CoinFallEffect.TYPE_RAIN) {
                    num = CoinFallEffect.NUM_COIN_RATE_RAIN * 0.05;
                    this.timeCount = CoinFallEffect.TIME_OUT_COIN - 0.05;
                }
                for (i = 0; i < num; i++) {
                    coin = this.listCoin[this.numCoinNow--];
                    if(coin)coin.start();
                    if (this.numCoinNow == 0)break;
                }
            }
        }
        else {
            if (isFinish) {
                this.unscheduleUpdate();
                this.setVisible(false);
                this.isRun = false;
                if (this.callBack) {
                    this.callBack.apply(this.callBack.target, this.callBack.data);
                }
                if(this.isAutoRemove){
                    this.removeEffect();
                }
            }
        }
    },

    startEffect: function (numEffect, type, delay, noSound) {
        delay = delay || 0;
        var coin;
        this.typeEffect = type;
        this.numEffect = numEffect;
        var i, len;

        if (this.isRun) {
            for (var i = 0; i < this.listCoin.length; i++) {
                this.listCoin[i].setVisible(false);
            }
        }
        if (numEffect > this.listCoin.length) {
            for (i = 0, len = numEffect - this.listCoin.length; i < len; i++) {
                coin = this.getCoinItem();
                this.listCoin.push(coin);
                this.addChild(coin);
            }
        }
        for (i = 0; i < numEffect; i++) {
            coin = this.listCoin[i];
            coin.stop();
            coin.initCoin(type);
        }
        this.numCoinNow = numEffect - 1;
        this.timeCount = -delay;
        this.scheduleUpdate();
        this.setVisible(true);
        this.isRun = true;
        if(noSound) return;
        this.runAction(cc.sequence(cc.delayTime(CoinFallEffect.DELAY_PLAY_SOUND + delay), cc.callFunc(gameSound.playCoinFall)));
    },

    stopEffect: function () {
        //for (var i = 0; i < this.listCoin.length; i++) {
        //    this.listCoin[i].setVisible(false);
        //}
        this.setVisible(false);
        this.unscheduleUpdate();
    },

    removeEffect: function(){
        this.stopEffect();
        this.listCoin = [];
        this.removeFromParent(true);
    },

    getCoinItem: function () {
        var coin = new CoinEffect(this.imageCoin);
        return coin;
    }
});

var CoinEffect = cc.Sprite.extend({

    ctor: function (imageCoin) {
        if(imageCoin){
            this._super(imageCoin);
        }
        else{
            this._super();
            var spriteCoin = cc.spriteFrameCache.getSpriteFrame(CoinFallEffect.NAME_ANIMATION_COIN + Math.floor(Math.random() * CoinFallEffect.NUM_SPRITE_ANIMATION_COIN) + ".png");
            if(!spriteCoin) {
                var cacheFrames = cc.spriteFrameCache;
                cacheFrames.addSpriteFrames("Particles/gold.plist", "Particles/gold.png");
                spriteCoin = cacheFrames.getSpriteFrame(CoinFallEffect.NAME_ANIMATION_COIN + Math.floor(Math.random() * CoinFallEffect.NUM_SPRITE_ANIMATION_COIN) + ".png");
            }
            this.initWithSpriteFrame(spriteCoin);
            var animation = cc.animationCache.getAnimation(CoinFallEffect.NAME_ANIMATION_COIN);
            if (!animation) {
                var arr = [];
                var cache = cc.spriteFrameCache;
                var aniFrame;
                for (var i = 0; i < CoinFallEffect.NUM_SPRITE_ANIMATION_COIN; i++) {
                    aniFrame = new cc.AnimationFrame(cache.getSpriteFrame(CoinFallEffect.NAME_ANIMATION_COIN + i + ".png"), CoinFallEffect.TIME_ANIMATION_COIN);
                    arr.push(aniFrame);
                }
                animation = new cc.Animation(arr, CoinFallEffect.TIME_ANIMATION_COIN);
                cc.animationCache.addAnimation(animation, CoinFallEffect.NAME_ANIMATION_COIN);
            }
            this.anim = animation;
            this.animate = null;
        }
        //this.scaleCoin = 1;
        this.setVisible(false);
    },

    initCoin: function (type) {
        this.state = CoinFallEffect.STATE_COIN_NONE; //kiem tra da cham dat 1 lan chua
        this.setOpacity(0);
        var valueRan;
        var winSize = cc.winSize;
        /////////////
        this.speedR = 2 * Math.random() * CoinFallEffect.RATE_SPEED_R - CoinFallEffect.RATE_SPEED_R;
        valueRan = Math.random() * (CoinFallEffect.MAX_SCALE - CoinFallEffect.MIN_SCALE) + CoinFallEffect.MIN_SCALE;
        if(!this.anim)valueRan /= CoinFallEffect.MIN_SCALE; //neu la image Coin thi giu nguyen scale image
        this.setScale(valueRan, valueRan);
        this.setRotation(Math.random() * 360);
        if (type == CoinFallEffect.TYPE_FLOW) {
            this.speedX = (2 * Math.random() - 1) * CoinFallEffect.RATE_SPEED_X;
            var def = Math.random() * winSize.width + winSize.width;
            this.speedY = Math.sqrt(def * def - this.speedX * this.speedX);
            let pos = cc.p(0, 0);
            if (this.getParent().positionCoin.x) pos = this.getParent().positionCoin;
            var p = cc.p(pos.x + (Math.random() - 0.5) * CoinFallEffect.RATE_Position_X,
                pos.y + (Math.random() - 0.5) * CoinFallEffect.RATE_Position_Y);
            this.setPosition(p);
        }
        else if (type == CoinFallEffect.TYPE_RAIN) {
            this.speedX = 0;
            this.speedY = Math.random() * CoinFallEffect.RATE_SPEED_X;
            var parent = this.getParent();
            this.setPosition(Math.random() * parent.width, parent.height + this.height + Math.random() * CoinFallEffect.RATE_Position_Y);
        }
        this.setVisible(false);
    },

    start: function () {
        this.setVisible(true);
        if(this.anim){
            var ani = cc.animate(this.anim);
            this.animate = ani;
            this.runAction(ani.repeatForever());
        }
        this.state = CoinFallEffect.STATE_COIN_START;
        this.runAction(cc.fadeIn(CoinFallEffect.TIME_FADE_IN_COIN));
    },

    stop: function () {
        this.setVisible(false);
        this.stopAllActions();
    },

    updateCoin: function (dt) {
        this.x += this.speedX * dt;
        this.y += this.speedY * dt;
        this.speedY -= CoinFallEffect.GRAVITY * dt;
        this.rotation += this.speedR;
        //cham dat thi cho nhay len 1 lan roi roi tiep
        if (this.state == CoinFallEffect.STATE_COIN_START && this.y < 0) {
            this.state = CoinFallEffect.STATE_COIN_COLLIDED;
            this.speedY = -this.speedY * (Math.random() * CoinFallEffect.RATE_JUMP_BACK);
            this.speedX = 0;
        }
        //sau khi da cham dat
        else if (this.state == CoinFallEffect.STATE_COIN_COLLIDED && this.y + (this.height * this.scale) < 0) {
            this.state = CoinFallEffect.STATE_COIN_FINISH;
            this.runAction(cc.fadeOut(CoinFallEffect.TIME_FADE_OUT_COIN));
        }
        else if(this.state == CoinFallEffect.STATE_COIN_FINISH && this.getOpacity() == 0){
            this.stop();
        }
    }
});

CoinFallEffect.RATE_SPEED_X = 350 * cc.winSize.width / 800;
CoinFallEffect.RATE_SPEED_Y = 600 * cc.winSize.height / 480;    // vi ti le ban dau tính toan theo man hinh 800x480
CoinFallEffect.DEFAULT_SPEED_Y = 850;
CoinFallEffect.RATE_SPEED_R = 10;
CoinFallEffect.RATE_Position_X = 70;
CoinFallEffect.RATE_Position_Y = 70;
CoinFallEffect.MIN_SCALE = 0.55;
CoinFallEffect.MAX_SCALE = 0.67;
CoinFallEffect.RATE_JUMP_BACK = 0.55;
CoinFallEffect.GRAVITY = 2300;
CoinFallEffect.POSI = 90;
CoinFallEffect.NAME_ANIMATION_COIN = "gold";
CoinFallEffect.NAME_ANIMATION_JADE = ""
CoinFallEffect.NUM_SPRITE_ANIMATION_COIN = 5;
CoinFallEffect.NUM_SPRITE_ANIMATION_JADE = 6;
CoinFallEffect.NUM_COIN_EACH_TIME = 100;
CoinFallEffect.NUM_COIN_RATE_RAIN = 100;
CoinFallEffect.TIME_ANIMATION_COIN = 0.3;
CoinFallEffect.TIME_OUT_COIN = 0.05;

CoinFallEffect.TYPE_FLOW = 0;
CoinFallEffect.TYPE_RAIN = 1;
CoinFallEffect.TYPE_FLY = 2;

CoinFallEffect.DELAY_PLAY_SOUND = 0.3;
CoinFallEffect.TIME_FADE_IN_COIN = 0.15;
CoinFallEffect.TIME_FADE_OUT_COIN = 0.15;

CoinFallEffect.STATE_COIN_NONE = 0;
CoinFallEffect.STATE_COIN_START = 1;
CoinFallEffect.STATE_COIN_COLLIDED = 2;
CoinFallEffect.STATE_COIN_FINISH = 3;