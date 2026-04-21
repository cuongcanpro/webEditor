/**
 * Created by GSN on 6/2/2015.
 */

gv.SCREEN_ID = {
    LOADING: 0,
    LOGIN_SOCIAL: 1,
    LOBBY: 2,
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

    // sky race
    avatar_sky_mask: 'modules/skyRace/res/mask.png',

    // common png images:
    blank_background: "no_pack/shop/blank_background.png",
    img_shadow: "game/element/shadow_common.png",
    avatar_bg: "login/avatar_bg.png",
    avatar_frame: "login/avatar_frame.png",
    img_slash: "no_pack/slash.png"
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
