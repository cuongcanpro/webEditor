/**
 * Created by Antigravity on 02/09/2026.
 */

var LogLayer = cc.Layer.extend({
    ctor: function () {
        this._super();
        this.label = new cc.LabelTTF("", "Arial", 25);
        this.label.setColor(cc.color.RED);
        this.label.enableStroke(cc.color.BLACK, 2);

        var size = cc.director.getWinSize();
        this.label.setPosition(size.width / 2, size.height / 2);
        this.addChild(this.label);

        this.setVisible(false);
    },

    showLog: function (msg, color) {
        if (msg.length > 100) {
            msg = msg.substring(0, 100) + "...";
        }
        this.label.setString(msg);
        if (color) {
            this.label.setColor(color);
        }
        this.setVisible(true);
        this.label.stopAllActions();
        this.label.setOpacity(255);

        var self = this;
        this.label.runAction(cc.sequence(
            cc.delayTime(5),
            cc.fadeOut(0.5),
            cc.callFunc(function () {
                self.setVisible(false);
            })
        ));
    }
});

LogLayer.show = function (msg) {
    if (typeof msg !== "string") {
        msg = JSON.stringify(msg);
    }

    var color = cc.color.RED;
    var msgUpper = msg.toUpperCase();
    if (msgUpper.indexOf("SUCCESS") !== -1 || msgUpper.indexOf("LOADED") !== -1) {
        color = cc.color.GREEN;
    }

    var scene = cc.director.getRunningScene();
    if (!scene) return;

    var layer = scene.getChildByName("LogLayer");
    if (!layer) {
        layer = new LogLayer();
        layer.setName("LogLayer");
        scene.addChild(layer, 999999);
    }
    layer.showLog(msg, color);
};

