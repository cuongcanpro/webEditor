/**
 * Created by AnhVTT on 4/1/2022.
 */
var NodeItemBonusBuyMove = cc.Node.extend({
    ctor: function () {
        this._super();
        this.initUI();
    },

    initUI: function () {
        var json = ccs.load(NodeItemBonusBuyMove.json);
        this._rootNode = json.node;
        this.addChild(this._rootNode);
        UIUtils.mappingChildren(this._rootNode, this);
    },

    setItem: function (type) {
        let path = "";
        switch (type) {
            case "move":
                path = "game/gui/end_game/plus5.png";
                break;
            case 101:
                path = "winstreak/101.png";
                break;
            default:
                path = "game/element/" + type + ".png";
                break;
        }
        this.bg.getChildByName('lblPlus').setVisible(type != 'move');
        this.bg.getChildByName('icon').setTexture(path);
    }
});
NodeItemBonusBuyMove.json = "game/csd/NodeItemBonusBuyMove.json";