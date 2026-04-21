/**
 * Created by AnhLMT on 8/20/2020.
 */
var ElementUtils = ElementUtils || {};

ElementUtils.getProps = function (type) {
    // type = this.convertType(type).type;
    return gv.elementCfg.get(type) || {};
}

ElementUtils.isSpace = function (type) {
    if (type == null) return false;
    return !!this.getProps(type)['isSpace'];
}

ElementUtils.canMatching = function (type) {
    if (type == null) return false;
    return !!this.getProps(type)['canMatching'];
}

ElementUtils.isBasicGem = function (type) {
    return this.isGem(type) && !this.isPowerUp(type)
        && type != CoreGame.Config.ElementType.GEM_RANDOM;
}

ElementUtils.isGem = function (type) {
    if (type == null) return false;
    return !!this.getProps(type)['isGem'];
}

ElementUtils.isPowerUp = function (type) {
    if (type == null) return false;
    return !!this.getProps(type)['isPowerUp'];
}

ElementUtils.isBlocker = function (type) {
    if (type == null) return false;
    return !!this.getProps(type)['isBlocker'];
}

ElementUtils.isMovable = function (type) {
    if (type == null) return false;
    return !!this.getProps(type)['isMovable'];
}

ElementUtils.isLayered = function (type) {
    if (type == null) return false;
    return !!this.getProps(type)['isLayered'];
}

ElementUtils.isMatchOn = function (type) {
    if (type == null) return false;
    return !!this.getProps(type)['isMatchOn'];
}

ElementUtils.isMatchBeside = function (type) {
    if (type == null) return false;
    return !!this.getProps(type)['isMatchBeside'];
}

ElementUtils.isExplosionBeside = function (type) {
    if (type == null) return false;
    return !!this.getProps(type)['isExplosionBeside'];
}

ElementUtils.isRemovable = function (type) {
    if (type == null) return false;
    return !!this.getProps(type)['isRemovable'];
}

ElementUtils.isPenetrable = function (type) {
    if (type == null) return false;
    return !!this.getProps(type)['isPenetrable'];
}

ElementUtils.isLock = function (type) {
    if (type == null) return false;
    return !!this.getProps(type)['isLock'];
}

ElementUtils.isCollectible = function (type) {
    if (type == null) return false;
    return !!this.getProps(type)['isCollectible'];
}

ElementUtils.isSameType = function (type1, type2) {
    if (type1 == type2) return true;
    //bomb
    let bomb = [CoreGame.Config.ElementType.MATCH_L, CoreGame.Config.ElementType.MATCH_T];
    if (bomb.indexOf(type1) >= 0 && bomb.indexOf(type2) >= 0) return true;
    //rocket
    let rocket = [CoreGame.Config.ElementType.MATCH_4_H, CoreGame.Config.ElementType.MATCH_4_V];
    if (rocket.indexOf(type1) >= 0 && rocket.indexOf(type2) >= 0) return true;
    //cloud bomb vs color
    //rainbow
    let rainbow = [CoreGame.Config.ElementType.MATCH_5, CoreGame.Config.ElementType.PU5_PU, CoreGame.Config.ElementType.PU5_PU5];
    if (rainbow.indexOf(type1) >= 0 && rainbow.indexOf(type2) >= 0) return true;
    return false;
}

ElementUtils.isMatch4 = function (type) {
    return type == CoreGame.Config.ElementType.MATCH_4_H
        || type == CoreGame.Config.ElementType.MATCH_4_V;
}

ElementUtils.isMatchTL = function (type) {
    return type == CoreGame.Config.ElementType.MATCH_L
        || type == CoreGame.Config.ElementType.MATCH_T;
}

ElementUtils.isMatchSquare = function (type) {
    return type == CoreGame.Config.ElementType.MATCH_SQUARE;
}

ElementUtils.isMatch5 = function (type) {
    return type == CoreGame.Config.ElementType.MATCH_5;
}

ElementUtils.getCombineType = function (type1, type2) {
    var type = null;
    var bonus = null;
    if (this.isMatch4(type1) && this.isMatch4(type2)) type = CoreGame.Config.ElementType.PU4_PU4;
    else if (this.isMatch4(type1) && this.isMatchTL(type2)) type = CoreGame.Config.ElementType.PU4_PU5TL;
    else if (this.isMatchTL(type1) && this.isMatch4(type2)) type = CoreGame.Config.ElementType.PU4_PU5TL;
    else if (this.isMatchTL(type1) && this.isMatchTL(type2)) type = CoreGame.Config.ElementType.PU5TL_PU5TL;
    else if (this.isMatchSquare(type1) && (this.isMatch4(type2) || this.isMatchTL(type2))) {
        type = CoreGame.Config.ElementType.PUS_PU;
        bonus = type2;
    } else if ((this.isMatch4(type1) || this.isMatchTL(type1)) && this.isMatchSquare(type2)) {
        type = CoreGame.Config.ElementType.PUS_PU;
        bonus = type1;
    } else if (this.isMatchSquare(type1) && this.isMatchSquare(type2)) type = CoreGame.Config.ElementType.PUS_PUS;
    else if (this.isMatch5(type1) && this.isMatch5(type2)) type = CoreGame.Config.ElementType.PU5_PU5;
    else if (this.isMatch5(type1) && (this.isMatch4(type2) || this.isMatchTL(type2) || this.isMatchSquare(type2))) {
        type = CoreGame.Config.ElementType.PU5_PU;
        bonus = type2;
    } else if (this.isMatch5(type2) && (this.isMatch4(type1) || this.isMatchTL(type1) || this.isMatchSquare(type1))) {
        type = CoreGame.Config.ElementType.PU5_PU;
        bonus = type1;
    }
    return { type: type, bonus: bonus };
}

ElementUtils.isMgrElement = function (type) {
    return type == CoreGame.Config.ElementType.DONUT_MGR
        || type == CoreGame.Config.ElementType.BOUNTY_MGR
        || type == CoreGame.Config.ElementType.BALLOON
        || type == CoreGame.Config.ElementType.PROTECT_BALLOON
        || type == CoreGame.Config.ElementType.CHEST_KEY_MGR
        || type == CoreGame.Config.ElementType.CLOUD_MGR
        || type == CoreGame.Config.ElementType.CLOUD_BOMB_MGR
        || type == CoreGame.Config.ElementType.SWITCH_FOG_MGR
        || type == CoreGame.Config.ElementType.COLLECT_BALLOON_MGR;
}

ElementUtils.createObj = function (type, percentGem) {
    var obj = {};
    var tmp = BoardUtils.convertType(type);
    if (ElementUtils.isLayered(type)) {
        obj.num = tmp.num;
    }
    obj.type = tmp.type;
    return obj;
}

ElementUtils.getListPowerUp = function () {
    return [
        CoreGame.Config.ElementType.MATCH_4_H,
        CoreGame.Config.ElementType.MATCH_4_V,
        CoreGame.Config.ElementType.MATCH_SQUARE,
        CoreGame.Config.ElementType.MATCH_5,
        CoreGame.Config.ElementType.MATCH_T
        // CoreGame.Config.ElementType.MATCH_L
    ]
}

ElementUtils.getRandomPUType = function () {
    var listPU = this.getListPowerUp();
    return listPU[fr.generateRandomInt(0, listPU.length)];
}

ElementUtils.getDataNames = function (type) {
    switch (type) {
        case CoreGame.Config.ElementType.SHAPE:
            return ["Is Source", "Is Donut port", "Prevent Replace By StartGame PUs", "Is Portal(0-None,1-Out,2-In)", "Portal ID"];
        case CoreGame.Config.ElementType.GRASS:
        case CoreGame.Config.ElementType.CHAIN:
            return ["Layer quantity (<3)"];
        case CoreGame.Config.ElementType.BOX:
        case CoreGame.Config.ElementType.COOKIE:
            return ["Layer quantity (<4)"];
        case CoreGame.Config.ElementType.CHERRY:
            return ["Layer quantity (1<layer<6)"];
        case CoreGame.Config.ElementType.DONUT_MGR:
            return ["Max quantity on board"]
        case CoreGame.Config.ElementType.BOSS:
            // return ["HP", "Cooldown", "List summon type"]
            return ["HP", "Cooldown", "Num of Summon", { "name": "Element", "type": "select" }]
        case CoreGame.Config.ElementType.BOSS_ELITE:
            // return ["HP", "Cooldown", "List summon type"]
            return ["HP", "Cooldown", "Num of Summon", { "name": "Element", "type": "select" }]
        case CoreGame.Config.ElementType.BOSS_BUNNY:
            // return ["HP"]
            return ["HP"];
        case CoreGame.Config.ElementType.BOSS_BUNNY_ELITE:
            // return ["HP"]
            return ["HP"];
        case CoreGame.Config.ElementType.YETI:
            // return ["HP", "Cooldown", "List summon type"]
            return ["HP", "Cooldown"]
        case CoreGame.Config.ElementType.BOSS_FIRE:
            // return ["HP", "Cooldown", "List summon type"]
            return ["HP", "Cooldown", "Num of Summon", { "name": "Element", "type": "select" }]
        case CoreGame.Config.ElementType.BOSS_RAT_ONE_EYED:
            // return ["HP", "Cooldown", "List summon type"]
            return ["HP", "Cooldown"]
        case CoreGame.Config.ElementType.BOSS_RAT_CANDY:
            // return ["HP", "Cooldown", "List summon type"]
            return ["HP", "Cooldown"]
        case CoreGame.Config.ElementType.BALLOON:
            return ["HP max", "HP Increase", "Cooldown", "HP decrease"];
        case CoreGame.Config.ElementType.BOUNTY_MGR:
            return ["Max quantity on board", "Bounty HP", "PU Weights\n (0-default,1-custom below)","Pháo ngang", "Pháo dọc", "Tên lửa", "Bom", "Đa sắc"];
        case CoreGame.Config.ElementType.WINDUP_CAR:
            return ["HP", "Color (default: 1) (1-Green,2-Yellow,3-Red,4-Orange, 5-Pink,6-Cyan)", "Direction (0,90,180,270)"];
        case CoreGame.Config.ElementType.CHEST_KEY_MGR:
            return ["Num unlock chest", "Max key on board"];
        case CoreGame.Config.ElementType.TRAFFIC_LIGHT:
            return ["List color\n default: 3,2,1"];
        case CoreGame.Config.ElementType.CLOUD_BOMB:
            return ["Color", "Cooldown", "Radius"];
        case CoreGame.Config.ElementType.CLOUD_BOMB_MGR:
            return ["Cooldown", { name: "List percent\n(G, Y, R, O, P, C)", width: 330 }, "Max bomb"];
        case CoreGame.Config.ElementType.PROTECT_BALLOON:
            return ["Hit point", "List hook col", "Rat vel up", "Rat vel down", "Rat damage", "Rat first step", "Rat max on board"];
        case CoreGame.Config.ElementType.VALI:
            return ["X", "Y", { "name": "Element", "type": "select" }];
        case CoreGame.Config.ElementType.SAFE:
            return ["Width", "Height", { "name": "Element", "type": "select" }, "Amount"];
        case CoreGame.Config.ElementType.COLLECT_BALLOON:
            return ["0", "1", "2", "3", "5", "6", "7", "8"];
        case CoreGame.Config.ElementType.SECRET_PEARL:
            return ["Num layer"];
        case CoreGame.Config.ElementType.KING_RAT:
            // return ["HP", "Cooldown", "List summon type"]
            return ["HP", "Cooldown", "Num new color"]
        default:
            return [];
    }
}

ElementUtils.isBossElement = function (type) {
    return true;
    return type == CoreGame.Config.ElementType.BOSS
        || type == CoreGame.Config.ElementType.YETI
        || type == CoreGame.Config.ElementType.BOSS_FIRE
        || type == CoreGame.Config.ElementType.KING_RAT
        || type == CoreGame.Config.ElementType.BOSS_RAT_ONE_EYED
        || type == CoreGame.Config.ElementType.BOSS_RAT_CANDY;
};

ElementUtils.isProgressTypeElement = function (type) {
    return this.isBossElement(type)
        || type == CoreGame.Config.ElementType.PROTECT_BALLOON
        || type == CoreGame.Config.ElementType.BALLOON;
};
