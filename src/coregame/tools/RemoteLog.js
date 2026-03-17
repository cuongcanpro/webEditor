/**
 * RemoteLog.js
 * Lightweight remote logger — sends explicit log calls to a local HTTP server
 * so output can be read in a terminal without the native console window.
 *
 * Does NOT touch cc.log / cc.warn / cc.error.  Only messages sent via
 * CoreGame.RemoteLog.log() / .warn() / .error() are forwarded.
 *
 * Setup:
 *   1. Run:  python3 log_server.py          (in GameClientJS/)
 *   2. This file is already listed in project.json
 *
 * Server endpoint (default):  POST http://127.0.0.1:9999/log
 * Body: { "msg": "<text>", "level": "LOG|WARN|ERROR" }
 */
var CoreGame = CoreGame || {};

CoreGame.RemoteLog = (function () {

    var SERVER_URL = "http://127.0.0.1:9999/log";
    var _enabled = true;
    var _queue = [];
    var _sending = false;

    // -----------------------------------------------------------------------
    // Internal XHR sender — async, queued
    // -----------------------------------------------------------------------
    function _send(msg, level) {
        cc.log("RemoteLog:", level, msg);
        if (!_enabled) {
            return;
        }
        _queue.push({ msg: String(msg), level: level || "LOG" });
        _flush();
    }

    function _flush() {
        if (_sending || _queue.length === 0) {
            return;
        }
        var entry = _queue.shift();
        _sending = true;

        try {
            var xhr = new XMLHttpRequest();
            xhr.open("POST", SERVER_URL, true);   // true = async
            xhr.setRequestHeader("Content-Type", "application/json");
            xhr.onreadystatechange = function () {
                if (xhr.readyState === 4) {
                    _sending = false;
                    _flush();
                }
            };
            xhr.onerror = function () {
                _sending = false;
                if (_queue.length > 20) _enabled = false;
                _flush();
            };
            xhr.send(JSON.stringify(entry));
        } catch (e) {
            _sending = false;
            _enabled = false;
        }
    }

    // -----------------------------------------------------------------------
    // Public API
    // -----------------------------------------------------------------------
    return {
        setUrl: function (url) { SERVER_URL = url; },
        setEnabled: function (v) { _enabled = !!v; },

        log: function (msg) { _send(msg, "LOG"); },
        warn: function (msg) { _send(msg, "WARN"); },
        error: function (msg) { _send(msg, "ERROR"); }
    };

})();
