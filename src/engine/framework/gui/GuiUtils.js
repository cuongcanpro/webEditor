/**
 * Created by KienVN on 11/16/2015.
 */


/**
 *  scale node to certain size
 * @param node
 * @param size: cc.size, = cc.winSize if undefined
 */
fr.scaleNodeToFull = function(node, size) {
    if (typeof node.getContentSize == "function" && typeof node.setScale == "function"){
        if (size == undefined){
            size = cc.winSize;
        }
        var contentSize = node.getContentSize();
        var scaleX = size.width/contentSize.width;
        var scaleY = size.height/contentSize.height;
        var scale = scaleX>scaleY?scaleX:scaleY;
        node.setScale(scale);
    }
    else{
        cc.log("fr.scaleNodeToFull: node can't run this function");
    }
};

fr.createCommonButton = function(imgNormal, imgSelected, imgDisabled, texType) // path
{
    var btnKeep = new ccui.Button();
    btnKeep.setTouchEnabled(true);
    btnKeep.setPressedActionEnabled(true);
    btnKeep.loadTextures(imgNormal, imgSelected, imgDisabled,texType);
    return btnKeep;
};

fr.createSprite = function (name, path) {
    cc.log("fr.createSprite getSpriteFrame", name);
    path = path || name;
    if (cc.spriteFrameCache.getSpriteFrame(name)) {
        cc.log("fr.createSprite getSpriteFrame", name);
        return new cc.Sprite("#" + name);
    } else {
        cc.log("fr.createSprite Path", path);
        return new cc.Sprite(path);
    }
};


fr.changeSprite = function(sprite, name, path)
{
    path = path || name;
    if (cc.spriteFrameCache.getSpriteFrame(name)) {
        sprite.setSpriteFrame(name);
    }
    else {
        sprite.setTexture(path);
    }
};
fr.createText = function(fontPath, size, color )
{
    var lbl = new ccui.Text("0" ,fontPath, size);
    lbl.setTextColor(color);
    return  lbl;
};

fr.pressBackGroundToHide = function(background)
{
    var self = this;
    background.addClickEventListener(function()
    {
        if(_.isFunction(self.hide))
        {
            self.hide();
        }else
        {
            self.setVisible(false);
        }
    });
};

fr.showTopPanel = function (layer) {
    if (!layer) return -1;
    if (!layer.topPanel) {
        var panel = ccs.load(res.ZCSD_TOP_PANEL).node;
        panel.setScale(cc.winSize.width/200, cc.winSize.height/200);
        layer.addChild(panel);
        layer.topPanel = panel;
    }
    layer.topPanel.setVisible(true);
    if (layer.topPanelZOrder)
        layer.topPanel.setLocalZOrder(layer.topPanelZOrder);
    else layer.topPanel.setLocalZOrder(GUIConst.TOP_PANEL_ZORDER);
    if (!layer.topPanel.guiStack) layer.topPanel.guiStack = 0;
    layer.topPanel.guiStack++;
    return layer.topPanel.getLocalZOrder();
};

fr.hideTopPanel = function (layer) {
    if (!layer || !layer.topPanel) return -1;
    layer.topPanel.guiStack--;
    if (layer.topPanel.guiStack <= 0) {
        layer.topPanel.setVisible(false);
    }
};

fr.removeFogTouchListener = function () {
    let scene = cc.director.getRunningScene();
    if (scene.topPanel && scene.topPanel.getChildByName('panel')) {
        scene.topPanel.getChildByName('panel').addTouchEventListener(function (sender, node) {}, scene);
    }
};

fr.setLayerToCenterScreen = function(layer){
    var parent = layer.getParent();
    var contentSize = layer.getContentSize();
    var center = cc.p(cc.winSize.width/2, cc.winSize.height/2);
    // layer root pos at (0,0) -> sub content size -> subtract 1/2 content size:
    var worldPosLayerToCenter = cc.p(center.x - contentSize.width/2, center.y - contentSize.height/2);
    var nodePosLayerToCenter = parent.convertToNodeSpace(worldPosLayerToCenter);
    layer.setPosition(nodePosLayerToCenter);
};

fr.resizeUIImage = function(image, maxSizeCap, minSizeCap){
    var size = image.getContentSize();
    if (size.width >= size.height && size.width > maxSizeCap){
        image.ignoreContentAdaptWithSize(false);
        image.setContentSize(maxSizeCap, size.height *(maxSizeCap/size.width));
    }
    else if (size.height >= size.width && size.height > maxSizeCap){
        image.ignoreContentAdaptWithSize(false);
        image.setContentSize(size.width * (maxSizeCap/size.height), maxSizeCap);
    }
    else if (size.height >= size.width && size.height < minSizeCap){
        image.ignoreContentAdaptWithSize(false);
        image.setContentSize(size.width * (minSizeCap/size.height) ,minSizeCap);
    }
    else if (size.width >= size.height && size.width < minSizeCap){
        image.ignoreContentAdaptWithSize(false);
        image.setContentSize(minSizeCap, size.height*(minSizeCap/size.width));
    }
};

// get node center position no matter where the anchor point
fr.getNodeCenterPos = function(node){
    if (!node) {
        return cc.p(0,0);
    }
    if (typeof node.getParent != "function" || !node.getParent()){
        return node.getPosition();
    }

    var pos = node.getPosition();
    var anchor = node.getAnchorPoint();
    var size = node.getContentSize();
    var x = pos.x + (0.5-anchor.x)*size.width;
    var y = pos.y + (0.5-anchor.y)*size.height;
    return cc.p(x, y);
};

fr.temporaryDisableBtn = function(btn, time){
    if (time == undefined) time = 1;
    btn.setEnabled(false);
    var action = cc.sequence(
        cc.delayTime(time),
        cc.callFunc(function () {
            btn.setEnabled(true);
        })
    );
    action.setTag(GLOBAL_ACTION_TAG.DELAY_ENABLE_BUTTON);
    btn.runAction(action);
};

var GLOBAL_ACTION_TAG = {};
GLOBAL_ACTION_TAG.DELAY_ENABLE_BUTTON = 12345;