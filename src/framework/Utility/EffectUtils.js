
fr.EffectUtils = {};

fr.EffectUtils.addBtnBlend = function (btn, btn_sprite_res) {
    var btn_blend = fr.createSprite(btn_sprite_res);
    btn_blend.setBlendFunc(gl.SRC_ALPHA, gl.ONE);
    btn_blend.setOpacity(180);
    fr.scaleNodeToFull(btn_blend, btn.getContentSize());
    btn_blend.setPosition(btn.getContentSize().width / 2, btn.getContentSize().height / 2);
    btn.addChild(btn_blend);
    btn_blend.setName("blend_btn");
    btn_blend.runAction(cc.sequence(cc.fadeTo(0.8,0), cc.delayTime(0.5), cc.fadeTo(0.8, 150)).repeatForever());
};

fr.EffectUtils.addSlashEffect = function(spriteToStencil, isInvert, alphaThreshold, numRepeat, delayPerRepeat){
    if (spriteToStencil.getParent().getChildByName("NodeSlashEffect"))
        return;
    var contentSize = spriteToStencil.getContentSize();
    var clipping = cc.ClippingNode();
    clipping.stencil = spriteToStencil;
    clipping.alphaThreshold = alphaThreshold;
    var slash = fr.createSprite(res.img_slash);
    var slashHeight = slash.getContentSize().height;    //360
    var slashWidth = slash.getContentSize().width;      // 281
    var spriteWorldPos = UIUtils.getWorldPosition(spriteToStencil);
    slash.setPosition( - slashWidth + spriteWorldPos.x, -slashHeight/2 + spriteWorldPos.y + contentSize.height/2);
    clipping.addChild(slash);
    spriteToStencil.getParent().addChild(clipping);
    clipping.setName("NodeSlashEffect");
    if (isInvert) clipping.setInverted(true);
    slash.setBlendFunc(gl.SRC_ALPHA, gl.ONE);
    slash.setOpacity(255);
    var slashMove = cc.sequence(
        cc.moveBy(3, cc.p(contentSize.width + slashWidth*2, 0)).easing(cc.easeQuadraticActionInOut()),
        cc.callFunc(function () {
            slash.setPositionX( -slashWidth + spriteWorldPos.x);
        }),
        cc.delayTime(delayPerRepeat)
    );
    if (numRepeat === -1)
        slash.runAction(slashMove.repeatForever());
    else if (numRepeat > 0)
        slash.runAction(slashMove.repeat(numRepeat));
    else
        slash.runAction(slashMove);
};
fr.EffectUtils.removeSlashEffect = function(spriteToStencil){
    if (spriteToStencil.getParent().getChildByName("NodeSlashEffect"))
        spriteToStencil.getParent().removeChildByName("NodeSlashEffect");
};

fr.EffectUtils.scaleHighlightBtn = function (btn, isForever) {
    if (isForever == undefined) isForever = false;
    var scale = cc.sequence(
        cc.scaleTo(0.5, 1.06, 1.06),
        cc.scaleTo(0.5, 1, 1),
        cc.scaleTo(0.3, 1.03, 1.03),
        cc.scaleTo(0.3, 1, 1),
        cc.delayTime(2)
    );
    if (isForever) scale = scale.repeatForever();
    scale.setTag(GLOBAL_ACTION_TAG.SCALE_HIGHLIGHT_BUTTON);
    btn.runAction(scale);
};

fr.EffectUtils.setShader = function(node, shaderProgram){
    if (typeof node.setShaderProgram == "function")
        node.setShaderProgram(shaderProgram);
    if (node.getChildren && node.getChildren().length > 0){
        for (var i =0; i < node.getChildren().length;i++){
            fr.EffectUtils.setShader(node.getChildren()[i], shaderProgram);
        }
    }
};
fr.EffectUtils.setGrayScale = function(node, isGray){
    var shaderProgram = isGray ? cc.shaderCache.getProgram("ShaderUIGrayScale") :
        cc.shaderCache.getProgram("ShaderPositionTextureColor_noMVP");
    fr.EffectUtils.setShader(node, shaderProgram);
};

fr.EffectUtils.enableCascadeOpacityForNode = function (node) {
    if (node && typeof node.getChildren === "function" ){
        var allChild = node.getChildren();
        for ( var i = 0; i < allChild.length; i++){
            if ( typeof allChild[i].setCascadeOpacityEnabled === "function" ){
                allChild[i].setCascadeOpacityEnabled(true);
                fr.EffectUtils.enableCascadeOpacityForNode(allChild[i]);
            }
        }
    }
};

fr.EffectUtils.enableBtn = function (btn, isEnable) {
    btn.setEnabled(isEnable);
    if (isEnable) btn.runAction(cc.tintTo(0.2, 255, 255, 255));
    else btn.runAction(cc.tintTo(0.2, 155, 155, 155));
};

fr.EffectUtils.lockBtn = function(btn, isLocked, originalCallBack){
    if (!btn instanceof ccui.Button)
        return;
    btn.isLocked = isLocked;
    btn.getVirtualRenderer().setState(isLocked ? cc.Scale9Sprite.state.GRAY : cc.Scale9Sprite.state.NORMAL);
    // update touch action callback:
    btn.addTouchEventListener(function (sender, type) {
        switch (type) {
            case ccui.Widget.TOUCH_BEGAN:
            case ccui.Widget.TOUCH_CANCELED:
                this.getVirtualRenderer().setState(this.isLocked ? cc.Scale9Sprite.state.GRAY : cc.Scale9Sprite.state.NORMAL);
                break;
            case ccui.Widget.TOUCH_ENDED:
                this.getVirtualRenderer().setState(this.isLocked ? cc.Scale9Sprite.state.GRAY : cc.Scale9Sprite.state.NORMAL);
                originalCallBack && originalCallBack(sender, type);
                break;
            default:
                break;
        }
    }, btn);
};