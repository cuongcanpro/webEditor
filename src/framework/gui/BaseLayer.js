let BaseLayer = cc.Layer.extend({
    ctor: function () {
        cc.Layer.prototype.ctor.call(this);
    },

    initWithJsonFile: function (json, rootPath = res.ZCSD_ROOT, size = cc.director.getWinSize()) {
        BaseLayer.initWithJsonFile(
            this, json, rootPath, size
        );
        this.initLayer();
    },

    /**
     * Called when enter layer
     */
    onEnter: function () {
        cc.Layer.prototype.onEnter.call(this);

        this.onEnterFinish();
    },

    /**
     * Called when exit layer
     */
    onExit: function () {
        cc.Layer.prototype.onExit.call(this);
    },

    //region ABSTRACT
    initLayer: function () {

    },

    onEnterFinish: function () {

    },
    //endregion

    //region Button
    onTouchBeganEvent: function (button) {

    },

    onTouchMovedEvent: function (button) {

    },

    onTouchEndEvent: function (button) {

    },

    onTouchCancelledEvent: function (button) {

    },

    onButtonTouched: function (button, tag) {

    },

    onButtonRelease: function (button, tag) {

    },

    onButtonCanceled: function (button, tag) {

    },
    //endregion Button
});

/* region BaseLayer common */
BaseLayer.initWithJsonFile = function (self, json, rootPath = res.ZCSD_ROOT, size = cc.director.getWinSize()) {
    cc.log("LOAD JSON : " + json, rootPath);
    var start = new Date().getTime();

    self._jsonPath = json;
    var jsonLayout = ccs.load(json, rootPath);
    self._rootNode = jsonLayout.node;
    self._rootNode.setContentSize(size);
    ccui.Helper.doLayout(self._rootNode);
    self.addChild(self._rootNode);

    var end = new Date().getTime();
    cc.log("## Time Load " + json + " : " + (end - start));

    BaseLayer._syncInNode(self._rootNode, self);
    var end2 = new Date().getTime();
    cc.log("## Time SYNC NODE " + json + " : " + (end2 - end));

    if (self.initLayer) {
        self.initLayer();
        var end3 = new Date().getTime();
        cc.log("## Time initGUI " + json + " : " + (end3 - end2));
    }

    cc.log("## Time TOTAL " + json + " : " + (new Date().getTime() - start));
};

BaseLayer._syncInNode = function (node, ctx, createNew = true) {
    let children = node.getChildren();
    if (children.length === 0) return;

    let childName;
    for (let i = 0; i < children.length; i++) {
        childName = children[i].getName();
        if ((childName in ctx && ctx[childName] === null) || createNew) {
            ctx[childName] = children[i];
        }

        BaseLayer._handleDefaultNode(children[i], ctx);

        BaseLayer._syncInNode(children[i], ctx, createNew);
    }
};

BaseLayer._handleDefaultNode = function (node, self) {
    if (node instanceof ccui.Button) {
        node.setPressedActionEnabled && node.setPressedActionEnabled(true);
        node.removeAllEventListeners && node.removeAllEventListeners();
        node.addTouchEventListener(function (sender, type) {
            switch (type) {
                case ccui.Widget.TOUCH_BEGAN:
                    this.onTouchBeganEvent && this.onTouchBeganEvent(sender);
                    this.onButtonTouched && this.onButtonTouched(sender, sender.getTag());
                    break;
                case ccui.Widget.TOUCH_MOVED:
                    this.onTouchMovedEvent && this.onTouchMovedEvent(sender);
                    break;
                case ccui.Widget.TOUCH_ENDED:
                    this.onTouchEndEvent && this.onTouchEndEvent(sender);
                    this.onButtonRelease && this.onButtonRelease(sender, sender.getTag());
                    break;
                case ccui.Widget.TOUCH_CANCELED:
                    this.onTouchCancelledEvent && this.onTouchCancelledEvent(sender);
                    this.onButtonCanceled && this.onButtonCanceled(sender, sender.getTag());
                    break;
            }
        }, self);
    }

    node.getPosition && (node.rawPos = node.getPosition()) && (node.oriPosition = node.getPosition());
    node.getScale && (node.rawScale = node.getScaleX()) && (node.oriScale = node.getScaleX());
    node.getContentSize && (node.rawSize = node.getContentSize()) && (node.oriOpacity = node.getOpacity());
    if (node.getString != null) {
        let str = node.getString();
        if (str.search("str_") === 0) {
            str = fr.Localization.text(str.replace("str_", ""));
            node.setString && node.setString(str);
        }
    }
    node.setCascadeOpacityEnabled && node.setCascadeOpacityEnabled(true);
};

BaseLayer.createTableView = function (parent, self) {
    let table = new cc.TableView(self, parent.getContentSize());
    table.setDirection(cc.SCROLLVIEW_DIRECTION_VERTICAL);
    table.setVerticalFillOrder(cc.TABLEVIEW_FILL_TOPDOWN);
    table.setDelegate(self);
    table.reloadData();
    parent.addChild(table);

    table.setCascadeOpacityEnabled(true);
    table.getContainer().setCascadeOpacityEnabled(true);

    return table;
};
/* endregion BaseLayer common*/