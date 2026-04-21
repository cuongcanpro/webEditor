/**
 * Created by hoangnq on 8/14/15.
 */

var StringUtility = function () {
}

StringUtility.JSON_ERROR_DEFAULT = -99999;

StringUtility.standartNumber = function (number, symbol) {            // Hien thi number theo chuan{
    var tmp = "" + number;
    if(!symbol) symbol = ",";
    if (tmp.length < 4) {
        return tmp;
    }
    var tmp2 = "";
    for (var i = 0; i < tmp.length - 1; i++) {
        if (((i + 1) % 3) == 0) {
            tmp2 = symbol + tmp.charAt(tmp.length - i - 1) + tmp2;
        }
        else {
            tmp2 = tmp.charAt(tmp.length - i - 1) + tmp2;
        }
    }
    tmp2 = tmp.charAt(0) + tmp2;
    return tmp2;
}

StringUtility.formatNumberSymbol = function (number, minLen, maxLen) {
    var retVal = "";
    if (number < 0)retVal = "-";
    if(!minLen)minLen = 0;
    number = Math.floor(Math.abs(number));
    var numberCheck = minLen > 0 ? number / (10 * minLen) : number;
    if (numberCheck >= 1000000000) {
        retVal = retVal + StringUtility.numberConvert(number, 1000000000) + "B";
    }
    else if (numberCheck >= 1000000) {
        retVal = retVal + StringUtility.numberConvert(number, 1000000) + "M";
    }
    else if (numberCheck >= 1000) {
        retVal = retVal + StringUtility.numberConvert(number, 1000) + "K";
    } else {
        retVal = retVal + StringUtility.pointNumber(number);
    }
    if(maxLen && retVal.length > maxLen){
        retVal = retVal.slice(0, retVal.indexOf('.')) + retVal[retVal.length - 1];
    }
    return retVal;
}

StringUtility.pointNumber = function (number, commas) {
    if (typeof number === 'undefined')
        return "";
    if (typeof  commas === 'undefined') commas = ",";
    var ret = Math.floor(Math.abs(number));
    return ret.toString().replace(/\B(?=(\d{3})+(?!\d))/g, commas);
}

StringUtility.numberConvert = function (number, div) {
    var a = parseInt(number / (div / 100));
    var b = parseInt(a / 100);

    a = a - b * 100;
    b = StringUtility.pointNumber(b);
    if (a == 0) {
        return "" + b;
    }
    else {
        if (a > 9) {
            if (a % 10 == 0) {
                return b + "." + a / 10;
            }
            else {
                return b + "." + a;
            }
        }
        else {
            return b + ".0" + a;
        }
    }
}

StringUtility.replaceAll = function (text, searchText, replaceText) {
    return text.split(searchText).join(replaceText);
}

StringUtility.subStringTextLength = function (text, length) {
    if(text.length <= length) return text;

    return text.substring(0,length-3) + "...";
}

StringUtility.parseJSON = function (json) {
    var ret = null;
    try {
        ret = JSON.parse(json);
    }
    catch (e) {
        ret = {};
        ret.error = StringUtility.JSON_ERROR_DEFAULT;
    }
    return ret;
}

StringUtility.getFontDefault = function (fnt) {

    var defaultPath = "fonts/";
    var defaultFont = "PoetsenOne-Regular.ttf";

    if(fnt === undefined || fnt == null || fnt == "")
        return defaultPath + defaultFont;

    var path = "";
    var idxComma = fnt.lastIndexOf("/");
    if(idxComma > -1)
    {
        path = fnt.substring(idxComma+1,fnt.length);
    }
    else
    {
        path = fnt;
    }
    return defaultPath + path;
}

StringUtility.getStringLocalized = function (str) {
    if(str === undefined || str == null || str == "") return str;

    var sLocalized = "str_";
    var idxLocalized = str.indexOf(sLocalized);
    var sizeLocalized = sLocalized.length;

    if(idxLocalized > -1)
    {
        return LocalizedString.to(str.substring(idxLocalized + sizeLocalized,str.length));
    }
    else
    {
        return str;
    }
}

StringUtility.getLabelWidth = function (label) {
    var tempStr = new ccui.Text();
    tempStr.setFontName(label.getFontName());
    tempStr.setFontSize(label.getFontSize());
    tempStr.setString(label.getString());
    return tempStr.getContentSize().width;
}

StringUtility.subRandomString = function (str, sub) {
    if(sub > str.length) return str;
    const nStart = Math.floor(Math.random() * (str.length - sub));
    return str.substring(nStart, nStart + sub);
};

StringUtility.convertUTF8String = function (str) {
    let accentChars = 'áàảãạăắằẳẵặâấầẩẫậđĐéèẻẽẹêếềểễệíìỉĩịóòỏõọôốồổỗộơớờởỡợúùủũụưứừửữựýỳỷỹỵÁÀẢÃẠĂẮẰẲẴẶÂẤẦẨẪẬÉÈẺẼẸÊẾỀỂỄỆÍÌỈĨỊÓÒỎÕỌÔỐỒỔỖỘƠỚỜỞỠỢÚÙỦŨỤƯỨỪỬỮỰÝỲỶỸỴ';
    let noAccentChars = 'aaaaaaaaaaaaaaaaadDeeeeeeeeeeeiiiiiooooooooooooooooouuuuuuuuuuuyyyyyAAAAAAAAAAAAAAAAAEEEEEEEEEEEIIIIIOOOOOOOOOOOOOOOOOUUUUUUUUUUUYYYYY';

    for (var i = 0; i < accentChars.length; i++) {
        str = str.replace(new RegExp(accentChars.charAt(i), 'g'), noAccentChars.charAt(i));
    }

    return str;
}

StringUtility.randomInt = function (min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
};

// for md5
function safeAdd (x, y) {
    var lsw = (x & 0xFFFF) + (y & 0xFFFF)
    var msw = (x >> 16) + (y >> 16) + (lsw >> 16)
    return (msw << 16) | (lsw & 0xFFFF)
}

/*
 * Bitwise rotate a 32-bit number to the left.
 */
function bitRotateLeft (num, cnt) {
    return (num << cnt) | (num >>> (32 - cnt))
}

/*
 * These functions implement the four basic operations the algorithm uses.
 */
function md5cmn (q, a, b, x, s, t) {
    return safeAdd(bitRotateLeft(safeAdd(safeAdd(a, q), safeAdd(x, t)), s), b)
}
function md5ff (a, b, c, d, x, s, t) {
    return md5cmn((b & c) | ((~b) & d), a, b, x, s, t)
}
function md5gg (a, b, c, d, x, s, t) {
    return md5cmn((b & d) | (c & (~d)), a, b, x, s, t)
}
function md5hh (a, b, c, d, x, s, t) {
    return md5cmn(b ^ c ^ d, a, b, x, s, t)
}
function md5ii (a, b, c, d, x, s, t) {
    return md5cmn(c ^ (b | (~d)), a, b, x, s, t)
}

/*
 * Calculate the MD5 of an array of little-endian words, and a bit length.
 */
function binlMD5 (x, len) {
    /* append padding */
    x[len >> 5] |= 0x80 << (len % 32)
    x[(((len + 64) >>> 9) << 4) + 14] = len

    var i
    var olda
    var oldb
    var oldc
    var oldd
    var a = 1732584193
    var b = -271733879
    var c = -1732584194
    var d = 271733878

    for (i = 0; i < x.length; i += 16) {
        olda = a
        oldb = b
        oldc = c
        oldd = d

        a = md5ff(a, b, c, d, x[i], 7, -680876936)
        d = md5ff(d, a, b, c, x[i + 1], 12, -389564586)
        c = md5ff(c, d, a, b, x[i + 2], 17, 606105819)
        b = md5ff(b, c, d, a, x[i + 3], 22, -1044525330)
        a = md5ff(a, b, c, d, x[i + 4], 7, -176418897)
        d = md5ff(d, a, b, c, x[i + 5], 12, 1200080426)
        c = md5ff(c, d, a, b, x[i + 6], 17, -1473231341)
        b = md5ff(b, c, d, a, x[i + 7], 22, -45705983)
        a = md5ff(a, b, c, d, x[i + 8], 7, 1770035416)
        d = md5ff(d, a, b, c, x[i + 9], 12, -1958414417)
        c = md5ff(c, d, a, b, x[i + 10], 17, -42063)
        b = md5ff(b, c, d, a, x[i + 11], 22, -1990404162)
        a = md5ff(a, b, c, d, x[i + 12], 7, 1804603682)
        d = md5ff(d, a, b, c, x[i + 13], 12, -40341101)
        c = md5ff(c, d, a, b, x[i + 14], 17, -1502002290)
        b = md5ff(b, c, d, a, x[i + 15], 22, 1236535329)

        a = md5gg(a, b, c, d, x[i + 1], 5, -165796510)
        d = md5gg(d, a, b, c, x[i + 6], 9, -1069501632)
        c = md5gg(c, d, a, b, x[i + 11], 14, 643717713)
        b = md5gg(b, c, d, a, x[i], 20, -373897302)
        a = md5gg(a, b, c, d, x[i + 5], 5, -701558691)
        d = md5gg(d, a, b, c, x[i + 10], 9, 38016083)
        c = md5gg(c, d, a, b, x[i + 15], 14, -660478335)
        b = md5gg(b, c, d, a, x[i + 4], 20, -405537848)
        a = md5gg(a, b, c, d, x[i + 9], 5, 568446438)
        d = md5gg(d, a, b, c, x[i + 14], 9, -1019803690)
        c = md5gg(c, d, a, b, x[i + 3], 14, -187363961)
        b = md5gg(b, c, d, a, x[i + 8], 20, 1163531501)
        a = md5gg(a, b, c, d, x[i + 13], 5, -1444681467)
        d = md5gg(d, a, b, c, x[i + 2], 9, -51403784)
        c = md5gg(c, d, a, b, x[i + 7], 14, 1735328473)
        b = md5gg(b, c, d, a, x[i + 12], 20, -1926607734)

        a = md5hh(a, b, c, d, x[i + 5], 4, -378558)
        d = md5hh(d, a, b, c, x[i + 8], 11, -2022574463)
        c = md5hh(c, d, a, b, x[i + 11], 16, 1839030562)
        b = md5hh(b, c, d, a, x[i + 14], 23, -35309556)
        a = md5hh(a, b, c, d, x[i + 1], 4, -1530992060)
        d = md5hh(d, a, b, c, x[i + 4], 11, 1272893353)
        c = md5hh(c, d, a, b, x[i + 7], 16, -155497632)
        b = md5hh(b, c, d, a, x[i + 10], 23, -1094730640)
        a = md5hh(a, b, c, d, x[i + 13], 4, 681279174)
        d = md5hh(d, a, b, c, x[i], 11, -358537222)
        c = md5hh(c, d, a, b, x[i + 3], 16, -722521979)
        b = md5hh(b, c, d, a, x[i + 6], 23, 76029189)
        a = md5hh(a, b, c, d, x[i + 9], 4, -640364487)
        d = md5hh(d, a, b, c, x[i + 12], 11, -421815835)
        c = md5hh(c, d, a, b, x[i + 15], 16, 530742520)
        b = md5hh(b, c, d, a, x[i + 2], 23, -995338651)

        a = md5ii(a, b, c, d, x[i], 6, -198630844)
        d = md5ii(d, a, b, c, x[i + 7], 10, 1126891415)
        c = md5ii(c, d, a, b, x[i + 14], 15, -1416354905)
        b = md5ii(b, c, d, a, x[i + 5], 21, -57434055)
        a = md5ii(a, b, c, d, x[i + 12], 6, 1700485571)
        d = md5ii(d, a, b, c, x[i + 3], 10, -1894986606)
        c = md5ii(c, d, a, b, x[i + 10], 15, -1051523)
        b = md5ii(b, c, d, a, x[i + 1], 21, -2054922799)
        a = md5ii(a, b, c, d, x[i + 8], 6, 1873313359)
        d = md5ii(d, a, b, c, x[i + 15], 10, -30611744)
        c = md5ii(c, d, a, b, x[i + 6], 15, -1560198380)
        b = md5ii(b, c, d, a, x[i + 13], 21, 1309151649)
        a = md5ii(a, b, c, d, x[i + 4], 6, -145523070)
        d = md5ii(d, a, b, c, x[i + 11], 10, -1120210379)
        c = md5ii(c, d, a, b, x[i + 2], 15, 718787259)
        b = md5ii(b, c, d, a, x[i + 9], 21, -343485551)

        a = safeAdd(a, olda)
        b = safeAdd(b, oldb)
        c = safeAdd(c, oldc)
        d = safeAdd(d, oldd)
    }
    return [a, b, c, d]
}

/*
 * Convert an array of little-endian words to a string
 */
function binl2rstr (input) {
    var i
    var output = ''
    var length32 = input.length * 32
    for (i = 0; i < length32; i += 8) {
        output += String.fromCharCode((input[i >> 5] >>> (i % 32)) & 0xFF)
    }
    return output
}

/*
 * Convert a raw string to an array of little-endian words
 * Characters >255 have their high-byte silently ignored.
 */
function rstr2binl (input) {
    var i
    var output = []
    output[(input.length >> 2) - 1] = undefined
    for (i = 0; i < output.length; i += 1) {
        output[i] = 0
    }
    var length8 = input.length * 8
    for (i = 0; i < length8; i += 8) {
        output[i >> 5] |= (input.charCodeAt(i / 8) & 0xFF) << (i % 32)
    }
    return output
}

/*
 * Calculate the MD5 of a raw string
 */
function rstrMD5 (s) {
    return binl2rstr(binlMD5(rstr2binl(s), s.length * 8))
}

/*
 * Calculate the HMAC-MD5, of a key and some data (raw strings)
 */
function rstrHMACMD5 (key, data) {
    var i
    var bkey = rstr2binl(key)
    var ipad = []
    var opad = []
    var hash
    ipad[15] = opad[15] = undefined
    if (bkey.length > 16) {
        bkey = binlMD5(bkey, key.length * 8)
    }
    for (i = 0; i < 16; i += 1) {
        ipad[i] = bkey[i] ^ 0x36363636
        opad[i] = bkey[i] ^ 0x5C5C5C5C
    }
    hash = binlMD5(ipad.concat(rstr2binl(data)), 512 + data.length * 8)
    return binl2rstr(binlMD5(opad.concat(hash), 512 + 128))
}

/*
 * Convert a raw string to a hex string
 */
function rstr2hex (input) {
    var hexTab = '0123456789abcdef'
    var output = ''
    var x
    var i
    for (i = 0; i < input.length; i += 1) {
        x = input.charCodeAt(i)
        output += hexTab.charAt((x >>> 4) & 0x0F) +
            hexTab.charAt(x & 0x0F)
    }
    return output
}

/*
 * Encode a string as utf-8
 */
function str2rstrUTF8 (input) {
    return unescape(encodeURIComponent(input))
}

/*
 * Take string arguments and return either raw or hex encoded strings
 */
function rawMD5 (s) {
    return rstrMD5(str2rstrUTF8(s))
}
function hexMD5 (s) {
    return rstr2hex(rawMD5(s))
}
function rawHMACMD5 (k, d) {
    return rstrHMACMD5(str2rstrUTF8(k), str2rstrUTF8(d))
}
function hexHMACMD5 (k, d) {
    return rstr2hex(rawHMACMD5(k, d))
}

function md5 (string, key, raw) {
    if (!key) {
        if (!raw) {
            return hexMD5(string)
        }
        return rawMD5(string)
    }
    if (!raw) {
        return hexHMACMD5(key, string)
    }
    return rawHMACMD5(key, string)
}

StringUtility.md5 = md5;
