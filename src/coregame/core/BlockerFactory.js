/**
 * BlockerFactory - Factory class to create Blockers from configuration
 * Part of Match-3 Core Game
 */
var CoreGame = CoreGame || {};

CoreGame.BlockerFactory = cc.Class.extend({
    ctor: function () {
        // Singleton pattern or just normal class
    }
});

// Config cache for synchronous access
CoreGame.BlockerFactory._configCache = {};

/**
 * Create a blocker using configuration from typeId
 * @param {number} row - Grid row
 * @param {number} col - Grid column
 * @param {number} typeId - The ID of the blocker (e.g. 1004)
 * @param {number} hp - The health of the blocker
 * @param {function} callback - Callback function(err, blocker)
 */
CoreGame.BlockerFactory.createBlocker = function (row, col, typeId, hp) {
    if (CoreGame.ElementObject.map[typeId]) {
        // Use standard creation for registered types
        return CoreGame.ElementObject.create(row, col, typeId, hp);
    }
    var config = CoreGame.BlockerFactory._configCache[typeId];

    if (!config) {
        cc.log("ERROR: Config for", typeId, "not preloaded. Call preloadConfig first.");
        return null;
    }


    // Determine class based on type (string)
    var blockerName = config.type;
    var BlockerClass = CoreGame[blockerName];
    if (!BlockerClass) {
        if (typeof window !== 'undefined' && window[blockerName])
            BlockerClass = window[blockerName];
    }

    // Create Instance
    var blocker = new BlockerClass();
    if (!blocker) {
        return null;
    }

    blocker.configData = config.configData;
    blocker.rawConfig = config;

    // Initialize with default HP
    blocker.init.apply(blocker, arguments);

    // Set Size
    if (config.width !== undefined && config.height !== undefined) {
        blocker.size = cc.size(config.width, config.height);
    }

    // Set Layer Behavior
    if (config.layerBehavior) {
        var layerBehaviorMap = {
            "CONTENT": CoreGame.LayerBehavior.CONTENT,
            "OVERLAY": CoreGame.LayerBehavior.OVERLAY,
            "EXCLUSIVE": CoreGame.LayerBehavior.EXCLUSIVE,
            "BACKGROUND": CoreGame.LayerBehavior.BACKGROUND
        };
        blocker.layerBehavior = layerBehaviorMap[config.layerBehavior] || CoreGame.LayerBehavior.CONTENT;
    }

    // Map baseAction to haveBaseAction array
    // Action enum: SWAP=0, MATCH=1, ACTIVE=2, DROP=3
    var actionNameToIndex = {
        "SWAP": CoreGame.ElementObject.Action.SWAP,
        "MATCH": CoreGame.ElementObject.Action.MATCH,
        "ACTIVE": CoreGame.ElementObject.Action.ACTIVE,
        "DROP": CoreGame.ElementObject.Action.DROP
    };

    // Initialize arrays (default: blocker has no base actions, blocks all)
    blocker.haveBaseAction = [0, 0, 0, 0];
    blocker.blockBaseAction = [1, 1, 1, 1];

    // Set haveBaseAction based on baseAction array
    if (config.baseAction && Array.isArray(config.baseAction)) {
        for (var i = 0; i < config.baseAction.length; i++) {
            var actionName = config.baseAction[i];
            var actionIndex = actionNameToIndex[actionName];
            if (actionIndex !== undefined) {
                blocker.haveBaseAction[actionIndex] = 1;
            }
        }
    }

    // Set blockBaseAction based on unblockAction array
    // unblockAction lists actions that should NOT be blocked (set to 0)
    if (config.unblockAction && Array.isArray(config.unblockAction)) {
        for (var i = 0; i < config.unblockAction.length; i++) {
            var actionName = config.unblockAction[i];
            var actionIndex = actionNameToIndex[actionName];
            if (actionIndex !== undefined) {
                blocker.blockBaseAction[actionIndex] = 0;
            }
        }
    }

    // Add Custom Actions
    if (config.customAction) {
        for (var actionType in config.customAction) {
            var actionList = config.customAction[actionType];
            if (Array.isArray(actionList)) {
                for (var i = 0; i < actionList.length; i++) {
                    var actionData = actionList[i];
                    var actionName = null;
                    var actionConfig = null;

                    // Check format: string or object
                    if (typeof actionData === 'string') {
                        // Old format: "ActionName"
                        actionName = actionData;
                    } else if (actionData && typeof actionData === 'object') {
                        // New format: { name: "ActionName", config: {...} }
                        actionName = actionData.name;
                        actionConfig = actionData.config;
                    }

                    if (!actionName) continue;

                    var ActionClass = CoreGame.Strategies[actionName];

                    // Fallback lookup if not in Strategies
                    if (!ActionClass) {
                        if (CoreGame[actionName]) ActionClass = CoreGame[actionName];
                        else if (typeof window !== 'undefined' && window[actionName]) ActionClass = window[actionName];
                    }

                    if (ActionClass) {
                        var actionInstance = new ActionClass(blocker);

                        // Set config data if available
                        if (actionConfig) {
                            actionInstance.setConfigData(actionConfig);
                        }

                        blocker.addAction(actionType, actionInstance);
                        cc.log("BlockerFactory: Added action", actionName, "to", actionType);
                    } else {
                        cc.log("BlockerFactory: Action class not found: " + actionName);
                    }
                }
            }
        }
    }

    cc.log("BlockerFactory created blocker:", typeId,
        "haveBaseAction:", blocker.haveBaseAction,
        "blockBaseAction:", blocker.blockBaseAction);
    return blocker;
};

/**
 * Ensure configs are preloaded. Calls `callback(failed)` when ready or immediately if already preloaded.
 * This is idempotent and queues callbacks while a preload is in progress.
 */
CoreGame.BlockerFactory.ensurePreloaded = function (callback) {
    if (CoreGame.BlockerFactory._isPreloaded) {
        if (callback) callback(null);
        return;
    }

    if (!CoreGame.BlockerFactory._preloadCallbacks) CoreGame.BlockerFactory._preloadCallbacks = [];
    if (callback) CoreGame.BlockerFactory._preloadCallbacks.push(callback);

    if (!CoreGame.BlockerFactory._isPreloading) {
        // Start preload; when done our preloadAllConfigs will call queued callbacks
        CoreGame.BlockerFactory.preloadAllConfigs(null, function (failed) {
            // Pass through failure list to queued callbacks (preloadAllConfigs already handles calling them)
        });
    }
};

/**
 * Preload blocker config for sync access
 * @param {number} typeId - The ID of the blocker
 * @param {function} callback - Callback when loaded
 */
CoreGame.BlockerFactory.preloadConfig = function (typeId, callback) {
    // Skip if already cached
    // if (CoreGame.BlockerFactory._configCache[typeId]) {
    //     cc.log("BlockerFactory: Config", typeId, "already cached, skipping");
    //     if (callback) callback(null, CoreGame.BlockerFactory._configCache[typeId]);
    //     return;
    // }

    var configFile = "res/newBlock/" + typeId + ".json";

    cc.loader.loadJson(configFile, function (err, config) {
        if (err) {
            cc.log("BlockerFactory: Error preloading config for", typeId);
            if (callback) callback(err);
            return;
        }

        // Cache the config
        CoreGame.BlockerFactory._configCache[typeId] = config;
        cc.log("BlockerFactory: Preloaded config for", typeId);

        if (callback) callback(null, config);
    });
};

/**
 * Preload all blocker configs from newBlock folder
 * @param {function} onProgress - Optional callback(loaded, total, typeId, success)
 * @param {function} onComplete - Callback(failed) when all configs loaded
 */
CoreGame.BlockerFactory.preloadAllConfigs = function (onProgress, onComplete) {
    // Reset config cache before preloading
    CoreGame.BlockerFactory._configCache = {};
    CoreGame.BlockerFactory._isPreloading = true;
    CoreGame.BlockerFactory._isPreloaded = false;

    // Load mapID.json to get list of all blocker type IDs
    cc.loader.loadJson("res/newBlock/mapID.json", function (err, mapData) {
        if (err) {
            cc.log("BlockerFactory: Failed to load mapID.json");
            if (onComplete) onComplete([]);
            return;
        }

        // Extract type IDs from mapID.json (values, not keys)
        var typeIds = [];
        for (var key in mapData) {
            if (mapData.hasOwnProperty(key)) {
                var id = mapData[key]; // Get the value (ID)
                if (typeof id === 'number' && !isNaN(id)) {
                    // Avoid duplicates
                    if (typeIds.indexOf(id) === -1) {
                        typeIds.push(id);
                    }
                }
            }
        }

        if (typeIds.length === 0) {
            cc.log("BlockerFactory: No blocker IDs found in mapID.json");
            if (onComplete) onComplete([]);
            return;
        }

        var total = typeIds.length;
        var loaded = 0;
        var failed = [];

        cc.log("BlockerFactory: Found", total, "blockers in mapID.json, preloading configs...");

        var loadNext = function (index) {
            if (index >= total) {
                // All done
                if (failed.length > 0) {
                    cc.log("BlockerFactory: Preload complete. Failed:", failed);
                } else {
                    cc.log("BlockerFactory: All", total, "configs preloaded successfully!");
                }
                CoreGame.BlockerFactory._isPreloading = false;
                CoreGame.BlockerFactory._isPreloaded = true;
                // Call any queued ensurePreloaded callbacks
                if (CoreGame.BlockerFactory._preloadCallbacks) {
                    for (var i = 0; i < CoreGame.BlockerFactory._preloadCallbacks.length; i++) {
                        try { CoreGame.BlockerFactory._preloadCallbacks[i](failed.length > 0 ? failed : null); } catch (e) { }
                    }
                    CoreGame.BlockerFactory._preloadCallbacks = [];
                }
                if (onComplete) onComplete(failed);
                return;
            }

            var typeId = typeIds[index];

            CoreGame.BlockerFactory.preloadConfig(typeId, function (err, config) {
                loaded++;

                if (err) {
                    failed.push(typeId);
                }

                // Progress callback
                if (onProgress) {
                    onProgress(loaded, total, typeId, err ? false : true);
                }

                // Load next (sequential to avoid resource loading issues)
                loadNext(index + 1);
            });
        };

        // Start loading
        loadNext(0);
    });
};
