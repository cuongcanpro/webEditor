
gv.isShortScreen = function(){
    return cc.winSize.width/cc.winSize.height <= 1.55;
};

var GuiMgr = cc.Class.extend(
    {
        ctor:function () {
            this._currentScreen = null;
            this._listScreen = {};
            this._screenFactory = null;
            this._currentScreenId = -1;
            this._oldScreenId = -1;
            return true;
        },
        addScreen:function(screen, screenId){
            cc.log("add screen to list" + screenId);
            this._listScreen[screenId] = screen;
            screen.retain();
        },
        removeScreen:function(screenId)
        {
            cc.log("remove screen +" + screenId + " - " + this.getScreenNameById(screenId));
            if(screenId in this._listScreen)
            {
                if(this._listScreen[screenId].onRemoved != undefined)
                {
                    this._listScreen[screenId].onRemoved();
                }

                this._listScreen[screenId].release();
                delete this._listScreen[screenId];
            }
            cc.log("finish remove screen +" + screenId + " - " + this.getScreenNameById(screenId));
        },
        getScreen:function(screenId)
        {

            if(screenId in this._listScreen)
            {
                cc.log("reload "+screenId);
                return this._listScreen[screenId];
            }
            else if(this._screenFactory != null)
            {
                var startTime = Date.now();
                var screen = this._screenFactory.createScreen(screenId);
                var endTime = Date.now();
                cc.log("timecreatescreen " + screenId + " - " + this.getScreenNameById(screenId) + ": " + (endTime - startTime));
                if(screen != null)
                {
                    this._currentScene = screen;
                    this.addScreen(screen, screenId);
                    return screen;
                }
            }
            return null;
        },
        initScreensByIds:function(listScreenId)
        {
            for(var i = 0; i < listScreenId.length; i++)
            {
                var screenId = listScreenId[i];
                this.getScreen(screenId);
            }
        },
        viewScreenById:function(screenId, isKeepPrevScreen)
        {
            isKeepPrevScreen = typeof isKeepPrevScreen !== 'undefined' ? isKeepPrevScreen:false;

            if (screenId == this._currentScreenId)
            {
                cc.log("equal current screen");
                return;
            }
            if(!isKeepPrevScreen
                || this._currentScreenId == gv.SCREEN_ID.MAIN_BOARD
                || this._currentScreenId == gv.SCREEN_ID.EVENT_304
                )
            {
                this.removeScreen(this._currentScreenId);
            }
            this._oldScreenId = this._currentScreenId;
            this._currentScreenId = screenId;
           // cc.log("view screen " + screenId + " - " + this.getScreenNameById(screenId));
            this.viewScreen(this.getScreen(screenId));

        },
        addScreenKeyboardListener:function(screen) {
            if (screen == null) {
                return;
            }
            var self = this;
            screen.keyboardEventListener = cc.EventListener.create({
                event: cc.EventListener.KEYBOARD,
                onKeyReleased:function(key, event){
                    if(key == cc.KEY.backspace || key == cc.KEY.back || key == cc.KEY.escape) {
                        if  (cc.sys.platform == cc.sys.WINRT || cc.sys.platform == cc.sys.WP8) {
                            cc.log("event.stopPropagation();");
                            event.stopPropagation();
                        }
                        if(gv.layerSetting != null && gv.layerSetting.isVisible()){
                            return;
                        }
                        if(self.dialogExit != null){
                            self.dialogExit.removeFromParent();
                            self.dialogExit = null;
                        }else {
                            self.dialogExit = new PopupDialog();
                            self.addChild(self.dialogExit);
                            self.dialogExit.showTwoButton({
                                    title: fr.Localization.text("lang_notice"),
                                    content: fr.Localization.text("lang_notice_exit_game"),
                                    leftButton: fr.Localization.text("lang_btn_cancel"),
                                    rightButton: fr.Localization.text("lang_btn_exit_game")
                                },
                                function () {
                                    self.dialogExit = null;
                                },
                                function () {
                                    self.dialogExit = null;
                                    gv.notificationMgr.onGameHide();
                                    fr.NativeService.endGame();
                                }
                            );
                        }
                    }
                }
            });
            cc.eventManager.addEventListenerWithFixedPriority(screen.keyboardEventListener, 1);
        },
        removeScreenKeyboardListener:function(screen) {
            if (screen == null) {
                return;
            }
            if( screen.keyboardEventListener )
            {
                cc.eventManager.removeListener(screen.keyboardEventListener);
            }
        },
        viewScreen:function(screen)
        {
            //this.removeScreenKeyboardListener(this._currentScreen);
            screen.removeFromParent();
            var scene = new cc.Scene();
            screen.is3dScreen = false;
            scene.addChild(screen);
            screen.setGlobalZOrder(10);

            // initialize director
            //cc.director.runScene(scene);
            if(this._oldScreenId == -1 || this._oldScreenId == gv.SCREEN_ID.MAIN_BOARD) {
                cc.director.runScene(scene);
            } else {
                var pTransition = this._screenFactory.createTransition(scene, this._oldScreenId,this._currentScreenId);
                cc.director.runScene(pTransition);
            }
            //this.addScreenKeyboardListener(screen);
            this._currentScreen = screen;
            this._currentScene = scene;
            cc.log("view Done ~~~ !!");
        },
        setScreenFactory:function(screenFactory)
        {
            this._screenFactory = screenFactory;
        },
        getCurrentScreen:function()
        {
            return this._currentScreen;
        },
        getCurrentScreenId:function()
        {
            return this._currentScreenId;
        },
        isScreen:function(screenId) {
            return this._currentScreenId == screenId;
        },
        getCurrentScene:function() {
            return this._currentScene;
        },

        getScreenNameById: function (screenId) {
            var screenName = "";
            for ( var key in gv.SCREEN_ID ){
                if ( gv.SCREEN_ID.hasOwnProperty(key) && gv.SCREEN_ID[key] == screenId ){
                    screenName = key;
                    return screenName;
                }
            }
            return (" can't get name of screenId: " + screenId);
        }
    }
);