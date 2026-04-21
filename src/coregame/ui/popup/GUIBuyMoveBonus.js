/**
 * Created by AnhVTT on 4/1/2022.
 */
var GUIBuyMoveBonus = cc.Node.extend({
    ctor: function () {
        this._super();
        this.initUI();
        this.itemList = [];
    },

    initUI: function () {
        var spriteBatchNode = new cc.SpriteBatchNode("game/gui/end_game/popup.png");
        this.bg = new cc.Scale9Sprite();
        this.bg.setAnchorPoint(0.5, 0);
        this.bg.updateWithBatchNode(spriteBatchNode, cc.rect(0, 0, 365, 102), false, cc.rect(150, 30, 50, 20));
        this.addChild(this.bg);
        this.bg.setPosition(0, 47);
        this.bg.height = 120;

        this.arrow = new cc.Sprite("game/gui/end_game/arrow.png");
        this.bg.addChild(this.arrow);
        this.arrow.setPosition(this.bg.width/2, 4.2);
    },

    setBonus: function (bonus) {
        if (!bonus) bonus = [];
        this.bg.width = Math.max(bonus.length * 120 + 50, 300);
        this.arrow.setPosition(this.bg.width/2, 4.2);

        let listNode = [];
        for (let i in bonus) {
            if (this.itemList.length <= i) {
                let item = new NodeItemBonusBuyMove();
                item.setScale(0.8);
                this.bg.addChild(item);
                this.itemList.push(item);
            }
            this.itemList[i].setItem(bonus[i]);
            this.itemList[i].setVisible(true);
            listNode.push(this.itemList[i]);
        }
        for (let i = bonus.length; i < this.itemList.length; i++)
            this.itemList[i].setVisible(false);
        let rootPos = cc.p(this.bg.width/2 + 10, this.bg.height/2);
        for (var i in listNode) listNode[i].setPosition(rootPos.x + (i - (listNode.length - 1) / 2) * 120, rootPos.y);
    },

    hide: function () {
        this.setVisible(false);
    },

    show: function () {
        this.bg.scale = 0;
        this.arrow.scale = 0;
        this.setVisible(true);
        this.bg.setOpacity(0);
        this.bg.runAction(cc.fadeIn(0.2));
        this.bg.runAction(cc.sequence(
            cc.scaleTo(0.2, 1.2, 1.2),
            cc.scaleTo(0.1, 0.9, 0.9),
            cc.scaleTo(0.1, 1.0, 1.0),
            cc.delayTime(2.0)
        ).repeatForever())
        this.arrow.setOpacity(0);
        this.arrow.runAction(cc.fadeIn(0.2));
        this.arrow.runAction(cc.sequence(
            cc.scaleTo(0.2, 1.2, 1.2),
            cc.scaleTo(0.1, 0.9, 0.9),
            cc.scaleTo(0.1, 1.0, 1.0),
            cc.delayTime(2.0)
        ).repeatForever())
        //this.bg.runAction(cc.scaleTo(0.3, 1, 1).easing(cc.easeSineIn()));
        // this.arrow.runAction(cc.scaleTo(0.3, 1, 1).easing(cc.easeSineIn()));
    }
});