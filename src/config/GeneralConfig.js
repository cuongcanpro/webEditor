// src/config/GeneralConfig.js
// Loads GeneralFeatureConfig.json and exposes isActiveXxx() helpers.
var GeneralConfig = cc.Class.extend({

    ctor: function (data) {
        this._data = data || {};
    },

    _isActive: function (key) {
        return !!(this._data[key] && this._data[key].active);
    },

    isActiveChallengeRoom: function () {
        return this._isActive("ChallengeRoom");
    },

    isActiveAI: function () {
        return this._isActive("AI");
    },

    getBuildName: function () {
        return this._data.BuildName || "";
    },
});

// ── Bootstrap ──────────────────────────────────────────────────────────────
// Load GeneralFeatureConfig.json at startup and expose as global `generalConfig`.
(function () {
    var CONFIG_PATH = "res/GeneralFeatureConfig.json";
    var rawData = {};

    try {
        var raw = jsb.fileUtils.getStringFromFile(CONFIG_PATH);
        if (raw) {
            rawData = JSON.parse(raw) || {};
        }
    } catch (e) {
        cc.warn("GeneralConfig: failed to load " + CONFIG_PATH, e);
    }

    var generalConfig = new GeneralConfig(rawData);

    // Expose globally so other modules can use generalConfig.isActiveXxx()
    if (typeof window !== "undefined") {
        window.generalConfig = generalConfig;
    } else {
        // JSB / native environment — assign to global scope directly
        this.generalConfig = generalConfig;
    }
    cc.log("GeneralConfig loaded. ChallengeRoom active:", generalConfig.isActiveChallengeRoom(), "AI active:", generalConfig.isActiveAI());
})();
