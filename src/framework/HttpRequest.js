/**
 * Created by AnhLMT on 8/4/2020.
 */
var HttpRequest = {
    STATE: {
        SUCCESS: 1,
        FAIL: 2,
        ERROR: 3
    },
    getReturnXHR: function (url, callback) {
        var xhr = cc.loader.getXMLHttpRequest();
        xhr.onreadystatechange = function () {
            if (xhr.responseText) {
                if (4 == xhr.readyState && 200 == xhr.status) {
                    cc.log(url + " ResponseText \x3d " + xhr.responseText);
                    callback && callback(HttpRequest.STATE.SUCCESS, xhr);
                } else callback && callback(HttpRequest.STATE.FAIL, xhr);
            }
        }
        xhr.ontimeout = function () {
            cc.log(" ON TIME OUT");
            callback && callback(HttpRequest.STATE.ERROR, xhr);
        }
        xhr.onerror = function () {
            cc.log(" ON ERROR");
            callback && callback(HttpRequest.STATE.ERROR, xhr);
        }
        xhr.timeout = 5e3;
        xhr.open("GET", url, true);
        xhr.setRequestHeader("Content-Type", "application/json; charset\x3dUTF-8");
        xhr.send();
    }
}