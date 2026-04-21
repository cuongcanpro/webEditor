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
    DROP_SPEED: 5000,      // gravity in pixels/s² (duration = √(2d/g))
    MATCH_DELAY: 0.1,
    DESTROY_DURATION: 0.2,
    CONVERGE_DURATION: 0.2,
    DROP_DELTA_DELAY: 0,
    DROP_DELTA_DELAY_COL: 0,
    DROP_DELAY_POWER_UP: 0.1,

    // Match requirements
    MIN_MATCH: 3,
    BG_COLOR: "light"
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

CoreGame.Config.BOSS_LIST = [
    CoreGame.Config.ElementType.BOSS,
    CoreGame.Config.ElementType.BOSS_ELITE
];

CoreGame.Config.DIFFICULTY = {
    'easy': 0,
    'medium': 1,
    'hard': 2
};

CoreGame.Config.GrassPieceInfo = {
    "0001": [3],
    "0010": [2],
    "0100": [4],
    "1000": [1],
    "0110": ['1_3', '3_1'],
    "1001": ['2_4', '4_2'],
    "0111": ['3_1'],
    "1011": ['2_4'],
    "1110": ['1_3'],
    "1101": ['4_2'],
    "1010": ['1_2'],
    "1100": ['4_1'],
    "0101": ['3_4'],
    "0011": ['2_3']
};
CoreGame.Config.CloudPieceInfo = {
    "0001": [3],
    "0010": [2],
    "0100": [4],
    "1000": [1],
    "0110": ['1_3', '3_1'],
    "1001": ['2_4', '4_2'],
    "0111": ['3_1', '1_2_3_4'],
    "1011": ['2_4', '1_2_3_4'],
    "1110": ['1_3', '1_2_3_4'],
    "1101": ['4_2', '1_2_3_4'],
    "1010": ['1_2'],
    "1100": ['4_1'],
    "0101": ['3_4'],
    "0011": ['2_3'],
    "1111": ['1_2_3_4']
};

CoreGame.Config.BorderInfoUI = {
    "0001": [2, 270],// img, rotation
    "0010": [2, 180],
    "0100": [2, 0],
    "1000": [2, 90],
    "0110": [3, 0, 180],
    "1001": [3, 90, 270],
    "0111": [3, 270],
    "1011": [3, 180],
    "1110": [3, 90],
    "1101": [3, 0],
    "1010": [4, 0],
    "1100": [4, 270],
    "0101": [4, 180],
    "0011": [4, 90]
};

CoreGame.Config.zOrder = {
    SHAPE: 0,
    SLOT: 2,
    SOURCE: 4,
    DONUT_PORT: 6,
    GRASS: 5,
    SELECT_BOX: 6,
    GEM: 7,
    GEM_SWAP: 9,
    GEM_SHUFFLE: 100,

    GREEN: 7,
    BLUE: 7,
    RED: 7,
    YELLOW: 7,
    PINK: 7,
    CYAN: 7,
    GEM_RANDOM: 7,

    MATCH_3: 17,
    MATCH_4_H: 17,
    MATCH_4_V: 7,
    MATCH_4_EXPLODE: 1100,
    MATCH_SQUARE: 17,
    PUS_FLY: 1100,
    MATCH_5: 17,
    MATCH_T: 17,
    MATCH_L: 17,
    PU4_PU4: 17,
    PU4_PU5TL: 17,
    PU5TL_PU5TL: 17,
    PUS_PU: 17,
    PUS_PUS: 17,
    PU5_PU: 17,
    PU5_PU5: 17,
    POWER_UP: 17,

    BOX: 9,
    COOKIE: 9,
    CLOUD: 8,
    CHAIN: 11,
    DONUT: 7,
    FABERGE_EGG: 7,
    CHERRY: 7,
    BOSS: 40,
    BOSS_ELITE: 40,
    YETI: 40,
    BOSS_FIRE: 40,
    BOSS_RAT_ONE_EYED: 40,
    BOSS_RAT_CANDY: 40,
    BOSS_BUNNY: 40,
    BOSS_BUNNY_ELITE: 40,
    PUMP: 11,
    BALLOON: 3,
    BOUNTY: 10,
    WINDUP_CAR: 13,
    CHEST: 9,
    CHEST_KEY: 7,
    TRAFFIC_LIGHT: 9,
    PINWHEEL: 9,
    CLOUD_BOMB: 7,
    HOOK: 31,
    RAT: 32,
    PROTECT_BALLOON: 11,
    MILK_CABINET: 11,
    BANANA_BUNCH: 11,
    VALI: 9,
    SCALLOP: 9,
    SAFE: 30,
    SOAP_PUMP: 9,
    GOLD_BONUS:7,
    GOLDEN_PIG: 9,
    COLLECT_BALLOON: 12,
    BALLOON_ROPE: 11,
    BUSH: 9,
    SWITCH: 5,
    SWITCH_FOG: 11,
    SWITCH_FOG_MGR: 11,
    SECRET_PEARL: 11,
    KING_RAT: 12,

    EFF_MATCHING: 50,
    EFF_EXPLORE: 50,
    EFF_EXPLODE: 50,
    COLLAPSE: 49,
    OBJECTIVE: 30,

    FOG_HIGHLIGHT: 99,
};