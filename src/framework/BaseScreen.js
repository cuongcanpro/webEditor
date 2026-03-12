var BaseScreen = cc.Layer.extend({
    screenConfig:null,

    ctor:function(){
        this._super();
    },

    syncAllChild:function(res){
        this.screenConfig = ccs.load(res,res.ZCSD_ROOT);
        this._rootNode = this.screenConfig.node;
        this.addChild(this._rootNode);

        var allChildren = this._rootNode.getChildren();
        var nameChild;
        for(var i = 0; i < allChildren.length; i++) {
            nameChild = allChildren[i].name;
            if(nameChild in this)
            {
                this[nameChild] = allChildren[i];
                if(nameChild.indexOf("btn") != -1)
                {
                    this[nameChild].addTouchEventListener(this.onTouchEvent, this);
                }
            }
        }
    },

    createGUI:function(res,img){
        var config = ccs.load(res,res.ZCSD_ROOT);
        img._rootNode = config.node;
        img.addChild(img._rootNode);
        this.addChild(img);

        var allChildren = img._rootNode.getChildren();
        var nameChild;
        for(var i = 0; i < allChildren.length; i++) {
            nameChild = allChildren[i].name;
            if(nameChild in this)
            {
                this[nameChild] = allChildren[i];
                if(nameChild.indexOf("btn") != -1)
                {
                    this[nameChild].addTouchEventListener(this.onTouchEvent, this);
                }
            }
        }
    },

    onTouchEvent:function(sender, type){
        switch (type){
            case ccui.Widget.TOUCH_BEGAN:
                this.onTouchBeganEvent(sender);
                break;
            case ccui.Widget.TOUCH_ENDED:
                this.onTouchEndEvent(sender);
                break;
        }
    },

    onTouchBeganEvent:function(sender){

    },

    onTouchEndEvent:function(sender){

    }


});