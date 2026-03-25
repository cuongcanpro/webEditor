/**
 * CoreGame Index - Module exports
 * Part of Match-3 Core Game
 * 
 * Include this file LAST after all other coregame files
 */
var CoreGame = CoreGame || {};

/**
 * Create and run a new Match-3 game scene
 * @param {object} config - Optional configuration overrides
 * @returns {cc.Scene}
 */
CoreGame.createScene = function (config) {
    // Apply config overrides
    if (config) {
        if (config.rows) CoreGame.Config.BOARD_ROWS = config.rows;
        if (config.cols) CoreGame.Config.BOARD_COLS = config.cols;
        if (config.cellSize) CoreGame.Config.CELL_SIZE = config.cellSize;
        if (config.numColors) CoreGame.Config.NUM_COLORS = config.numColors;
    }

    var scene = new cc.Scene();

    // Create UI (which creates Manager and initializes Grid)
    var boardUI = CoreGame.BoardUI.getInstance();
    scene.addChild(boardUI);

    return scene;
};

/**
 * Run the Match-3 game
 * @param {object} config - Optional configuration
 */
CoreGame.run = function (config) {
    var scene = CoreGame.createScene(config);
    cc.director.runScene(scene);
};

// Export for module systems if available
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CoreGame;
}
