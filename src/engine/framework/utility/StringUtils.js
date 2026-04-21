/**
 * Created by KienVN on 5/28/2015.
 */

fr.toMoneyString = function (num) {
    if (_.isString(num)) {
        return num;
    }
    var isNegative = false;
    var formattedNumber = num;
    if (num < 0) {
        isNegative = true;
    }
    num = Math.abs(num);
    var hau_to;
    if (num >= 1000000000) {
        hau_to = 'B';
        formattedNumber = (num / 1000000000).toFixed(3);
    } else if (num >= 1000000) {
        hau_to = 'M';
        formattedNumber = (num / 1000000).toFixed(3);
    } else if (num >= 1000) {
        hau_to = 'K';
        formattedNumber = (num / 1000).toFixed(3);
    } else {
        formattedNumber = num.toString();
        return formattedNumber;
    }
    if (formattedNumber.indexOf('.000') != -1) {
        formattedNumber = formattedNumber.replace(".000", hau_to);
        return formattedNumber;
    }
    var indexOfDot = formattedNumber.indexOf('.');
    if (indexOfDot > 0) {
        var buff = formattedNumber.substring(indexOfDot + 1);
        if (buff[2] == '0') {
            buff = buff.substring(0, 2);
            if (buff[1] == '0') {
                buff = buff.substring(0, 1);
            }
            formattedNumber = formattedNumber.substring(0, indexOfDot + 1) + buff + hau_to;
        }
        else {
            formattedNumber = formattedNumber.replace('.', hau_to);
        }
    }
    if (isNegative) {
        formattedNumber = '-' + formattedNumber;
    }
    return formattedNumber;
};

fr.standardizeNumber = function (num, delimiter) {
    if (delimiter == null) {
        delimiter = ".";
    }

    var tmp = num.toString();
    var retVal = "";
    var count = 0;
    for (var i = tmp.length - 1; i >= 0; i--) {
        retVal = tmp[i] + retVal;
        count++;
        if (count >= 3 && i != 0) {
            count = 0;
            retVal = delimiter + retVal;
        }
    }

    return retVal;
};
fr.standardNumberStringToNumber = function (numString) // format 50.000.000
{

    var val = numString.split(".");

    var newVal = "";
    for (var i = 0; i < val.length; ++i) {
        newVal = newVal + val[i];
    }

    var result = parseInt(newVal);

    return result;
};
fr.getFileNameByTime = function (ext) {
    var now = new Date();
    var year = now.getFullYear();
    var month = now.getMonth() + 1;
    var day = now.getDate();
    var hour = now.getHours();
    var minute = now.getMinutes();
    var second = now.getSeconds();
    var minisecond = now.getMilliseconds();

    if (month.toString().length == 1) {
        month = '0' + month;
    }
    if (day.toString().length == 1) {
        day = '0' + day;
    }
    if (hour.toString().length == 1) {
        hour = '0' + hour;
    }
    if (minute.toString().length == 1) {
        minute = '0' + minute;
    }
    if (second.toString().length == 1) {
        second = '0' + second;
    }

    var fileByTime = year + '_' + month + '_' + day + '__' + hour + '_' + minute + '_' + second + '_' + minisecond + '.' + ext;
    return fileByTime;
};
fr.checkHotHotText = function (text) {

};
fr.capString = function (text, length) {
    var result = text;
    if (text.length > length) {
        result = text.substr(0, length - 3);
        result = result + "...";
    }
    return result;

};

fr.createRichText = function (text, size, defFont, defSize, defColor, defAlignHorizontal, defAlignVertical) {
    // init
    var label = new CustomLabel(size);
    label.setDefaultFont(defFont ? defFont : res.FONT_GAME_BOLD);
    label.setDefaultColor(defColor ? defColor : cc.color.WHITE);
    label.setDefaultSize(defSize ? defSize : 20);
    label.setDefaultAlignHorizontal((defAlignHorizontal != undefined) ? defAlignHorizontal : RichTextAlignment.CENTER);
    label.setDefaultAlignVertical(defAlignVertical ? defAlignVertical : RichTextAlignment.MIDDLE);
    label.setString(text ? text : "");
    return label;
};

fr.cloneRichText = function (uiText) {
    if (!uiText instanceof ccui.Text){
        cc.warn("Input must be UI text");
    }
    var richText = fr.createRichText(
        uiText.getString(),
        uiText.getContentSize(),
        uiText.getFontName(),
        uiText.getFontSize(),
        uiText.getTextColor(),
        fr.getRichTextHorizontalAlign(uiText.getTextHorizontalAlignment()),
        fr.getRichTextVerticalAlign(uiText.getTextVerticalAlignment())
    );

    var parent = uiText.getParent();
    parent.addChild(richText);
    UIUtils.copyGeneralNodeAttribute(uiText, richText);
    richText.setTextContentSize(uiText.getContentSize());
    return richText;
};

/** uiText anchorPoint must be 0.5,0.5 */
fr.replaceByRichText = function (uiText) {
    var name = uiText.getName(), tag = uiText.getTag();
    var richText = fr.cloneRichText(uiText);
    var parent = uiText.getParent();
    parent.removeChild(uiText);
    richText.setName(name);
    richText.setTag(tag);
    return richText;
};

fr.getRichTextHorizontalAlign = function (uiTextHorizontalAlign) {
    switch (uiTextHorizontalAlign) {
        case cc.TEXT_ALIGNMENT_LEFT:
            return RichTextAlignment.LEFT;
        case cc.TEXT_ALIGNMENT_CENTER:
            return RichTextAlignment.CENTER;
        case cc.TEXT_ALIGNMENT_RIGHT:
            return RichTextAlignment.RIGHT;
        default: return -1;
    }
};
fr.getRichTextVerticalAlign = function (uiTextVerticalAlign) {
    switch (uiTextVerticalAlign) {
        case cc.VERTICAL_TEXT_ALIGNMENT_TOP:
            return RichTextAlignment.TOP;
        case cc.VERTICAL_TEXT_ALIGNMENT_CENTER:
            return RichTextAlignment.MIDDLE;
        case cc.VERTICAL_TEXT_ALIGNMENT_BOTTOM:
            return RichTextAlignment.BOTTOM;
        default: return -1;
    }
};

fr.speakRichText = function(rLbl, text, firstDelay, frequency, cbOnFinish) {
    // analysis
    text = text.replace(/\s+/g, " ").trim();    // remove any double+ white spaces
    var ret = [];
    var indexSeparatedByWhitespaces = fr.allIndexesOf(text, " ");
    indexSeparatedByWhitespaces.push(text.length);    // last index of string
    var startRichTextElementIndexes = fr.allIndexesOf(text, "<");
    var endRichTextElementIndexes = fr.allIndexesOf(text, ">");
    var latestIndex = 0;
    for (var i = 0; i < indexSeparatedByWhitespaces.length; i++){
        if (indexSeparatedByWhitespaces[i] < latestIndex){
            continue;
        }
        if (startRichTextElementIndexes[0] < indexSeparatedByWhitespaces[i] && indexSeparatedByWhitespaces[i] < endRichTextElementIndexes[1]){
            // process text inside rich element
            var richText = text.slice(endRichTextElementIndexes[0]+1, startRichTextElementIndexes[1]);
            var elements = [];
            if (richText.indexOf(" ") > -1){
                elements = richText.split(" ");
            }
            else{
                elements = [richText];
            }
            for (var j = 0; j < elements.length; j++){
                var obj = {};
                obj.str = elements[j];
                obj.isRichElement = true;
                obj.richTextStart = text.slice(startRichTextElementIndexes[0],endRichTextElementIndexes[0]+1);
                obj.richTextEnd = text.slice(startRichTextElementIndexes[1],endRichTextElementIndexes[1]+1);
                ret.push(obj);
                cc.log("obj: " + JSON.stringify(obj));
            }
            // move over rich element
            latestIndex = endRichTextElementIndexes[1]+1;
            startRichTextElementIndexes.splice(0,2);
            endRichTextElementIndexes.splice(0,2);
        }
        else{
            var str = text.slice(latestIndex, indexSeparatedByWhitespaces[i]);
            latestIndex = indexSeparatedByWhitespaces[i];
            var obj = {str: str, isRichElement: false};
            ret.push(obj);
            cc.log("obj: " + JSON.stringify(obj));
        }
    }


    // run action
    rLbl.textSlices = ret;
    rLbl.textSlicesIndex = 0;

    var constructText = function (slices, index) {
        var ret = "";
        var i = 0;
        while (i <= index && i < slices.length){
            var obj = slices[i];
            if (obj.isRichElement){
                ret = ret + obj.richTextStart;
                ret = ret + " " +  obj.str;
                var j = i+1;
                while ( j < index && slices[j].isRichElement && slices[j].richTextStart == obj.richTextStart){
                    ret = ret + " " + slices[j].str;
                    i++;j++;
                }
                ret = ret + " " + obj.richTextEnd;
                i++;
            }
            else{
                ret = ret + obj.str;
                i++;
            }
        }
        return ret.replace(/\s+/g, " ").trim();     // remove double+ whitespaces
    };


    var actionOnFinish = cc.callFunc(function(){
        if (cbOnFinish != null) cbOnFinish();
    });

    var speakText = cc.sequence(
        cc.delayTime(firstDelay),
        cc.sequence(
            cc.delayTime(frequency),
            cc.callFunc(
                function(){
                    var str = constructText(this.textSlices, this.textSlicesIndex);
                    this.setString(str);
                    this.textSlicesIndex++;
                }.bind(rLbl)
            )
        ).repeat(rLbl.textSlices.length),
        actionOnFinish
    );

    rLbl.runAction(speakText);
};

fr.allIndexesOf = function(str, subStr, caseSensitive){
    if (str.length == 0 || subStr.length == 0){
        return [];
    }
    if (caseSensitive == undefined){
        caseSensitive = true;
    }
    if (!caseSensitive){
        subStr = subStr.toLowerCase();
        str = str.toLowerCase();
    }
    var indexes = [], pointerIndex = 0, index = -1;
    while ((index = str.indexOf(subStr, pointerIndex)) > -1){
        indexes.push(index);
        pointerIndex = index + subStr.length;
    }
    return indexes;
};

fr.replaceAll = function(str, find, replace){
    var ret = str;      // copy
    if (replace.indexOf(find) > -1){
        cc.log("fr.replaceAll: infinity loop warn: " + find + "   " + replace);
        return ret.replace(find, replace);
    }

    while (ret.indexOf(find) > -1){
        ret = ret.replace(find, replace);
    }
    return ret;
};

fr.fillString = function (text, length) {
    var dif = length - text.length;
    if (dif <= 0) return text.slice(0, length);
    for (var i = 0; i < dif; i++) text += " ";
    return text;
};

fr.toVDNCurrency = function () {

};

fr.runText = function (uiText, callback) {
    let label = uiText.getVirtualRenderer();
    let totalLetter = label.getStringLength();
    for (let i = 0; i < totalLetter; i++) {
        let letter = label.getLetter(i);
        letter && letter.setVisible(false);
    }
    for (let i = 0; i < totalLetter; i++) {
        let letter = label.getLetter(i);
        letter && letter.runAction(cc.sequence(
            cc.delayTime(i*0.015),
            cc.callFunc(function () {
                letter.setVisible(true);
            })
        ))
    }

    uiText.runAction(cc.sequence(
        cc.delayTime(totalLetter * 0.025),
        cc.callFunc(function () {
            callback && callback();
        })
    ))
}
fr.standardString = function (str, limitLength) {
    var st = "";
    if (str == null) return "";
    if (str.length > limitLength) {
        st = str.substr(0, limitLength).concat("...");
        return st;
    }
    return str;
};