/**
 * Created by CPU02336_LOCAL on 6/14/2019.
 */

var CLIENT_JS_VERSION = "codeV1";

var boosterType = {
    PAPER_PLANE: 1,
    BOMB_ROCKET: 2,
    RAINBOW: 3
};

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
var ResourceIdKey = _.invert(ResourceType);

// map with server Match3Constant.java
var ResourceName = {
    GOLD: "gold",
    G: "G",
    HEART: "heart",
    HEART_FREE: "heart_free",
    DISCOUNT_HEALING_TIME: "healingTime",

    //Booster
    BOM_PHAO: "bom_phao",
    HAT5: "hat5",
    MAY_BAY: "may_bay",
    BOM_PHAO_FREE: "bom_phao_free",
    HAT5_FREE: "hat5_free",
    MAY_BAY_FREE: "may_bay_free",

    //Tool
    BUA: "bua",
    BUA_TA: "bua_ta",
    GANG_TAY: "gang_tay",

    PACK: "pack",
    CHEESE_SKIN: "cheese_skin",
    AVATAR_FRAME: "avatar_frame",

    STAR: "star",       // meta star
};
var ResourceNameKey = _.invert(ResourceName);

var ActionType = {
    START_PLAY_GAME: 0, // level, resType1, resBefore1, resAfter1, resChange1, ....
    USE_TOOL_IN_GAME: 1, // level, typeTool, toolBefore, toolAfter, toolChange
    END_GAME_WIN: 2, //levelPlayed
    END_GAME_LOSE: 4, //level, heart, heartBefore, heartAfter, heartChange
    END_GAME_REWARD: 5, //level, rewardType, rewardBefore, rewardAfter, rewardChange
    DONE_TUT: 6, //levelTut

    BOSS_RUN_START_PLAY: 100,
    BOSS_RUN_END_GAME_WIN: 102,
    BOSS_RUN_END_GAME_LOSE: 103,
    BOSS_RUN_END_GAME_REWARD: 104,
    BOSS_RUN_FINAL_REWARD: 105,

    CHEAT_LEVEL: 1001, //level
    CHEAT_BOOSTER: 1002, //boosterType, boosterChange
    CHEAT_TOOL: 1003, //toolType, toolChange
    CHEAT_HEART: 1004,
    CHEAT_GET_PACK: 1005,

    PUNISH_CHEAT_HEART: 2000, //newHeart, newHealing
    FIX_FREE_TIME_HEART: 2001, //resType, newEndTime
    FIX_FREE_TIME_BOM_PHAO: 2005, //resType, newEndTime
    FIX_FREE_TIME_HAT5: 2006, //resType, newEndTime
    FIX_FREE_TIME_MAY_BAY: 2007, //resType, newEndTime

    //event collect
    EVENT_COLLECTION: 3e3,
    EVENT_COLLECT_START: 3e3 + 1,//timeStart, timeFinish, idxEvent
    EVENT_COLLECT_LEVEL: 3e3 + 2,//idxEvent, amount
    EVENT_COLLECT_REWARD: 3e3 + 3,//idxEvent, idxReward, rewardType, rewardAmount
    EVENT_COLLECT_FIX_TIME: 3e3 + 4,//timeStart, timeFinish, idxEvent
    DECREASE_TIME_END: 3005, //durationTimeMinus
    GET_REWARD_COLLECTION_TUT: 3006,

    // craft machine
    OPEN_PACK: 4000, //nItem item1 item2 item3 ....
    CRAFT_RECIPE: 4001, //slotId rewardType amount
    CHEAT_TIME_CRAFT: 4002, // slotId
    CRAFT_ARTIFACT: 4003, // type isTut
    RECHARGE: 4004, // type
    HARVEST: 4005, // type productType productAmount
    UN_DISPLAY: 4006, // type
    DISPLAY: 4007, // type
    CHEAT_CARD: 4008, // type amount
    CHEAT_TRIGGER_TIME: 4009, // type triggerTime
    CHEAT_REMAIN_TIME: 4010, // type remainTime
    CHEAT_PACK_ID: 4011, // packId
    CHEAT_ROLL_PACK: 4012, // amount
    CRAFT_TUT: 4013,
    OPEN_PACK_TUT: 4014,
    RESET_TUT_ARTIFACT: 4015,

    //Buy
    BUY_MOVE: 5001,  // turnBuy, typeMoney, numMoney, levelId, isBossRun

    //Story
    STORY: 6e3,
    STORY_DO_EVENT: 6e3 + 1, // chapterId, nextLevelId
    STORY_GET_REWARD: 6e3 + 2, // chapterId, rewardType, rewardAmount
    STORY_NEXT_CHAPTER: 6e3 + 3, // chapterNextId

    // Meta
    META_OPEN_PUZZLE: 7001, // picId, chapId, puzzleId
    META_FIND_ITEM: 7002,   // missionId, itemId, chapId, puzzleId

    // Event Launching
    LAUNCHING_EVENT_NEXT_DAY: 7100,  // next DayId


    // Log session
    LOG_TURN_PLAY: 1000000001,                          // metricPoint | time | uId | typeEvent | level | versionLevel | levelWithVer | turnsPlay | version | winstreak | freeHeartRemain | useB1 | useB2 | useB3
    LOG_MOVE_PLAY: 1000000002,                          // metricPoint | time | uId | typeEvent | level | versionLevel | levelWithVer | turnsPlay | version | winstreak | freeHeartRemain | originMove | extraMove | movePlay | residualMove
    LOG_LOSE_TARGET: 1000000003,                        // metricPoint | time | uId | typeEvent | level | versionLevel | levelWithVer | turnsPlay | version | winstreak | freeHeartRemain | turnsLose | numberTarget | target1 | needMore1 | ...
    LOG_OUT_GAME: 1000000004,                           // metricPoint | time | uId | typeEvent | level | versionLevel | levelWithVer | turnsPlay | version | winstreak | freeHeartRemain
    LOG_LOSE_SUBTRACT_HEART: 1000000005,                // metricPoint | time | uId | typeEvent | level | versionLevel | levelWithVer | turnsPlay | version | winstreak | freeHeartRemain | heartAfter
    LOG_USE_TOOL: 1000000007,                           // metricPoint | time | uId | typeEvent | level | versionLevel | levelWithVer | turnsPlay | version | winstreak | freeHeartRemain | typeTool
    LOG_VOTE: 1000000006,                               // metricPoint | time | uId | typeEvent | level | versionLevel | levelWithVer | turnsPlay | version | point
    LOG_USER_STEP: "userDropStep",                      // metricPoint | time | uId | typeEvent | stepName
    LOG_TUT_STEP: "tutStep",                            // metricPoint | time | uId | typeEvent | tutStepId(begin/c_x/end)
    LOG_TIME_SWAP_GEM: "timeSwapGem",                   // metricPoint | time | uId | typeEvent | level | version | numSwap | timeFromLastSwap
    LOG_DT_UPDATE_AVG: "fpsAVG",                        // metricPoint | time | uId | typeEvent | level | dtAVG | fpsAVG | result | numSwap | version | osName | osVersion | deviceModel
    // craft
    LOG_OPEN_CRAFT: "openCraft",                        // metricPoint | time | uId | typeEvent | level | isOutOfHeart | isOutOfBoosterBomb | isOutOfBoosterDisco | isOutOfBoosterPlane | isOutOfToolGlove | isOutOfToolHammerSmall | isOutOfToolHammerBig
    LOG_AFTER_OPEN_PACK: "afterOpenPack",               // metricPoint | time | uId | typeEvent | action
    // bossRun
    LOG_BOSS_RUN_POP_UP: "brPopup",                     // metricPoint | time | uId | typeEvent | isFirstTimeShow | action:show/play/close
    LOG_BOSS_RUN_BUY_MOVE: "brBuyMove",                 // metricPoint | time | uId | typeEvent | stepId | levelId | turnBuy | price | moneyAfter
    LOG_BOSS_RUN_PLAY_MAIN: "brSkipPopupPlayMain",      // metricPoint | time | uId | typeEvent
    LOG_BOSS_RUN_PLAY_MAIN1: "brSkipGuiPlayMain",       // metricPoint | time | uId | typeEvent
    LOG_BOSS_RUN_CLICK_BTN: "brClickBtn",               // metricPoint | time | uId | typeEvent | status:canJoin/joined/finished
    LOG_BOSS_RUN_SESSION: "brSession",                  // metricPoint | time | uId | typeEvent | status:start/end
    // popup Offer
    LOG_OFFER: "offer",                                 // metricPoint | time | uId | typeEvent | typeOffer | action

};
var ActionNameKey = _.invert(ActionType);

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

    //event collect
    EC_IDX_EVENT: "eventCollectIdx",
    EC_IDX_REWARD: "eventCollectIdxReward",
    EC_TIME_START: "eventCollectTimeStart",
    EC_TIME_FINISH: "eventCollectTimeFinish",
    EC_AMOUNT: "eventCollectCurrentAmount",

    //free item
    FINISH_FREE_HEART: "finishFreeHeart",
    FINISH_FREE_BOM_PHAO: "finishFreeBomPhao",
    FINISH_FREE_HAT5: "finishFreeHat5",
    FINISH_FREE_MAY_BAY: "finishFreeMayBay",

    // craft
    CR_CARD: "cards",
    CR_ARTIFACT: "artifactPieces",
    CR_RECIPE: "recipes",
    CR_RECIPE_SLOT: "recipe_slot",
    CR_COOL_DOWN_TIME: "coolDownTime",
    CR_CATALOG_CHAPTER: "catalogChapter",
    CR_ARTIFACT_INFO: "artifact_info",
    CR_NOT_OPEN_PACK_ANIM: "notOpenPackAnim",
    CR_TUTORIAL: "tutorialCraft",
    CR_ARTIFACT_TUTORIAL: "tutorialArtifact",
    CR_LAST_TIME_POPUP: "cr_last_time_popup",

    //winStreak
    WIN_STREAK: "winStreak",
    WIN_STREAK_INTRODUCED: "mac_factory_introduced",

    // random
    RANDOM_SEED: "randomSeed",

    // tut
    TUT_LEVEL: "tutorialLevel",
    TUT_FEATURE: "tutorialFeature",
    ON_BOARDING: "onBoarding",

    KEY_LIST_MAP_PASS: "list_map_pass",
    NUM_LOSE: "numLose",
    NUM_PLAY: "numPlay",
    NUM_STAR: "numStar",
    EVENT_POINTS: "EVENT_POINTS",
    CHAPTER: "CHAPTER",

    //validData:
    VALID_DATA: "validData",

    // cheat
    CHEAT_PACK_ID: "cheatPackId",

    IS_OFFLINE_SESSION: "IS_OFFLINE_SESSION",               // also used in c++, do not change this string

    DEVICE_IS_GOT_SERVER_TIME: "DEVICE_GOT_SERVER_TIME",    // also used in c++, do not change this string
    DEVICE_DELTA_TIME: "DEVICE_DELTA_TIME",
    LAST_TIME_LOGIN: "LAST_TIME_LOGIN",

    USER_LAST_TIME_RECORDED: "USER_LAST_TIME_RECORDED",
    USER_NUM_CHEAT_TIME: "USER_NUM_CHEAT_TIME",
    LAST_DEVICE_TIME_VERSIONED: "LAST_DEVICE_TIME_VERSIONED",

    TIME_START_MAINTAIN: "TIME_START_MAINTAIN",
    TIME_FINISH_MAINTAIN: "TIME_FINISH_MAINTAIN",

    // ranking
    RANKING: "ranking",
    USER_RANK: "user_rank",
    WEEK_RANK_TIMEOUT: "week_rank_timeout",
    AVATAR_URL_MAP: "avatar_url",
    WEEKLY_RANKING_POINT: "ranking_week_point",

    // piggy
    PIGGY_INIT: "piggy_init",
    PIGGY_LEVEL: "piggy_level",
    PIGGY_TIME_START: "piggy_time_start",
    PIGGY_LEVEL_START: "piggy_level_start",
    PIGGY_SAVED_INIT_TIME: "piggy_saved_init_time",

    //offer
    OFFER_DATA: "OFFER_DATA",

    // Rating
    IS_DEVICE_RATED: "is_device_rated",

    // Ads
    LAST_TIME_SHOW_ADS: "last_time_show_ads",
    ADS_HEART_DATA: "ADS_HEART_DATA",

    // Meta
    META_CHAPTER_ID: "current_meta_chapter_id",
    META_PUZZLE_ID: "current_meta_puzzle_id",
    OPENED_PART: "meta_opened_image_part",
    FOUND_ITEM: "meta_found_item",
    META_CURRENT_REWARD: "meta_current_reward",
    META_STAR: "meta_star",
    META_NUM_LV_WAIT_TO_SWITCH_TAB: "meta_numlv_wait_switch_tab",

    // Metric
    METRIC_LOG: "metric_log",
    START_METRIC_LOG_DAY: "start_saved_metric_log",

    // sky race
    SKY_RACE_TIME_END: "sky_race_time_end",
    SKY_RACE_PROCESS: "sky_race_process",

    // Event Adventure king global:
    EVENT_ADVT_START: "EVENT_ADVT_START",
    EVENT_ADVT_END: "EVENT_ADVT_END",
    // Event Adventure king user:
    EVENT_ADVT_IS_SHOWN_WELCOME: "EVENT_ADVT_IS_SHOWN_WELCOME",
    EVENT_ADVT_TIME_START: "EVENT_ADVT_TIME_START",
    EVENT_ADVT_IS_ACTIVE: "EVENT_ADVT_IS_ACTIVE",
    EVENT_ADVT_LEVEL_START: "EVENT_ADVT_LEVEL_START",
    EVENT_ADVT_LIST_TIME: "EVENT_ADVT_LIST_TIME",

    // Notification
    NOTIFY_TIME: "notify_time",
    NOTIFY_CLICKED: "notify_clicked",
    NOTIFICATION_CONTENT_USED: "NOTIFICATION_CONTENT_USED",
    NOTIFICATION_MAX_LEVEL: "NOTIFICATION_MAX_LEVEL",
    NOTIFICATION_LAST_TIME_CLAIM_DAILY_REWARD: "NOTIFICATION_LTCDR",

    // Event Launching
    LC_TIME_START: "lc_timeStart",
    LC_LIST_STEP_RECEIVED: "lc_listStepReceived",
    LC_NUM_LVL_PASSED: "lc_numLvlPassed",
    LC_LAST_TIME_SHOW_EVENT: "lc_lastTimeShowEvent",

    // Boss Run
    BR_TIME_START: "br_timeStart",
    BR_LIST_LEVEL: "br_listLevel",
    BR_CUR_LEVEL: "br_curLevel",
    BR_BOSS_ID: "br_bossId",
    BR_ACTIVE: "br_cx1rw",
    BR_SHOWN_START: "br_shownStart",
    BR_SHOWN_WIN: "br_shownWin",
    BR_MAP_LEVEL_CLEARED: "br_map_level_cleared",
    BR_RANDOM_RUN: "br_randomRun",
    BR_LAST_BOSS: "br_lastBoss",

    COUNTRY_CODE: "countryCode",
    MAP_AB_TEST: "mapABTest",
    LAST_LEVEL_MINI_SAGA: "LAST_LEVEL_MINI_SAGA"
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
    HEALING_TIME: 1800,
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

var GameScene = {
    LOGIN: "SceneLogin",
    LOADING_BOARD: "GUILoadingBoardScene",
    LOBBY: "SceneLobby",
    MAIN_SCENE: "MainScene"
};

var GameEvent = {
    UPDATE_RESOURCE: "UPDATE_RESOURCE",
    UPDATE_LEVEL: "UPDATE_LEVEL",
    UPDATE_STAR: "UPDATE_STAR",
    REFRESH_SHOP: "REFRESH_SHOP",
    CLEAR_DATA: "CLEAR_DATA",
    SHARE_GET_LEVEL: "SHARE_GET_LEVEL",
    SHARE_UPDATE_LEVEL: "SHARE_UPDATE_LEVEL",
    UPDATE_MY_AVATAR_FRAME: "UPDATE_MY_AVATAR_FRAME",
};

var TUTORIAL_FEATURE = {
    NEW_PLAYER: "newPlayer",
    BOOSTER: "booster",
    TOOL: "tool"
};

var TUTORIAL_STATE = {
    NEW: 0,
    DONE: 1
};

var LEVEL_TUT_ACTION = {
    WAIT: "WAIT",
    NPC_TALK: "NPC_TALK",
    HIGHLIGHT_SLOT: "HIGHLIGHT_SLOT",
    HIGHLIGHT_SLOT_AREA: "HIGHLIGHT_SLOT_AREA",
    HIGHLIGHT_ELEMENT_TYPE: "HIGHLIGHT_ELEMENT_TYPE",
    FORCE_SWAP: "FORCE_SWAP",
    FORCE_TOUCH: "FORCE_TOUCH",
    FORCE_TOUCH_USING_TOOL: "FORCE_TOUCH_USING_TOOL",
    FORCE_SELECT_TOOL: "FORCE_SELECT_TOOL",
    ADD_FREE_TOOL: "ADD_FREE_TOOL",
    HIGHLIGHT_GUI_OBJECTIVE: "HIGHLIGHT_GUI_OBJECTIVE",
    SHOW_VIDEO: "SHOW_VIDEO",
    EXIT: "EXIT"
};

var ON_BOARDING_ACTION = {
    WAIT: "WAIT",
    NPC_TALK: "NPC_TALK",
    SHOW_TEXT: "SHOW_TEXT",
    SHOW_PICTURE: "SHOW_PICTURE",
    SHOW_VIDEO: "SHOW_VIDEO",
    SHOW_OFFLINE_VIDEO: "SHOW_OFFLINE_VIDEO",
    SHOW_ONLINE_VIDEO: "SHOW_ONLINE_VIDEO",
    FORCE_CLICK_BUTTON: "FORCE_CLICK_BUTTON",
    CLEAR_NPC_TALK: "CLEAR_NPC_TALK",
    SHOW_GUI: "SHOW_GUI",
    TOUCH_CALLBACK: "TOUCH_CALLBACK",
    SHOW_PUZZLE_STORY: "SHOW_PUZZLE_STORY",
    HIDE_PUZZLE_STORY: "HIDE_PUZZLE_STORY",
    SHOW_PUZZLE: "SHOW_PUZZLE",
    SHOW_INSTRUMENT_TEXT: "SHOW_INSTRUMENT_TEXT",
    HIDE_INSTRUMENT_TEXT: "HIDE_INSTRUMENT_TEXT",
    BLOCK_SWITCH_TAB: "BLOCK_SWITCH_TAB",
    FORCE_PLAY: "FORCE_PLAY",
    FORCE_PLAY_BOSS_RUN: "FORCE_PLAY_BOSS_RUN",
    FORCE_SHOW_BOSS_RUN_WELCOME: "FORCE_SHOW_BOSS_RUN_WELCOME",
};

var RichTextAlignment = {
    LEFT: 0,
    RIGHT: 1,
    CENTER: 2,
    JUSTIFIED: 3,
    TOP: 4,
    MIDDLE: 5,
    BOTTOM: 6
};

var ONE_DAY_IN_SEC = 3600 * 24;

var DAILY_LOGIN_CONST = {
    NUM_DAY: 7,
    COUNT_DOWN_CLAIM_GIFT: 86400,   // one day in seconds

    GIFT_ID_NOT_REVEALED: -1,
    GIFT_STATE_CLAIMED: 1,
    GIFT_STATE_NOT_CLAIMED: 0
};

var GLOBAL_ACTION_TAG = {
    TOUCH_BUTTON: 1001,
    DELAY_HIDE_TOOL_TIP: 1002,
    DELAY_ENABLE_BUTTON: 1003,
    SCALE_HIGHLIGHT_BUTTON: 1004,
};

// var DefaultStateValue = {
//     // todo: not used and tested:
//     LEVEL: InitResource.LEVEL,
//     GOLD: 0,
//     G: 0,
//     HEART: InitResource.HEART,
//     HEALING_TIME: InitResource.HEALING_TIME,
//     DISCOUNT_HEALING_TIME: InitResource.DISCOUNT_HEALING_TIME,
//     BUA: 0,
//     BUA_TA: 0,
//     GANG_TAY: 0,
//     BOM_PHAO: 0,
//     HAT5: 0,
//     MAY_BAY: 0,
//
//     //event collect
//     EC_IDX_EVENT: 0,
//     EC_IDX_REWARD: -1,
//     EC_TIME_START: 0,
//     EC_TIME_FINISH: 0,
//     EC_AMOUNT: 0,
//
//     //free item
//     FINISH_FREE_HEART: GameConstant.TIME_NOT_FREE_RES,
//     FINISH_FREE_BOM_PHAO: GameConstant.TIME_NOT_FREE_RES,
//     FINISH_FREE_HAT5: GameConstant.TIME_NOT_FREE_RES,
//     FINISH_FREE_MAY_BAY: GameConstant.TIME_NOT_FREE_RES,
//
//     // craft
//     CR_CARD: "{}",
//     CR_ARTIFACT: "{}",
//     CR_RECIPE: "[]",
//     CR_RECIPE_SLOT: "{}",
//     CR_COOL_DOWN_TIME: GameConstant.TIME_COOL_DOWN_READY,
//     CR_CATALOG_CHAPTER: InitResource.CATALOG_CHAPTER,
//     CR_ARTIFACT_INFO: "{}",
//
//     //winStreak
//     WIN_STREAK: 0,
//
//     // random
//     RANDOM_SEED: 0,
// };


var DefaultStateValue = {
    tutLevel: 1,
};
// Default state value launching:
DefaultStateValue[KeyStorage.LC_NUM_LVL_PASSED] = 0;

// Default state value BossRun:
DefaultStateValue[KeyStorage.BR_ACTIVE] = BOSS_RUN_DEFAULT.ACTIVE;
DefaultStateValue[KeyStorage.BR_TIME_START] = BOSS_RUN_DEFAULT.TIME_START;
DefaultStateValue[KeyStorage.BR_CUR_LEVEL] = BOSS_RUN_DEFAULT.CUR_LEVEL;
DefaultStateValue[KeyStorage.BR_LIST_LEVEL] = BOSS_RUN_DEFAULT.LIST_LEVEL;
DefaultStateValue[KeyStorage.BR_BOSS_ID] = BOSS_RUN_DEFAULT.BOSS_ID;


const GAME_PROGRESS = {
    SERVER: 1,
    CLIENT: 2
};

const langCode = {
    VN : "vi",
    GLOBAL: "en",
    PHIL: "ph",
    THAI: "th",
    MM: "mm",
    INDO: "id"
};

const packageNameAndroid = {
    VN:  "com.zps.match3_vn",
    GL2: "com.zps.match3",
    PH:  "com.zps.match3_ph",
    TH:  "com.zps.match3_th"
};
const AppType = {
    VN: "vn",
    GL: "gl2",
    PH: "ph",
    TH: "th",
    MM: 'mm',
    ID: "id"
};

const PAYMENT_SEA_ID = 50119;
const API_COUNTRY = 'https://sub.zingplay.com/mobile/openapi.php?&api=geoip2';

const GIFT_CODE_ERR = {
    SUCCESS: 0,
    FAIL: 1,
    GIFTCODE_NOT_EXIST: 50,
    GIFTCODE_EXPIRED: 51,
    GIFTCODE_LIMITED: 52,
    GIFTCODE_HAS_BEEN_USED: 53,
    GIFTCODE_NOT_ENOUGH_AGE: 54,
    GIFTCODE_NOT_ENOUGH_MATCH_PLAYED: 55,
    GIFTCODE_SERVER_BUSY: 56,
};

const MAP_PLAY = {
    NONE: -1,
    MAIN_LEVEL: 0,
    BOSS_RUN: 1
};