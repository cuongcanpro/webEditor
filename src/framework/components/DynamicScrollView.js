/**
 * Created by AnhVTT on 7/19/2021.
 */
var DynamicScrollView = ccui.ScrollView.extend({
    ctor: function (width, height) {
        this._super();
        this.width = width;
        this.height = height;
        this.containerWidth = width;
        this.containerHeight = height;

        this.setBackGroundColorType(ccui.Layout.BG_COLOR_NONE);
        this.setContentSize(width, height);
        this.setInertiaScrollEnabled(true);

        this.items = [];
        this.paddingBottom = 0;
        this.paddingTop = 0;
    },

    addItem: function (item, x, y, width, height) {
        this.containerWidth = Math.max(this.containerWidth, x + width/2);
        this.containerHeight = Math.max(this.containerHeight, y + height/2);
        item.setPosition(x, y);
        this.items.push(item);
    },

    render: function () {
        this.removeAllChildren(true);
        this.containerHeight += this.paddingBottom;
        for (var i in this.items) {
            var item = this.items[i];
            item.setPosition(item.x, this.containerHeight - item.y);
            this.addChild(item);
        }
        this.setInnerContainerSize(cc.size(this.containerWidth, this.containerHeight + this.paddingTop));
    }
})