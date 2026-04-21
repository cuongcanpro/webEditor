var BaseUINode  = cc.Node.extend({

    ctor: function(json){
        this._super();

        this._layoutPath = json;
        var jsonLayout = ccs.load(json);
        this._layout = jsonLayout.node;
        ccui.Helper.doLayout(this._layout);
        this.addChild(this._layout);
        this._deepSyncChildren = 1;
        this.initGUI();
    },

    initGUI: function (){
        /*    override meeeeeeeeee  */
    },

    customButtonDelayClick: function (sender, delayClick){
        if(delayClick === undefined)
            delayClick = 0;
        sender.delayClick = delayClick * 1000;
        if(delayClick > 0) sender.timeLastClick = 0;
    },

    /************ touch event handler *************/
    onTouchEventHandler: function(sender,type){
        switch (type){
            case ccui.Widget.TOUCH_BEGAN:
                this.onButtonTouched(sender,sender.getTag());
                fr.crashLytics.logPressButton(this._layoutPath + ": " + sender.getName());
                break;
            case ccui.Widget.TOUCH_ENDED:
                var delayClick = sender.delayClick;
                if(delayClick > 0){
                    var now = Date.now();
                    if(now - sender.timeLastClick < delayClick) {
                        break;
                    }
                    else {
                        sender.timeLastClick = now;
                    }
                }
                this.onButtonRelease(sender, sender.getTag());
                this.playSoundButton(sender.getTag());
                break;
            case ccui.Widget.TOUCH_CANCELED:
                this.onButtonCanceled(sender, sender.getTag());
                break;
        }
    },
    ////////////////////////////////////////////

    /******* functions need override  *******/

    onButtonRelease: function(button,id){
        /*    override meeeeeeeeee  */
    },

    onButtonTouched: function(button,id){
        /*    override meeeeeeeeee  */
    },

    onButtonCanceled: function(button,id){
        /*    override meeeeeeeeee  */
    },

    setDeepSyncChildren: function(deep){
        this._deepSyncChildren = deep;
    },

    syncAllChildren: function(){
        UIUtils._syncChildrenInNode(this._layout, this, 0, this._deepSyncChildren);

        return this._layout;
    },

    playSoundButton: function(id){
        if (gamedata.sound)
        {
            jsb.AudioEngine.play2d(lobby_sounds.click, false);
        }
    },

    addTouchEventListener: function (){

    },
});