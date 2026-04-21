var fr = fr || {};

var PMPK_INFO_CONFIG_KEY = "PMPK_INFO_CONFIG";
var B64_TABLE = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
var URL_SERVICES = "https://login.service.zingplay.com/?service_name=get_config_iap&environment=false&os=_OS_&package_name=_PACK_";

var IAP_GAME_CONFIG = {
    "package_name":"com.zps.domino",
    "license_key":"MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAj+62myfN5AIxkFqN+oQqI+Eiv9Ml5UsNGiXYxoVBWJPwL588tOaApksCdau7XdugPVsGu78UyqnSntug++7UUMuKzsE2zvkUTk8In+wz8D8ihLirG+f/whTINL4+0V0Rew6RjMWAKn02kbGG9xvGnYVESGVnRyZk4G1yysGY3Rdnnb82bZng0LC7IVE9fa4eVqqEVpMNfsrEG7kkS5im/V/V8OQ/zA0Z1m5Nf0Guz1meLsGNA1/YmAr9+BuqlDb7tyI2bXL+sBVaDous72mCVhYL62Q+IBd/STjJLLAWTREgHUoQ6W4m7KyLDSyCVGPKZRTwpkeyE0nZpxlzrJV99QIDAQAB",
    "packages": {
        "10A":"zps.pack7",
        "10B":"zps.pack8",
        "20A":"zps.pack9",
        "20B":"zps.pack10",
        "50A":"zps.pack11",
        "100B":"zps.pack14",
        "50B":"zps.pack12",
        "100A":"zps.pack13",
        "5A":"zps.pack5",
        "5B":"zps.pack6",
        "2A":"zps.pack3",
        "1A":"zps.pack1",
        "2B":"zps.pack4",
        "1B":"zps.pack2",
        "2C":"zps.pack16",
        "1C":"zps.pack15",
        "0.2B":"zps.pack18",
        "0.4B":"zps.pack20",
        "0.2A":"zps.pack17",
        "0.4A":"zps.pack19"
    }
};
var IAP_PORTAL_CONFIG = {
    "package_name":"com.zps.domino",
    "license_key":"MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAj+62myfN5AIxkFqN+oQqI+Eiv9Ml5UsNGiXYxoVBWJPwL588tOaApksCdau7XdugPVsGu78UyqnSntug++7UUMuKzsE2zvkUTk8In+wz8D8ihLirG+f/whTINL4+0V0Rew6RjMWAKn02kbGG9xvGnYVESGVnRyZk4G1yysGY3Rdnnb82bZng0LC7IVE9fa4eVqqEVpMNfsrEG7kkS5im/V/V8OQ/zA0Z1m5Nf0Guz1meLsGNA1/YmAr9+BuqlDb7tyI2bXL+sBVaDous72mCVhYL62Q+IBd/STjJLLAWTREgHUoQ6W4m7KyLDSyCVGPKZRTwpkeyE0nZpxlzrJV99QIDAQAB",
    "packages": {
        "10A":"zps.pack7",
        "10B":"zps.pack8",
        "20A":"zps.pack9",
        "20B":"zps.pack10",
        "50A":"zps.pack11",
        "100B":"zps.pack14",
        "50B":"zps.pack12",
        "100A":"zps.pack13",
        "5A":"zps.pack5",
        "5B":"zps.pack6",
        "2A":"zps.pack3",
        "1A":"zps.pack1",
        "2B":"zps.pack4",
        "1B":"zps.pack2",
        "2C":"zps.pack16",
        "1C":"zps.pack15",
        "0.2B":"zps.pack18",
        "0.4B":"zps.pack20",
        "0.2A":"zps.pack17",
        "0.4A":"zps.pack19"
    }
};
var IAP_APPLE_CONFIG = {
    package_name : "com.mpt.dominoqq",
    license_key :"",
    packages : {
        "10A" :"zps.dominoNew.pack10",
        "20A" :"zps.dominoNew.pack20",
        "5A"  :"zps.dominoNew.pack5",
        "2A"  :"zps.dominoNew.pack2",
        "1A"  :"zps.dominoNew.pack1"
    }
};

fr.paymentInfo = {
    nRetry : 5,

    isServerConfig : false,
    isConfig : false,
    config : null,

    init : function () {
        fr.portalState.init();
        // if (portalMgr.isPortal()) {
        this.loadCacheInfo();
        this.loadInfo();
        // }
        // else {
        //     this.isConfig = true;
        //     this.isServerConfig = true;
        //     this.config = IAP_GAME_CONFIG;
        // }
    },

    hasInit : function () {
        if(this.isServerConfig) return true;

        if(this.nRetry <= 0) return true;

        return false;
    },

    // load config
    loadInfo: function () {
        var url = URL_SERVICES;
        var packageName = fr.platformWrapper.getPackageName() || "";
        var os = "";
        if (cc.sys.os === cc.sys.OS_IOS) {
            os = "apple";
        } else {
            os = "google";
        }
        url = StringUtility.replaceAll(url,"_OS_",os);
        url = StringUtility.replaceAll(url,"_PACK_",packageName);

        if(platformMgr.isIOS()) {
            // this.setConfig(IAP_APPLE_CONFIG, true);
            this.requestJsonGet(url, this.responseInfo.bind(this));
        }
        else {
            cc.log("##Portal::Load Payment Info " + url);
            this.requestJsonGet(url, this.responseInfo.bind(this));
        }
    },

    loadCacheInfo : function () {
        var sCache = null;
        try {
            cc.sys.localStorage.setItem(PMPK_INFO_CONFIG_KEY, JSON.stringify(IAP_GAME_CONFIG));
            sCache = cc.sys.localStorage.getItem(PMPK_INFO_CONFIG_KEY);
            cc.log("##Portal::cacheConfig " + sCache);
            sCache = JSON.parse(sCache);
            if(sCache)
                this.setConfig(sCache);
        }
        catch(e) {
            cc.log("##Portal::cannot parse cache " + e);
        }
    },

    saveCacheInfo : function () {
        try {
            var txt = JSON.stringify(this.config);
            cc.sys.localStorage.setItem(PMPK_INFO_CONFIG_KEY, txt);
        }
        catch(e) {

        }
    },

    responseInfo : function (result, response) {
        if (result && (response.error == 0 || response.error == null)) {
            this.setConfig(response, true);
            paymentMgr.openIAP();
        }
        else {
            if(this.isServerConfig) return;

            if(this.nRetry > 0 && portalMgr.isPortal()) {
                this.nRetry--;
                this.loadInfo();
            }
            else {
                if(!this.isConfig) {
                    if(portalMgr.isPortal())
                        this.setConfig(IAP_PORTAL_CONFIG, true);
                    else
                        this.setConfig(IAP_GAME_CONFIG, true);
                }
                paymentMgr.openIAP();
            }
        }
    },

    setConfig: function (config, isSave) {
        cc.log("##Portal::setConfig " + JSON.stringify(config) + "|" + isSave);

        this.isConfig = true;
        this.isServerConfig = isSave;
        this.config = config;
        if (isSave && this.config) {
            this.saveCacheInfo();
        }
        // Dang Test tam
        this.unloadLicenseKey();
    },

    openIAP : function () {
        return;
        cc.log("fr.paymentInfo.openIAP ", this.isServerConfig, this.nRetry);
        if(GameClient.getInstance().connectState == ConnectState.CONNECTED) {
            if(this.isServerConfig || this.nRetry <= 0 || !portalMgr.isPortal()) {
                fr.googleIap.init();
            }
        }
    },

    // ios iap
    setPackages : function (packages) {
        if(this.isPortalDefault()) return;

        if(this.config) {
            this.config.packages = packages;
            cc.log("PaymentInfo::setPackages " + JSON.stringify(this.config));
        }
    },

    isPortalDefault : function () {
        return false;
    },

    // get package id
    getProductID: function (pkgKey) {
        var packages;
        if (this.config)
            packages = this.config.packages;
        if (this.config && packages && pkgKey in packages) {
            return packages[pkgKey];
        }
        return pkgKey;
    },

    getAllProductsID: function() {
        var ar = "";
        if(fr.paymentInfo && fr.paymentInfo.config) {
            var packages = fr.paymentInfo.config.packages;
            if(packages) {
                for(var s in packages) {
                    ar = packages[s] + ",";
                }
            }
        }
        return ar;
    },

    // get base64 api
    getLicenseKey: function () {
        if (this.config) {
            return this.config.license_key;
        }
        return "";
    },

    unloadLicenseKey: function () {
        if (this.config && this.config.license_key != null && this.config.license_key != "") {
            this.config.license_key = this.decodeXOR(this.config.license_key, "g$n_secret_n0!");
        }
    },

    // services and decode
    xmlHttpRequestGet: function (urlRequest, callbackFunc) {
        var timeout = setTimeout(function () {
            cc.log("xmlHttpRequestGet:request time out");
            if (callbackFunc != undefined) {
                callbackFunc(false, "Request time out!");
            }
        }, 10000);

        var callBack = function (result, data) {
            clearTimeout(timeout);
            if (callbackFunc != undefined) {
                callbackFunc(result, data);
            }
        };
        var xhr = cc.loader.getXMLHttpRequest();
        xhr.onreadystatechange = function () {
            if (xhr.readyState == 4 && (xhr.status >= 200 && xhr.status <= 207)) {
                callBack(true, xhr.responseText);
            } else {
                if (!cc.sys.isNative && (xhr.status == 200 || xhr.status == 0)) {
                    return;
                }
                callBack(false, "error: " + xhr.readyState + "," + xhr.status);
            }
        };
        xhr.onerror = function () {
            cc.log("Request error!");
            callBack(false, "onerror");
        };
        xhr.ontimeout = function () {
            cc.log("Request time out!");
            callBack(false, "ontimeout");
        };
        xhr.onabort = function () {
            cc.log("Request aborted!");
            callBack(false, "ontimeout");
        };
        xhr.timeout = 10000;
        xhr.open("GET", urlRequest, true);
        xhr.send();
    },

    requestJsonGet: function (urlRequest, callbackFunc) {
        this.xmlHttpRequestGet(urlRequest, function (result, response) {
            if (result) {
                var data = JSON.parse(response);
                cc.log("##Portal::ServicesResponse  " + response);
                if (data) {
                    callbackFunc(true, data);
                } else {
                    callbackFunc(false, "parse error: " + urlRequest + " : " + response);
                }
            } else {
                callbackFunc(false, response);
            }
        });
    },

    // decode base 64
    decodeXOR: function (data, key) {
        data = this.b64_decode(data);
        return this.xor_decrypt(key, data);
    },

    b64_decode: function (data) {
        var o1, o2, o3, h1, h2, h3, h4, bits, i = 0, result = [];
        if (!data) {
            return data;
        }
        data += "";
        do {
            h1 = B64_TABLE.indexOf(data.charAt(i++));
            h2 = B64_TABLE.indexOf(data.charAt(i++));
            h3 = B64_TABLE.indexOf(data.charAt(i++));
            h4 = B64_TABLE.indexOf(data.charAt(i++));
            bits = h1 << 18 | h2 << 12 | h3 << 6 | h4;
            o1 = bits >> 16 & 0xff;
            o2 = bits >> 8 & 0xff;
            o3 = bits & 0xff;
            result.push(o1);
            if (h3 !== 64) {
                result.push(o2);
                if (h4 !== 64) {
                    result.push(o3);
                }
            }
        } while (i < data.length);
        return result;
    },

    xor_decrypt: function (key, data) {
        var self = this;
        var str = "";
        for (var i = 0; i < data.length; i++) {
            str += String.fromCharCode(data[i] ^ self.keyCharAt(key, i));
        }
        return str;
    },

    keyCharAt: function (key, i) {
        return key.charCodeAt(Math.floor(i % key.length));
    },
};

fr.portalState = {
    init:function() {
        this.loadState();
    },

    getDataPath:function() {
        return jsb.fileUtils.getWritablePath() + "/portal_state";
    },

    loadState:function() {
        var txt = jsb.fileUtils.getStringFromFile(this.getDataPath());

        if(txt == "" || txt == undefined) {
            this._state = {};
        }
        else {
            try {
                this._state = JSON.parse(txt);
            }
            catch(e){

            }
        }
        if(!this._state)
        {
            this._state = {}
        }
    },

    saveState:function() {
        var data = JSON.stringify(this._state);
        jsb.fileUtils.writeStringToFile(data, this.getDataPath());
    },

    setRequireLogout:function(isNeedLogout) {
        this._state.isNeedLogout = isNeedLogout;
        this.saveState();
    },

    isRequireLogout:function() {
        return this._state.isNeedLogout;
    },
    getAccessToken:function()
    {
        return this._state.accessToken
    }
};