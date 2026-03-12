
const AVATAR_FRAME = {
    DEFAULT: 0,
    LAUNCHING_EVENT: 2
};

const CHEESE_SKIN = {
    DEFAULT: 0,
    LAUNCHING_EVENT: 2
};

const COSTUME_ANIM = {
    template_cheese_lobby_skin: "game/animation/effekseer/character/cheese_lobby_@id@",
};

const COSTUME_IMG = {
    template_avatar_frame: "costume/avatarFrame/avatarFrame_@id@.png",
};

gv.getCostumeOwnedKey = function (costumeKey) {
    return "l_" + costumeKey;
};