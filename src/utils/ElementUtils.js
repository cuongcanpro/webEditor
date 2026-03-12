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
        && type != BoardConst.ElementType.GEM_RANDOM;
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
    let bomb = [BoardConst.ElementType.MATCH_L, BoardConst.ElementType.MATCH_T];
    if (bomb.indexOf(type1) >= 0 && bomb.indexOf(type2) >= 0) return true;
    //rocket
    let rocket = [BoardConst.ElementType.MATCH_4_H, BoardConst.ElementType.MATCH_4_V];
    if (rocket.indexOf(type1) >= 0 && rocket.indexOf(type2) >= 0) return true;
    //cloud bomb vs color
    //rainbow
    let rainbow = [BoardConst.ElementType.MATCH_5, BoardConst.ElementType.PU5_PU, BoardConst.ElementType.PU5_PU5];
    if (rainbow.indexOf(type1) >= 0 && rainbow.indexOf(type2) >= 0) return true;
    return false;
}

ElementUtils.isMatch4 = function (type) {
    return type == BoardConst.ElementType.MATCH_4_H
        || type == BoardConst.ElementType.MATCH_4_V;
}

ElementUtils.isMatchTL = function (type) {
    return type == BoardConst.ElementType.MATCH_L
        || type == BoardConst.ElementType.MATCH_T;
}

ElementUtils.isMatchSquare = function (type) {
    return type == BoardConst.ElementType.MATCH_SQUARE;
}

ElementUtils.isMatch5 = function (type) {
    return type == BoardConst.ElementType.MATCH_5;
}

ElementUtils.getCombineType = function (type1, type2) {
    var type = null;
    var bonus = null;
    if (this.isMatch4(type1) && this.isMatch4(type2)) type = BoardConst.ElementType.PU4_PU4;
    else if (this.isMatch4(type1) && this.isMatchTL(type2)) type = BoardConst.ElementType.PU4_PU5TL;
    else if (this.isMatchTL(type1) && this.isMatch4(type2)) type = BoardConst.ElementType.PU4_PU5TL;
    else if (this.isMatchTL(type1) && this.isMatchTL(type2)) type = BoardConst.ElementType.PU5TL_PU5TL;
    else if (this.isMatchSquare(type1) && (this.isMatch4(type2) || this.isMatchTL(type2))) {
        type = BoardConst.ElementType.PUS_PU;
        bonus = type2;
    } else if ((this.isMatch4(type1) || this.isMatchTL(type1)) && this.isMatchSquare(type2)) {
        type = BoardConst.ElementType.PUS_PU;
        bonus = type1;
    } else if (this.isMatchSquare(type1) && this.isMatchSquare(type2)) type = BoardConst.ElementType.PUS_PUS;
    else if (this.isMatch5(type1) && this.isMatch5(type2)) type = BoardConst.ElementType.PU5_PU5;
    else if (this.isMatch5(type1) && (this.isMatch4(type2) || this.isMatchTL(type2) || this.isMatchSquare(type2))) {
        type = BoardConst.ElementType.PU5_PU;
        bonus = type2;
    } else if (this.isMatch5(type2) && (this.isMatch4(type1) || this.isMatchTL(type1) || this.isMatchSquare(type1))) {
        type = BoardConst.ElementType.PU5_PU;
        bonus = type1;
    }
    return { type: type, bonus: bonus };
}

ElementUtils.isMgrElement = function (type) {
    return type == BoardConst.ElementType.DONUT_MGR
        || type == BoardConst.ElementType.BOUNTY_MGR
        || type == BoardConst.ElementType.BALLOON
        || type == BoardConst.ElementType.PROTECT_BALLOON
        || type == BoardConst.ElementType.CHEST_KEY_MGR
        || type == BoardConst.ElementType.CLOUD_MGR
        || type == BoardConst.ElementType.CLOUD_BOMB_MGR
        || type == BoardConst.ElementType.SWITCH_FOG_MGR
        || type == BoardConst.ElementType.COLLECT_BALLOON_MGR;
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
        BoardConst.ElementType.MATCH_4_H,
        BoardConst.ElementType.MATCH_4_V,
        BoardConst.ElementType.MATCH_SQUARE,
        BoardConst.ElementType.MATCH_5,
        BoardConst.ElementType.MATCH_T
        // BoardConst.ElementType.MATCH_L
    ]
}

ElementUtils.getRandomPUType = function () {
    var listPU = this.getListPowerUp();
    return listPU[fr.generateRandomInt(0, listPU.length)];
}

ElementUtils.getDataNames = function (type) {
    switch (type) {
        case BoardConst.ElementType.SHAPE:
            return ["Is Source", "Is Donut port", "Prevent Replace By StartGame PUs", "Is Portal(0-None,1-Out,2-In)", "Portal ID"];
        case BoardConst.ElementType.GRASS:
        case BoardConst.ElementType.CHAIN:
            return ["Layer quantity (<3)"];
        case BoardConst.ElementType.BOX:
        case BoardConst.ElementType.COOKIE:
            return ["Layer quantity (<4)"];
        case BoardConst.ElementType.CHERRY:
            return ["Layer quantity (1<layer<6)"];
        case BoardConst.ElementType.DONUT_MGR:
            return ["Max quantity on board"]
        case BoardConst.ElementType.BOSS:
            // return ["HP", "Cooldown", "List summon type"]
            return ["HP", "Cooldown", "Num of Summon", { "name": "Element", "type": "select" }]
        case BoardConst.ElementType.BOSS_ELITE:
            // return ["HP", "Cooldown", "List summon type"]
            return ["HP", "Cooldown", "Num of Summon", { "name": "Element", "type": "select" }]
        case BoardConst.ElementType.BOSS_BUNNY:
            // return ["HP"]
            return ["HP"];
        case BoardConst.ElementType.BOSS_BUNNY_ELITE:
            // return ["HP"]
            return ["HP"];
        case BoardConst.ElementType.YETI:
            // return ["HP", "Cooldown", "List summon type"]
            return ["HP", "Cooldown"]
        case BoardConst.ElementType.BOSS_FIRE:
            // return ["HP", "Cooldown", "List summon type"]
            return ["HP", "Cooldown", "Num of Summon", { "name": "Element", "type": "select" }]
        case BoardConst.ElementType.BOSS_RAT_ONE_EYED:
            // return ["HP", "Cooldown", "List summon type"]
            return ["HP", "Cooldown"]
        case BoardConst.ElementType.BOSS_RAT_CANDY:
            // return ["HP", "Cooldown", "List summon type"]
            return ["HP", "Cooldown"]
        case BoardConst.ElementType.BALLOON:
            return ["HP max", "HP Increase", "Cooldown", "HP decrease"];
        case BoardConst.ElementType.BOUNTY_MGR:
            return ["Max quantity on board", "Bounty HP", "PU Weights\n (0-default,1-custom below)","Pháo ngang", "Pháo dọc", "Tên lửa", "Bom", "Đa sắc"];
        case BoardConst.ElementType.WINDUP_CAR:
            return ["HP", "Color (default: 1) (1-Green,2-Yellow,3-Red,4-Orange, 5-Pink,6-Cyan)", "Direction (0,90,180,270)"];
        case BoardConst.ElementType.CHEST_KEY_MGR:
            return ["Num unlock chest", "Max key on board"];
        case BoardConst.ElementType.TRAFFIC_LIGHT:
            return ["List color\n default: 3,2,1"];
        case BoardConst.ElementType.CLOUD_BOMB:
            return ["Color", "Cooldown", "Radius"];
        case BoardConst.ElementType.CLOUD_BOMB_MGR:
            return ["Cooldown", { name: "List percent\n(G, Y, R, O, P, C)", width: 330 }, "Max bomb"];
        case BoardConst.ElementType.PROTECT_BALLOON:
            return ["Hit point", "List hook col", "Rat vel up", "Rat vel down", "Rat damage", "Rat first step", "Rat max on board"];
        case BoardConst.ElementType.VALI:
            return ["X", "Y", { "name": "Element", "type": "select" }];
        case BoardConst.ElementType.SAFE:
            return ["Width", "Height", { "name": "Element", "type": "select" }, "Amount"];
        case BoardConst.ElementType.COLLECT_BALLOON:
            return ["0", "1", "2", "3", "5", "6", "7", "8"];
        case BoardConst.ElementType.SECRET_PEARL:
            return ["Num layer"];
        case BoardConst.ElementType.KING_RAT:
            // return ["HP", "Cooldown", "List summon type"]
            return ["HP", "Cooldown", "Num new color"]
        default:
            return [];
    }
}

ElementUtils.isBossElement = function (type) {
    return type == BoardConst.ElementType.BOSS
        || type == BoardConst.ElementType.YETI
        || type == BoardConst.ElementType.BOSS_FIRE
        || type == BoardConst.ElementType.KING_RAT
        || type == BoardConst.ElementType.BOSS_RAT_ONE_EYED
        || type == BoardConst.ElementType.BOSS_RAT_CANDY;
};

ElementUtils.isProgressTypeElement = function (type) {
    return this.isBossElement(type)
        || type == BoardConst.ElementType.PROTECT_BALLOON
        || type == BoardConst.ElementType.BALLOON;
};
