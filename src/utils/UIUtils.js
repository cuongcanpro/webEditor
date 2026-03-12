var UIUtils = {
    fakeBtnAction: function (btn, type) {
        if (btn) switch (btn.originalScale || (btn.originalScale = btn.getScale()), type) {
            case ccui.Widget.TOUCH_BEGAN:
                if (btn.isPlaySound) fr.Sound.playEffectClickButton();
                btn.runAction(cc.scaleTo(0.3, btn.originalScale + btn.originalScale * 0.15).easing(cc.easeExponentialOut()));
                break;
            case ccui.Widget.TOUCH_ENDED:
            case ccui.Widget.TOUCH_CANCELED:
                btn.stopAllActions();
                btn.runAction(cc.scaleTo(0.3, btn.originalScale).easing(cc.easeExponentialOut()));
        }
    },
    mappingChildren: function (node, targetAssign, exclude) {
        this.doMappingChildren(node, targetAssign, exclude);
        this.cacheFuncMappingChildren = [];
    },
    doMappingChildren: function (node, targetAssign, exclude) {
        this.cacheFuncMappingChildren = this.cacheFuncMappingChildren || [];
        node.getName() && (this.cacheFuncMappingChildren.push(node.getName()));
        !exclude && (exclude = [])
        var list = node.getChildren();
        for (var i = 0; i < list.length; i++) {
            //check click listener button
            if (list[i].cbClickName) {
                let cbClick = targetAssign[list[i].cbClickName];
                if (cbClick) list[i].addClickEventListener(cbClick.bind(targetAssign));
            }

            var name = list[i].getName();
            //cc.log(name)
            if (exclude.indexOf(name) != -1) {
                this.doMappingChildren(list[i], targetAssign);
                continue;
            }
            if (this.cacheFuncMappingChildren.indexOf(name) != -1) {
                this.doMappingChildren(list[i], targetAssign);
                continue;
            }
            if (name && name != "") {
                targetAssign[name] = list[i];
                this.cacheFuncMappingChildren.push(name);
            }
            this.doMappingChildren(list[i], targetAssign);
        }
    },
    addFog: function (parent, zOrder, customName, color, opacity, isNew) {
        if (!parent) return null;
        if (zOrder == undefined) zOrder = 99999; // top of parent if param not defined
        if (customName == undefined) customName = "UIUtils.addFog";
        if (color == undefined) color = cc.color(0, 20, 30);
        if (opacity == undefined) opacity = 204;
        if( isNew == undefined) isNew = false;

        var fog = parent.getChildByName(customName);
        if (fog){
            if(!isNew) return fog;
            fog.removeFromParent();
        }

        fog = new ccui.Layout();
        fog.setBackGroundColorType(1);
        fog.setBackGroundColor(color);
        fog.setOpacity(opacity);
        fog.setTouchEnabled(true);
        fog.setAnchorPoint(0.5, 0.5);
        fog.setName(customName);
        parent.addChild(fog, zOrder);
        UIUtils.setWorldPosition(fog, cc.winSize.width / 2, cc.winSize.height / 2);
        fog.setContentSize(cc.size(cc.winSize.width, cc.winSize.height));
        return fog;
    },
    createBasicTrail: function (node, fade, minSeg, stroke) {
        fade = fade || 0.1;
        minSeg = minSeg || 10;
        stroke = stroke || 30;
        let trail = new cc.MotionStreak(fade, minSeg, stroke, cc.color.WHITE, "game/element/streak.png");
        trail.setBlendFunc(new cc.BlendFunc(1, 1));
        trail.setPosition(node.getPosition());
        node.getParent().addChild(trail, node.getLocalZOrder() - 1);
        trail.update = function () {
            trail.setPosition(node.getPosition());
        }
        trail.scheduleUpdate();
        return trail;
    },
    bubbleIn: function (node, callback, delay) {
        var defaultScale = node.getScale();
        node.setOpacity(0);
        node.setScaleX(defaultScale * 1.4);
        node.setScaleY(defaultScale * 1.4);
        var fadeIn = cc.fadeIn(0.1);

        var scaleIn = cc.scaleTo(0.12, defaultScale * 0.95);
        var scaleOut = cc.scaleTo(0.11, defaultScale * 1.05);

        var scaleIn1 = cc.scaleTo(0.11, defaultScale * 0.98);
        var scaleOut1 = cc.scaleTo(0.11, defaultScale * 1.01);

        var scaleNormal = cc.scaleTo(0.1, defaultScale);
        node.runAction(cc.sequence(cc.delayTime(delay), cc.callFunc(callback, node)));
        node.runAction(cc.sequence(cc.delayTime(delay), fadeIn));
        node.runAction(cc.sequence(cc.delayTime(delay), scaleIn, scaleOut, scaleIn1, scaleOut1, scaleNormal));
    },
    scaleIn: function (node, delay, actionTime, callback, beginScale, beginOpacity) {
        if (delay == undefined) delay = 0;
        if (actionTime == undefined) actionTime = 0.2;
        if (beginScale == undefined) beginScale = 0.2;
        if (beginOpacity == undefined) beginOpacity = 50;

        var originScale = node.getScale();

        node.setScale(beginScale);
        node.setOpacity(beginOpacity);
        node.setVisible(false);
        var showNode = cc.spawn(
            cc.fadeIn(actionTime / 2),
            cc.scaleTo(actionTime, originScale).easing(cc.easeBackOut())
        );
        var act = cc.sequence(
            cc.delayTime(delay),
            cc.show(),
            showNode
        );
        node.runAction(act);

        if (typeof callback == "function") {
            node.runAction(cc.sequence(cc.delayTime(delay + actionTime), cc.callFunc(callback, node)));
        }
    },
    scaleOut: function (node, delay, actionTime, callback, endScale, endOpacity) {
        if (delay == undefined) delay = 0;
        if (actionTime == undefined) actionTime = 0.2;
        if (endScale == undefined) endScale = 0.2;
        if (endOpacity == undefined) endOpacity = 50;

        var originScale = node.getScale();
        var originOpacity = node.getOpacity();

        var hideNode = cc.spawn(
            cc.fadeTo(actionTime, endOpacity),
            cc.scaleTo(actionTime, endScale).easing(cc.easeOut(2))
        );
        var act = cc.sequence(
            cc.delayTime(delay),
            hideNode,
            cc.hide(),
            cc.callFunc(function () {
                node.setScale(originScale);
                node.setOpacity(originOpacity);
            })
        );
        node.runAction(act);
        if (typeof callback == "function") {
            node.runAction(cc.sequence(cc.delayTime(delay + actionTime), cc.callFunc(callback, node)));
        }
    },
    fadeIn: function (node, delay, actionTime, callback, beginOpacity) {
        if (delay == undefined) delay = 0;
        if (actionTime == undefined) actionTime = 0.2;
        if (beginOpacity == undefined) beginOpacity = 0;

        node.setOpacity(beginOpacity);
        node.setVisible(false);
        var act = cc.sequence(
            cc.delayTime(delay),
            cc.show(),
            cc.fadeIn(actionTime)
        );
        node.runAction(act);

        if (typeof callback == "function") {
            node.runAction(cc.sequence(cc.delayTime(delay + actionTime), cc.callFunc(callback, node)));
        }
    },
    getOtherPosAtNodeSpace: function (node, other) {
        if (node.getParent() == other.getParent()) {
            return other.getPosition();
        }
        var otherWorldPos = other.getParent().convertToWorldSpace(other.getPosition());
        return node.getParent().convertToNodeSpace(otherWorldPos);
    },

    setWorldPosition: function (node, wPosOrwPosX, wPosY) {
        var wPos = wPosOrwPosX;
        if (wPosY != undefined) {
            wPos = cc.p(wPosOrwPosX, wPosY);
        }
        var nodePos = node.getParent().convertToNodeSpace(wPos);
        node.setPosition(nodePos);
    },

    getWorldPosition: function (node) {
        return node.getParent().convertToWorldSpace(node.getPosition());
    },

    addWaiting: function () {

    },
    removeWaiting: function () {

    },
    changeParent: function (node, newParent, zOrder, isCleanupOnRemove) {
        if (node == null) return;
        if (isCleanupOnRemove == undefined) isCleanupOnRemove = true;
        var wPos = node.getParent().convertToWorldSpace(node.getPosition());
        var newPos = newParent.convertToNodeSpace(wPos);
        node.retain();
        node.removeFromParent(isCleanupOnRemove);
        newParent.addChild(node);
        node.setPosition(newPos);
        if (zOrder != null) node.setLocalZOrder(zOrder);
        node.release();
    },
    addChild: function (node, parent, pos, zOrder) {
        node.setPosition(pos);
        parent.addChild(node, zOrder || 0);
    },
    scaleSprToFit: function (spr, size) {
        let scaleX = size.width / spr.width,
            scaleY = size.height / spr.height;
        spr.setScale(Math.min(scaleX, scaleY));
    },
    isScene: function(sceneName){
        let curScene = cc.director.getRunningScene();
        if(_.isNull(curScene)) return false;
        if(curScene instanceof cc.TransitionScene){
            curScene = curScene.getInScene();
        }
        return (!_.isNull(curScene) && curScene.getName() == sceneName)
    },
    getCurScene: function (sceneName) {
        let curScene = cc.director.getRunningScene();
        if(_.isNull(curScene)) return null;
        if(curScene instanceof cc.TransitionScene){
            curScene = curScene.getInScene();
        }
        if (!_.isNull(curScene) && (curScene.getName() == sceneName || _.isUndefined(sceneName) || sceneName.length == 0)) {
            return curScene;
        }
        return null;
    },
    getLocalZOrderMax: function (node) {
        let max = 0;
        let childs = node.getChildren();
        for(let i in childs){
            let zOrder = childs[i].getLocalZOrder();
            if(zOrder > max) max = zOrder;
        }
        return max;
    },
    initCCS: function (path, parent) {
        parent._rootNode = ccs.load(path, res.ZCSD_ROOT).node;
        parent.addChild(parent._rootNode);
        this.mappingChildren(parent._rootNode, parent);
    },
    setSprGrayScale: function (sprite) {
        if (!sprite) return;
        if (!cc.sys.isObjectValid(sprite)) return;
        if (!this.stateGrayScale) this.initGrayScaleShader();
        sprite.setGLProgramState(this.stateGrayScale);
    },
    setSprNormalShader: function (sprite) {
        if (!sprite) return;
        if (!cc.sys.isObjectValid(sprite)) return;
        if (!this.stateNormalShader) this.initGrayScaleShader();
        sprite.setGLProgramState(this.stateNormalShader);
    },
    initGrayScaleShader: function () {
        cc.log("initShaderGreyScale");
        this.grayShader = new cc.GLProgram(shader.vertex_normal, shader.frag_gray_scale);
        this.grayShader.retain();
        this.stateGrayScale = cc.GLProgramState.getOrCreateWithGLProgram(this.grayShader);
        cc.log("initShaderGreyScale finish");
        this.normalShader = new cc.GLProgram(shader.vertex_normal, shader.frag_normal);
        this.normalShader.retain();
        this.stateNormalShader = cc.GLProgramState.getOrCreateWithGLProgram(this.normalShader);
    },
    initAvatarShader: function () {
        cc.log("initShaderAvatar");
        this.avatarShader = new cc.GLProgram(shader.vertex_normal, shader.frag_avatar);
        this.avatarShader.retain();
        this.stateAvatarShader = cc.GLProgramState.getOrCreateWithGLProgram(this.avatarShader);
        let tex_alpha = cc.textureCache.addImage("ranking/ava_mask.png");
        this.stateAvatarShader.setUniformTexture("s_alpha", tex_alpha.getName());
    },
    setAvatarShader: function (sprite) {
        if (!sprite) return;
        if (!cc.sys.isObjectValid(sprite)) return;
        if (!this.stateAvatarShader) this.initAvatarShader();
        sprite.setGLProgramState(this.stateAvatarShader);
    },

    createSprite: function (_url, _parent, _x, _y, _anchorX, _anchorY) {
        var _sprite;
        if (cc.spriteFrameCache.getSpriteFrame(_url)) {
            _sprite = new cc.Sprite("#" + _url);
        } else {
            _sprite = new cc.Sprite(_url);
        }

        if (_x === undefined)
            _x = 0;
        if (_y === undefined)
            _y = 0;
        if (_anchorX === undefined)
            _anchorX = 0.5;
        if (_anchorY === undefined)
            _anchorY = 0.5;
        _parent.addChild(_sprite);
        _sprite.attr({
            x: _x,
            y: _y,
            anchorX: _anchorX,
            anchorY: _anchorY
        });
        return _sprite;
    },
    createCSprite9Scale: function (_url, _parent, _x, _y, _anchorX, _anchorY) {
        var _sprite;
        //if(cc.spriteFrameCache.getSpriteFrame(_url))
        //{
        //    _sprite =  new cc.Scale9Sprite(_url);
        //}
        //else{
        //    _sprite = new cc.Scale9Sprite(_url);
        //}
        _sprite = new cc.Scale9Sprite(_url);
        _parent.addChild(_sprite);

        if (_x === undefined)
            _x = 0;
        if (_y === undefined)
            _y = 0;
        if (_anchorX === undefined)
            _anchorX = 0.5;
        if (_anchorY === undefined)
            _anchorY = 0.5;
        _sprite.attr({
            x: _x,
            y: _y,
            anchorX: _anchorX,
            anchorY: _anchorY
        });
        return _sprite;
    },
    /**
     * setScale9Enabled
     * setPressEnable
     * setSwallowTouches
     * loadTexturePressed(res.account_line, ccui.Widget.LOCAL_TEXTURE);
     * loadTextureNormal(texture)
     * loadTextures(path, path, path, ccui.Widget.LOCAL_TEXTURE)
     */
    createButton: function (_url, _parent, _x, _y, _anchorX, _anchorY, _text) {
        if (_text === undefined)
            _text = "";
        var _btn = new fr.Button(_url, _url, "", "");
        if (_x === undefined)
            _x = 0;
        if (_y === undefined)
            _y = 0;
        if (_anchorX === undefined)
            _anchorX = 0.5;
        if (_anchorY === undefined)
            _anchorY = 0.5;
        _parent.addChild(_btn);
        _btn.attr({
            x: _x,
            y: _y,
            anchorX: _anchorX,
            anchorY: _anchorY
        });
        _btn.setTitleText(_text);
        _btn.setTitleFontName(res.FONT_GAME_BOLD);
        // var defaultFontSize = parseInt(fr.Localization.text('font_button_size_2'),10);
        //_btn.setTitleFontSize(22);
        _btn.setTitleItalic();
        // _btn.setPressedActionEnabled(true);
        return _btn;
    },
    /**
     * lbl.setTextHorizontalAlignment(cc.TEXT_ALIGNMENT_CENTER);
     * lbl.setTextVerticalAlignment(cc.TEXT_ALIGNMENT_CENTER);
     * lbl.setTextAreaSize(x,y)
     * lblContent.boundingHeight = 150;
     * lblContent.boundingWidth = 250;
     * enableOutline(cc.color(0,128,0), 3);
     * setColor
     */
    createLabel: function (_string, _font, _parent, _size, _x, _y, _anchorX, _anchorY, _color) {

        var _lb = new ccui.Text(_string, _font, _size);
        if (_x === undefined)
            _x = 0;
        if (_y === undefined)
            _y = 0;
        if (_anchorX === undefined)
            _anchorX = 0.5;
        if (_anchorY === undefined)
            _anchorY = 0.5;
        if (_color === undefined) {
            _color = {r: 255, g: 255, b: 255}; //white
        }

        _parent.addChild(_lb);
        _lb.attr({
            x: _x,
            y: _y,
            anchorX: _anchorX,
            anchorY: _anchorY
        });
        _lb.setColor(_color);
        return _lb;
    },
    /**
     * setPercentage
     * runAction(cc.progressTo(time, 0))
     */
    createProgressTimer: function (resPath, parent, _x, _y, type) {
        var timeProgress = new cc.ProgressTimer(cc.Sprite.create(resPath));
        parent.addChild(timeProgress);

        if (_x === undefined)
            _x = 0;
        if (_y === undefined)
            _y = 0;

        timeProgress.setPosition(_x, _y);
        timeProgress.setAnchorPoint(0, 0.5);
        timeProgress.setMidpoint(cc.p(0, 1));
        timeProgress.type = cc.ProgressTimer.TYPE_BAR;
        timeProgress.barChangeRate = cc.p(1, 0);
        return timeProgress;
    },

    copyGeneralNodeAttribute: function (nodeOrigin, nodeClone) {
        nodeClone.setAnchorPoint(nodeOrigin.getAnchorPoint());
        nodeClone.setPosition(nodeOrigin.getPosition());
        nodeClone.setScaleX(nodeOrigin.getScaleX());
        nodeClone.setScaleY(nodeOrigin.getScaleY());
        nodeClone.setRotation(nodeOrigin.getRotation());
        nodeClone.setLocalZOrder(nodeOrigin.getLocalZOrder());
        nodeClone.setVisible(nodeOrigin.isVisible());
        nodeClone.setOpacity(nodeOrigin.getOpacity());
    },

    // set node position to center of parent
    positioningToCenter: function(node){
        if (typeof node.getParent != "function" || !node.getParent()){
            return;
        }
        let parent = node.getParent();
        node.setPosition(parent.getContentSize().width/2, parent.getContentSize().height/2);
    },
};

var PointUtils = {
    pDist: function (p1, p2) {
        return Math.sqrt((p1.x - p2.x) * (p1.x - p2.x) + (p1.y - p2.y) * (p1.y - p2.y));
    },
    pMid: function (point1, point2) {
        return cc.p((point1.x + point2.x) / 2, (point1.y + point2.y) / 2);
    },
    patternRot90: function (num, pattern) {// pattern = [ [x1,y1],[x2,y2],... ]
        var retVal = [];
        for (var i = 0; i < pattern.length; i++) {
            var pRot = this.pRot90(num, pattern[i][0], pattern[i][1]);
            retVal.push([pRot.x, pRot.y]);
        }
        return retVal;
    },
    getMidPointWithDistance: function (p1, p2, h) {
        var tmp = this.getLineEquation(p1, p2),
            a = tmp[0], b = tmp[1], c = tmp[2];
        if (a == 0) return cc.p((p1.x + p2.x) / 2, p1.y + h);
        if (b == 0) return cc.p(p1.x + h, (p1.y + p2.y) / 2);
        var m = b / a;
    },
    getLineEquation: function (p1, p2) {
        var a = p2.y - p1.y,
            b = p1.x - p2.x,
            c = a * p1.x + b * p1.y;
        return [a, b, c];
    },
    pRot90: function (num, x, y) {// root 0,0
        num = num % 4;
        switch (num) {
            case 0:
                return cc.p(x, y);
            case 1:
                return cc.p(y, -x);
            case 2:
                return cc.p(-x, -y);
            case 3:
                return cc.p(-y, x);
            default:
                return null;
        }
    },
    pAdd: function (point, delta) {
        return cc.p(point.x + delta.x, point.y + delta.y);
    },
    getPosOnLine: function (center, point, radius) {
        var dist = PointUtils.pDist(center, point);
        if (dist == 0) return center;
        var k = (radius + dist) / dist;
        return {
            x: (1 - k) * center.x + k * point.x,
            y: (1 - k) * center.y + k * point.y,
        }
    },
    getMidPoint: function (point1, point2) {
        return cc.p((point1.x + point2.x) / 2, (point1.y + point2.y) / 2);
    },
    getAngleWithPoint1: function (point1, point2) {
        return Math.atan2(point2.y - point1.y, point2.x - point1.x);
    },
    getBezierActionInMiddle: function (time, point1, point2, length, clockwise) {
        var midPoint = this.getMiddlePointOfBezierCurve(point1, point2, length, clockwise);
        return cc.bezierTo(time, [midPoint, cc.p(midPoint.x, midPoint.y + length), point2]);
    },
    getMidPointWithAngle: function (p1, p2, angleDeg) {
        let dist = this.pDist(p1, p2);
        let length = Math.abs(Math.tan(cc.degreesToRadians(angleDeg)) * dist / 2);
        return this.getMiddlePointOfBezierCurve(p1, p2, length, angleDeg > 0);
    },
    getMiddlePointOfBezierCurve: function (point1, point2, length, clockwise) {
        const angle = this.getAngleWithPoint1(point1, point2);
        const direction = clockwise ? 1 : -1;
        const perpendicularAngle = angle + direction * Math.PI / 2;
        const midPoint = PointUtils.getMidPoint(point1, point2);
        return cc.p(midPoint.x + Math.cos(perpendicularAngle) * length, midPoint.y + Math.sin(perpendicularAngle) * length);
    },
    mergeListPoint: function (arr1, arr2) {// [row, col]
        var list = JSON.parse(JSON.stringify(arr1));
        for (var i in arr2) {
            var isExist = false;
            for (var j in arr1) if (arr1[j][0] == arr2[i][0] && arr1[j][1] == arr2[i][1]) isExist = true;
            if (!isExist) list.push(arr2[i]);
        }
        // cc.log("mergeListPoint " + JSON.stringify(arr1) + " + " + JSON.stringify(arr2) + " = " + JSON.stringify(list));
        return list;
    },

}

UIUtils.seekWidgetByName = function (root, name) {
    if (!root)
        return null;
    if (root.getName() === name)
        return root;
    var arrayRootChildren = root.getChildren();
    var length = arrayRootChildren.length;
    for (var i = 0; i < length; i++) {
        var child = arrayRootChildren[i];
        var res = UIUtils.seekWidgetByName(child, name);
        if (res !== null)
            return res;
    }
    return null;
};