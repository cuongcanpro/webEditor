/**
 * Created by AnhVTT on 26/10/2021.
 */
var CutFogComponent = cc.Node.extend({
    ctor: function (fullSize, centerSize, centerPos) {
        this._super();
        this.fullSize = fullSize;
        this.setNewCenter(centerSize, centerPos);
        this.setForceTouchArea(CutFogComponent.FORCE_TOUCH_AREA.WHOLE_SCENE);
    },

    setNewCenter: function (centerSize, centerPos) {
        let fullSize = this.fullSize;

        let borderPath = "tutorial/cut_fog_border.png";

        // create center fog
        if (!this.borders) {
            this.borders = [];
            for (let i = 0; i < 4; i++) {
                let border = new cc.Sprite(borderPath);
                border.setAnchorPoint(1, 1);
                this.borders.push(border);
                this.addChild(border)
            }
        }
        let scale = Math.min(centerSize.width, centerSize.height)/100;
        for (let i = 0; i < 4; i++) {
            let x = centerPos.x - fullSize.width/2;
            let y = centerPos.y - fullSize.height/2;
            this.borders[i].setPosition(x + CutFogComponent.CENTER_SCALEX[i]*centerSize.width/2,
                y + CutFogComponent.CENTER_SCALEY[i]*centerSize.height/2);
            this.borders[i].setScale(CutFogComponent.CENTER_SCALEX[i]*scale, CutFogComponent.CENTER_SCALEY[i]*scale);
        }

        // create up fog
        if (!this.upFog) {
            this.upFog = ccs.load(res.ZCSD_TOP_PANEL).node;
            this.upFog.retain();
            this.addChild(this.upFog);
        }
        let upFogWidth = fullSize.width;
        let upFogHeight = fullSize.height - centerPos.y - centerSize.height/2;
        this.upFog.setScale(upFogWidth/200, upFogHeight/200);
        this.upFog.setPosition(0 - upFogWidth/2, fullSize.height/2 - upFogHeight);

        // create down fog
        if (!this.downFog) {
            this.downFog = ccs.load(res.ZCSD_TOP_PANEL).node;
            this.downFog.retain();
            this.addChild(this.downFog);
        }
        let downFogWidth = fullSize.width;
        let downFogHeight = centerPos.y - centerSize.height/2;
        this.downFog.setScale(downFogWidth/200, downFogHeight/200);
        this.downFog.setPosition(0 - downFogWidth/2, -fullSize.height/2);

        // create left fog
        if (!this.leftFog) {
            this.leftFog = new ccs.load(res.ZCSD_TOP_PANEL).node;
            this.leftFog.retain();
            this.addChild(this.leftFog);
        }
        let leftFogWidth = centerPos.x - centerSize.width/2;
        let leftFogHeight = centerSize.height;
        this.leftFog.setScale(leftFogWidth/200, leftFogHeight/200);
        this.leftFog.setPosition(-fullSize.width/2, centerPos.y - fullSize.height/2 - leftFogHeight/2);

        // create right fog
        if (!this.rightFog) {
            this.rightFog = new ccs.load(res.ZCSD_TOP_PANEL).node;
            this.rightFog.retain();
            this.addChild(this.rightFog);
        }
        let rightFogWidth = fullSize.width - centerSize.width - leftFogWidth;
        let rightFogHeight = centerSize.height;
        this.rightFog.setScale(rightFogWidth/200, rightFogHeight/200);
        this.rightFog.setPosition(fullSize.width/2 - rightFogWidth, centerPos.y - fullSize.height/2 - rightFogHeight/2);

        // center panel
        if (!this.centerTouchPanel) {
            this.centerTouchPanel = ccs.load(res.ZCSD_TOP_PANEL).node;
            this.centerTouchPanel.retain();
            this.centerTouchPanel.setOpacity(0);
            this.addChild(this.centerTouchPanel);
        }
        this.centerTouchPanel.setScale(centerSize.width/200, centerSize.height/200);
        let pos = this.getPosition();
        let dx = centerPos.x - pos.x, dy = centerPos.y - pos.y;
        this.centerTouchPanel.setPosition(dx - centerSize.width / 2, dy - centerSize.height / 2);
    },

    setForceTouchArea: function(area){
        let bordersFog = [this.upFog, this.downFog, this.leftFog, this.rightFog];
        let enableBorderTouch, enableCenterTouch, visibleCenter;

        if (area == CutFogComponent.FORCE_TOUCH_AREA.WHOLE_SCENE){
            enableBorderTouch = true;
            enableCenterTouch = true;
            visibleCenter = true;
        }
        else if (area == CutFogComponent.FORCE_TOUCH_AREA.FOUR_BORDER){
            enableBorderTouch = true;
            enableCenterTouch = false;
            visibleCenter = true;
        }
        else if (area == CutFogComponent.FORCE_TOUCH_AREA.OTHER_NODE_AT_CENTER){
            enableBorderTouch = false;
            enableCenterTouch = true;
            visibleCenter = false;
        }
        else if(area == CutFogComponent.FORCE_TOUCH_AREA.CENTER) {
            enableBorderTouch = false;
            enableCenterTouch = true;
            visibleCenter = true;
        }

        for (let i = 0; i < bordersFog.length; i++){
            let cb = enableBorderTouch ? this.onTouchTopPanel : function(){};
            bordersFog[i].getChildByName("panel").addTouchEventListener(cb, this);
        }
        this.centerTouchPanel.getChildByName("panel").setVisible(visibleCenter);
        let cb = enableCenterTouch ? this.onTouchTopPanel : function(){};
        this.centerTouchPanel.getChildByName("panel").addTouchEventListener(cb, this);
    },

    executeAfterTouchOrDelay: function (delayTime, callback) {
        this.touchCallback = callback;
        if (delayTime >= 0) {
            let action = cc.sequence(
                cc.delayTime(delayTime),
                cc.callFunc(function () {
                    if (this.touchCallback) {
                        let cb = this.touchCallback;
                        this.touchCallback = null;
                        if (cb) cb();
                    }
                }.bind(this))
            )
            action.setTag(CutFogComponent.DELAY_ACTION);
            this.runAction(action)
        }
        else{
            this.stopActionByTag(CutFogComponent.DELAY_ACTION);
        }
    },
    onTouchTopPanel: function (sender, type) {
        switch (type) {
            case ccui.Widget.TOUCH_ENDED:
                this.stopActionByTag(CutFogComponent.DELAY_ACTION);
                // free callback before execute as new touchCallback might be added while doing current callback
                if (this.touchCallback) {
                    let cb = this.touchCallback;
                    this.touchCallback = null;
                    if (cb) cb();
                }
                break;
        }
    },
    setFogOpacity: function (opacity) {
        this.upFog.setOpacity(opacity);
        this.downFog.setOpacity(opacity);
        this.leftFog.setOpacity(opacity);
        this.rightFog.setOpacity(opacity);
        for (let i in this.borders) this.borders[i].setOpacity(opacity);
    }
});

CutFogComponent.CENTER_SCALEX = [-1, 1, -1, 1];
CutFogComponent.CENTER_SCALEY = [1, 1, -1, -1];
CutFogComponent.DELAY_ACTION = 11;
CutFogComponent.FORCE_TOUCH_AREA = {
    OTHER_NODE_AT_CENTER: 0,   // let user touch anything inside center, don't trigger this.touchCallback(), need call manual
    CENTER: 1,
    FOUR_BORDER: 2,
    WHOLE_SCENE: 3
};