/**
 * Created by AnhVTT on 4/16/2021.
 */
var NumberLabel = cc.Node.extend({
    partition: 5,

    ctor: function (font = null, size = 50, initValue = 0) {
        this._super();
        if (font == null || font == undefined)
            font = res.FONT_GAME_MEDIUM;
        this.label = new ccui.Text(initValue, font, size);
        this.value = initValue;
        this.addChild(this.label);
    },

    setFont: function (font) {
        this.label.setFontName(font);
    },

    setFontSize: function (size) {
        this.label.setFontSize(size);
    },

    addValue: function (amount) {
        cc.log("addValue", amount)
        var showingNumber = [];
        for (var i = 1; i <= this.partition; i++) {
            showingNumber.push(this.value + Math.floor(amount / this.partition * i));
            this.runAction(cc.sequence(
                cc.delayTime(0.05 * i),
                cc.callFunc(function () {
                    this.label.setString(showingNumber[0]);
                    showingNumber.shift();
                }.bind(this))
            ));
        }
        this.value += amount;
        cc.log("value", this.value)
    },

    setPartition: function (partition) {
        this.partition = partition;
    }
});

let NumberLabelClass = cc.Class.extend({
    partition: 5,

    ctor: function (label, initValue = 0) {
        this.label = label;
        this.value = initValue;
        this.label.setString(this.value);
    },

    setVisible: function (visibility) {
        this.label.setVisible(visibility);
    },

    setFont: function (font) {
        this.label.setFontName(font);
    },

    setFontSize: function (size) {
        this.label.setFontSize(size);
    },

    addValue: function (amount) {
        cc.log("addValue", amount)
        var showingNumber = [];
        for (var i = 1; i <= this.partition; i++) {
            showingNumber.push(this.value + Math.floor(amount / this.partition * i));
            this.label.stopAllActions();
            this.label.runAction(cc.sequence(
                cc.delayTime(0.05 * i),
                cc.callFunc(function () {
                    this.label.setString(showingNumber[0]);
                    showingNumber.shift();
                }.bind(this))
            ));
        }
        this.value += amount;
        cc.log("value", this.value)
    },

    setPartition: function (partition) {
        this.partition = partition;
    }
});

