/**
 * Created by KienVN on 4/15/2015.
 */

var EffectText = cc.Node.extend({
    ctor: function () {
        this._super();

        var json = ccs.load(res.ZCSD_COMMON_TEXT_NOTIFY, res.ZCSD_ROOT);
        this._rootNode = json.node;
        this._rootNode.setContentSize(cc.winSize);
        ccui.helper.doLayout(this._rootNode);

        this.addChild(this._rootNode);

        this.bg = this._rootNode.getChildByName("bg");
        this.lblText = this.bg.getChildByName("lblText");

        return true;
    },
    start:function(text) {
        this.bg.setVisible(true);
        this.lblText.setString(text);

        this.stopAllActions();
        this.opacity = 0;
        var actionScale = cc.sequence(
            cc.fadeIn(0.3),
            cc.delayTime(1.5),
            cc.fadeOut(0.3),
            cc.callFunc(this.removeSelf, this)
        );
        this.runAction(actionScale);
    },
    removeSelf:function() {
        gv.poolObjects.push(this);
        this.retain();
        this.removeFromParent();
    }
});

EffectText.show = function (parent, text, pos) {
    if (parent == null || pos == null) return;
    text = text || "";
    var effect = gv.poolObjects.get(EffectText);
    effect.start(text);
    effect.setPosition(pos);
    parent.addChild(effect, 10000);
};

EffectText.showAtCurrentScreen = function (text, optionalPos) {
    if (optionalPos == undefined){
        optionalPos = cc.p(cc.winSize.width / 2, cc.winSize.height / 3);
    }
    var curScene = cc.director.getRunningScene();
    EffectText.show(curScene, text, optionalPos);
};
