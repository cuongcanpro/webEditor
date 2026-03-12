/**
 * Created by Cantaloupe from Singapore on 7/28/2015.
 * Singapore dep nhat la ve dem, dac biet la Gaylang dung khong anh Kien? :))
 */

var g_guiEffect = null;
fr.GuiEffect = cc.Class.extend({
    ctor:function() {

    },

    showGUI:function(sender, node) {
        if(node)
            node.setVisible(true);
    },

    hideGUI:function(sender, node) {
        node.setVisible(false);
    },

    doFadeIn:function(node, callBack, target, delay) {
        node.setOpacity(1);
        node.stopAllActions();
        var fade = cc.fadeIn(3);
        if (typeof callBack == 'undefined') {
            node.runAction(cc.sequence(cc.callFunc(this.showGUI, target, node), fade));
        }
        else {
            node.runAction(cc.sequence(cc.callFunc(this.showGUI, target, node), fade, cc.callFunc(callBack, node)));
        }
    },

    doFadeOut:function(node, callBack, target, delay) {
        node.setOpacity(255);
        node.stopAllActions();
        var fade = cc.fadeOut(3);
        if (typeof callBack == 'undefined') {
            node.runAction(cc.sequence(fade, cc.callFunc(this.hideGUI, this, node)));
        }
        else {
            node.runAction(cc.sequence(fade, cc.callFunc(callBack, target)));
        }
    },

    doBubbleIn:function(node, callBack, target, delay) {
        node.setOpacity(0);
        node.setScaleX(1.2);
        node.setScaleY(1.2);
        var fadeIn = cc.fadeIn(0.1);

        var scaleIn = cc.scaleTo(0.12, 0.95, 0.95);
        var scaleOut = cc.scaleTo(0.11, 1.05, 1.05);

        var scaleIn1 = cc.scaleTo(0.11, 0.98, 0.98);
        var scaleIn2 = cc.scaleTo(0.11, 1.01, 1.01);

        var scaleNormal = cc.scaleTo(0.1, 1, 1);
        node.runAction(cc.sequence(cc.delayTime(delay), cc.callFunc(this.showGUI, target, node), cc.callFunc(callBack, node)));
        node.runAction(cc.sequence(cc.delayTime(delay), fadeIn));
        node.runAction(cc.sequence(cc.delayTime(delay), scaleIn, scaleOut, scaleIn1, scaleIn2, scaleNormal));
    },

    doBubbleOut:function(node, callBack, target, delay) {
        var fadeOut = cc.fadeOut(0.2);
        var scaleIn = cc.scaleTo(0.2, 0.8,0.8);
        node.runAction(cc.sequence(cc.delayTime(delay), fadeOut));

        if (typeof callBack == 'undefined' || callBack == null) {
            node.runAction(cc.sequence(cc.delayTime(delay), scaleIn, cc.callFunc(this.hideGUI, this, node)));
        }
        else {
            node.runAction(cc.sequence(cc.delayTime(delay), scaleIn, cc.callFunc(callBack, target)));
        }
    },

    doPaperIn:function(node, posIn, callBack, target) {

        var timeAction = 0.2;

        node.setScale(0.1);
        node.setPosition(posIn);
        node.setRotation(0);
        var rot = cc.rotateBy(timeAction, 360, 360);
        node.runAction(cc.sequence(cc.delayTime(0.6), cc.scaleTo(timeAction / 2, 1, 1)));
        node.runAction(cc.sequence(cc.delayTime(0.5), cc.moveTo(timeAction, cc.p(0, 0))));

        node.isPapering = true;

        if (typeof callBack == 'undefined') {
            node.runAction(cc.sequence(cc.delayTime(0.5), cc.callFunc(this.showGUI, this, node), rot, cc.callFunc(this.endPaperIn, this)));
        }
        else {
            node.runAction(cc.sequence(cc.delayTime(0.5), cc.callFunc(this.showGUI, this, node), rot, cc.callFunc(callBack, target), cc.callFunc(this.endPaperIn, this)));
        }
    },

    endPaperIn:function(sender) {
        sender.isPapering = undefined;
    }

    /*doPaperOut:function(node, callBack) {

    }*/
})

fr.GuiEffect.getInstance = function(){
    if(g_guiEffect == null)
    {
        g_guiEffect = new fr.GuiEffect();
    }
    return g_guiEffect;
}

fr.GuiEffect.fadeIn = function(node, callBack, target, delay) {
    fr.GuiEffect.getInstance().doFadeIn(node, callBack, target, delay);
}

fr.GuiEffect.fadeOut = function(node, callBack, target, delay) {
    fr.GuiEffect.getInstance().doFadeOut(node, callBack, target, delay);
}

fr.GuiEffect.bubbleIn = function(node, callBack, target, delay) {
    fr.GuiEffect.getInstance().doBubbleIn(node, callBack, target, delay);
}

fr.GuiEffect.bubbleOut = function(node, callBack, target, delay) {
    fr.GuiEffect.getInstance().doBubbleOut(node, callBack, target, delay);
}

fr.GuiEffect.paperIn = function(node, startPos, callBack, target) {
    if (node.isPapering != undefined) {
        return;
    }
    fr.GuiEffect.getInstance().doPaperIn(node, startPos, callBack, target);
}