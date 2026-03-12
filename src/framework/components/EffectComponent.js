/**
 * Created by CPU02336_LOCAL on 6/4/2019.
 */
/**
 * Action Hand point to...something.
 *
 */
var ActionHandSuggest = function(){
    /**
     * Action "point" object at position
     * @param position(x,y): point position
     * @param callBack(function): call back function when hand touch
     */
    this.POINT_TO_ANGLE = 27,
    this.POINT_BACK_ANGLE = -17,
    this.SCALE_RATE = 0.8,
    this.pointTo = function(position, callBack){
        var contentSize = this.getContentSize();
        this.setPosition(position.x - contentSize.width*this.SCALE_RATE, position.y);
        this.initAction();
        this.runAction(
            cc.sequence(
                cc.spawn(cc.rotateTo(0.3, this.POINT_TO_ANGLE), cc.scaleTo(0.3, this.SCALE_RATE)),
                cc.callFunc(function(){
                   callBack(position);
                }),
                cc.delayTime(0.1),
                cc.spawn(cc.rotateTo(0.3, this.POINT_BACK_ANGLE), cc.scaleTo(0.3, 1.0)),
                cc.delayTime(0.5)
            ).repeatForever()
        )
    },
    this.initAction = function () {
        this.setRotation(this.POINT_BACK_ANGLE);
        this.setAnchorPoint(0,0);
        this.setLocalZOrder(999);


    },
    /**
     * point from start object to destination object
     * @param startPos(x,y): position of start object
     * @param desPos(x,y): position of destination object
     */
    this.pointFromTo = function(startPos, desPos, callBack){

        this.initAction();
        var contentSize = this.getContentSize();
        this.runAction(
            cc.sequence(
                cc.callFunc(function(){
                    this.setPosition(startPos.x - (contentSize.width*0.8), startPos.y);
                    this.setRotation(this.POINT_BACK_ANGLE);
                    this.setScale(1.0);
                }.bind(this)),
                cc.delayTime(0.1),
                cc.spawn(cc.rotateTo(0.3, this.POINT_TO_ANGLE), cc.scaleTo(0.3, this.SCALE_RATE)),
                cc.callFunc(function(){
                    callBack(startPos);
                }),
                cc.delayTime(0.1),
                cc.moveTo(0.5, cc.p(desPos.x - (contentSize.width*0.8), desPos.y)),
                cc.delayTime(1.0)
            ).repeatForever()
        )
    }
}
/**
 * Count down number from "timeCount" to 0
 * CallBack function when finish count down
  */
var effCountDown = function(){
    /**
     * @param timeCount(int): total time count
     * @param callBack(func): callback function
     */
    this.startCount = function(timeCount, callBack){
        this.runAction(
            cc.sequence(
                cc.callFunc(function(){
                    this.setScale(0.2);
                }.bind(this)),
                cc.sequence(cc.scaleTo(0.1, 0.8), cc.scaleTo(0.1, 0.7)),
                cc.delayTime(1.0), // count down unit = 1s
                cc.callFunc(function(){
                    var time = this.getString();
                    if(time > 0){
                        time--;
                        this.setString(time);
                    }else{
                        callBack();
                    }
                }.bind(this))
            ).repeat(timeCount)
        )
    }
}

/**
 * run eff show like buble out. ahihi
 */
var effBubbleOut = function(){
    this.show = function(){
        this.setVisible(true);
        this.setOpacity(0);
        this.setScale(0.9);
        var fadeIn = cc.fadeIn(0.1);

        var scaleIn = cc.scaleTo(0.12, 0.95, 0.95);
        var scaleOut = cc.scaleTo(0.11, 1.05, 1.05);

        var scaleIn1 = cc.scaleTo(0.11, 0.98, 0.98);
        var scaleIn2 = cc.scaleTo(0.11, 1.01, 1.01);

        var scaleNormal = cc.scaleTo(0.1, 1, 1);
        this.runAction(fadeIn);
        this.runAction(cc.sequence(scaleIn,scaleOut, scaleIn1,scaleIn2, scaleNormal));
    }
    this.touchEff = function(){
        this.setScale(0.9);
        var fadeIn = cc.fadeIn(0.1);

        var scaleIn = cc.scaleTo(0.12, 0.95, 0.95);
        var scaleOut = cc.scaleTo(0.11, 1.05, 1.05);

        var scaleIn1 = cc.scaleTo(0.11, 0.98, 0.98);
        var scaleIn2 = cc.scaleTo(0.11, 1.01, 1.01);

        var scaleNormal = cc.scaleTo(0.1, 1, 1);
        this.runAction(fadeIn);
        this.runAction(cc.sequence(scaleIn,scaleOut, scaleIn1,scaleIn2, scaleNormal));
    }
}
/**
 * jump node bounce out
 */
effShowJump = function(){
    this.show = function(){
        this.setOpacity(0);
        this.setScale(0);

        this.runAction(cc.spawn(
            cc.fadeIn(0.3),
            cc.scaleTo(0.3,1.0),
            cc.sequence(
                cc.jumpBy(0.3, cc.p(0,0), 50, 1),
                cc.moveBy(0.15,cc.p(0,10)),
                cc.moveBy(0.05,cc.p(0,-10))
                // cc.moveBy(0.8, cc.p(0, -50)).easing(cc.easeBounceOut())
            )

        ))
    }
}
/**
 * create blend sprite
 */
effCreateBlend = function(){
    this.initBlend = function () {
        var texture = this.getTexture();
        this.blend = new cc.Sprite();
        this.blend.initWithTexture(texture);
        this.blend.setBlendFunc(gl.SRC_ALPHA, gl.ONE);
        this.addChild(this.blend);
        this.blend.setPosition(this.blend.getContentSize().width/2, this.blend.getContentSize().height/2);
        this.blend.setOpacity(0);
    };

    this.showBlendForever = function(time){
        this.blend.runAction(cc.sequence(cc.fadeTo(time,0),cc.delayTime(0.1), cc.fadeTo(time,255)).repeatForever());
        this.blend.setPosition(this.blend.getContentSize().width/2, this.blend.getContentSize().height/2);
    };

    /**
    * show blend with 1 time.
    */
    this.showBlend = function(time){
        this.blend.runAction(cc.sequence(
            cc.fadeTo(time,255),
            cc.delayTime(0.05),
            cc.fadeTo(time,0)
        ));


    };
    this.showBlendIncrease = function(time){
        this.blend.setOpacity(0);
        this.blend.runAction(cc.fadeIn(time));
        this.addChild(this.blend);
        this.blend.setPosition(this.blend.getContentSize().width/2, this.blend.getContentSize().height/2);
    }
};

effShadow = function(){
    this.init = function (shadowResourcePath) {
        if(_.isUndefined(shadowResourcePath)){
            shadowResourcePath = res.img_shadow;
        }
        this.shadowFake = UIUtils.createSprite(shadowResourcePath, this);
        this.shadow = UIUtils.createSprite(shadowResourcePath, this.getParent());
    }

}

/**
 * shake node
 */
effShake = function(){
    /**
     * shake
     * @param bien_do: bien do shake
     * @param time: so lan shake
     */
    this.shake = function(){

        this.runAction(cc.sequence(cc.moveBy(0.01, cc.p(-5, 0)),
            cc.moveBy(0.01, cc.p(5, 0))).repeatForever())


    }
    this.shakeCustome =function(bien_do, time){
        this.runAction(cc.sequence(
                cc.moveBy(0.04, cc.p(-bien_do, 0)),
                cc.moveBy(0.04, cc.p(bien_do, 0))).repeat(time)
        )
    }
}
/**
 * show off node
 */
showTextEff = function(){
    this.show = function(isHide){
        this.setVisible(true);
        this.setOpacity(0);
        this.setScale(6.0);

        var scale1 = cc.scaleTo(0.15, 1.0);
        var fadeIn = cc.fadeIn(0.15);

        gv.guiMgr.getCurrentScreen().runAction(cc.sequence(
            cc.delayTime(0.15),
            cc.sequence(cc.moveBy(0.01, cc.p(-40, 0)),cc.moveBy(0.01, cc.p(40, 0))).repeat(3)


        ))
        this.runAction(cc.spawn(scale1, fadeIn));
        if(isHide){
            this.runAction(
                cc.sequence(
                    cc.delayTime(2.0),
                    cc.scaleTo(0.3, 1.2),
                    cc.scaleTo(0.2,0)
                )
            )
        }

    }
}
var NUMBER = {
    FEW: 1,
    NORMAL: 2,
    MUCH:3,
    VERY_MUCH:4
}
effMoveBezierItem = function(){
    this.moveBezier = function(desPos, callBack){

        var pos = this.getPosition();

        //var time = Math.random()*5  + 1;
        //var move = cc.moveTo(time/10, cc.p(sprite.posX, sprite.posY));
        //sprite.runAction(move.easing(cc.easeCircleActionOut()));

        var array = [

            cc.p(pos.x  + 100, pos.y - 100),
            cc.p(pos.x + 200, pos.y + 200),
            cc.p(desPos.x, desPos.y)
        ];
        var bezierTo = cc.bezierTo(1.0, array);
        this.runAction(cc.spawn(bezierTo.easing(cc.easeQuadraticActionInOut())
            ,cc.sequence(
                cc.scaleTo(0.5, 1.2, 1.2),
                cc.scaleTo(0.5, 0.8, 0.8),
                cc.scaleTo(0.2, 1.0,1.0),
                cc.scaleTo(0.2, 0,0)
            )
        ));

    }
}
var coinEffPath = {
    diamondPlist:"game/animation/effects/eff_g/g.plist",
    diamondPng: "game/animation/effects/eff_g/g.png",

    goldPlist : "game/animation/effects/eff_coin/gold.plist",
    goldPng: "game/animation/effects/eff_coin/gold.png"
}
NAME_ANIMATION_COIN = "gold";
NAME_ANIMATION_G = "g";
var itemSprite = cc.Sprite.extend({
    ctor: function (itemID) {
        this._super();

        var spriteCoin ;
        var animationKey = NAME_ANIMATION_COIN;
        if(itemID == gv.ITEM.G){
            animationKey = NAME_ANIMATION_G;
        }

        spriteCoin = cc.spriteFrameCache.getSpriteFrame(animationKey + Math.floor(Math.random() * 4) + ".png");

        if(!spriteCoin) {
            var cacheFrames = cc.spriteFrameCache;

            if(itemID == gv.ITEM.GOLD)
            {
                cc.log("item = gold");
                cacheFrames.addSpriteFrames(coinEffPath.goldPlist, coinEffPath.goldPng);
            }else{
                cc.log("item = g");
                cacheFrames.addSpriteFrames(coinEffPath.diamondPlist, coinEffPath.diamondPng);
            }
            spriteCoin = cc.spriteFrameCache.getSpriteFrame(animationKey + Math.floor(Math.random() * 4) + ".png");
        }
        this.initWithSpriteFrame(spriteCoin);
        var animation = cc.animationCache.getAnimation(animationKey);
        if (!animation) {
            var arr = [];
            var cache = cc.spriteFrameCache;
            var aniFrame;
            for (var i = 0; i < CoinFallEffect.NUM_SPRITE_ANIMATION_COIN; i++) {
                aniFrame = new cc.AnimationFrame(cache.getSpriteFrame(animationKey + i + ".png"), CoinFallEffect.TIME_ANIMATION_COIN);
                arr.push(aniFrame);
            }

            animation = new cc.Animation(arr, CoinFallEffect.TIME_ANIMATION_COIN);
            cc.animationCache.addAnimation(animation, animationKey);
        }
        this.anim = animation;
        this.setScale(0.5);

        //var particle = new cc.ParticleSystem(res.particle_negative);
        //this.addChild(particle);
        //particle.setPosition(20,20);
        //this.scaleCoin = 1;
        //this.setVisible(false);
    },
    start: function () {
        this.setVisible(true);
        var ani = cc.animate(this.anim);

        this.runAction(ani.repeatForever());
        this.runAction(cc.fadeIn(CoinFallEffect.TIME_FADE_IN_COIN));
    },
})
EffFlyItem = cc.Class.extend({
    ctor:function(){
        this.width = 100;
        this.height = 150;


        //var cacheFrames = cc.spriteFrameCache;
        //cacheFrames.addSpriteFrames(coinEffPath.goldPlist, coinEffPath.goldPng);

    },


    startEff:function(parrent, numberType, fromPos, desPos, item, amount){
        //this.effFireWork = gv.createAnimationById(resAniId.effFireWork, parrent);
        //parrent.addChild(this.effFireWork);
        //this.effFireWork.setPosition(fromPos.x, fromPos.y + 70);
        //this.effFireWork.gotoAndPlay("run", -1, -1, 1);

        this.amount  = amount;
        this.listSprite = [];
        this.parrent = parrent;
        this.curIdx = 0;
        this.desPos = desPos;
        this.fromPos = fromPos;

        switch (numberType){
            case NUMBER.FEW:
                this.createSpriteElement(10, fromPos, desPos, item);
                break;
            case NUMBER.NORMAL:
                this.createSpriteElement(20, fromPos, desPos, item);
                break;
            case NUMBER.MUCH:
                this.createSpriteElement(30, fromPos, desPos, item);
                break;
            case NUMBER.VERY_MUCH:
                this.createSpriteElement(40, fromPos, desPos, item);
                break;

        }
    },
    createSpriteElement:function(number, fromPos, desPos, item){

        var resPath = "";

        switch (item){
            case gv.ITEM.GOLD:
                resPath = res.img_gold;
                break;
            case gv.ITEM.G:
                resPath = res.img_g;
                break;
            case gv.ITEM.REP:
                resPath = res.img_rep;
                break;
            case gv.ITEM.CHEST_1:
                resPath = res.img_chest1;
                number = this.amount;
                break;
            case gv.ITEM.CHEST_2:
                resPath = res.img_chest2;
                number = this.amount;
                break;
            case gv.ITEM.CHEST_3:
                resPath = res.img_chest3;
                number = this.amount;
                break;

        }
        for(var i = 0; i < number; ++i){
            var sprite;
            if(item == gv.ITEM.GOLD){
                sprite = new itemSprite(gv.ITEM.GOLD);

            }else if(item == gv.ITEM.G){
                cc.log("item G");
                sprite = new itemSprite(gv.ITEM.G);
            }
            else{
                sprite = fr.createSprite(resPath);

            }
            sprite.setOpacity(0);
            this.parrent.addChild(sprite);

            this.listSprite.push(sprite);
            sprite.setPosition(fromPos.x, fromPos.y);

            var deltaX = Math.random()*this.width - this.width/2;
            var deltaY = Math.random()*this.height+50;
            sprite.posX = fromPos.x + deltaX;
            sprite.posY = fromPos.y + deltaY;

        }

        this.curIdx = 0;
        this.showSprite();

    },
    showSprite:function(){
        var sprite = this.listSprite[this.curIdx];
        var _this =this;
        cc.log("curidx = " + this.curIdx);
        if(this.curIdx > this.listSprite.length - 1){
            this.curIdx = this.listSprite.length - 1;

            this.parrent.runAction(cc.sequence(
                cc.delayTime(0.5)
                ,cc.callFunc(function(){
                    this.runEffFly();
                }.bind(this))
            ))
            return;
        }else{
            if(!_.isUndefined(sprite.start)){
                sprite.start();
            }
            sprite.runAction(cc.fadeIn(0.1));
            var time = Math.random()*10  + 1;
            var move = cc.moveTo(time/10, cc.p(sprite.posX, sprite.posY));
            sprite.runAction(move.easing(cc.easeCircleActionOut()));
        }
        this.curIdx++;

        var sequence = cc.sequence(cc.delayTime(0.0),
            cc.callFunc(this.showSprite , this)
        );
        this.parrent.runAction(sequence);
    },
    runEffFly:function(){
        if(this.curIdx < 0){
            var _this = this;
            this.parrent.runAction(
                cc.sequence(cc.delayTime(1.4),
                    cc.callFunc(function () {
                        for(var i = 0 ; i < _this.listSprite.length; ++i){
                            _this.listSprite[i].removeFromParent(true);
                        }
                    })
                )
            )

            return;
        }

        var sprite = this.listSprite[this.curIdx];

        var array = [

            cc.p(sprite.posX  + 100, sprite.posY - 100),
            cc.p(sprite.posX + 200, sprite.posY + 200),
            cc.p(this.desPos.x, this.desPos.y)
        ];

        var bezierTo = cc.bezierTo(1.2, array);

        var _this =this;
        //sprite.stopAllActions();
        if(this.curIdx == 0){ // last move
            sprite.runAction(cc.sequence(
                bezierTo.easing(cc.easeQuadraticActionInOut()),
                cc.callFunc(function(){
                    _this.parrent.moveOneItemFinish(_this.item);
                })
            ));
        }else if(this.curIdx == this.listSprite.length - 1){ // first move
            sprite.runAction(cc.sequence(bezierTo.easing(cc.easeQuadraticActionInOut()),
                cc.callFunc(function(){
                    _this.parrent.moveFirstItemDone(_this.item);
                })
            ))
        }
        else
        {
            sprite.runAction(cc.sequence(bezierTo.easing(cc.easeQuadraticActionInOut())));
            //sprite.runAction(actonMove.easing(cc.easeQuadraticActionInOut()))
        }

        this.curIdx--;
        var sequence = cc.sequence(
            cc.delayTime(0.0),
            cc.callFunc(this.runEffFly , this));
        this.parrent.runAction(sequence);
    }
})
EffFlyItem.show = function(parrent, numberType, fromPos, desPos, resPath, amount){

    var eff = new EffFlyItem();
    eff.startEff(parrent, numberType, fromPos, desPos, resPath, amount);
}
