/**
 * Created by phuongnm5 on 21/06/2021.
 */
var ResourcesUtils = ResourcesUtils || {};

ResourcesUtils.ListFreeResource = [
    ResourceType.HEART_FREE,
    ResourceType.BOM_PHAO_FREE,
    ResourceType.HAT5_FREE,
    ResourceType.MAY_BAY_FREE
];

ResourcesUtils.ListBooster = [
    ResourceType.BOM_PHAO,
    ResourceType.HAT5,
    ResourceType.MAY_BAY
];

ResourcesUtils.ListTool = [
    ResourceType.GANG_TAY,
    ResourceType.BUA,
    ResourceType.BUA_TA
];

ResourcesUtils.ListCostume = [
    ResourceType.CHEESE_SKIN,
    ResourceType.AVATAR_FRAME,
];

ResourcesUtils.getAllResIdCanFree = function () {
    return [ResourceType.HEART, ResourceType.BOM_PHAO, ResourceType.HAT5, ResourceType.MAY_BAY];
};

ResourcesUtils.getResourceTypeOfFreeType = function (freeType) {
    var type = null;
    switch (freeType) {
        case ResourceType.BOM_PHAO_FREE:
            type = ResourceType.BOM_PHAO;
            break;
        case ResourceType.HAT5_FREE:
            type = ResourceType.HAT5;
            break;
        case ResourceType.MAY_BAY_FREE:
            type = ResourceType.MAY_BAY;
            break;
        case ResourceType.HEART_FREE:
            type = ResourceType.HEART;
            break;
    }
    return type;
};

ResourcesUtils.isGoldG = function(resourceType){
    return resourceType == ResourceType.GOLD || resourceType == ResourceType.G;
};

ResourcesUtils.isFreeResource = function(resourceType) {
    return ResourcesUtils.ListFreeResource.indexOf(resourceType) > -1;
};
ResourcesUtils.isTool = function (resourceType) {
    return ResourcesUtils.ListTool.indexOf(resourceType) > -1;
};
ResourcesUtils.isBooster = function (resourceType) {
    return ResourcesUtils.ListBooster.indexOf(resourceType) > -1;
};
ResourcesUtils.isCostume = function (resourceType) {
    return ResourcesUtils.ListCostume.indexOf(resourceType) > -1;
};

ResourcesUtils.getSpritePathForResource = function (resourceType, num) {
    if (!resourceItemPath.hasOwnProperty(resourceType)){
        cc.warn("Can't find reward icon of resourceType:" + resourceType + " -> use default as gold!");
        return resourceItemPath[ResourceType.GOLD];
    }
    let imgPath = resourceItemPath[resourceType];
    if (num != undefined && (resourceType == ResourceType.CHEESE_SKIN || resourceType == ResourceType.AVATAR_FRAME)){
        imgPath = imgPath.replace("@i@", num);
    }
    cc.log("getSpritePathForResource ", imgPath);
    return imgPath;
};

ResourcesUtils.getDesForResource = function (resourceType, num) {
    var strHour = "h", strMin = "m";
    if (ResourcesUtils.isFreeResource(resourceType)){
        cc.log('getDesForResource',num);
        var numMinute = num;
        if(numMinute >= 60){
            var hour = Math.floor(numMinute/60);
            numMinute = numMinute - hour*60;
            return hour + strHour + (numMinute > 0 ? (numMinute+strMin) : "");
        }
        else{
            return "∞"+numMinute+strMin;
        }
    }
    else if (ResourcesUtils.isGoldG(resourceType)){
        if (typeof num != 'number') num = Number(num);
        return  "x"+num.formatAsMoney();
    }
    else if (ResourcesUtils.isCostume(resourceType)){
        return  "x1";
    }
    else{
        return "x"+num;
    }
};