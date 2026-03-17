/**
 * ReplaceSelfAction - Strategy to replace the element with another type
 * Part of Match-3 Core Game
 */
var CoreGame = CoreGame || {};
CoreGame.Strategies = CoreGame.Strategies || {};

CoreGame.Strategies.ReplaceSelfAction = CoreGame.Strategies.NormalAction.extend({
    configData: {
        type: 0 // can be an ID or an array of IDs
    },

    ctor: function () {
        this._super();
    },

    checkCondition: function (element, context) {
        return true;
    },

    execute: function (element, context, time) {
        cc.log("Execute ReplaceSelfAction");
        this._super(element, context);

        if (!element.boardMgr) return;

        var boardMgr = element.boardMgr;
        var typeConfig = this.configData.type;

        var delayTime = Math.max(0, time);

        CoreGame.TimedActionMgr.addAction(delayTime, function () {
            var targetType = 0;
            if (Array.isArray(typeConfig) && typeConfig.length > 0) {
                targetType = typeConfig[boardMgr.random.nextInt32Bound(typeConfig.length)];
            } else {
                targetType = typeConfig;
            }

            // Create template element to steal properties, actions and UI
            var templateElem = null;
            if (CoreGame.ElementObject.map[targetType]) {
                templateElem = CoreGame.ElementObject.create(-1, -1, targetType);
            } else {
                templateElem = CoreGame.BlockerFactory.createBlocker(-1, -1, targetType, element.hitPoints);
            }

            if (templateElem) {
                var oldLayerBehavior = element.layerBehavior;

                // 1. Clear old actions and event listeners
                element.clearAllEvents();
                element.actions = {};

                // 2. Copy properties
                element.type = targetType;
                element.rawConfig = templateElem.rawConfig;
                element.configData = templateElem.configData;
                element.size = templateElem.size;
                element.layerBehavior = templateElem.layerBehavior;
                element.haveBaseAction = templateElem.haveBaseAction ? templateElem.haveBaseAction.slice() : [1, 1, 1, 1];
                element.blockBaseAction = templateElem.blockBaseAction ? templateElem.blockBaseAction.slice() : [0, 0, 0, 0];

                // Remove Old UI before doing anything that might recreate it
                if (element.ui) {
                    element.ui.removeFromParent(true);
                    element.ui = null;
                }

                // 2.5 Handle Layer Change in Logic
                if (oldLayerBehavior !== element.layerBehavior) {
                    cc.log("ReplaceSelfAction: layerBehavior changed from", oldLayerBehavior, "to", element.layerBehavior);

                    // Unregister from old setup
                    if (oldLayerBehavior === CoreGame.LayerBehavior.OVERLAY) {
                        if (element.holder) {
                            element.holder.removeAttachment(element);
                        }
                    } else {
                        boardMgr.removeElementFromBoard(element);
                    }

                    // Register to new setup using boardMgr.addElement
                    // Note: This ALSO recreates the UI via addElementAvatar!
                    boardMgr.addElement(element);
                } else {
                    // Need to recreate UI since we deleted it above
                    boardMgr.boardUI.addElementAvatar(element);
                }

                // 3. Recreate action strategies
                if (element.rawConfig && element.rawConfig.customAction) {
                    for (var actionType in element.rawConfig.customAction) {
                        var actionList = element.rawConfig.customAction[actionType];
                        if (Array.isArray(actionList)) {
                            for (var i = 0; i < actionList.length; i++) {
                                var actionData = actionList[i];
                                var actionName = (typeof actionData === 'string') ? actionData : (actionData && actionData.name);
                                var actionConfig = (typeof actionData === 'object') ? actionData.config : null;

                                if (!actionName) continue;

                                var ActionClass = CoreGame.Strategies[actionName] || CoreGame[actionName] || (typeof window !== 'undefined' ? window[actionName] : null);
                                if (ActionClass) {
                                    var actionInstance = new ActionClass(element);
                                    if (actionConfig) actionInstance.setConfigData(actionConfig);
                                    element.addAction(actionType, actionInstance);
                                }
                            }
                        }
                    }
                }

                element.updateVisual();
            }
        }, this);
    }
});
