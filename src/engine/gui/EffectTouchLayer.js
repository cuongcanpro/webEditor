var EffectTouchLayer = cc.Layer.extend({
    ctor: function () {
        this._super();
        // this.setContentSize(cc.winSize);
        this.setTag(EffectTouchLayer.TAG);
        this.setLocalZOrder(EffectTouchLayer.TAG);

        this.iconTouch = cc.Sprite.create();
        this.iconTouch.setVisible(false);
        this.addChild(this.iconTouch);
        this.sttIcon = 0;

        this.timeEffect = 0;
        this.stateTouch = EffectTouchLayer.TOUCH_NONE;
        this.movePos = cc.p(0, 0);
        this.deltaTouch = cc.p(0, 0);

        var NUM_DECO = 3;
        this.arrayDeco = [];
        this.arrayWaitDeco = [];
        for(var i = 0; i < NUM_DECO; i++){
            this.createDeco();
        }

        this.arrayDecoEvent = [];
        this.arrayWaitDecoEvent = [];

        this._listener = cc.EventListener.create({
            event: cc.EventListener.TOUCH_ONE_BY_ONE,
            swallowTouches: false,
            onTouchBegan: this.onTouchBegan,
            onTouchMoved: this.onTouchMoved,
            onTouchEnded: this.onTouchEnded
        });
        cc.eventManager.addListener(this._listener,this);
    },

    onExit: function() {
        this.iconTouch.setVisible(false);
        this.arrayWaitDeco = [];
        for(var deco of this.arrayDeco)
            deco.setVisible(false);
        if(this.arrayDecoEvent.length > 0){
            this.arrayWaitDecoEvent = [];
            for(var deco of this.arrayDecoEvent)
                deco.setVisible(false);
        }
    },

    effectTouch: function(pos){
        var iconTouch = this.iconTouch;
        iconTouch.initWithFile("Lobby/Common/touchIcon" + this.sttIcon + ".png");
        this.sttIcon ++;
        if(this.sttIcon >= 4)this.sttIcon = 0;
        iconTouch.setBlendFunc(cc.DST_COLOR, cc.ONE);
        iconTouch.setPosition(pos);
        iconTouch.setVisible(true);
        iconTouch.setScale(0);
        iconTouch.setOpacity(255);
        iconTouch.stopAllActions();
        iconTouch.runAction(cc.sequence(
            cc.delayTime(0.1),
            cc.spawn(
                cc.scaleTo(0.6, 1.5).easing(cc.easeSineOut()),
                cc.fadeOut(0.6).easing(cc.easeSineIn())),
            cc.hide()
        ));

        /////
        for(var i = 0; i < 3; i++){
            this.effectDeco(pos);
        }

    },

    createDeco: function(){
        var deco = cc.Sprite.create("Lobby/Common/touchDeco.png");
        deco.setBlendFunc(cc.DST_COLOR, cc.ONE);
        this.addChild(deco);
        var square = cc.Sprite.create("Lobby/Common/touchSquare.png");
        deco.addChild(square);
        deco.square = square;
        square.setBlendFunc(cc.DST_COLOR, cc.ONE);
        deco.setCascadeOpacityEnabled(false);
        square.setPosition(deco.width / 2, deco.height / 2);
        square.setScale(1.05, 1.05);
        this.arrayDeco.push(deco);
        deco.setVisible(false);
        return deco;
    },

    effectDeco: function(pos){
        var deco = this.arrayWaitDeco.pop();
        if(!deco){
            deco = this.createDeco();
        }
        var EFF_TIME = 0.7;
        deco.stopAllActions();
        deco.setVisible(true);
        deco.setPosition(pos);
        deco.setRotation(Math.random() * 90);
        deco.setOpacity(0);
        deco.setScale(0.2);
        var square = deco.square;
        square.setOpacity(0);
        square.stopAllActions();
        //
        var angle = Math.random() * Math.PI * 2;
        var del = Math.random() * 85 + 15;
        var pDelta = cc.p(del* Math.cos(angle), del * Math.sin(angle));
        var scale = 0.5 + Math.random()*0.7;
        deco.runAction(cc.spawn(
            cc.rotateBy(EFF_TIME, (Math.random() - 0.5) * 360),
            cc.moveBy(EFF_TIME, pDelta).easing(cc.easeSineOut()),
            cc.sequence(cc.scaleTo(0.2, scale), cc.scaleTo(0.5, scale * 0.5))
        ));
        deco.runAction(cc.sequence(
            cc.fadeIn(0.4),
            cc.fadeOut(0.1),
            cc.fadeTo(0.15, 150),
            cc.fadeOut(0.1),
            cc.hide(),
            cc.callFunc(function (target) {
                this.arrayWaitDeco.push(target);
            }, this)
        ));
        square.runAction(cc.sequence(
            cc.fadeIn(0.25),
            cc.fadeOut(0.1),
            cc.fadeTo(0.2, 150),
            cc.fadeOut(0.15)
        ));
    },

    createDecoEvent: function(){
        var deco = cc.Sprite.create();
        this.addChild(deco);
        this.arrayDecoEvent.push(deco);
        deco.setVisible(false);
        return deco;
    },

    effectDecoEvent: function(pos){
        var deco = this.arrayWaitDecoEvent.pop();
        if(!deco){
            deco = this.createDecoEvent();
        }
        deco.initWithFile("Lobby/Lobby/deco" + (Math.floor(Math.random() * 100000) % 3) + ".png");
        deco.setPosition(pos);
        deco.setRotation(Math.random() * 360);
        deco.setOpacity(100 + Math.random() * 100);
        deco.setVisible(true);
        var scale = 0.3 + Math.random() * 0.3;
        deco.setScale(scale);

        var time = 1;
        var angle = Math.random() * Math.PI * 2;
        var del = Math.random() * 45 + 15;
        var pDelta = cc.p(del* Math.cos(angle), del * Math.sin(angle));
        deco.runAction(cc.sequence(
            cc.spawn(
                cc.moveBy(time, pDelta).easing(cc.easeSineOut()),
                cc.rotateBy(time, (Math.random() - 0.5) * 300)
            ),
            cc.fadeOut(0.1),
            cc.hide(),
            cc.callFunc(function(target){
                target.stopAllActions();
                this.arrayWaitDecoEvent.push(target);
            }, this)));

    },

    update: function(dt){
        this.timeEffect += dt;
        var state = this.stateTouch;
        if(state == EffectTouchLayer.TOUCH_MOVED){
            if(this.timeEffect > EffectTouchLayer.TIME_START_EFFECT){
                if(EffectTouchLayer.IS_EVENT)
                    this.effectDecoEvent(this.movePos);
                else
                    this.effectDeco(this.movePos);
                this.timeEffect = 0;
            }
        }
    },

    onTouchBegan: function(touch,event){
        var layer = event.getCurrentTarget();
        layer.stateTouch = EffectTouchLayer.TOUCH_BEGAN;
        return true;
    },
    onTouchMoved: function(touch,event){
        var layer = event.getCurrentTarget();
        var state = layer.stateTouch;
        if(state == EffectTouchLayer.TOUCH_BEGAN){
            var pos = touch.getLocation();
            var startPos = touch.getStartLocation();
            var delta = MathEx.convertDistanceToInch(pos.x - startPos.x, pos.y - startPos.y);
            if(delta > MathEx.MOVE_INCH){
                layer.timeEffect = EffectTouchLayer.TIME_START_EFFECT;
                layer.stateTouch = EffectTouchLayer.TOUCH_MOVED;
                var pos = touch.getLocation();
                layer.deltaTouch = cc.p(layer.movePos.x - pos.x, layer.movePos.y - pos.y);
                layer.movePos = pos;
                layer.scheduleUpdate();
            }
        }
        else if(state == EffectTouchLayer.TOUCH_MOVED){
            var pos = touch.getLocation();
            layer.deltaTouch = cc.p(layer.movePos.x - pos.x, layer.movePos.y - pos.y);
            layer.movePos = pos;
        }
    },
    onTouchEnded: function(touch,event){
        var layer = event.getCurrentTarget();
        var pos = touch.getLocation();
        layer.stateTouch = EffectTouchLayer.TOUCH_NONE;
        layer.effectTouch(pos);
        layer.unscheduleUpdate();
    },

});

EffectTouchLayer.TOUCH_NONE = -1;
EffectTouchLayer.TOUCH_BEGAN = 0;
EffectTouchLayer.TOUCH_MOVED = 1;
EffectTouchLayer.TIME_START_EFFECT = 0.1;
EffectTouchLayer.IS_EVENT = false;

EffectTouchLayer._instance = null;
EffectTouchLayer.TAG = 99999;
EffectTouchLayer.getInstance = function () {
    if (!EffectTouchLayer._instance) {
        EffectTouchLayer.TAG = TOUCH_EFFECT_TAG;
        EffectTouchLayer._instance = new EffectTouchLayer();
    }
    var effLayer = EffectTouchLayer._instance;
    if(effLayer.getParent())effLayer.removeFromParent();
    effLayer.retain();
    return effLayer;
};