/**
 * Created by AnhLMT on 12/17/2019.
 */
const BoardConst = {};
BoardConst.WIDTH = 9;
BoardConst.HEIGHT = 11;
BoardConst.SlotSize = {
    WIDTH: 73,
    HEIGHT: 73
};
BoardConst.GridSize = {
    ROW: 9,
    COL: 9
};
BoardConst.ElementType = {
    NONE: -1000,
    GREEN: 1,
    BLUE: 2,
    RED: 3,
    YELLOW: 4,
    PINK: 5,
    CYAN: 6,
    GEM_RANDOM: 7,

    SHAPE: 10,
    SOURCE: 11,
    DONUT_PORT: 12,

    MATCH_3: 100,
    MATCH_4_H: 101,
    MATCH_4_V: 106,
    MATCH_SQUARE: 102,
    MATCH_5: 103,
    MATCH_T: 104,
    MATCH_L: 105,

    PU4_PU4: 300,
    PU4_PU5TL: 301,
    PU5TL_PU5TL: 302,
    PUS_PU: 303,
    PUS_PUS: 304,
    PU5_PU: 305,
    PU5_PU5: 306,

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

    BOSS: 10000,
    YETI: 11000,
    BOSS_FIRE: 12000,
    BOSS_RAT_ONE_EYED: 13000,
    BOSS_RAT_CANDY: 14000,
    BOSS_BUNNY: 15000,
    BOSS_BUNNY_ELITE: 16000,
    BOSS_ELITE: 17000
};

const ElementType = BoardConst.ElementType;
BoardConst.zOrder = {
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
    BOSS: 12,
    BOSS_ELITE: 12,
    YETI: 12,
    BOSS_FIRE: 12,
    BOSS_RAT_ONE_EYED: 12,
    BOSS_RAT_CANDY: 12,
    BOSS_BUNNY: 12,
    BOSS_BUNNY_ELITE: 12,
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

BoardConst.MovePriority = {
    BOX: 0,
    GRASS: 0,
    CHAIN: 0,
    MILK_CABINET: 0,
    BANANA_BUNCH: 0,
    CHERRY: 0,
    COOKIE: 0,
    PUMP: 0,
    TRAFFIC_LIGHT: 0,
    PINWHEEL: 0,
    VALI: 0,
    SCALLOP: 0,
    SAFE: 0,

    DONUT: 1,
    BOUNTY: 1,
    SOAP_PUMP: 1,
    FABERGE_EGG: 1,

    WINDUP_CAR: 2,

    CHEST_KEY_MGR: 3,
    CLOUD: 4,
    BALLOON: 4,

    CLOUD_BOMB: 5,
    RAT: 5,

    BOSS: 6,
    BOSS_ELITE: 6,
    BOSS_BUNNY: 6,
    BOSS_BUNNY_ELITE: 1,
    MAX_PRIORITY: 6
}

BoardConst.ElementName = {
    1: "lang_element_1",
    3: "lang_element_2",
    101: "lang_pu_1",
    102: "lang_pu_2",
    103: "lang_pu_3",
    104: "lang_pu_4"
};

BoardConst.MatchTLRadius = 1;
BoardConst.MatchSquareRadius = 1;

BoardConst.MatchPriority = {103: 5.5, 105: 5, 104: 5, 101: 4.5, 106: 4.5, 102: 4, 100: 3};
BoardConst.MatchPattern = {
    102: [
        [[1, 0], [0, -1], [1, -1]],        //14 : match square //102
        [[1, 0], [0, 1], [1, 1]],        //15 : match square
        [[-1, 0], [0, 1], [-1, 1]],        //16 : match square
        [[-1, 0], [0, -1], [-1, -1]]
    ],
    100: [
        [[2, 0], [1, 0]],                   //18: match 3 //100
        [[1, 0], [-1, 0]],                   //19: match 3
        [[-2, 0], [-1, 0]],                   //20: match 3
        [[0, 2], [0, 1]],                   //21: match 3
        [[0, 1], [0, -1]],                   //22: match 3
        [[0, -2], [0, -1]]
    ],
    103: [
        [[-2, 0], [-1, 0], [1, 0], [2, 0]],    //0 : match 5 vertical //103
        [[0, -2], [0, -1], [0, 1], [0, 2]]
    ],
    105: [
        [[2, 0], [1, 0], [0, 2], [0, 1]],        //2 : match L //105
        [[-2, 0], [-1, 0], [0, 2], [0, 1]],        //3 : match L
        [[-2, 0], [-1, 0], [0, -2], [0, -1]],        //4 : match L
        [[2, 0], [1, 0], [0, -2], [0, -1]]
    ],
    104: [
        [[2, 0], [1, 0], [0, 1], [0, -1]],        //6 : match T //104
        [[1, 0], [-1, 0], [0, 1], [0, 2]],        //7 : match T
        [[1, 0], [-1, 0], [0, -1], [0, -2]],        //8 : match T
        [[-1, 0], [-2, 0], [0, -1], [0, 1]]
    ],
    101: [
        [[2, 0], [1, 0], [-1, 0]],        //10 : match 4 //101
        [[1, 0], [-1, 0], [-2, 0]]
    ],
    106: [
        [[0, 2], [0, 1], [0, -1]],        //12 : match 4 //106
        [[0, 1], [0, -1], [0, -2]]
    ]
}

BoardConst.MatchPatternV2 = {
    '4,0,0,0,0,0,0,0,0': [103, [-2, 0]]

}


BoardConst.BasicMatchPattern = {
    103: [
        [[0, -2], [0, -1], [0, 0], [0, 1], [0, 2]]    //0 : match 5 vertical //103
    ],
    105: [
        [[2, 0], [1, 0], [0, 0], [0, 2], [0, 1]]        //2 : match L //105
    ],
    104: [
        [[2, 0], [1, 0], [0, 0], [0, 1], [0, -1]]        //6 : match T //104
    ],
    101: [
        [[2, 0], [1, 0], [0, 0], [-1, 0]]        //10 : match 4 //101
    ],
    106: [
        [[0, 2], [0, 1], [0, 0], [0, -1]]        //12 : match 4 //106
    ],
    102: [
        [[1, 0], [0, -1], [0, 0], [1, -1]]        //14 : match square //102
    ],
    100: [
        [[2, 0], [1, 0], [0, 0]]                   //18: match 3 //100
    ]
}

BoardConst.SwapMatch3Pattern = [
    // slot cuoi la slot swap den
    [[-1, +1], [+1, +1], [+0, +1]],
    [[+1, +1], [+1, -1], [+1, -0]],
    [[+1, -1], [-1, -1], [-0, -1]],
    [[-1, -1], [-1, +1], [-1, +0]],

    [[-2, +1], [-1, +1], [+0, +1]],
    [[+1, +2], [+1, +1], [+1, -0]],
    [[+2, -1], [+1, -1], [-0, -1]],
    [[-1, -2], [-1, -1], [-1, +0]],

    [[-2, -1], [-1, -1], [+0, -1]],
    [[-1, +2], [-1, +1], [-1, -0]],
    [[+2, +1], [+1, +1], [-0, +1]],
    [[+1, -2], [+1, -1], [+1, +0]],

    [[-3, +0], [-2, +0], [-1, +0]],
    [[+0, +3], [+0, +2], [+0, +1]],
    [[+3, -0], [+2, -0], [+1, -0]],
    [[-0, -3], [-0, -2], [-0, -1]]
]

BoardConst.EffectRotation = {
    103: [
        0,    //0 : match 5 vertical //103
        90
    ],
    105: [
        [[2, 0], [1, 0], [0, 2], [0, 1]],        //2 : match L //105
        [[-2, 0], [-1, 0], [0, 2], [0, 1]],        //3 : match L
        [[-2, 0], [-1, 0], [0, -2], [0, -1]],        //4 : match L
        [[2, 0], [1, 0], [0, -2], [0, -1]]
    ],
    104: [
        [[2, 0], [1, 0], [0, 1], [0, -1]],        //6 : match T //104
        [[1, 0], [-1, 0], [0, 1], [0, 2]],        //7 : match T
        [[1, 0], [-1, 0], [0, -1], [0, -2]],        //8 : match T
        [[-1, 0], [-2, 0], [0, -1], [0, 1]]
    ],
    101: [
        90,        //10 : match 4 //101
        270
    ],
    106: [
        0,        //12 : match 4 //106
        180
    ],
    102: [
        [[1, 0], [0, -1], [1, -1]],        //14 : match square //102
        [[1, 0], [0, 1], [1, 1]],        //15 : match square
        [[-1, 0], [0, 1], [-1, 1]],        //16 : match square
        [[-1, 0], [0, -1], [-1, -1]]
    ],
    100: [
        [[2, 0], [1, 0]],                   //18: match 3 //100
        [[1, 0], [-1, 0]],                   //19: match 3
        [[-2, 0], [-1, 0]],                   //20: match 3
        [[0, 2], [0, 1]],                   //21: match 3
        [[0, 1], [0, -1]],                   //22: match 3
        [[0, -2], [0, -1]]
    ]
}

BoardConst.BorderInfo = {
    "0001": [2, 0],// img, rotation
    "0010": [2, 90],
    "0100": [2, 270],
    "1000": [2, 180],
    "0110": [3, 0, 180],
    "1001": [3, 90, 270],
    "0111": [3, 0],
    "1011": [3, 90],
    "1110": [3, 180],
    "1101": [3, 270],
    "1010": [4, 0],
    "1100": [4, 90],
    "0101": [4, 180],
    "0011": [4, 270]
};

BoardConst.BorderInfoUI = {
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

BoardConst.GrassPieceInfo = {
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
BoardConst.CloudPieceInfo = {
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

BoardConst.AnimationDuration = {
    REMOVE: 0.4
};
BoardConst.TIME_SUGGEST = 2;

BoardConst.COLOR = {
    1: cc.color(15, 201, 0),
    2: cc.color(252, 232, 32),
    3: cc.color(255, 73, 66),
    4: cc.color(226, 82, 0),
    5: cc.color(226, 48, 218),
    6: cc.color(2, 205, 255)
}

BoardConst.GRAVITY = 160;
BoardConst.DEFAULT_SPEED = 0;
BoardConst.MAX_SPEED = 10;
BoardConst.DIST_START_DROP = 80;
BoardConst.TIME_BOUNCE = 0.4;

BoardConst.COMBO_LEVEL = 5;
BoardConst.ENCOURAGE_SHOWING_DURATION = 0.75;
BoardConst.GEM_COMBO_ENCOURAGE = [18, 27, 36, 45, 54];
BoardConst.MATCH_SEQUENCE_ENCOURAGE = [5, 8, 11, 14, 17];

BoardConst.BoosterType = {
    BOMB_ROCKET: 1,
    RAINBOW: 2,
    PAPER_PLANE: 0,
}

BoardConst.BG_COLOR = "light";
