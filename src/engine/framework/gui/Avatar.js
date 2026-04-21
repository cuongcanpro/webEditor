
fr.Avatar = cc.Node.extend({
    ctor: function (url) {
        this._super();

        this.setCascadeOpacityEnabled(true);

        this.defaultAvatar = new cc.Sprite('avatar.png');
        this.defaultAvatar.setCascadeOpacityEnabled(true);
        this.addChild(this.defaultAvatar);

        this.avatar = fr.AsyncSprite.create(this.defaultAvatar.getContentSize(), this.onFinishLoad.bind(this));
        this.addChild(this.avatar);
        this.avatar.setCascadeOpacityEnabled(true);

        this.updateAvatar(url);
    },

    onEnter: function(){
        this._super();
    },

    onExit: function(){
        this._super();
        if (cc.sys.isObjectValid(this.avaFrame)){
            this.avaFrame.removeFromParent(true);
            this.avaFrame = null;
        }
    },

    updateAvatar:function(url, callBack) {

        this.callBackCompleteFinish = callBack;
        let defaultAvaFromServer = "/avatar/default.jpg";
        if(_.isEmpty(url) || url == defaultAvaFromServer) {
            this.onFinishLoad(false);
            return;
        }
        this.defaultAvatar.setVisible(true);
        this.avatar.setVisible(false);
        cc.log("avatar url: " + url);
        //this.avatar.updatePath(url.replace("https:", "http:"),this.getStorePath(url));
        this.avatar.updatePath(url,this.getStorePath(url));


    },
    onFinishLoad:function(result)
    {
        if(result)
        {
            this.defaultAvatar.setVisible(false);
            this.avatar.setVisible(true);
        }
        else
        {
            this.defaultAvatar.setVisible(true);
            this.avatar.setVisible(false);
        }
        if(!_.isUndefined(this.callBackCompleteFinish)){
            this.callBackCompleteFinish(result);
        }
    },
    clippingAvatar:function(maskPath, result){
        var shader = new cc.GLProgram("res/shaders/ccShader_PositionTextureColor_noMVP.vert",
            "res/shaders/card_char.fsh");
        this._state = cc.GLProgramState.create(shader);
        if(result)
        {
            this.avatar.setGLProgramState(this._state);
        }else{
            this.defaultAvatar.setGLProgramState(this._state);
        }

        var tex_alpha = cc.textureCache.addImage(maskPath);
        this._state.setUniformTexture("s_alpha", tex_alpha.getName());
    },
    getStorePath:function(url)
    {
        if(cc.sys.isNative) {
            return jsb.fileUtils.getWritablePath() + "/" + md5(url);
        }else
        {
            return "";
        }
    },

    refreshAvatar: function() {
        this.defaultAvatar.setVisible(true);
    },

    setAvatarFrameInfo: function(isMe, isEnableOtherAvatarFrame){
        if (isMe) {
            this._isEnabledAvatarFrame = true;
            this._avatarFrameId = userMgr.getData().getCostumeUsing(KeyStorage.AVATAR_FRAME_ID);
            this.addListenerOnMeUpdateAvatarFrame();
        }
        else{
            this._isEnabledAvatarFrame = isEnableOtherAvatarFrame;
            this._avatarFrameId = AVATAR_FRAME.DEFAULT;
        }
        this.setAvatarFrame(this._avatarFrameId);
    },

    setAvatarFrame: function(avatarFrameId){
        cc.log("setAvatarFrame:", avatarFrameId);
        if (!this._isEnabledAvatarFrame){
            avatarFrameId = AVATAR_FRAME.DEFAULT;
        }

        if (avatarFrameId == AVATAR_FRAME.DEFAULT){
            if (cc.sys.isObjectValid(this.avaFrame)){
                this.avaFrame.removeFromParent(true);
            }
        }
        else{
            if (cc.sys.isObjectValid(this.avaFrame)){
                this.avaFrame.removeFromParent(true);
            }
            let avaFrame = CostumeVisual.createCostume(KeyStorage.AVATAR_FRAME_ID, avatarFrameId);
            if(avaFrame != null){
                this.avaFrame = avaFrame;
                this.addChild(this.avaFrame, 1);
            }
        }
    },

    addListenerOnMeUpdateAvatarFrame: function(){
        var listenerOnUpdateAvatarFrame = cc.EventListenerCustom.create(
            GameEvent.UPDATE_MY_AVATAR_FRAME,
            function(event) {
                if(this._isEnabledAvatarFrame){
                    let avatarFrameId = event.getUserData().newAvatarFrameId;
                    this.setAvatarFrame(avatarFrameId);
                }
            }.bind(this)
        );
        cc.eventManager.addEventListenerWithSceneGraphPriority(listenerOnUpdateAvatarFrame, this);
    },

});
