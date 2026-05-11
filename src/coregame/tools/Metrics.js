/**
 * CoreGame.Metrics — generic metrics transport layer.
 *
 * Sends a flat payload to the LogServer via HTTP POST
 * and optionally forwards to the native analytics pipeline (ZPTracker).
 *
 * Usage:
 *   CoreGame.Metrics.send({ type: "tpp", level_id: 30, ... });
 */
var CoreGame = CoreGame || {};

CoreGame.Metrics = {
    URL: "https://m3new-alpha-log.service.zingplay.com/metrics",

    /** Session ID — generated once per app launch. */
    _sessionId: "s_" + Date.now() + "_" + Math.random().toString(36).substr(2, 6),

    /** Timestamp when Metrics module loaded (for cold-start measurement). */
    _loadTime: Date.now(),

    /** Heartbeat interval handle. */
    _heartbeatHandle: null,

    /** Level ID of the level currently being played (set at level_attempt_start). */
    _currentLevelId: 0,

    // ── Bulk queue ────────────────────────────────────────────────────────
    _queue: [],
    _FLUSH_INTERVAL: 2000,  // ms between auto-flushes
    _FLUSH_SIZE: 10,        // flush immediately when queue reaches this size
    _flushHandle: null,

    /** @returns {string} device ID or empty string */
    _getDeviceId: function () {
        try { return fr.platformWrapper ? fr.platformWrapper.getDeviceID() : ""; }
        catch (e) { return ""; }
    },

    /** @returns {string} current user ID or empty string */
    _getUserId: function () {
        try { return userMgr.getData().uId || ""; }
        catch (e) { return ""; }
    },

    /** @returns {string} app version string */
    _getAppVersion: function () {
        try { return gameMgr.getVersionString() || ""; }
        catch (e) { return ""; }
    },

    /** @returns {string} app package name */
    _getPackageName: function () {
        try { return gameMgr.getPackageName() || ""; }
        catch (e) { return ""; }
    },

    /** @returns {string} build name from GeneralConfig */
    _getBuildName: function () {
        try { return generalConfig.getBuildName() || ""; }
        catch (e) { return ""; }
    },

    /** @returns {string} device locale (e.g. "en", "vi") */
    _getLocale: function () {
        try { return cc.sys.language || ""; }
        catch (e) { return ""; }
    },

    /** @returns {number} current gold balance */
    _getGold: function () {
        try { return userMgr.getData().getGold() || 0; }
        catch (e) { return 0; }
    },

    /** @returns {number} current lives count */
    _getLives: function () {
        try { return userMgr.getHeartWithUpdate(); }
        catch (e) { return 0; }
    },

    /** @returns {number} current max level */
    _getMaxLevel: function () {
        try { return userMgr.getData().getLevel() || 0; }
        catch (e) { return 0; }
    },

    /**
     * Build standard prefix fields for all events.
     * Spec: {userId, deviceId, ts, appVersion, cohortId, currentLevel}
     */
    _buildPrefix: function () {
        return {
            device_id: this._getDeviceId(),
            user_id: this._getUserId(),
            session_id: this._sessionId,
            app_version: this._getAppVersion(),
            package_name: this._getPackageName(),
            build_name: this._getBuildName(),
            locale: this._getLocale(),
            current_level: this._getMaxLevel(),
            timestamp: Date.now()
        };
    },

    /** Start periodic heartbeat (call once after login). */
    startHeartbeat: function () {
        if (this._heartbeatHandle) return;
        var self = this;
        this._heartbeatHandle = setInterval(function () {
            var p = self._buildPrefix();
            p.type = "heartbeat";
            p.gold_balance = self._getGold();
            p.lives = self._getLives();
            p.max_level = self._getMaxLevel();
            self.send(p);
        }, 60000);
    },

    /**
     * Queue a metrics payload for bulk sending.
     * Flushes automatically every _FLUSH_INTERVAL ms or when queue hits _FLUSH_SIZE.
     * @param {Object} payload  Flat key-value object (must include "type")
     */
    send: function (payload) {
        this._queue.push(payload);

        // Native analytics pipeline — dispatch immediately (not batched)
        try {
            if (fr.tracker && payload.type === "tpp") {
                fr.tracker.logTPPMetrics(payload);
            }
        } catch (e) { }

        // Start auto-flush timer on first enqueue
        if (!this._flushHandle) {
            var self = this;
            this._flushHandle = setInterval(function () { self._flush(); }, this._FLUSH_INTERVAL);
        }

        // Flush immediately if queue is full
        if (this._queue.length >= this._FLUSH_SIZE) {
            this._flush();
        }
    },

    /**
     * Flush queued payloads to LogServer in a single HTTP POST.
     * Safe to call anytime — no-op if queue is empty.
     */
    _flush: function () {
        if (this._queue.length === 0) return;

        var batch = this._queue;
        this._queue = [];

        try {
            fr.Network.xmlHttpRequestPost(this.URL, batch, function (result) {
                cc.log("[Metrics] flush " + batch.length + " events →",
                       result ? "OK" : "FAIL");
            });
        } catch (e) {
            cc.log("[Metrics] flush error:", e);
        }
    }
};
