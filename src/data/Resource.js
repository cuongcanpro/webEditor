/**
 * Created by GSN on 6/2/2015.
 */

gv.SCREEN_ID = {
    LOADING: 0,
    LOGIN_SOCIAL: 1,
    LOBBY: 2,
};

gv.POPUP_ID = {};

gv.GUI_ID = {
    END_GAME: 1,
    LEVEL_INFO: 2,
    CURRENT_WIN_STREAK: 3,
    MAC_FACTORY_INFO: 4,
    CHEAT_RECIPE: 5,
    CRAFT: 6,
    CRAFT_DONE: 7,
    ALERT: 8,
    BUY_IN_GAME: 9,
    QUIT_GAME: 10,
    CHEAT: 11,
    TOOL: 12,
    BOARD_INFO: 13,
    START_GAME: 14,
    SUGGEST: 15,
    NOT_ENOUGH_STAR: 16,
    META_MISSION: 17
};

var res = {
    // default
    BTN_TEXTURE_TYPE: ccui.Widget.PLIST_TEXTURE,
    // font
    FONT_BITMAP_NUMBER_1: "bm_fonts/font_number_2.fnt",
    FONT_BITMAP_WIN: "bm_fonts/number_win-export.fnt",
    FONT_BITMAP_LOSE: "bm_fonts/number_lose-export.fnt",

    FONT_BITMAP_EFF_NUMBER: "bm_fonts/eff_number.fnt",
    FONT_BITMAP_CITY_SLOT: "bm_fonts/20.fnt",
    FONT_GAME_BOLD: "font/BalooPaaji2-Bold.ttf",
    FONT_GAME_SEMI_BOLD: "font/BalooPaaji2-SemiBold.ttf",
    FONT_GAME_MEDIUM: "font/BalooPaaji2-Medium.ttf",
    FONT_GAME_BLOOD: "font/font_game_bold.ttf",

    // zcsd
    ZCSD_ROOT: "",

    ZCSD_MAIN_LOBBY: "zcsd/lobby/MainLobby.json",
    ZCSD_TOP_PANEL: "zcsd/TopPanel.json",
    ZCSD_LAYER_NARRATIVE: "zcsd/lobby/LayerNarrative.json",
    ZCSD_STORY_MAP:"zcsd/lobby/NodeMap.json",

    // login social
    ZCSD_SCREEN_SOCIAL_LOGIN: "zcsd/login/ScreenSocialLogin.json",
    ZCSD_LAYER_REGISTER: "zcsd/login/LayerRegister.json",
    ZCSD_LAYER_LOGIN_ZM: "zcsd/login/LayerLoginZM.json",
    ZCSD_LAYER_DYNAMIC_LOADING: "zcsd/dynamicLoading/NodeLoading.json",
    ZCSD_GUI_PROGRESS: "zcsd/login/GUIProgress.json",
    ZCSD_NODE_CONFIRM_MAPPING: "zcsd/login/NodeConfirmMapping.json",

    // common
    ZCSD_COMMON_TEXT_NOTIFY: "zcsd/common/NodeTextNotify.json",
    ZCSD_LAYER_CLAIM_REWARD: "zcsd/common/LayerClaimReward.json",
    ZCSD_LAYER_TRYING: "zcsd/common/LayerTrying.json",
    ZCSD_NODE_RESOUCE_ITEM: "zcsd/common/ResourceItem.json",
    ZCSD_NODE_RESOUCE_ITEM_TOOLTIP: "zcsd/common/ResourceItemToolTip.json",
    ZCSD_NODE_COMMON_TOOLTIP: "zcsd/common/NodeCommonToolTip.json",
    ZCSD_NODE_REWARD: "zcsd/common/NodeReward.json",
    ZCSD_NODE_GLOBAL_GOLD_G: "zcsd/common/NodeGlobalGoldG.json",


    ZCSD_GUI_ALERT: "zcsd/alert/GUIAlert.json",
    ZCSD_LAYER_FREE_GOLD: "modules/newBieGift/zcsd/LayerLikeRateGetFreeGold.json",
    ZCSD_GUI_CLAIM_REWARD: "zcsd/event/event_collect/GUIClaimReward.json",

    ZCSD_GUI_CHEAT: "zcsd/design_tool/GUICheat.json",
    ZCSD_GUI_CHEAT_AD: "zcsd/design_tool/GUICheatAd.json",
    ZCSD_GUI_CHEAT_PACK: "zcsd/design_tool/GUICheatPack.json",
    ZCSD_GUI_CHEAT_RECIPE: "zcsd/design_tool/GUICheatRecipe.json",
    ZCSD_GUI_CHOOSE_ARTIFACT_TYPE: "zcsd/design_tool/GUIChooseArtifactType.json",
    ZCSD_GUI_SELECT_TIME: "zcsd/design_tool/GUISelectTime.json",
    ZCSD_LAYER_EDIT_BOARD: "zcsd/design_tool/LayerEditBoard.json",
    ZCSD_GUI_EDIT_BOARD_INFO: "zcsd/design_tool/GUIEditBoardInfo.json",
    ZCSD_NODE_NUMBER_FORM: "zcsd/design_tool/NodeNumberForm.json",
    ZCSD_GUI_SELECT_ELEMENT: "zcsd/design_tool/GUISelectElement.json",
    ZCSD_GUI_ELEMENT_FORM: "zcsd/design_tool/GUIElementForm.json",
    ZCSD_NODE_ELEMENT_FORM: "zcsd/design_tool/NodeElementForm.json",

    ZCSD_NODE_BOT_TEST: "zcsd/design_tool/NodeBotRun.json",
    ZCSD_GUI_SETTING: "zcsd/lobby/GUISetting.json",
    ZCSD_LAYER_LOBBY: "zcsd/lobby/LayerLobby.json",
    ZCSD_LAYER_TOOL: "zcsd/lobby/LayerTool.json",
    ZCSD_NODE_CLOUD: "zcsd/lobby/NodeCloud.json",
    ZCSD_LAYER_MAP: "zcsd/game/LayerMap.json",
    ZCSD_LAYER_TEST_FLY: "zcsd/game/LayerTestFly.json",
    ZCSD_LAYER_SELECT_MAP: "zcsd/design_tool/LayerSelectMap.json",
    ZCSD_LAYER_MAIN_BOARD: "zcsd/game/LayerMainBoard.json",
    ZCSD_GUI_BOARD_INFO: "zcsd/game/GUIBoardInfo.json",
    ZCSD_GUI_TOOL: "zcsd/game/GUITool.json",
    ZCSD_NODE_CHEAT: "zcsd/game/NodeCheat.json",
    ZCSD_GUI_ITEM_BOOSTER: "zcsd/game/ItemBooster.json",
    ZCSD_GUI_START_GAME: "zcsd/game/GUIStartGame.json",
    ZCSD_GUI_SUGGEST: "zcsd/game/GUISuggest.json",
    ZCSD_GUI_LOADING_BOARD: "zcsd/game/GUILoadingBoard.json",
    ZCSD_GUI_END_GAME: "zcsd/game/GUIEndGame.json",
    ZCSD_GUI_LEVEL_INFO: "zcsd/game/popup/GUILevelInfo.json",
    ZCSD_GUI_QUIT_GAME: "zcsd/game/GUIQuitGame.json",
    ZCSD_NODE_COMPLETE_TEXT: "zcsd/game/NodeCompleteText.json",
    ZCSD_NODE_ITEM_BONUS_BUY_MOVE: "zcsd/game/NodeItemBonusBuyMove.json",
    ZCSD_NODE_WIN_TARGET: "zcsd/game/NodeWinTarget.json",
    ZCSD_NODE_POPUP_GUI_END_GAME: "zcsd/game/NodePopupGUIEndGame.json",
    ZCSD_NODE_SETTING_VELOCITY: "zcsd/design_tool/NodeSettingVelocity.json",
    ZCSD_GUI_LOGIN: "zcsd/login/GUILogin.json",
    ZCSD_LAYER_DAILY_LOGIN: "zcsd/dailyLogin/LayerDailyLogin.json",
    ZCSD_LAYER_GIFT_CODE: "zcsd/lobby/LayerGC.json",
    ZCSD_GUI_MINI_SAGA: "zcsd/game/minisaga/GUIMiniSaga.json",
    ZCSD_NODE_SAGA_POINT: "zcsd/game/minisaga/NodeSagaPoint.json",

    //Saga
    ZCSD_LAYER_SAGA: "zcsd/lobby/saga/LayerSaga.json",
    ZCSD_LAYER_SAGA_CELL: "zcsd/lobby/saga/LayerSagaCell.json",
    ZCSD_LAYER_SAGA_NODE: "zcsd/lobby/saga/LayerSagaNode.json",
    ZCSD_LAYER_SAGA_WORLD: "zcsd/lobby/saga/LayerSagaWorld.json",
    ZCSD_LAYER_SAGA_WORLD_MAP_NODE: "zcsd/lobby/saga/MapNode.json",
    ZCSD_LAYER_WORLD_SCROLL: "zcsd/lobby/saga/LayerWorldScroll.json",

    // ranking
    ZCSD_LAYER_RANKING: "zcsd/ranking/LayerRanking.json",
    ZCSD_NODE_RANKING_USER: "zcsd/ranking/NodeRankingUser.json",

    // event
    ZCSD_EVENT_COLLECT_POPUP: "zcsd/event/event_collect/GUIEventCollect.json",
    ZCSD_EVENT_COLLECT_PROGRESS: "zcsd/event/event_collect/GUIProgress.json",
    ZCSD_EVENT_COLLECT_NODE_ADD: "zcsd/event/event_collect/NodeAddElement.json",

    // craft machine
    ZCSD_GUI_ARTIFACT_CRAFT_DONE: "zcsd/craft_machine/GUIArtifactCraftDone.json",
    ZCSD_GUI_ARTIFACT_INFO: "zcsd/craft_machine/GUIArtifactInfo.json",
    ZCSD_GUI_CATALOGUE: "zcsd/craft_machine/GUICatalogue.json",
    ZCSD_GUI_CONFIRM_UN_DISPLAY: "zcsd/craft_machine/GUIConfirmUnDisplay.json",
    ZCSD_GUI_CRAFT: "zcsd/craft_machine/GUICraft.json",
    ZCSD_GUI_INVENTORY: "zcsd/craft_machine/GUIInventory.json",
    ZCSD_LAYER_CRAFT: "zcsd/craft_machine/LayerCraft.json",
    ZCSD_NODE_ARTIFACT: "zcsd/craft_machine/NodeArtifact.json",
    ZCSD_NODE_CARD: "zcsd/craft_machine/NodeCard.json",
    ZCSD_NODE_CATALOGUE_ITEM: "zcsd/craft_machine/NodeCatalogueItem.json",
    ZCSD_NODE_RECIPE: "zcsd/craft_machine/NodeRecipe.json",
    ZCSD_BTN_CRAFT: "zcsd/craft_machine/BtnCraft.json",

    // win streak
    ZCSD_GUI_LOSE_WIN_STREAK: "zcsd/win_streak/GUIAlertLoseBonus.json",
    ZCSD_GUI_CURRENT_STREAK: "zcsd/win_streak/GUICurrentStreak.json",
    ZCSD_GUI_WIN_STREAK_INFO: "zcsd/win_streak/GUIMacFactoryInfo.json",

    // element
    ZCSD_NODE_101: "zcsd/element/Node_101.json",
    ZCSD_NODE_106: "zcsd/element/Node_106.json",
    ZCSD_NODE_104: "zcsd/element/Node_104.json",
    ZCSD_NODE_300: "zcsd/element/Node_300.json",
    ZCSD_NODE_2400_TIME: "zcsd/element/Node_2400_time.json",

    // tutorial
    ZCSD_LAYER_TUT_START_GAME: "zcsd/tutorial/LayerTutorialStartGame.json",
    ZCSD_LAYER_LAYER_CUTSCENE: "zcsd/tutorial/LayerCutscene.json",
    ZCSD_NODE_NPC_DIALOG: "zcsd/tutorial/NodeNpcDialog.json",
    ZCSD_NODE_TOOLTIP_UNLOCK: "zcsd/tutorial/NodeToolTopUnlock.json",

    // payment + shop
    ZCSD_GUI_BUY_IN_GAME: "zcsd/shop/GUIBuyInGame.json",
    ZCSD_GUI_SHOP: "zcsd/shop/GUIShop.json",
    ZCSD_NODE_BUY_G_CHANNEL: "zcsd/shop/NodeBuyGChannel.json",
    ZCSD_NODE_SHOP_BONUS_ITEM: "zcsd/shop/NodeShopBonusItem.json",
    ZCSD_NODE_SHOP_ITEM_0: "zcsd/shop/NodeShopItemVertical.json",
    ZCSD_NODE_SHOP_ITEM_1: "zcsd/shop/NodeShopItemHorizontal_0_1.json",
    ZCSD_NODE_SHOP_ITEM_2: "zcsd/shop/NodeShopItemHorizontal_2_4.json",
    ZCSD_NODE_SHOP_ITEM_3: "zcsd/shop/NodeShopItemHorizontal_5_6.json",
    ZCSD_LAYER_SELECT_BANK: "zcsd/shop/LayerSelectBank.json",
    ZCSD_LAYER_SELECT_SMS: "zcsd/shop/LayerSelectSms.json",
    ZCSD_LAYER_SMS_CODE: "zcsd/shop/LayerSmsCode.json",
    ZCSD_LAYER_SELECT_METHODS: "zcsd/shop/LayerChooseToBuy.json",
    ZCSD_LAYER_ZING_CARD: "zcsd/shop/LayerZingCard.json",
    ZCSD_POPUP_FAKE_PURCHASE: "zcsd/shop/PopupFakePurchase.json",

    //offer
    ZCSD_LAYER_OFFER_COMMON: "zcsd/offer/LayerOfferCommon.json",
    ZCSD_LAYER_OFFER_NEWBIE_1: "zcsd/offer/LayerOfferNewbie1.json",
    ZCSD_LAYER_OFFER_NEWBIE_3: "zcsd/offer/LayerOfferNewbie3.json",
    ZCSD_LAYER_OFFER_ITEM_SHOP: "zcsd/offer/NodeShopItemOffer.json",
    ZCSD_BTN_OFFER_MITU: "zcsd/offer/NodeBtnOfferMitu.json",
    ZCSD_BTN_OFFER_COMMON: "zcsd/offer/NodeBtnCommonOffer.json",

    // ads
    ZCSD_NODE_LUCKY_WHEEL: "zcsd/ads/NodeLuckyWheel.json",
    ZCSD_POPUP_ADS_HEART: "zcsd/ads/PopupAdsHeart.json",
    ZCSD_POPUP_ADS_WIN_STREAK: "zcsd/ads/PopupAdsWinStreak.json",

    // Meta
    ZCSD_GUI_NOT_ENOUGH_STAR: "zcsd/meta/GUINotEnoughStar.json",
    ZCSD_LAYER_META: "zcsd/meta/LayerMeta.json",
    ZCSD_NODE_GALLERY_ITEM: "zcsd/meta/NodeGalleryItem.json",
    ZCSD_NODE_GALLERY_ITEM_PUZZLE: "zcsd/meta/NodeGalleryItemPuzzle.json",
    ZCSD_NODE_META_MISSION: "zcsd/meta/NodeMetaMission.json",
    ZCSD_NODE_PUZZLE: "zcsd/meta/NodePuzzle.json",
    ZCSD_GUI_META_MISSION: "zcsd/meta/GUIMetaMission.json",
    ZCSD_NODE_TOOLTIP_ACTION_COST: "zcsd/meta/NodeTooltipActionCost.json",
    ZCSD_GUI_CHEAT_META: "zcsd/design_tool/GUICheatMeta.json",
    ZCSD_NODE_TOOLTIP_META_REWARD: "zcsd/meta/NodeTooltipMetaReward.json",
    ZCSD_NODE_PUZZLE_COMPLETE: "zcsd/meta/NodePuzzleComplete.json",
    ZCSD_NODE_TOOLTIP_META_MISSION: "zcsd/meta/NodeTooltipMetaMission.json",
    ZCSD_LAYER_META_INFO: "zcsd/meta/LayerMetaInfo.json",

    // OnBoarding
    ZCSD_NODE_ONBOARDING_NPC_TALK_ACTION: "zcsd/meta/on_boarding/NodeOnBoardingNPCTalkAction.json",

    // Test:
    ZCSD_LAYER_TEST_DAILY_LOGIN: "zcsd/test/LayerTestDailyLogin.json",
    ZCSD_LAYER_TEST_ADVT: "zcsd/test/LayerTestAdvt.json",
    ZCSD_LAYER_TEST_BOSS_RUN: "zcsd/test/LayerTestBossRun.json",

    ZCSD_GUI_RATTING: "zcsd/lobby/rating/LayerRating.json",

    // sky race
    LAYER_START_SKY_RACE: "modules/skyRace/zcsd/LayerStartSkyRace.json",
    LAYER_LEADER_BOARD_SKY_RACE: "modules/skyRace/zcsd/LayerSkyLeaderBoard.json",
    NODE_ICON_SKY_RACE:"modules/skyRace/zcsd/NodeIconSkyRace.json",
    LAYER_SHOW_GIFT:"modules/skyRace/zcsd/LayerShowGift.json",
    NODE_ITEM_GIFT:"modules/skyRace/zcsd/NodeItemGift.json",
    NODE_CHEAT_SKY_RACE: "modules/skyRace/zcsd/NodeCheatSkyRace.json",
    LAYER_LOADING: "modules/skyRace/zcsd/LayerLoading.json",
    avatar_sky_mask: 'modules/skyRace/res/mask.png',

    // boss run
    ZCSD_BTN_BOSS_RUN: "modules/bossRun/zcsd/BtnBossRun.json",
    ZCSD_LAYER_SAGA_BOSS_RUN: "modules/bossRun/zcsd/LayerSagaBossRun.json",
    ZCSD_LAYER_WELCOME_BOSS_RUN: "modules/bossRun/zcsd/LayerWelcomeBossRun.json",
    ZCSD_LAYER_INFO_BOSS_RUN: "modules/bossRun/zcsd/LayerBossInfo.json",
    ZCSD_LAYER_WIN_BOSS_RUN: "modules/bossRun/zcsd/LayerWinBossRun.json",
    ZCSD_NODE_STEP_BOSS_RUN: "modules/bossRun/zcsd/NodeStepBossRun.json",

    // Event launching
    ZCSD_LAYER_LAUNCHING: "modules/eventLaunching/zcsd/LayerEventLaunching.json",
    ZCSD_NODE_LAUNCHING_BTN: "modules/eventLaunching/zcsd/NodeLaunchingBtn.json",
    ZCSD_NODE_LAUNCHING_STEP: "modules/eventLaunching/zcsd/NodeLaunchingStep.json",

    // Inbox
    ZCSD_LAYER_INBOX: "modules/inbox/zcsd/LayerInbox.json",
    ZCSD_BTN_INBOX: "modules/inbox/zcsd/BtnInbox.json",
    ZCSD_NODE_INBOX_ITEM: "modules/inbox/zcsd/NodeInboxItem.json",

    // common png images:
    blank_background: "no_pack/shop/blank_background.png",
    img_shadow: "game/element/shadow_common.png",
    avatar_bg: "login/avatar_bg.png",
    avatar_frame: "login/avatar_frame.png",
    img_slash: "no_pack/slash.png",

    ZCSD_LAYER_LOG: "zcsd/LayerLog.json"
};


var shader = {
    vertex_normal: "shaders/ccShader_PositionTextureColor_noMVP.vert",
    frag_normal: "shaders/ccShader_PositionTextureColor_noMVP.frag",
    frag_gray_scale: "shaders/gray_shader_sprite.fsh",
    frag_avatar: "shaders/card_char.fsh",
};

if (!cc.sys.isNative) {
    res.FONT_GAME_BOLD = "font_game_bold";
}

var seq_match = {
    background: "game/gui/seq_match/bgSeq.png",
    seq_0: ["localize/seq_0_0.png","localize/seq_0_1.png"],
    seq_1: ["localize/seq_1_0.png", "localize/seq_1_1.png"],
    seq_2: ["localize/seq_2.png"],
    seq_3: ["localize/seq_3.png"],
    seq_4: ["localize/seq_4.png"]
};

var progress_bar = {
    balloon_bg: "game/board/progress_bar/balloon_progress_bar_bg.png",
    balloon_bg_1: "game/board/progress_bar/balloon_progress_bar_bg_1.png",
    balloon: "game/board/progress_bar/balloon_progress_bar.png",
    balloon_divider: "game/board/progress_bar/balloon_progress_bar_divider.png",
    balloon_number_bg: "game/board/progress_bar/balloon_progress_bar_number_bg.png",
    gorilla_bg: "game/board/progress_bar/boss_progress_bar_bg.png",
    gorilla: "game/board/progress_bar/boss_progress_bar.png",
    gorilla_back: "game/board/progress_bar/boss_progress_bar_1.png",
    windup_car_bg: "game/board/progress_bar/progress_xecot_01.png",
    windup_car: "game/board/progress_bar/progress_xecot_02.png",
    windup_car_bubble: "game/board/progress_bar/progress_xecot_03.png",

    bunny_bg: "game/board/progress_bar/bunny_progress_bar_bg.png",
    bunny: "game/board/progress_bar/bunny_progress_bar.png",
    bunny_back: "game/board/progress_bar/bunny_progress_bar_1.png"
};

var element_bg = {
    traffic_light: "game/board/nen/bg_traffic_light.png",
    gorilla_01: "game/board/nen/bg_gorilla_01.png",
    gorilla_02: "game/board/nen/bg_gorilla_02.png"
};

var select_box = "game/board/nen/select_box.png";
var remove_slot = "game/board/nen/remove_item.png";
var check_icon = "lobby/icon_check.png";

var resourceItemPath = {
    0: "items/gold.png",
    1: "items/g.png",
    2: "items/life.png",
    3: "items/life.png",
    6: "items/star.png",
    30: "items/booster_1.png",
    31: "items/booster_2.png",
    32: "items/booster_0.png",
    33: "items/booster_1.png",
    34: "items/booster_2.png",
    35: "items/booster_0.png",
    40: "items/tool_1.png",
    41: "items/tool_2.png",
    42: "items/tool_0.png",
    50: "items/pack_card.png",
    51: "items/cheese_skin_@i@.png",
    52: "items/avatar_frame_@i@.png",
    "timer": "event_collect/icon_timer.png"
};

var reward_icon = {
    0: "currency/gold.png",
    1: "currency/g.png",
    2: "currency/life.png",
    3: "currency/life.png",
    6: "items/star.png",
    30: "game/gui/booster/booster_1.png",
    31: "game/gui/booster/booster_2.png",
    32: "game/gui/booster/booster_0.png",
    33: "game/gui/booster/booster_1.png",
    34: "game/gui/booster/booster_2.png",
    35: "game/gui/booster/booster_0.png",
    40: "game/gui/tool/tool_1.png",
    41: "game/gui/tool/tool_2.png",
    42: "game/gui/tool/tool_0.png",
    50: "craft_machine/pack_card.png",
    "timer": "event_collect/icon_timer.png"
};

var lobby_res = {
    play_normal: "lobby/play.png",
    play_medium: "lobby/play_medium.png",
    play_hard: "lobby/play_hard.png"
};

var gui_level_info_res = {
    bg: [
        "lobby/bg_level_info_normal.png",
        "lobby/bg_level_info_normal.png",
        "lobby/bg_level_info_normal.png",
        "lobby/bg_level_info_medium.png",
        "lobby/bg_level_info_hard.png"
    ],
    button_play: [
        "button/btn_orange.png",
        "button/btn_orange.png",
        "button/btn_orange.png",
        "button/btn_red.png",
        "button/btn_red.png"
    ],
    star_normal: "lobby/level_info_star_normal.png",
    star_hard: "lobby/level_info_star_hard.png",
    bg_target_normal: "gui_background/bg_target_normal.png",
    bg_target_hard: "gui_background/bg_target_hard.png",
    bg_win_streak_normal: "gui_background/bg_level_info_winstreak_normal.png",
    bg_win_streak_hard: "gui_background/bg_level_info_winstreak_hard.png",

    bg_booster: "lobby/bg_booster.png",
    bg_booster_select: "lobby/bg_booster_select.png",
    bg_booster_disable: "lobby/bg_booster_disable.png",
};

var gui_start_game_res = {
    bg_target: "game/gui/start_game/start_game_objective_bg.png",
    bg_target_objective: "lobby/bg_target.png"
};

var win_streak_res = {
    bg_progress: "winstreak/bg_progress.png",
    bg_progress_1: "winstreak/bg_progress_1.png",
    progress: "winstreak/progress.png",
    progress_splitter: "winstreak/progress_splitter.png",
    bottle: ["winstreak/bottle_01.png", "winstreak/bottle_02.png", "winstreak/bottle_02.png", "winstreak/bottle_03.png"]
};

var craft_res = {
    btn_craft_recipe_normal: "craft_machine/btn_craft.png",
    btn_craft_recipe_disable: "craft_machine/btn_craft_2.png",
    btn_craft_recipe_cool_down: "craft_machine/btn_craft_1.png",
    icon_notification: "lobby/noti.png",
    bg_recipe_normal: "craft_machine/bg_recipe_1.png",
    bg_recipe_cool_down: "craft_machine/bg_recipe.png",
    bg_card_opening: "craft_machine/card_opening.png",
    shelf: "craft_machine/shelf_holder.png",
    slot_holder: "craft_machine/slot_holder.png",
    add_button: "craft_machine/add_to_shelf.png",
    bg_title: "craft_machine/bg_title.png",
    bg_title_unavailable: "craft_machine/bg_title_unavailable.png",
    bg_catalogue_item_display: "craft_machine/bg_catalogue_item_display.png",
    bg_catalogue_item_undisplay: "craft_machine/bg_catalogue_item_undisplay.png",
    icon_card: "craft_machine/icon_card.png",
    icon_upgrade: "craft_machine/icon_upgrade.png",
    artifact_progress: "craft_machine/artifact_progress_2.png",
    artifact_progress_full: "craft_machine/artifact_progress_1.png"
};

var tutorial_res = {
    bubble_talk_bg: "tutorial/text_bg.png",
    bubble_talk_arrow: "tutorial/text_arrow.png",
    arrow_up: "tutorial/arrow_1.png",
    arrow_down: "tutorial/arrow_2.png",
    arrow_left: "tutorial/arrow_3.png",
    arrow_right: "tutorial/arrow_4.png"
};

var left_cloud = "game/gui/end_game/clothB1.png";
var right_cloud = "game/gui/end_game/clothB2.png";

var ranking_res = {
    user_node_bg: "ranking/bg_ranking_user.png",
    user_node_self_bg: "ranking/bg_ranking_self.png",
    button_quick_scroll: "ranking/btn_quick_scroll.png"
};

var meta_res = {
    bg_puzzle_full: 'meta/bg_puzzle_1.png',
    bg_puzzle_locked: 'meta/bg_puzzle_2.png',
    bg_current_puzzle: 'meta/bg_puzzle.png',
    part_cover: "meta/part.png",
    locked_image: "meta/locked_puzzle.png",
    progress_splitter: "winstreak/progress_splitter.png",
    puzzle_frame: "meta/puzzle_frame.png",
    full_puzzle_frame: "meta/full_puzzle_frame.png"
};

var launchingRes = {
    progressBtn: "modules/eventLaunching/res/btn/progressBtn.png",
    icon_step_current: "modules/eventLaunching/res/progress/3.png",
    icon_step_passed: "modules/eventLaunching/res/progress/4.png",
    icon_step_remain: "modules/eventLaunching/res/progress/5.png",
    icon_key: "modules/eventLaunching/res/progressKey/key.png",
    connect_line_locked: "modules/eventLaunching/res/step/connect_0.png",
    connect_line_unlocked: "modules/eventLaunching/res/step/connect_1.png",
    step_bg_received: "modules/eventLaunching/res/step/bg1.png",
    step_bg_remain: "modules/eventLaunching/res/step/bg.png",
    step_bg_remain_final: "modules/eventLaunching/res/step/bg_end.png",
};