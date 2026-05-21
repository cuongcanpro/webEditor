/**
 * Donut - Collectible blocker that falls via gravity and is collected at a DonutPort slot.
 *
 * Behavior:
 *   - Placed on the board from map config at game start (no random spawning).
 *   - Falls downward using the standard DropMgr drop logic (haveBaseAction[DROP] = 1).
 *   - Cannot be swapped or destroyed by matches/explosions.
 *   - Collected automatically when it reaches the bottom of the map (IDLE, no slot below).
 *   - Collection chains into boardMgr.removedElement() → objective count.
 *
 * Part of Match-3 Core Game
 */
var CoreGame = CoreGame || {};

CoreGame.Donut = CoreGame.Blocker.extend({

    ctor: function () {
        this._super();
        this.layerBehavior = CoreGame.LayerBehavior.EXCLUSIVE;

        // Participates in DropMgr gravity — falls like a gem
        this.haveBaseAction[CoreGame.ElementObject.Action.DROP] = 1;
        // Cannot be swapped by the player
        this.haveBaseAction[CoreGame.ElementObject.Action.SWAP] = 1;

        // Collected when it reaches the bottom of the map
        this.addAction(
            CoreGame.ElementObject.ACTION_TYPE.ON_IDLE,
            new CoreGame.Strategies.CollectAtBottomAction()
        );

        // No SIDE_MATCH or MATCH actions → immune to all explosions and matches
    },

    init: function (row, col, type) {
        this._super(row, col, type, 1);
        return this;
    },

    /**
     * Override setState to emit ON_IDLE when element settles,
     * allowing CollectAtPortAction to trigger collection.
     */
    setState: function (state) {
        // Once collection starts (REMOVING), ignore further state changes.
        // NormalSwap schedules both visualMoveTo's IDLE and an explicit IDLE
        // at the same tick; without this guard each one re-fires ON_IDLE →
        // CollectAtBottomAction → doExplode, decrementing the objective twice.
        if (this.state === CoreGame.ElementState.REMOVING) {
            return;
        }
        this._super(state);
        if (state === CoreGame.ElementState.IDLE) {
            this.doActionsType(CoreGame.ElementObject.ACTION_TYPE.ON_IDLE, {});
        }
    },

    createUIInstance: function () {
        return new CoreGame.DonutUI(this);
    },

    getTypeName: function () {
        return 'donut';
    },

    //**
    updateTarget: function (targetNode) {
        if (targetNode) {
            targetNode.infoUI.suckElement(this);
        }
    }
});

// Register with element type map
if (CoreGame.Config && CoreGame.Config.ElementType && CoreGame.Config.ElementType.DONUT) {
    CoreGame.ElementObject.register(CoreGame.Config.ElementType.DONUT, CoreGame.Donut);
}
