/**
 * Created by AnhVTT on 26/10/2021.
 * Use Scale9Sprite bubble as background
 * Use Rich Text to for highlighting info
 */
// var TutorialBubble1 = cc.Node.extend({
//     ctor: function (size, font, fontSize) {
//         this._super();
//         this.bg = new cc.Scale9Sprite();
//         this.bg.updateWithBatchNode(new cc.SpriteBatchNode(tutorial_res.bubble_talk_bg), cc.rect(0, 0, 732, 226), false, cc.rect(80, 70, 572, 86));
//         this.content = new ccui.RichText();
//         this.content.ignoreContentAdaptWithSize(false);
//         this.content.setCascadeOpacityEnabled(true);
//         this.content.setAlignmentVertical(RichTextAlignment.MIDDLE);
//         this.content.setAlignmentHorizontal(RichTextAlignment.CENTER);
//
//         this.addChild(this.bg);
//         this.bg.addChild(this.content);
//
//         this.font = font;
//         this.fontSize = fontSize;
//         this.color = GUIConst.TEXT_COLOR.BROWN;
//         this.textIndex = 0;
//         this.elements = [];
//
//         this.setBubbleSize(size.width, size.height);
//     },
//     setBubbleSize: function (width, height) {
//         this.bg.width = width;
//         this.bg.height = height;
//         for (let i in this.elements) this.content.removeElement(this.elements[i]);
//         this.content.setContentSize(cc.size(width-50, height-50));
//         this.content.setPosition(width/2, height/2);
//         for (let i in this.elements) this.content.pushBackElement(this.elements[i]);
//         this.content.formatText();
//     },
//     addText: function (texts) {
//         for (let i in texts) {
//             this.textIndex++;
//             let text = texts[i];
//             let element = new ccui.RichElementText(
//                 this.textIndex,
//                 text['color'] || this.color,
//                 255,
//                 text['content'] || '',
//                 text['font'] || this.font,
//                 text['size'] || this.fontSize)
//             this.content.pushBackElement(element);
//             this.elements.push(element);
//         }
//         this.content.formatText();
//     },
//     clearText: function () {
//         this.textIndex = 0;
//         for (let i in this.elements) this.content.removeElement(this.elements[i]);
//         this.elements = [];
//     }
// });

var TutorialBubble = cc.Node.extend({
    ctor: function (size, font, fontSize) {
        this._super();
        this.bg = new cc.Scale9Sprite();
        this.bg.updateWithBatchNode(new cc.SpriteBatchNode(tutorial_res.bubble_talk_bg), cc.rect(0, 0, 732, 226), false, cc.rect(80, 70, 572, 86));
        this.content = fr.createRichText("", cc.size(500, 70), font, fontSize);
        this.content.setDefaultColor(GUIConst.TEXT_COLOR.BROWN);
        this.content.setCascadeOpacityEnabled(true);
        this.content.setDefaultAlignVertical(RichTextAlignment.MIDDLE);
        this.content.setDefaultAlignHorizontal(RichTextAlignment.CENTER);

        this.addChild(this.bg);
        this.bg.addChild(this.content);
        this.textIndex = 0;

        this.setBubbleSize(size.width, size.height);
    },
    setBubbleSize: function (width, height) {
        this.bg.width = width;
        this.bg.height = height;
        this.content.setTextContentSize(cc.size(width-50, height-50));
        this.content.setPosition(width/2, height/2);
        this.content.setString(this.content.getString());   // refresh
    },
    setString: function (text) {
        this.content.setString(text);
    }
})