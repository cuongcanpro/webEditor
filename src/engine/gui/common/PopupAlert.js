/**
 * Created by GSN on 6/8/2015.
 */
var g_guiPopupAlert = null;
var PopupAlert = cc.Layer.extend(
    {
        ctor:function() {
            this._super();

            var json = ccs.load("zcsd/LayerAlert.json","");
            this._rootNode = json.node;
            this._rootNode.setContentSize(cc.winSize);
            ccui.helper.doLayout(this._rootNode);
            this.addChild(this._rootNode);

            this._panel = this._rootNode.getChildByName("panelBg");
            this._panel.setPosition(cc.winSize.width / 2, cc.winSize.height / 2);
            fr.pressBackGroundToHide.apply(this, [this._panel]);
            this.bg = this._rootNode.getChildByName("bg");
            this._btnOk = this.bg.getChildByName("btn_go");
            this._btnOk.addClickEventListener(this.onBtnOkClickEvent.bind(this));
            this._lblBtn = this._btnOk.getChildByName("lbl_btn");
            this._lblBtn.setString(fr.Localization.text("OK"));
            this._txtNotice = this.bg.getChildByName("lbl_content");

            // hide unused
            this.bg.getChildByName("two_buttons").setVisible(false);
            var nodeCur = this._btnOk.getChildByName("node_currency");
            this._lblBtn.setPositionX(this._btnOk.getContentSize().width/2);
            nodeCur.getChildByName("g").setVisible(false);
            nodeCur.getChildByName("gold").setVisible(false);
        },

        show:function(type,msg){
            this.removeFromParent();
            this.setVisible(true);

            this.type = type;
            this._txtNotice.setString(msg);

            cc.director.getRunningScene().addChild(this, GUIConst.GUI_ALERT_ZORDER);
            this._panel.setVisible(true);
            fr.GuiEffect.bubbleIn(this.bg, null, null, 0);

        },
        onBtnOkClickEvent:function() {
            this.hide();
        },
        hide:function() {
            fr.GuiEffect.bubbleOut(this.bg, this.onOut, this, 0);
        },
        onOut:function() {
            this.removeFromParent();
        },
    }
);
PopupAlert.show = function(type,msg){
    if(g_guiPopupAlert == null)
    {
        g_guiPopupAlert = new PopupAlert();
        g_guiPopupAlert.retain();
    }
    g_guiPopupAlert.show(type,msg);
};

var toolTip = cc.Node.extend({
    ctor:function() {
        this._super();

        var json = ccs.load(res.ZCSD_TOOL_TIP,"");
        this._rootNode = json.node;
        this._rootNode.setContentSize(cc.winSize);
        ccui.helper.doLayout(this._rootNode);
        this.addChild(this._rootNode);

        this.bg = this._rootNode.getChildByName("Image_2");

        return true;
    },
    show:function(text, pos)
    {
        cc.log(pos.x + " " + pos.y);
        if (this.getParent())
            this.removeFromParent(); // crash
        gv.guiMgr.getCurrentScreen().addChild(this);
        this.setVisible(true);
        var lbl_text = fr.createText(res.FONT_GAME_BOLD, 18, cc.color(255,255,255));
        lbl_text.setString(text);
        this.addChild(lbl_text);

        this.setPosition(pos.x, pos.y);
        lbl_text.setPosition(pos.x, pos.y);
        this.bg.setContentSize(200,100);
    },
    hide:function()
    {
        this.setVisible(false);
        this.removeFromParent();
        gv.tooltip = null;
    }
});
toolTip.show = function(text, pos){
    if(gv.tooltip == null)
    {
        gv.tooltip = new toolTip();

    }
    gv.tooltip.show(text, pos);
};
toolTip.hide = function(){
    if(gv.tooltip == null)
    {
        return;
    }
    gv.tooltip.hide();
};