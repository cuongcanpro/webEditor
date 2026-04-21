/**
 * ActiveSwap - Swap that activates a power-up
 * Part of Match-3 Core Game
 */
var CoreGame = CoreGame || {};

CoreGame.ActiveSwap = CoreGame.LogicSwap.extend({

    ctor: function (boardMgr) {
        this._super(boardMgr);
    },

    /**
     * Check if this is a power-up activation swap
     */
    canSwap: function (element1, element2) {
        if (!this._super(element1, element2)) return false;

        // At least one must be a power-up
        var isPU1 = element1 instanceof CoreGame.PowerUP;
        var isPU2 = element2 instanceof CoreGame.PowerUP;

        // One power-up and one gem
        return (isPU1 && !isPU2) || (!isPU1 && isPU2);
    },

    /**
     * Perform power-up activation swap
     */
    swap: function (element1, element2) {
        if (!this.canSwap(element1, element2)) {
            return false;
        }

        this.element1 = element1;
        this.element2 = element2;

        // Determine which is the power-up
        var powerUp = element1 instanceof CoreGame.PowerUP ? element1 : element2;
        var targetGem = element1 instanceof CoreGame.PowerUP ? element2 : element1;

        var self = this;
        var duration = CoreGame.Config.SWAP_DURATION;

        // Data Swap
        this.doSwap();

        // Animate Visuals
        var targetPos1 = self.boardMgr.gridToPixel(element1.position.x, element1.position.y);
        var targetPos2 = self.boardMgr.gridToPixel(element2.position.x, element2.position.y);

        element1.visualMoveTo(targetPos1, duration);
        element2.visualMoveTo(targetPos2, duration);

        // Schedule Activation
        var isRainbow = powerUp instanceof CoreGame.RainbowPU;

        CoreGame.TimedActionMgr.addAction(duration, function () {
            // Reset state
            powerUp.setState(CoreGame.ElementState.IDLE);
            targetGem.setState(CoreGame.ElementState.IDLE);

            var newPowerUp = null;

            // Rainbow: skip gem match check — only activate rainbow effect,
            // normal matching resumes after rainbow finishes clearing
            if (!isRainbow) {
                // Check if the swapped gem forms a match at its new position
                var gemRow = targetGem.position.x;
                var gemCol = targetGem.position.y;
                var matchGroup = CoreGame.PatternFinder.findMatchPattern(
                    self.boardMgr.mapGrid, gemRow, gemCol
                );

                if (matchGroup.length >= 4) {
                    // Match creates a new powerup
                    var puType = self.boardMgr.matchMgr.detectPowerUpType(matchGroup);

                    // Match all gems in the group
                    var matchContext = { type: 'normal' };
                    for (var i = 0; i < matchGroup.length; i++) {
                        var pos = matchGroup[i];
                        var slot = self.boardMgr.getSlot(pos.row, pos.col);
                        if (slot) {
                            self.boardMgr.matchMgr.notifyNearbySlots(pos.row, pos.col, {
                                matchColor: targetGem.type, group: matchGroup
                            });
                            slot.matchElement(matchContext);
                        }
                    }

                    // Create the new powerup at the gem's position
                    newPowerUp = self.boardMgr.addNewElement(gemRow, gemCol, puType);
                    if (newPowerUp) {
                        newPowerUp._immuneToActivation = true;
                    }
                } else if (matchGroup.length >= CoreGame.Config.MIN_MATCH) {
                    // Regular match - just remove the matched gems
                    var matchContext = { type: 'normal' };
                    for (var i = 0; i < matchGroup.length; i++) {
                        var pos = matchGroup[i];
                        var slot = self.boardMgr.getSlot(pos.row, pos.col);
                        if (slot) {
                            self.boardMgr.matchMgr.notifyNearbySlots(pos.row, pos.col, {
                                matchColor: targetGem.type, group: matchGroup
                            });
                            slot.matchElement(matchContext);
                        }
                    }
                }
            }

            // Activate the power-up
            powerUp.active(targetGem.type);

            // Clear immunity after activation effects settle
            if (newPowerUp) {
                newPowerUp._immuneToActivation = false;
            }
        });
        return true;
    }
});
