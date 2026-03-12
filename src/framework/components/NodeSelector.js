var NodeSelector = cc.Node.extend({
    ctor: function () {
        this._super();
        this.initUI();

        this.picking = false;
        this.pickedPos = null;
        this.suggestNodes = [];
        this.curSuggestNodeIdx = -1;
        this.curNode = null;
        this.curNodeParent = null;
        this.defaultAttr = {
            x: 0,
            x: 0,
            dX: 0,
            dY: 0,
            scaleX: 0,
            scaleY: 0,
            dScaleX: 0,
            dScaleY: 0
        };
        this.curAttr = Utility.deepCopyObject(this.defaultAttr);
        this.nodes = [];

        this.getAllNodesOnScene();
    },
    initUI: function () {
        let path = "zcsd/design_tool/NodeSelector.json";
        UIUtils.initCCS(path, this);

        this.pnlBg.addTouchEventListener(this.touchPnlBg, this);
        this.btnIcon.addTouchEventListener(this.touchBtnIcon, this);
        this.pnlPreviewFog.addTouchEventListener(this.touchPnlPreview, this);


        this.pnlPreview.setContentSize(4000, 4000);
        this.pnlPreviewFog.setContentSize(4000, 4000);
    },
    showUI: function () {
        this.pnlBg.setVisible(true);
        this.btnIcon.setVisible(false);
        this.pnlPreview.setVisible(true);
        this.pnlPreviewFog.setVisible(true);

        UIUtils.changeParent(this.pnlPreviewFog, UIUtils.getCurScene(), this.getLocalZOrder()-1);
        UIUtils.changeParent(this.pnlPreview, UIUtils.getCurScene(), this.getLocalZOrder()-2);

        this.getAllNodesOnScene();
    },
    showIcon: function () {
        this.pnlBg.setVisible(false);
        this.btnIcon.setVisible(true);
        this.pnlPreview.setVisible(false);
        this.pnlPreviewFog.setVisible(false);
    },
    onClickBtnIcon: function () {
        this.showUI();
    },
    onClickBtnPick: function () {
        if(this.curNode) return;
        this.picking = !this.picking;
    },
    onClickBtnUnpick: function () {
        this.onClickBtnClose();
        this.onClickBtnIcon();
    },
    onClickBtnOther: function () {
        let idx = this.curSuggestNodeIdx + 1;
        if(idx >= this.suggestNodes.length) idx = 0;
        this.previewNodeIdx(idx);
    },
    onClickBtnReset: function () {
        this.setTextByCurAttr();
    },
    onClickBtnApply: function () {
        this.setCurAttrByText();
        this.setCurNodeByCurAttr();
        this.setCurAttrByCurNode();
        this.setTextByCurAttr();
    },
    onClickBtnClose: function () {
        if (this.curNode) {
            UIUtils.changeParent(this.curNode, this.curNodeParent);
        }
        this.picking = false;
        this.pickedPos = null;
        this.suggestNodes = [];
        this.curSuggestNodeIdx = -1;
        this.curNode = null;
        this.curNodeParent = null;
        this.defaultAttr = {
            x: 0,
            x: 0,
            dX: 0,
            dY: 0,
            scaleX: 0,
            scaleY: 0,
            dScaleX: 0,
            dScaleY: 0
        };
        this.curAttr = Utility.deepCopyObject(this.defaultAttr);

        this.showIcon();
    },

    touchPnlBg: function (sender, type) {
        switch (type) {
            case ccui.Widget.TOUCH_BEGAN:
                this._touchBeganPosition = sender.getTouchBeganPosition();
                this._oldPosition = this.getPosition();
                let pos = this.convertToNodeSpace(this._touchBeganPosition);
                this.btnIcon.setPosition(pos);
                break;
            case ccui.Widget.TOUCH_MOVED:
                let newPos = sender.getTouchMovePosition();
                let dX = newPos.x - this._touchBeganPosition.x;
                let dY = newPos.y - this._touchBeganPosition.y;
                this.setPosition(this._oldPosition.x + dX, this._oldPosition.y + dY);
                break;
            case ccui.Widget.TOUCH_ENDED:
                this._touchBeganPosition = null;
                break;
        }
    },
    touchBtnIcon: function (sender, type) {
        switch (type) {
            case ccui.Widget.TOUCH_BEGAN:
                this._touchBeganPosition = sender.getTouchBeganPosition();
                this._oldPosition = this.getPosition();
                let pos = this.convertToNodeSpace(this._touchBeganPosition);
                this.btnIcon.setPosition(pos);
                break;
            case ccui.Widget.TOUCH_MOVED:
                let newPos = sender.getTouchMovePosition();
                let dX = newPos.x - this._touchBeganPosition.x;
                let dY = newPos.y - this._touchBeganPosition.y;
                if (dX * dX + dY * dY < 3) return;
                this.setPosition(this._oldPosition.x + dX, this._oldPosition.y + dY);
                break;
            case ccui.Widget.TOUCH_ENDED:
                if (PointUtils.pDist(this._oldPosition, this.getPosition()) <= 3) {
                    this.onClickBtnIcon();
                }
                this._touchBeganPosition = null;
                this._oldPosition = null;
                break;
        }
    },
    touchPnlPreview: function (sender, type) {
        if(!this.picking) return;
        switch (type) {
            case ccui.Widget.TOUCH_ENDED:
                let pos = sender.getTouchEndPosition();
                this.pickPosition(pos);
                break;
        }
    },
    getAllChildrenOfNode: function (node) {
        if (node.getLocalZOrder() == NodeSelector.Z_ORDER) return [];
        let list = [];
        let childs = node.getChildren();
        list = list.concat(childs);
        cc.log("getAllChildrenOfNode", childs.length);
        for (let i in childs) {
            cc.log("Child " + i)
            list = list.concat(this.getAllChildrenOfNode(childs[i]));
        }
        return list;
    },
    getAllNodesOnScene: function () {
        let scene = UIUtils.getCurScene();
        this.nodes = this.getAllChildrenOfNode(scene);
        cc.log("getAllNodesOnScene", this.nodes.length);
    },
    clearData: function () {

    },
    pickPosition: function (wPos) {
        let possibleNodes = [];
        for (let i in this.nodes) {
            if(!this.nodes[i].getParent() || !this.nodes[i].isVisible()) continue;
            let wPosNode = UIUtils.getWorldPosition(this.nodes[i]);
            if (PointUtils.pDist(wPos, wPosNode) <= 50) possibleNodes.push(this.nodes[i]);
        }
        if (possibleNodes.length == 0) return;
        this.picking = false;
        this.pickedPos = wPos;
        this.suggestNodes = possibleNodes;
        this.previewNodeIdx(0);
        cc.log("pickPosition", "suggestNodes", this.suggestNodes.length);
    },
    previewNodeIdx: function (idx) {
        cc.log("previewNodeIdx", idx, this.curSuggestNodeIdx)
        if (idx == this.curSuggestNodeIdx) return;
        if (this.curNode) {
            UIUtils.changeParent(this.curNode, this.curNodeParent);
        }
        this.curSuggestNodeIdx = idx;
        this.curNode = this.suggestNodes[idx];
        this.curNodeParent = this.curNode.getParent();
        cc.log("previewNodeIdx", idx, typeof this.curNode)
        UIUtils.changeParent(this.curNode, this.pnlPreview);
        this.setCurAttrByCurNode();
        this.setTextByCurAttr();
        this.lbName.setString(""+this.curNode.getName());
    },
    setCurAttrByCurNode: function () {
        this.curAttr = {
            x: this.curNode.x,
            y: this.curNode.y,
            dX: 0,
            dY: 0,
            scaleX: this.curNode.getScaleX(),
            scaleY: this.curNode.getScaleY(),
            dScaleX: 0,
            dScaleY: 0
        };
    },
    setCurNodeByCurAttr: function () {
        this.curNode.x = this.curAttr.x + this.curAttr.dX;
        this.curNode.y = this.curAttr.y + this.curAttr.dY;
        this.curNode.setScaleX(this.curAttr.scaleX + this.curAttr.dScaleX);
        this.curNode.setScaleY(this.curAttr.scaleY + this.curAttr.dScaleY);
    },
    setCurAttrByText: function () {
        this.curAttr = {
            x: Number(this.attrX.getChildByName('tf').getString()),
            y: Number(this.attrY.getChildByName('tf').getString()),
            dX: Number(this.attrDX.getChildByName('tf').getString()),
            dY: Number(this.attrDY.getChildByName('tf').getString()),
            scaleX: Number(this.attrScaleX.getChildByName('tf').getString()),
            scaleY: Number(this.attrScaleY.getChildByName('tf').getString()),
            dScaleX: Number(this.attrDScaleX.getChildByName('tf').getString()),
            dScaleY: Number(this.attrDScaleY.getChildByName('tf').getString())
        };
    },
    setTextByCurAttr: function () {
        this.attrX.getChildByName('tf').setString(this.curAttr.x||"");
        this.attrY.getChildByName('tf').setString(this.curAttr.y||"");
        if(this.curAttr.dX != 0) this.attrDX.getChildByName('tf').setString(this.curAttr.dX||"");
        if(this.curAttr.dY != 0) this.attrDY.getChildByName('tf').setString(this.curAttr.dY||"");
        this.attrScaleX.getChildByName('tf').setString(this.curAttr.scaleX||"");
        this.attrScaleY.getChildByName('tf').setString(this.curAttr.scaleY||"");
        if(this.curAttr.dScaleX != 0) this.attrDScaleX.getChildByName('tf').setString(this.curAttr.dScaleX||"");
        if(this.curAttr.dScaleY != 0) this.attrDScaleY.getChildByName('tf').setString(this.curAttr.dScaleY||"");
    }
});
NodeSelector.Z_ORDER = 999999;
NodeSelector.show = function () {
    if (gv.isRelease){
        return;
    }
    let scene = UIUtils.getCurScene();
    if (this._instance && cc.sys.isObjectValid(this._instance))
        this._instance.removeFromParent();
    this._instance = new NodeSelector();
    this._instance.setPosition(50,50);
    scene.addChild(this._instance, NodeSelector.Z_ORDER);
    this._instance.showIcon();
};

NodeSelector.hide = function () {
    if (this._instance) this._instance.removeFromParent();
    this._instance = null;
};