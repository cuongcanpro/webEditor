// src/config/ABTestMgr.js
// A/B Test manager — GrowthBook-compatible deterministic bucketing.
// Matches the GrowthBook JS SDK hashing algorithm exactly:
//   hashVersion 1: fnv32a(value + seed) % 1000  / 1000
//   hashVersion 2: fnv32a(fnv32a(seed + value) + "") % 10000 / 10000
// Coverage uses bucket-range approach (same as SDK getBucketRanges).
//
// Features are loaded from local ABTestConfig.json (offline mode).
// Remote GrowthBook fetch is supported but disabled by default
// (remove "growthbook" key from config JSON to stay offline).

var ABTestMgr = cc.Class.extend({

    ctor: function () {
        this._features = {};
        this._userId = "10001";
        this._attributes = { id: "10001" };  // user attributes for condition matching
        this._gbConfig = null;   // { apiHost, clientKey }
        this._ready = false;     // true after GrowthBook fetch completes (or skipped)
        this._readyCbs = [];     // onReady callbacks
    },

    // ── public ──────────────────────────────────────────────────────────

    /**
     * Load local config, restore cache, then optionally fetch from GrowthBook.
     * @param {string} configPath  path to ABTestConfig.json (relative to assets)
     */
    init: function (configPath) {
        this._loadLocal(configPath);
        this._loadCache();

        if (this._gbConfig && this._gbConfig.clientKey) {
            this._fetchGrowthBook();
        } else {
            this._setReady();
        }
    },

    /**
     * Register a callback to be called when GrowthBook features are loaded.
     * If already ready, callback fires immediately.
     * @param {function} cb
     */
    onReady: function (cb) {
        if (typeof cb !== "function") return;
        if (this._ready) {
            cb();
        } else {
            this._readyCbs.push(cb);
        }
    },

    /**
     * @returns {boolean} true if GrowthBook fetch has completed (or was skipped)
     */
    isReady: function () {
        return this._ready;
    },

    /**
     * Update user ID used for bucketing.  Call after login.
     * @param {string} userId
     */
    setUserId: function (userId) {
        this._userId = String(userId);
        this._attributes.id = this._userId;
        this._attributes.userId = this._userId;
        cc.log("[ABTest] userId set to", this._userId);

        // Track cutscene A/B group via ZPTracker
        try {
            var cutsceneGroup = this.isCutsceneEnabled() ? "on" : "off";
            cc.log("[ABTest] logging cutscene group to tracker:", userId, " - ", cutsceneGroup);
            fr.tracker.logABTesting(this._userId, "", "cutscene", cutsceneGroup);
        } catch (e) {
            cc.warn("[ABTest] logABTesting error", e);
        }
    },

    /**
     * Set user attributes for condition matching.
     * Merges into existing attributes.  Common keys: id, platform, country, etc.
     * @param {Object} attrs  e.g. { platform: "android", country: "VN" }
     */
    setAttributes: function (attrs) {
        if (!attrs) return;
        for (var key in attrs) {
            if (attrs.hasOwnProperty(key)) {
                this._attributes[key] = attrs[key];
            }
        }
        // keep userId in sync
        if (attrs.id !== undefined) {
            this._userId = String(attrs.id);
        }
    },

    /**
     * Get the variant value for a feature.
     * @param {string}  featureKey   e.g. "cutscene"
     * @param {*}       defaultValue returned when feature is undefined
     * @returns {*} variant value
     */
    getValue: function (featureKey, defaultValue) {
        var result = this._evalFeature(featureKey);
        return (result !== undefined) ? result : defaultValue;
    },

    /**
     * Shorthand for boolean features.
     * @param {string} featureKey
     * @returns {boolean}
     */
    isOn: function (featureKey) {
        return !!this.getValue(featureKey, false);
    },

    // ── utilities ───────────────────────────────────────────────────────

    isCutsceneEnabled: function () {
        cc.log("A/B TESTING isCutsceneEnabled", this._userId);
        cc.log("A/B TESTING isCutsceneEnabled", this.getValue("cutscene", "off") === "on");
        if (Config.ENABLE_CHEAT) {
            return true;
        }
        
        return this.getValue("cutscene", "off") === "on";
    },

    // ── evaluation ──────────────────────────────────────────────────────

    _evalFeature: function (featureKey) {
        var feature = this._features[featureKey];
        if (!feature) return undefined;

        var rules = feature.rules;
        if (rules && rules.length) {
            for (var i = 0; i < rules.length; i++) {
                var rule = rules[i];

                // Optional condition filter (simple attribute matching)
                if (rule.condition && !this._matchCondition(rule.condition)) {
                    continue;
                }

                // Force value (no bucketing needed)
                if (rule.force !== undefined) {
                    return rule.force;
                }

                var variations = rule.variations;
                var weights = rule.weights;
                if (!variations || !variations.length || !weights || !weights.length) {
                    continue;
                }

                var seed = rule.seed || featureKey;
                var hashVersion = rule.hashVersion || 1;
                var hashAttr = rule.hashAttribute || "id";
                var hashValue = String(this._attributes[hashAttr] || this._userId);
                var n = this._hash(seed, hashValue, hashVersion);
                if (n === null) continue;

                // Build bucket ranges (same as SDK getBucketRanges)
                var coverage = (rule.coverage !== undefined) ? rule.coverage : 1;
                var ranges = this._getBucketRanges(variations.length, coverage, weights);

                var idx = this._chooseVariation(n, ranges);
                if (idx >= 0 && idx < variations.length) {
                    return variations[idx];
                }
                // idx === -1 means user not in experiment (coverage gap) → skip rule
            }
        }

        return feature.defaultValue;
    },

    /**
     * GrowthBook-compatible condition matching (MongoDB query subset).
     * Supports: equality, $in, $nin, $ne, $eq, $gt, $gte, $lt, $lte,
     *           $exists, $regex, $not, $or, $and, $nor.
     * @param {Object} condition  e.g. {"platform":"android"} or {"id":{"$in":["1","2"]}}
     * @returns {boolean}
     */
    _matchCondition: function (condition) {
        return this._evalCondition(this._attributes, condition);
    },

    _evalCondition: function (attrs, condition) {
        if (!condition || typeof condition !== "object") return true;

        // Logical operators at top level
        if (condition["$or"]) {
            var orList = condition["$or"];
            for (var i = 0; i < orList.length; i++) {
                if (this._evalCondition(attrs, orList[i])) return true;
            }
            return false;
        }
        if (condition["$and"]) {
            var andList = condition["$and"];
            for (var i = 0; i < andList.length; i++) {
                if (!this._evalCondition(attrs, andList[i])) return false;
            }
            return true;
        }
        if (condition["$not"]) {
            return !this._evalCondition(attrs, condition["$not"]);
        }
        if (condition["$nor"]) {
            var norList = condition["$nor"];
            for (var i = 0; i < norList.length; i++) {
                if (this._evalCondition(attrs, norList[i])) return false;
            }
            return true;
        }

        // Attribute-level conditions: every key must pass
        for (var key in condition) {
            if (!condition.hasOwnProperty(key)) continue;
            if (key.charAt(0) === "$") continue; // already handled above

            var attrVal = attrs[key];
            var expected = condition[key];

            if (expected !== null && typeof expected === "object" && !(expected instanceof Array)) {
                // Operator object: { "$in": [...], "$gt": 5, ... }
                if (!this._evalOperators(attrVal, expected)) return false;
            } else {
                // Simple equality
                if (!this._valuesEqual(attrVal, expected)) return false;
            }
        }
        return true;
    },

    _evalOperators: function (attrVal, operators) {
        for (var op in operators) {
            if (!operators.hasOwnProperty(op)) continue;
            var target = operators[op];

            switch (op) {
                case "$eq":
                    if (!this._valuesEqual(attrVal, target)) return false;
                    break;
                case "$ne":
                    if (this._valuesEqual(attrVal, target)) return false;
                    break;
                case "$in":
                    if (!this._isIn(attrVal, target)) return false;
                    break;
                case "$nin":
                    if (this._isIn(attrVal, target)) return false;
                    break;
                case "$gt":
                    if (!(attrVal > target)) return false;
                    break;
                case "$gte":
                    if (!(attrVal >= target)) return false;
                    break;
                case "$lt":
                    if (!(attrVal < target)) return false;
                    break;
                case "$lte":
                    if (!(attrVal <= target)) return false;
                    break;
                case "$exists":
                    var exists = (attrVal !== undefined && attrVal !== null);
                    if (target ? !exists : exists) return false;
                    break;
                case "$regex":
                    try {
                        if (!new RegExp(target).test(String(attrVal || ""))) return false;
                    } catch (e) { return false; }
                    break;
                case "$not":
                    if (this._evalOperators(attrVal, target)) return false;
                    break;
                default:
                    // Unknown operator — fail safe (do not match)
                    cc.warn("[ABTest] unknown condition operator: " + op);
                    return false;
            }
        }
        return true;
    },

    _valuesEqual: function (a, b) {
        if (a === b) return true;
        if (a == null || b == null) return false;
        return String(a) === String(b);
    },

    _isIn: function (val, arr) {
        if (!arr || !arr.length) return false;
        for (var i = 0; i < arr.length; i++) {
            if (this._valuesEqual(val, arr[i])) return true;
        }
        return false;
    },

    // ── hashing (GrowthBook SDK-compatible) ─────────────────────────────

    /**
     * GrowthBook-compatible hash function.
     * v1: fnv32a(value + seed)            % 1000  / 1000
     * v2: fnv32a(fnv32a(seed + value)+"") % 10000 / 10000  (double-hash)
     * @returns {number|null} bucket in [0, 1), or null if invalid version
     */
    _hash: function (seed, value, version) {
        if (version === 2) {
            // Double hash: hash once, convert to string, hash again
            var first = this._fnv32a(seed + value);
            var n = (this._fnv32a(first + "") % 10000) / 10000;
            return n;
        }
        if (version === 1) {
            var n = (this._fnv32a(value + seed) % 1000) / 1000;
            return n;
        }
        return null;
    },

    /**
     * Build bucket ranges from variations, coverage, and weights.
     * Matches GrowthBook SDK getBucketRanges() exactly.
     *
     * Example: 2 variations, weights [0.5, 0.5], coverage 0.8
     *   → [[0, 0.4], [0.5, 0.9]]
     *   gaps at 0.4-0.5 and 0.9-1.0 are excluded users
     *
     * @param {number}   numVariations
     * @param {number}   coverage  0.0 to 1.0
     * @param {number[]} weights   e.g. [0.5, 0.5]
     * @returns {Array<[number,number]>} bucket ranges
     */
    _getBucketRanges: function (numVariations, coverage, weights) {
        // Normalize weights to sum to 1
        var sum = 0;
        for (var i = 0; i < weights.length; i++) sum += weights[i];
        var normalizedWeights = [];
        for (var i = 0; i < numVariations; i++) {
            if (i < weights.length && sum > 0) {
                normalizedWeights.push(weights[i] / sum);
            } else {
                normalizedWeights.push(1 / numVariations);
            }
        }

        var cumulative = 0;
        var ranges = [];
        for (var i = 0; i < numVariations; i++) {
            var start = cumulative;
            cumulative += normalizedWeights[i];
            ranges.push([
                start,
                start + coverage * normalizedWeights[i]
            ]);
        }
        return ranges;
    },

    /**
     * Pick variation index from bucket ranges.
     * Matches GrowthBook SDK chooseVariation() exactly.
     *
     * @param {number}                n       hash bucket [0, 1)
     * @param {Array<[number,number]>} ranges  from _getBucketRanges
     * @returns {number} variation index, or -1 if not in any range
     */
    _chooseVariation: function (n, ranges) {
        for (var i = 0; i < ranges.length; i++) {
            if (n >= ranges[i][0] && n < ranges[i][1]) {
                return i;
            }
        }
        return -1;
    },

    /**
     * FNV-1a 32-bit hash — matches GrowthBook SDK hashFnv32a().
     * Uses bit-shift multiplication (same as SDK source):
     *   hval += (hval<<1) + (hval<<4) + (hval<<7) + (hval<<8) + (hval<<24)
     * which is algebraically equivalent to hval *= 0x01000193.
     *
     * @param {string} str
     * @returns {number} unsigned 32-bit integer
     */
    _fnv32a: function (str) {
        var hval = 0x811c9dc5;
        var l = str.length;
        for (var i = 0; i < l; i++) {
            hval ^= str.charCodeAt(i);
            hval += (hval << 1) + (hval << 4) + (hval << 7) + (hval << 8) + (hval << 24);
        }
        return hval >>> 0;
    },

    // ── ready state ─────────────────────────────────────────────────────

    _setReady: function () {
        this._ready = true;
        for (var i = 0; i < this._readyCbs.length; i++) {
            try { this._readyCbs[i](); } catch (e) {
                cc.warn("[ABTest] onReady callback error", e);
            }
        }
        this._readyCbs = [];
    },

    // ── config loading ──────────────────────────────────────────────────

    _loadLocal: function (configPath) {
        try {
            var raw = jsb.fileUtils.getStringFromFile(configPath);
            if (raw) {
                var data = JSON.parse(raw);
                this._features = data.features || {};
                this._gbConfig = data.growthbook || null;

                var count = Object.keys(this._features).length;
                cc.log("[ABTest] loaded " + count + " features from local config");
            }
        } catch (e) {
            cc.warn("[ABTest] failed to load " + configPath, e);
        }
    },

    // ── local storage cache ─────────────────────────────────────────────

    _CACHE_KEY: "abtest_features_cache",

    _loadCache: function () {
        try {
            var raw = cc.sys.localStorage.getItem(this._CACHE_KEY);
            if (raw) {
                var cached = JSON.parse(raw);
                // Merge cached features (local JSON features take priority,
                // but cached GrowthBook features fill in anything missing)
                for (var key in cached) {
                    if (cached.hasOwnProperty(key) && !this._features[key]) {
                        this._features[key] = cached[key];
                    }
                }
                cc.log("[ABTest] restored " + Object.keys(cached).length + " features from cache");
            }
        } catch (e) {
            cc.warn("[ABTest] cache load failed", e);
        }
    },

    _saveCache: function (features) {
        try {
            cc.sys.localStorage.setItem(this._CACHE_KEY, JSON.stringify(features));
            cc.log("[ABTest] saved " + Object.keys(features).length + " features to cache");
        } catch (e) {
            cc.warn("[ABTest] cache save failed", e);
        }
    },

    // ── GrowthBook fetch ────────────────────────────────────────────────

    _fetchGrowthBook: function () {
        var self = this;
        var url = this._gbConfig.apiHost + "/api/features/" + this._gbConfig.clientKey;

        cc.log("[ABTest] fetching GrowthBook features from", url);

        var xhr = new XMLHttpRequest();
        xhr.open("GET", url, true);
        xhr.setRequestHeader("Accept", "application/json");
        xhr.onreadystatechange = function () {
            if (xhr.readyState !== 4) return;
            if (xhr.status === 200) {
                try {
                    var resp = JSON.parse(xhr.responseText);
                    var remote = resp.features || {};
                    // Merge: remote overrides local
                    for (var key in remote) {
                        if (remote.hasOwnProperty(key)) {
                            self._features[key] = remote[key];
                        }
                    }
                    var count = Object.keys(remote).length;
                    cc.log("[ABTest] merged " + count + " features from GrowthBook");

                    // Cache for next session
                    self._saveCache(remote);
                } catch (e) {
                    cc.warn("[ABTest] failed to parse GrowthBook response", e);
                }
            } else {
                cc.warn("[ABTest] GrowthBook fetch failed: HTTP " + xhr.status);
            }
            self._setReady();
        };
        xhr.send();
    }
});

// ── singleton ───────────────────────────────────────────────────────────
ABTestMgr._instance = null;
ABTestMgr.getInstance = function () {
    if (!ABTestMgr._instance) {
        ABTestMgr._instance = new ABTestMgr();
    }
    return ABTestMgr._instance;
};

// ── bootstrap ───────────────────────────────────────────────────────────
(function () {
    var mgr = ABTestMgr.getInstance();
    mgr.init("res/ABTestConfig.json");

    if (typeof window !== "undefined") {
        window.abTestMgr = mgr;
    } else {
        this.abTestMgr = mgr;
    }
})();
