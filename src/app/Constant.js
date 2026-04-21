let Constant = function () {

};

Constant.PACKAGE_ANDROID_DEFAULT    = "com.zps.domino";
Constant.PACKAGE_IOS_DEFAULT        = "com.mpt.dominoqq";
Constant.GAME_ID                    = "domino_id";
Constant.GAME_SECRET                = "s47Y8qe3MtCOOydn";

Constant.LOGIN_SERVICE              = "https://login-global.zingplay.com/";
Constant.SMS_PRIVATE                = "http://118.102.3.18:10217/paymentIndo/all/out/testnew.php";

Constant.WIDTH                      = 1200;
Constant.HEIGHT                     = 720;

Constant.URL_ISO_COUNTRY            = "https://sub.zingplay.com/mobile/openapi.php?&api=geoip2";

Constant.FAN_PAGE                   = "https://www.facebook.com/ZingPlay.Indonesia";
Constant.SUPPORT_PAGE               = "https://m.me/ZingPlay.Indonesia";


var KeyStorage = {
    DEVICE_ID_FOR_ENCRYPT: "VYYMriaz3C5kmhykFg2",  // use to generate encrypt key, do not change this string
    USER_ID: "userId",                              // also used in c++, do not change this string
    USER_NAME: "userName",
    USER_DISPLAY_NAME: "userDisplayName",
    AVATAR: "avatar",
    SOCIAL_TYPE: "SOCIAL_TYPE",
    AVATAR_FRAME_ID: "avatar_frame",        // must be similar to ResourceName.AVATAR_FRAME
    CHEESE_SKIN_ID: "cheese_skin",          // must be similar to ResourceName.CHEESE_SKIN
    GUEST_ID: "guestId",
    GUEST_SSK: "guestssk",
    PUBLIC_KEY: "publicKey",
    LEVEL: "level",
    GOLD: "gold",
    G: "G",
    HEART: "heart",
    HEALING_TIME: "healingTime",
    DISCOUNT_HEALING_TIME: "discountHealingTime",
    LAST_TIME_UPDATE_HEART: "lastTimeUpdateHeart",
    BUA: "bua",
    BUA_TA: "buaTa",
    GANG_TAY: "gangTay",
    BOM_PHAO: "bomPhao",
    HAT5: "hat5",
    MAY_BAY: "mayBay",
    CHECK_STATE: "checkState",
    LAST_FLOW_COMPLETED: "lastFlowCompleted",
    SESSION_KEY: "session_key",
    JUST_START: "just_start",
    JUST_START_MODE_PLAY: "just_start_mode_play",
    LAST_WIN_GAME_REWARD: "last_win_game_reward",
    LAST_WIN_GAME_REWARD_BOSS_RUN: "last_win_game_reward_bossrun",

    EARNED_STAR: "level_star",
    STAR_BY_LEVEL: "star_by_level",


    //free item
    FINISH_FREE_HEART: "finishFreeHeart",
    FINISH_FREE_BOM_PHAO: "finishFreeBomPhao",
    FINISH_FREE_HAT5: "finishFreeHat5",
    FINISH_FREE_MAY_BAY: "finishFreeMayBay",


    // random
    RANDOM_SEED: "randomSeed",

};

var InitResource = {
    LEVEL: 1,
    GOLD: 0,
    G: 0,
    HEART: 5,
    HEALING_TIME: 1800,
    DISCOUNT_HEALING_TIME: 0,
    BUA: 0,
    BUA_TA: 0,
    GANG_TAY: 0,
    BOM_PHAO: 0,
    HAT5: 0,
    MAY_BAY: 0,

    //craft
    CATALOG_CHAPTER: 1,

    //story
    STAR_NUMBER: 0,
    CHAPTER_STORY: 1,
    EVENT_POINTS: [],
};

var ConfigResource = {
    HEART_MAX: 5,
    HEALING_TIME: 600,
    HEALING_TIME_FULL: Number(-100000000000),
    EXTRA_MOVE: 5,
    DISCOUNT_HEALING_TIME_INITIAL: 0,
};

var GameConstant = {
    GUEST: "guest",
    IS_GUEST_LOGIN: 1,
    IS_NOT_GUEST_LOGIN: 0,
    TIME_NOT_FREE_RES: Number(-100000000000),
    SPACE: " ",
    defaultPublicKeyRSA: "MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCgFGVfrY4jQSoZQWWygZ83roKXWD4YeT2x2p41dGkPixe73rT2IW04glagN2vgoZoHuOPqa5and6kAmK2ujmCHu6D1auJhE2tXP+yLkpSiYMQucDKmCsWMnW9XlC5K7OSL77TXXcfvTvyZcjObEz6LIBRzs6+FqpFbUO9SJEfh6wIDAQAB",

    //craft
    TIME_COOL_DOWN_READY: Number(-100000000000),

    NOTIFY_CANT_SWITCH: 1,
    ERROR_CRYPTOR: 2,

    INTERVAL_UPDATE_TIME_CLIENT: 30,

    MAX_WIN_STREAK_LEVEL: 3,
};


const AVATAR_FRAME = {
    DEFAULT: 0,
    LAUNCHING_EVENT: 2
};

const KEY_ENCRYPT = "fldjsf";


// map with Server ResourcesIdConfig.java
var ResourceType = {
    GOLD: 0,
    G: 1,
    HEART: 2,
    HEART_FREE: 3,
    DISCOUNT_HEALING_TIME: 4,
    STAR: 6,

    //Booster
    BOM_PHAO: 30,
    HAT5: 31,
    MAY_BAY: 32,
    BOM_PHAO_FREE: 33,
    HAT5_FREE: 34,
    MAY_BAY_FREE: 35,

    //Tool
    BUA: 40,
    BUA_TA: 41,
    GANG_TAY: 42,

    PACK: 50,            // pack card (feature craft)
    CHEESE_SKIN: 51,
    AVATAR_FRAME: 52,
};

Constant.BoosterType = {
    BOMB_ROCKET: 1,
    RAINBOW: 2,
    PAPER_PLANE: 0,
}



var LEVEL_BONUS = [20, 20, 30, 50];

const GUIConst = {};
GUIConst.IOS_NOTCH_HEIGHT = 75;