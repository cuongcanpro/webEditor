/**
 * Created by Cantaloupe on 10/5/2015.
 */
var LayerTrying = cc.Layer.extend({
    ctor: function () {
        this._super();
        //load gui
        var json = ccs.load(res.ZCSD_LAYER_TRYING, "");
        this._rootNode = json.node;
        this._rootNode.setContentSize(cc.winSize);
        this._rootNode.setCascadeOpacityEnabled(true);
        this._rootNode.getChildByName("node_eff").setCascadeOpacityEnabled(true);
        ccui.helper.doLayout(this._rootNode);
        this.addChild(this._rootNode);

        this.eff = null;
        this.numberOfTaskWaiting = 0;

        this.lbl_slow_connection = this._rootNode.getChildByName("lbl_slow_connection");
        this.numDot = 0;
    },

    onEnter: function () {
        this._super();

        this.eff = gv.createSpineAnimation(resAni.pus_spine);
        this._rootNode.getChildByName("node_eff").addChild(this.eff);
        this.eff.setAnimation(0, "idle", true);
        this.eff.setScale(0.5);
        this.eff.setPosition(0, 20);
        this.eff.setRotation(30);
        this._rootNode.getChildByName("node_eff").runAction(cc.rotateBy(0.8, 360).repeatForever());
        //
        var self = this;
        this.interval = setInterval(function () {
            self.numDot++;
            var string = "";
            if (self.numDot > 3) self.numDot = 0;
            for (var i = 0; i < self.numDot; ++i) {
                string += ".";
            }
            self.lbl_slow_connection.setString(fr.Localization.text("lang_slow_connection") + string);
        }, 1000);
    },
    onExit: function () {
        this._super();
        this.eff.removeFromParent(true);
        gv.unloadAllDBAnimationData(this);
        clearInterval(this.interval);
    },
    showWithoutTimeout: function () {
        if (this.getParent() != null) {
            this.removeFromParent();

        }
        cc.director.getRunningScene().addChild(gv.layerTrying, 10000);

    },
    onChangeState: function (customData) {
        if (_.isNull(this.getParent())) {
            if (this.numberOfTaskWaiting > 0) {
                if (this.getParent() != cc.director.getRunningScene()) {
                    this.removeFromParent();
                }
                cc.director.getRunningScene().addChild(gv.layerTrying, 10000);
                clearTimeout(this._timeOut);
                this._timeOut = setTimeout(this.onTimeout.bind(this), 1000);

                clearTimeout(this._timeOutAction);
                this._timeOutAction = setTimeout(this.onActionTimeout.bind(this), 10000);
                this._rootNode.setOpacity(0);


                if (customData != undefined) this.customData = customData;
                else this.customData = null;
            }
        } else {
            if (this.numberOfTaskWaiting <= 0) {
                this.removeFromParent();
                clearTimeout(this._timeOutAction);
            }
        }
    },
    onTimeout: function () {
        this._rootNode.setOpacity(255);
    },
    onActionTimeout: function () {
        this.setVisible(false);
        gv.gameClient.doDisconnect(DisconnectReason.ACTION_TIME_OUT);
        if (this.customData != null) cc.log("client disconnect onActionTimeout: " + this.customData);
    },
    addNewTask: function (customData) {
        this.numberOfTaskWaiting++;
        this.onChangeState(customData);
    },
    removeTask: function () {
        this.numberOfTaskWaiting--;
        if (this.numberOfTaskWaiting < 0)
            this.numberOfTaskWaiting = 0;
        this.onChangeState();
    },
    removeAllTask: function () {
        this.numberOfTaskWaiting = 0;
        this.onChangeState();
    },
    showWithTask: function () {
        if (this.numberOfTaskWaiting < 1) {
            this.numberOfTaskWaiting = 1;
        }
        this.onChangeState();
    }
});
gv.forceShowTrying = function () {
    if (gv.layerTrying == null) {
        gv.layerTrying = new LayerTrying();
        gv.layerTrying.retain();
    }
    gv.layerTrying.showWithoutTimeout();
};

gv.showTrying = function () {
    if (gv.layerTrying == null) {
        gv.layerTrying = new LayerTrying();
        gv.layerTrying.retain();
    }
    gv.layerTrying.showWithTask();
};
gv.addTaskTrying = function (customData) {
    if (gv.layerTrying == null) {
        gv.layerTrying = new LayerTrying();
        gv.layerTrying.retain();
    }

    gv.layerTrying.addNewTask(customData);
};

gv.hideTrying = function () {
    if (gv.layerTrying != null) {
        gv.layerTrying.removeTask();
    }
};
gv.forceHideTrying = function () {
    if (gv.layerTrying != null) {
        gv.layerTrying.removeAllTask();
    }
};