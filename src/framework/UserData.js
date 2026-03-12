/**
 * Created by KienVN on 10/19/2015.
 */
fr.UserData = {

    getObjectFromKey: function (key, defaultValue) {
        var val = cc.sys.localStorage.getItem(key);
        if (val == null) return defaultValue;
        try {
            return JSON.parse(val);
        } catch (ex) {
            return defaultValue;
        }
    },
    setObjectFromKey:function( key, object) {
        cc.log('localStorage setObjectFromKey',key,object);
        cc.sys.localStorage.setItem(key, JSON.stringify(object));
    },

    getStringFromKey: function (key, defaultValue) {
        var val = cc.sys.localStorage.getItem(key);
        if(_.isNull(val)|| _.isNaN(val) || _.isEmpty(val))
            return defaultValue;
        else
            return val;
    },
    setStringFromKey:function(key, value) {
        win32.log("localStorage setStringFromKey: "+ key + " " + value);
        if (!_.isString(key)) throw Error("key isn't string key = " + key + ", value = " + value);
        if (_.isEmpty(key)) throw Error("Key is empty key = " + key + ", value = " + value);

        cc.sys.localStorage.setItem(key, value);
    },

    getNumberFromKey:function(key, defaultValue) {
        win32.log("getNumberFromKey: " + key);
        var val = cc.sys.localStorage.getItem(key);
        if(_.isNull(val)|| _.isNaN(val) || _.isEmpty(val) || _.isNaN(Number(val)))
            return defaultValue;
        else
            return Number(val);
    },
    setNumberFromKey:function(key, value) {
        win32.log("localStorage setNumberFromKey: "+ key + " " + value);
        if (!_.isString(key)) throw Error("key isn't string");
        if (_.isEmpty(key)) throw Error("Key is empty");
        if (_.isNaN(value) || _.isNaN(Number(value))) throw Error("value is isn't number");

        cc.sys.localStorage.setItem(key, value);
    },

    getBoolFromKey:function(key, defaultValue) {
        var val = cc.sys.localStorage.getItem(key);
        if(_.isNull(val)|| _.isNaN(val) || _.isEmpty(val))
            return defaultValue;
        else
        {
            var valBool = val == 1 ? true : false;
            return valBool;
        }
    },
    setBoolFromKey:function(key, value) {
        cc.log("localStorage setBoolFromKey key", key, "value", value);
        if (!_.isString(key)) throw Error("key isn't string");
        if (_.isEmpty(key)) throw Error("Key is empty");

        var numVal = value ? 1 : 0
        cc.sys.localStorage.setItem(key, numVal);
    },

    setStringWithCrypt:function(key, value) {
        cc.log("localStorage setStringWithCrypt key", key, "value", value);
        if (KEY_ENCRYPT == null) throw Error("setStringWithCrypt null key");
        if (!_.isString(key)) throw Error("key isn't string");
        if (_.isEmpty(key)) throw Error("Key is empty");
        if (!_.isString(value)) throw Error("value isn't string");
        value = value.toString();

        let encryptedString = CryptoJS.AES.encrypt(value, KEY_ENCRYPT).toString();
        cc.sys.localStorage.setItem(key, encryptedString);
    },
    getStringWithCrypt:function(key, defaultValue){
        if (!_.isString(key)) throw Error("key isn't string");
        if (_.isEmpty(key)) throw Error("key is empty");
        if (KEY_ENCRYPT == null) throw Error("getStringWithCrypt null key");

        cc.log("getStringWithCrypt key", key, "defaultValue", defaultValue);
        var val = cc.sys.localStorage.getItem(key);
        cc.log("val", val);

        if(_.isNull(val)|| _.isNaN(val) || _.isEmpty(val) || _.isUndefined(val))
            return defaultValue;
        else {
            let decrypt = CryptorAESUtils.decryptAES(val.toString(), KEY_ENCRYPT, key).toString(CryptoJS.enc.Utf8).toString();
            if(_.isNull(decrypt)|| _.isNaN(decrypt) || _.isEmpty(decrypt) || _.isUndefined(decrypt))
                return defaultValue;

            return decrypt;
        }
    },

    getNumberWithCrypt:function(key, defaultValue) {
        let val = this.getStringWithCrypt(key, defaultValue);
        if (val == defaultValue){
            return defaultValue;
        }
        if (isNaN(val)) throw Error("value can't be convert to number");
        return Number(val);
    },
    setNumberWithCrypt:function(key, value) {
        if (_.isNaN(value) || _.isNaN(Number(value))) throw Error("value is't number");

        this.setStringWithCrypt(key, value.toString());
    },

    removeDataWithKey: function (key) {
        cc.sys.localStorage.removeItem(key);
    },

    //------------------------------------------------------------------------------
    // add UId:
    _isValidUId: function(uId){
        cc.log("check uId: " + uId);
        if (_.isNumber(uId)) return true;
        if (_.isString(uId)){
            return !_.isEmpty(uId);
        }
        return false;
    },
    setNumberFromKeyByUId: function(uId, key, value){
        if (!this._isValidUId(uId)) throw Error("Invalid uid");
        key = key + uId.toString();
        return this.setNumberFromKey(key, value);
    },
    getNumberFromKeyByUId: function(uId, key, defaultValue){
        if (!this._isValidUId(uId)) throw Error("Invalid uid");
        key = key + uId.toString();
        return this.getNumberFromKey(key, defaultValue);
    },
    getStringFromKeyByUId: function (uId, key, defaultValue) {
        if (!this._isValidUId(uId)) throw Error("Invalid uid");
        key = key + uId.toString();
        return this.getStringFromKey(key, defaultValue);
    },
    setStringFromKeyByUId:function(uId, key, value) {
        if (!this._isValidUId(uId)) throw Error("Invalid uid");
        key = key + uId.toString();
        this.setStringFromKey(key, value);
    },
    setStringWithCryptByUId:function(uId, key, value) {
        if (!this._isValidUId(uId)) throw Error("Invalid uid");
        key = key + uId.toString();
        this.setStringWithCrypt(key, value);
    },
    setObjectWithCryptByUId:function(uId, key, value) {
        this.setStringWithCryptByUId(uId, key, JSON.stringify(value));
    },
    getStringWithCryptByUId:function(uId, key, defaultValue) {
        if (!this._isValidUId(uId)) throw Error("Invalid uid");
        key = key + uId.toString();
        return this.getStringWithCrypt(key, defaultValue);
    },
    getNumberWithCryptByUId:function(uId, key, defaultValue) {
        if (!this._isValidUId(uId)) throw Error("Invalid uid");
        key = key + uId.toString();
        return this.getNumberWithCrypt(key, defaultValue);
    },
    getObjectWithCryptByUId:function(uId, key, defaultValue) {
        let string = this.getStringWithCryptByUId(uId, key, defaultValue);
        return JSON.parse(string);
    },
    setNumberWithCryptByUId:function(uId, key, value) {
        if (!this._isValidUId(uId)) throw Error("Invalid uid");
        key = key + uId.toString();
        this.setStringWithCrypt(key, value.toString());
    },
    removeDataWithKeyByUId: function (uId, key) {
        if (!this._isValidUId(uId)) throw Error("Invalid uid");
        key = key + uId.toString();
        cc.sys.localStorage.removeItem(key);
    },
};