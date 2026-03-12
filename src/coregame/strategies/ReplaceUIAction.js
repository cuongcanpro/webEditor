/**
 * ReplaceUIAction - Strategy to replace an element's UI with a CustomElementUI
 */
var CoreGame = CoreGame || {};
CoreGame.Strategies = CoreGame.Strategies || {};

CoreGame.Strategies.ReplaceUIAction = CoreGame.Strategies.NormalAction.extend({
    configData: {
        path: "", // Path to Cocos Studio JSON file
        defaultAnim: "idle"
    },

    ctor: function () {
        this._super();
    },

    /**
     * Execute action
     * @param {ElementObject} element - The element instance
     * @param {Object} context - Context data for execution
     */
    execute: function (element, context, time) {
        if (!element || !this.configData.path) return;

        // Skip if path is already loaded
        if (element.ui && element.ui instanceof CoreGame.CustomElementUI && element.ui.jsonPath === this.configData.path) {
            return;
        }

        var self = this;
        var replaceFunc = function () {
            var jsonPath = self.configData.path;
            var parent = null;
            var zOrder = element.layerBehavior || 0;

            // Cleanup existing UI if it exists
            if (element.ui) {
                parent = element.ui.getParent();
                zOrder = element.ui.getLocalZOrder();
                element.ui.removeFromParent(true);
                element.ui = null;
            }

            // If no parent found (maybe element didn't have UI yet), try board root
            if (!parent && element.boardMgr && element.boardMgr.boardUI) {
                parent = element.boardMgr.boardUI.root;
            }

            if (parent) {
                // Create and assign new CustomElementUI
                var newUI = new CoreGame.CustomElementUI(element, jsonPath);
                element.ui = newUI;

                // Add to parent with previous z-order
                parent.addChild(newUI, zOrder);

                // Update position and visual state
                element.updateVisualPosition();
                element.updateVisual();
                element.initSubUI();
                if (self.configData.defaultAnim)
                    element.ui.playAnimation(self.configData.defaultAnim);
                else
                    element.ui.playAnimation("idle");
                cc.log("ReplaceUIAction: Replaced UI for element at [" + element.position.x + ", " + element.position.y + "] with " + jsonPath);
            }
        };

        if (time && time > 0 && element.ui) {
            element.ui.runAction(cc.sequence(
                cc.delayTime(time),
                cc.callFunc(replaceFunc)
            ));
        } else {
            replaceFunc();
        }
    }
});
