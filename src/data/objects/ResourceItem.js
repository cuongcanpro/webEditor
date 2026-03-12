
var ResourceItem = cc.Class.extend({
    ctor: function(resourceId, num){
        this.id = resourceId;
        this.nameId = gv.ResourceIdToName(resourceId);
        this.num = parseInt(num);

        if (this.isCostumeResourceItem()){
            this.costumeKey = this.nameId;
            this.costumeId = num;
        }
    },
    getId: function () {
        return this.id;
    },
    getNameId: function(){
        return this.nameId;
    },
    getNum: function () {
        return this.num;
    },
    getCostumeId: function() {
        return this.costumeId;
    },
    getCostumeKey: function(){
        return this.costumeKey;
    },

    isItem: function(itemId){
        return this.id == itemId;
    },

    isGold: function () {
        return this.id == ResourceType.GOLD;
    },
    isG: function () {
        return this.id == ResourceType.G;
    },
    isHeart: function () {
        return this.id == ResourceType.HEART;
    },
    isBooster: function () {
        return this.id == ResourceType.BOM_PHAO
            || this.id == ResourceType.HAT5
            || this.id == ResourceType.MAY_BAY;
    },
    isTool: function () {
        return this.id == ResourceType.BUA
            || this.id == ResourceType.BUA_TA
            || this.id == ResourceType.GANG_TAY;
    },
    isPackCraft: function () {
        return this.id == ResourceType.PACK;
    },
    isDiscountHealing: function () {
        return this.id == ResourceType.DISCOUNT_HEALING_TIME;
    },
    isFreeResourceItem: function () {
        return ResourcesUtils.isFreeResource(this.id);
    },
    isCostumeResourceItem: function () {
        return this.id == ResourceType.CHEESE_SKIN
            || this.id == ResourceType.AVATAR_FRAME;
    },
    isCanClaimOffline: function () {
        return this.isGold()
            || this.isHeart()
            || this.isBooster()
            || this.isTool()
            || this.isFreeResourceItem()
    },
})

gv.ResourceNameToId = function (name) {
    //"gold" -> 0
    if (name in ResourceNameKey){
        var key = ResourceNameKey[name];
        if (key in ResourceType) return ResourceType[key];
    }
    return null;
};
gv.ResourceIdToName = function (id) {
    // 0 -> "gold"
    if (id in ResourceIdKey){
        var key = ResourceIdKey[id];
        if (key in ResourceName) return ResourceName[key];
    }
    return null;
};

gv.createResourceItem = function (itemName, num) {
    // costume
    if (itemName.indexOf(ResourceName.AVATAR_FRAME) > -1){
        num = Number(itemName.split("_")[2]);   // avatar_frame_i
        itemName = ResourceName.AVATAR_FRAME;
    }
    else if(itemName.indexOf(ResourceName.CHEESE_SKIN) > -1){
        num = Number(itemName.split("_")[2]);   // cheese_skin_i
        itemName = ResourceName.CHEESE_SKIN;
    }

    let itemId = gv.ResourceNameToId(itemName);
    return new ResourceItem(itemId, num);
};