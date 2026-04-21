/**
 * Do common and reusable thing
 * @type {{}}
 */
var Utility = Utility || {};

Utility.isWin32 = function () {
    return (cc.sys.platform == cc.sys.WIN32);
};
Utility.isAndroid = function () {
    return (cc.sys.platform == cc.sys.ANDROID);
};

Utility.isIOS = function () {
    //test

    return (cc.sys.platform == cc.sys.IPAD || cc.sys.platform == cc.sys.IPHONE);
};
Utility.getVersionData = function () {
    if (Utility.isWin32()) {
        return "";
    }
    var versionManifestPath = fr.NativeService.getFolderUpdateAssets() + "/version.manifest";
    if (!jsb.fileUtils.isFileExist(versionManifestPath)) {
        versionManifestPath = "version.manifest";
    }
    if (!jsb.fileUtils.isFileExist(versionManifestPath)) {
        return "";
    }
    return jsb.fileUtils.getStringFromFile(versionManifestPath);
};
//get Cdn link
Utility.getCdnLink = function () {
    var versionData = Utility.getVersionData();
    if (versionData == "") {
        return "";
    }
    else {
        try {
            var url = JSON.parse(versionData).packageUrl;
            // cc.log("cdn = " + url);
            return url;
        } catch (e) {
            return "";
        }
    }
};

Utility.getJSVersionNum = function () {
    var versionData = Utility.getVersionData();
    if (versionData == "") {
        return 1;
    } else {
        try {
            return JSON.parse(versionData).version;
        } catch (e) {
            return 1;
        }
    }
};

Utility.getCommitHash = function () {
    var versionData = Utility.getVersionData();
    if (versionData == "") {
        return "[-]";
    } else {
        try {
            return "[" + JSON.parse(versionData).ch + "]";
        } catch (e) {
            return "[-]";
        }
    }
};

//cdn for Dev
Utility.isDevVersion = function () {
    return Utility.getCdnLink().indexOf("match3_dev") >= 0;
};
//cdn for QC test
Utility.isQCVersion = function () {
    return Utility.getCdnLink().indexOf("match3_qc") >= 0;
};
Utility.isQC2Version = function () {
    return Utility.getCdnLink().indexOf("match3_qc2") >= 0;
};
//cdn for Focus group or Play test
Utility.isPlayTestVersion = function () {
    return Utility.getCdnLink().indexOf("prototype") >= 0;
};
// cdn live
Utility.isLiveVersion = function () {
    return Utility.getCdnLink().indexOf("cdn-match3.service.zingplay.com/client") >= 0;
};

Utility.isArrayContainAll = function (arr, target) {
    if (target.length == 0) return false;
    for (let i in target) {
        if (arr.indexOf(target[i]) == -1) return false;
    }
    return true;
};

Utility.getVersionTypeStr = function () {
    if (Utility.isDevVersion()) return "Dev";
    else if (Utility.isPlayTestVersion()) return "Pt";
    else if (Utility.isQCVersion()) return "Qc";
    else if (Utility.isQC2Version()) return "Qc2";
    else if (Utility.isLiveVersion()) return "v";
    else return "u";    // unknown
};

Utility.deepCopyObject = function (object) {
    try {
        return JSON.parse(JSON.stringify(object));
    } catch (e) {
        cc.log("Deep Copy Object Failed!", JSON.stringify(object));
    }
    return null;
};

// replace duplicate attribute in mainObj
Utility.mergeObject = function (mainObj, obj) {
    for (let key in obj) {
        mainObj[key] = obj[key]
    }
    return mainObj;
};

Utility.commonEnc = function (number) {
    return number;
    const key = 10;
    return number ^ key;
}
Utility.commonDec = function (number) {
    return number;
    const key = 10;
    return number ^ key;
}


var win32 = win32 || {};
win32.log = function (data) {
    if (cc.sys.platform == cc.sys.WIN32){
        cc.log.apply(this, arguments);
    }
}
Utility.getResourcesCountryCode = function () {

    return "en";
}