/**
 * Config - Game configuration constants
 * Part of Match-3 Core Game
 */
var CoreGame = CoreGame || {};

CoreGame.TAG_MOVE_ACTION = 1000;
CoreGame.ZORDER_BOARD_EFFECT = 1000;

CoreGame.Config = {
    // Board settings
    BOARD_ROWS: 10,
    BOARD_COLS: 9,
    CELL_SIZE: 73,

    // Gem colors (4 colors as requested)
    NUM_COLORS: 6,
    NUM_GEN: 6,

    // Animation speeds
    SWAP_DURATION: 0.1,
    DROP_SPEED: 750,        // pixels per second
    MATCH_DELAY: 0.1,
    DESTROY_DURATION: 0.2,
    CONVERGE_DURATION: 0.15,
    DROP_DELTA_DELAY: 0.05,
    DROP_DELTA_DELAY_COL: 0.01,

    // Match requirements
    MIN_MATCH: 3
};

/**
 * Update board size
 */
CoreGame.Config.setBoardSize = function (rows, cols) {
    this.BOARD_ROWS = rows;
    this.BOARD_COLS = cols;
};

/**
 * Update cell size
 */
CoreGame.Config.setCellSize = function (size) {
    this.CELL_SIZE = size;
};

/**
 * Set number of colors
 */
CoreGame.Config.setNumColors = function (num) {
    this.NUM_COLORS = 4;
};

/**
 * Element type ID constants — mirrors CoreGame.Config.ElementType.
 * Defined here so coregame has no dependency on the outer BoardConstants.js.
 */
CoreGame.Config.ElementType = {
    NONE: -1000,

    // Gems
    GREEN: 1,
    BLUE: 2,
    RED: 3,
    YELLOW: 4,
    PINK: 5,
    CYAN: 6,
    GEM_RANDOM: 7,

    // Special tiles
    SHAPE: 10,
    SOURCE: 11,
    DONUT_PORT: 12,

    // Power-up match types
    MATCH_3: 100,
    MATCH_4_H: 101,
    MATCH_4_V: 106,
    MATCH_SQUARE: 102,
    MATCH_5: 103,
    MATCH_T: 104,
    MATCH_L: 105,

    // Power-up combo types
    PU4_PU4: 300,
    PU4_PU5TL: 301,
    PU5TL_PU5TL: 302,
    PUS_PU: 303,
    PUS_PUS: 304,
    PU5_PU: 305,
    PU5_PU5: 306,

    // Blockers
    GRASS: 500,
    CHAIN: 600,
    BOX: 700,
    COOKIE: 800,
    CLOUD: 900,
    DONUT: 1000,
    CHERRY: 1100,
    PUMP: 1200,
    BALLOON: 1300,
    BOUNTY: 1400,
    WINDUP_CAR: 1500,
    FABERGE_EGG: 5000,

    CLOUD_MGR: 1600,
    DONUT_MGR: 1700,
    BOUNTY_MGR: 1800,
    CHEST: 1900,
    CHEST_KEY: 2000,
    CHEST_KEY_MGR: 2100,
    TRAFFIC_LIGHT: 2200,
    PINWHEEL: 2300,
    CLOUD_BOMB: 2400,
    RAT: 2500,
    HOOK: 2600,
    PROTECT_BALLOON: 2700,
    CLOUD_BOMB_MGR: 2800,
    MILK_CABINET: 2900,
    VALI: 3000,
    SCALLOP: 3100,
    SAFE: 3200,
    SOAP_PUMP: 3300,
    SOAP: 3400,
    GOLD_BONUS: 3500,
    GOLDEN_PIG: 3600,
    COLLECT_BALLOON: 3700,
    BALLOON_ROPE: 3800,
    COLLECT_BALLOON_MGR: 3900,
    BUSH: 4000,
    SWITCH: 4100,
    SWITCH_FOG: 4200,
    SWITCH_FOG_MGR: 4300,
    SECRET_PEARL: 4400,
    KING_RAT: 4500,
    BANANA_BUNCH: 4600,

    // Bosses
    BOSS: 10000,
    YETI: 11000,
    BOSS_FIRE: 12000,
    BOSS_RAT_ONE_EYED: 13000,
    BOSS_RAT_CANDY: 14000,
    BOSS_BUNNY: 15000,
    BOSS_BUNNY_ELITE: 16000,
    BOSS_ELITE: 17000
};
