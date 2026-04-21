/**
 * @file StorageUtil.js
 * All functions that are related to device's local storage
 */

const StorageUtil = function() {};

/**
 * @param {string} key key to search for value
 * @param {number} [value=0] default value to return if key not found
 * @return {number}
 */
StorageUtil.getInt = function (key, value=0) {
    if (key == null) return value;

    let raw = cc.sys.localStorage.getItem(key);

    if (raw == null || raw === "") return value;
    let val = parseInt(raw);

    return Number.isNaN(val) ? value : val;
};

/**
 * @param {string} key
 * @param {number} value
 */
StorageUtil.setInt = function (key, value) {
    if (value === undefined) return;

    cc.sys.localStorage.setItem(key, String(value));
};

/**
 * @param {string} key key to search for value
 * @param {number} [value=0] default value to return if key not found
 * @return {number}
 */
StorageUtil.getFloat = function (key, value=0) {
    if (value === undefined) value = 0;
    if (key == null) return value;

    let raw = cc.sys.localStorage.getItem(key);

    if (raw == null || raw === "") return value;
    let val = parseFloat(raw);

    return Number.isNaN(val) ? value : val;
};

/**
 * @param {string} key
 * @param {number} value
 */
StorageUtil.setFloat = function (key, value) {
    if (value === undefined) return;

    cc.sys.localStorage.setItem(key, String(value));
};

/**
 * @param {string} key key to search for value
 * @param {string} [value=""] default value to return if key not found
 * @return {string}
 */
StorageUtil.getString = function (key, value="") {
    if (key == null) return value;

    let raw = cc.sys.localStorage.getItem(key);
    if (raw == null) return value;

    return raw;
};

/**
 * @param {string} key
 * @param {string} value
 */
StorageUtil.setString = function (key, value) {
    if (value === undefined) return;

    cc.sys.localStorage.setItem(key, value);
};

/**
 * @param {string} key key to search for value
 * @param {boolean} [value=false] default value to return if key not found
 * @return {boolean}
 */
StorageUtil.getBool = function (key, value=false) {
    if (key == null) return value;

    return StorageUtil.getInt(key, value ? 1 : 0) === 1;
};

/**
 * @param {string} key
 * @param {boolean} value
 */
StorageUtil.setBool = function (key, value) {
    if (value === undefined) return;

    StorageUtil.setInt(key, value ? 1 : 0);
};

/**
 * @param {string} key
 */
StorageUtil.remove = function (key) {
    try {
        cc.sys.localStorage.removeItem(key);
    }
    catch(e) {}
}

StorageUtil.clear = function () {
    cc.sys.localStorage.clear();
};