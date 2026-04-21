let FxUtils = {};

// for all children
FxUtils.applyButtonTouchFx = function (btn, onClickedCallback, root = btn, zoomScale = 0.1) {
    if (btn._appliedBtnFx) {
        return btn;
    }

    btn._appliedBtnFx = true;

    btn.setPressedActionEnabled(true);

    btn.addTouchEventListener(function (sender, event) {
        switch (event) {
            case 0: {
                let fn = (child)=>{
                    if (child !== btn) {
                        child._originalScale = child.getScale();
                        child.runAction(cc.scaleTo(0.1, child._originalScale + zoomScale).easing(cc.easeBackOut()));
                    }
                    child.getChildren().forEach(fn);
                };
                root.getChildren().forEach(fn);
                break;
            }

            case 1: {
                break;
            }

            case 2: case 3: default: {
                if (event === ccui.Widget.TOUCH_ENDED) {
                    if (onClickedCallback) onClickedCallback();
                }

                let fn = (child)=>{
                    if (child !== btn) {
                        child.runAction(cc.scaleTo(0.1, child._originalScale).easing(cc.easeBackOut()));
                    }
                    child.getChildren().forEach(fn);
                };
                root.getChildren().forEach(fn);
                break;
            }
        }
    });

    return btn;
}

FxUtils.setCascadeOpacityEnabledRecursive = function (node, bool) {
    node.getChildren().forEach((child)=>{
        FxUtils.setCascadeOpacityEnabledRecursive(child, bool);
    });

    node.setCascadeOpacityEnabled(bool);
}

FxUtils.overlayBtnWithSpine = function (btn, spine) {
    btn.setOpacity(0);
    btn.parent.addChild(spine);
    spine.setPosition(btn);
}

FxUtils.applyStarFx1 = function (
    fxNode,
    minScaleTime = 1.0, maxScaleTime = 1.5,
    minScaleOffset = 0.4, maxScaleOffset = 0.6
) {
    fxNode.stopAllActions();
    let children = fxNode.getChildren();
    for (let i = 0; i < children.length; i++) {
        let child = children[i];
        let time = randomFloat(minScaleTime, maxScaleTime);
        let offsetScale = randomFloat(minScaleOffset, maxScaleOffset);

        child.runAction(cc.repeatForever(cc.sequence([
            cc.scaleTo(time, Math.max(0, child.getScale() - offsetScale)),
            cc.scaleTo(time, child.getScale() + offsetScale),
        ])));
    }
}

FxUtils.clearStarFx1 = function (
    fxNode
) {
    fxNode.stopAllActions();
    let children = fxNode.getChildren();
    for (let i = 0; i < children.length; i++) {
        let child = children[i];
        child.setScale(1.0);
    }
}

FxUtils.flyImageEffect = function (parent, num, pStart, pEnd, image, scaleStart, scaleEnd, time) {
    if (!parent) return 0;
    if (!scaleStart) scaleStart = 1;
    if (!scaleEnd) scaleEnd = 1;

    var dt = time / num;
    var winSize = cc.director.getWinSize();
    for (var i = 0; i < num; i++) {
        var imageSprite = cc.Sprite(image);
        imageSprite.setScale(scaleStart);
        imageSprite.setPosition(pStart);
        imageSprite.setVisible(false);

        var pCX = Math.random() * winSize.width;
        var pCY = Math.random() * winSize.height;
        var posCenter = cc.p(pCX, pCY);
        var actMove = new cc.EaseSineOut(cc.BezierTo.create(1, [pStart, posCenter, pEnd]));

        parent.addChild(imageSprite, 10000);
        imageSprite.runAction(cc.sequence(
            cc.delayTime(dt * i),
            cc.show(),
            cc.spawn(
                cc.scaleTo(1, scaleEnd),
                actMove
            ),
            cc.spawn(
                cc.fadeOut(0.3)
            ),
            cc.removeSelf()
        ));
    }
}