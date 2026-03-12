

const BOSS_RUN_ID = {
    Kong1: 1,
    Kong2: 2,
    Kong3: 3,
    Rat1: 4,
    Rat2: 5,
    Rat3: 6
};

const BOSS_ID_IN_GAME = {
    Kong1: 10000,
    Kong2: 11000,
    Kong3: 12000,
    Kong4: 17000,
    Rat1: 4500,
    Rat2: 13000,
    Rat3: 14000,
    Bunny1: 15000,
    Bunny2: 16000
};

const BOSS_RUN_NAME = _.invert(BOSS_RUN_ID);

const BOSS_RUN_TYPE = {
    KONG: 1,
    RAT_KING: 2
};
const NUM_LEVEL_BOSS_RUN = 5;

const MIN_LEVEL_BOSS_RUN = 1;

const BOSS_RUN_DEFAULT = {
    TIME_START: 0,
    LIST_LEVEL: "",
    CUR_LEVEL: 1,
    ACTIVE: 0,
    BOSS_ID: BOSS_RUN_ID.Rat2,
    LAST_BOSS_ENCOUNTERED: BOSS_RUN_ID.Rat2,
    MAP_LEVEL_CLEARED: {
        "Kong1": {
            "1" : 1
        }
    }
};
