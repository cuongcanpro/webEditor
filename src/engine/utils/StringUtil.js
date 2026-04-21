/**
 * @file StringUtil.js
 * All functions that are related to string convert, format, validate
 */

let StringUtil = function() {};

/**
 * Convert number to symbol (M, K, B, T) format
 * @param {number} number a positive number
 * @param {string} [sep="."] separator character
 * @return {string}
 * @example
 * StringUtil.formatNumberSymbol(50000);    //50K
 * StringUtil.formatNumberSymbol(50005);    //50.00K
 * StringUtil.formatNumberSymbol(50456);    //50.45K
 */
StringUtil.formatNumberSymbol = function(number, sep) {
    if (sep == null) sep = ".";

    let symbols = ["", "K", "M", "B", "T"];
    let symIdx = 0;
    while (symIdx < symbols.length - 1){
        if (number / Math.pow(10, (symIdx * 3)) < 1000) break;
        else symIdx++;
    }

    let intPart = Math.floor(number / Math.pow(10, symIdx * 3));
    let floatPart = number % Math.pow(10, symIdx * 3);

    if (floatPart === 0)
        return intPart + symbols[symIdx];
    else {
        let temp = Math.floor(floatPart / Math.pow(10, symIdx * 3 - 2));
        return intPart + sep + (temp < 10 ? "0" : "") + temp + symbols[symIdx];
    }
}

/**
 * Convert numbers to standard format
 * @param {number} number a positive number
 * @param {string} [sep="."] separator character
 * @return {string}
 * @example
 * StringUtil.formatNumberStandard(123);        //123
 * StringUtil.formatNumberStandard(1234);       //1.234
 * StringUtil.formatNumberStandard(123456789);  //123.456.789
 */
StringUtil.formatNumberStandard = function(number, sep) {
    if (sep == null) sep = ".";

    return String(number).replace(/\B(?=(\d{3})+(?!\d))/g, sep);
}

/**
 * @param {number} number a positive number
 * @param {number} threshold if number >= threshold then convert using shorter format
 * @param {string} [sep] separator character
 * @return {string}
 * @example
 * StringUtil.formatNumberCustom(123456, 10e6);     //123.456
 * StringUtil.formatNumberCustom(123456789, 10e6);  //123.45M
 */
StringUtil.formatNumberCustom = function(number, threshold, sep) {
    if (number < threshold)
        return StringUtil.formatNumberStandard(number, sep);
    else return StringUtil.formatNumberSymbol(number, sep);
}

/**
 * Convert numbers to ordinal format (add th-suffixes)
 * @param {number} number a positive number
 * @return {string}
 * @example
 * StringUtil.formatNumberOrdinal(1);   //1st
 * StringUtil.formatNumberOrdinal(22);  //22nd
 * StringUtil.formatNumberOrdinal(33);  //33rd
 * StringUtil.formatNumberOrdinal(11);  //11th
 * StringUtil.formatNumberOrdinal(25);  //25th
 */
StringUtil.formatNumberOrdinal = function(number) {
    if (number >= 10 && number <= 20) return number + "th";

    switch(number % 10) {
        case 1:
            return number + "st";
        case 2:
            return number + "nd";
        case 3:
            return number + "rd";
        default:
            return number + "th";
    }
}

/**
 * Convert UNIX time in milliseconds to date string
 * Use these tokens in format string
 * - %YYYY% - 4-digit year - 1999
 * - %YY% - 2-digit year - 99
 * - %MM% - 2-digit month number - 02
 * - %M% - month number - 2
 * - %DD% - 2-digit day number - 09
 * - %D% - day number - 9
 * - %th% - day ordinal suffix - st, nd, rd
 * - %hhhh% - 2-digit 24-based hour - 17, 09
 * - %hhh% - 24-based hour - 17, 9
 * - %hh% - 2-digit 12-based hour - 12, 01
 * - %h% - 12-based hour - 12, 1
 * - %mm% - 2-digit minute - 09, 59
 * - %m% - minute - 9, 59
 * - %ss% - 2-digit second - 09, 59
 * - %s% - second - 9, 59
 * - %msmsms% - 3-digit millis - 001, 999
 * - %msms% - 2-digit millis - 01, 99
 * - %ms% - 1-digit millis - 1, 9
 * - %ampm% - "am" or "pm" - am, pm
 * - %AMPM% - "AM" or "PM" - AM, PM
 * @param {number} millis
 * @param {string} format
 * @return {string}
 */
StringUtil.customFormatDate = function(millis, format) {
    let date = new Date(millis);
    let YYYY, YY, MM, M, DD, D, hhhh, hhh, hh, h, mm, m, ss, s, msmsms, msms, ms, ampm, AMPM, dMod, th;

    YY = ((YYYY = date.getFullYear()) + "").slice(-2);
    MM = (M = date.getMonth() + 1) < 10 ? ("0" + M) : M;
    DD = (D = date.getDate()) < 10 ? ("0" + D) : D;
    dMod = D % 10;
    th = (D >= 10 && D <= 20) ? "th" : (dMod === 1 ? "st" : (dMod === 2 ? "nd" : (dMod === 3 ? "rd" : "th")));
    hhhh = (hhh = date.getHours()) < 10 ? ("0" + hhh) : hhh;
    hh = (h = hhh > 12 ? hhh - 12 : (hhh === 0 ? 12 : hhh)) < 10 ? ("0" + h) : h;
    AMPM = (ampm = hhh < 12 ? "am" : "pm").toUpperCase();
    mm = (m = date.getMinutes()) < 10 ? ("0" + m) : m;
    ss = (s = date.getSeconds()) < 10 ? ("0" + s) : s;
    ms = Math.floor((msms = Math.floor((msmsms = millis % 1000) / 10)) / 10);

    return format.replace("%YYYY%", YYYY).replace("%YY%", YY)
        .replace("%MM%", MM).replace("%M%", M)
        .replace("%DD%", DD).replace("%D%", D)
        .replace("%hhhh%", hhhh).replace("%hhh%", hhh).replace("%hh%", hh).replace("%h%", h)
        .replace("%mm%", mm).replace("%m%", m).replace("%ss%", ss).replace("%s%", s)
        .replace("%msmsms%", msmsms).replace("%msms%", msms).replace("%ms%", ms)
        .replace("%ampm%", ampm).replace("%AMPM%", AMPM).replace("%th%", th);
}

/**
 *
 * @param {string} str
 * @param {number} limit
 */
StringUtil.subStringLimit = function(str, limit) {
    if(limit <= 3 || str.length <= limit) return str;

    return str.substring(0, limit - 3) + "...";
}

/**
 * @param {string} str
 * @param {string} [key]
 * @param {boolean} [raw=false]
 * @return {string}
 */
StringUtil.md5 = function(str, key, raw) {
    if (raw === undefined) raw = false;

    function safeAdd (x, y) {
        let lsw = (x & 0xFFFF) + (y & 0xFFFF)
        let msw = (x >> 16) + (y >> 16) + (lsw >> 16)
        return (msw << 16) | (lsw & 0xFFFF)
    }
    function bitRotateLeft (num, cnt) {
        return (num << cnt) | (num >>> (32 - cnt))
    }

    const md5cmn = function(q, a, b, x, s, t) {
        return safeAdd(bitRotateLeft(safeAdd(safeAdd(a, q), safeAdd(x, t)), s), b)
    }
    const md5ff = function(a, b, c, d, x, s, t) {
        return md5cmn((b & c) | ((~b) & d), a, b, x, s, t)
    }
    const md5gg = function(a, b, c, d, x, s, t) {
        return md5cmn((b & d) | (c & (~d)), a, b, x, s, t)
    }
    const md5hh = function(a, b, c, d, x, s, t) {
        return md5cmn(b ^ c ^ d, a, b, x, s, t)
    }
    const md5ii = function(a, b, c, d, x, s, t) {
        return md5cmn(c ^ (b | (~d)), a, b, x, s, t)
    }

    /**
     * Calculate the MD5 of an array of little-endian words, and a bit length.
     * @param {number[]} x
     * @param {number} len
     * @return {number[]}
     */
    const binlMD5 = function(x, len) {
        /* append padding */
        x[len >> 5] |= 0x80 << (len % 32)
        x[(((len + 64) >>> 9) << 4) + 14] = len

        let olda, oldb, oldc, oldd;
        let a = 1732584193;
        let b = -271733879;
        let c = -1732584194;
        let d = 271733878;

        for (let i = 0; i < x.length; i += 16) {
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

    /**
     * Convert an array of little-endian words to a string
     * @param {number[]} input
     * @return {string}
     */
    const binl2rstr = function(input) {
        let output = '';
        let length32 = input.length * 32;
        for (let i = 0; i < length32; i += 8) {
            output += String.fromCharCode((input[i >> 5] >>> (i % 32)) & 0xFF)
        }
        return output
    }

    /**
     * Convert a raw string to an array of little-endian words
     * Characters >255 have their high-byte silently ignored.
     * @param {number[]} input
     * @return {number[]}
     */
    const rstr2binl = function(input) {
        let output = []
        output[(input.length >> 2) - 1] = undefined
        for (let i = 0; i < output.length; i += 1) {
            output[i] = 0
        }
        const length8 = input.length * 8
        for (let i = 0; i < length8; i += 8) {
            output[i >> 5] |= (input[i / 8] & 0xFF) << (i % 32)
        }
        return output
    }

    /**
     * Calculate the MD5 of a raw string
     * @param {number[]} s
     * @return {string}
     */
    const rstrMD5 = function(s) {
        return binl2rstr(binlMD5(rstr2binl(s), s.length * 8))
    }

    /**
     * Calculate the HMAC-MD5, of a key and some data (raw strings)
     * @param {number[]} key
     * @param {number[]} data
     * @return {string}
     */
    const rstrHMACMD5 = function(key, data) {
        let bkey = rstr2binl(key);
        let ipad = [];
        let opad = [];
        ipad[15] = opad[15] = undefined
        if (bkey.length > 16) {
            bkey = binlMD5(bkey, key.length * 8)
        }
        for (let i = 0; i < 16; i += 1) {
            ipad[i] = bkey[i] ^ 0x36363636
            opad[i] = bkey[i] ^ 0x5C5C5C5C
        }
        let hash = binlMD5(ipad.concat(rstr2binl(data)), 512 + data.length * 8)
        return binl2rstr(binlMD5(opad.concat(hash), 512 + 128))
    }

    /**
     * Convert a raw string to a hex string
     * @param {string} input
     * @return {string}
     */
    const rstr2hex = function(input) {
        let hexTab = '0123456789abcdef';
        let output = '';
        for (let i = 0; i < input.length; i += 1) {
            let x = input.charCodeAt(i)
            output += hexTab.charAt((x >>> 4) & 0x0F) +
                hexTab.charAt(x & 0x0F)
        }
        return output;
    }

    /**
     * Encode a string as utf-8
     * @param {string} input
     * @return {number[]}
     */
    const str2rstrUTF8 = function(input) {
        return Array.from(new TextEncoder().encode(input));
    }

    /**
     * @param {string} s
     * @return {string}
     */
    const rawMD5 = function (s) {
        return rstrMD5(str2rstrUTF8(s))
    }

    /**
     * @param {string} s
     * @return {string}
     */
    const hexMD5 = function (s) {
        return rstr2hex(rawMD5(s))
    }

    /**
     * @param {string} k
     * @param {string} d
     * @return {string}
     */
    const rawHMACMD5 = function (k, d) {
        return rstrHMACMD5(str2rstrUTF8(k), str2rstrUTF8(d))
    }

    /**
     * @param {string} k
     * @param {string} d
     * @return {string}
     */
    const hexHMACMD5 = function (k, d) {
        return rstr2hex(rawHMACMD5(k, d))
    }

    if (key == null) {
        if (!raw)
            return hexMD5(str);
        else return rawMD5(str);
    }
    else {
        if (!raw)
            return hexHMACMD5(key, str);
        else return rawHMACMD5(key, str);
    }
}

StringUtil.formatNumber00 = function (number) {
    let prefix = "0";
    if(number >= 10) prefix = "";
    return prefix + number;
}