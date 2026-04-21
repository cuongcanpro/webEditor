
var Config = function () {

};

Config.ENABLE_CHEAT = false;
Config.ENABLE_DEVICE_CHEAT = true;
Config.ENABLE_W32_CHEAT = true;

Config.SERVER = {
    LIVE : {
        TYPE : "live",
        IP: "35.185.181.71",
        PORT: 443
    },
    QC1 : {
        TYPE : "qc",
        IP: "120.138.72.33",
        PORT: 10351
    },
    DEV1 : {
        TYPE : "dev",
        IP: "120.138.72.33",
        PORT: 10347
    },
    QC2 : {
        TYPE : "qc2",
        IP: "120.138.72.33",
        PORT: 10353
    },
    DEV2 : {
        TYPE : "dev2",
        IP: "120.138.72.33",
        PORT: 10349
    },
    LOCAL : {
        TYPE : "local",
        IP: "127.0.0.1",
        PORT: 10116
    }
}

Config.PATH_AVATAR = "avatar/";

//cheat
Config.CHEAT_MAX_PLAYER = 5;
Config.CHEAT_MAX_CARD = 12;
Config.CARD_CHEAT_SCALE_DECK = 0.45;
Config.CARD_CHEAT_SCALE_PLAYER = 0.29;
Config.CARD_CHEAT_PLAYER_LINE = 2;

//Config Module
Config.ENABLE_EVENT = true;

// test update private
Config.MANIFEST_URL_LIVE = "";
Config.MANIFEST_URL_PRIVATE = "";

Config.CARD_MULTI_COLOR = false;

Config.ENABLE_DEV_SERVER = true;
Config.PACKAGE_NAME = "com.zps.domino";

Config.SERVER_DEV_1         = "120.138.72.33";
Config.PORT_DEV_1           = 10347;
Config.SERVER_DEV_2         = "120.138.72.33";
Config.PORT_DEV_2           = 10349;
Config.SERVER_QC_1          = "120.138.72.33";
Config.PORT_QC_1            = 10351;
Config.SERVER_QC_2          = "120.138.72.33";
Config.PORT_QC_2            = 10353;

Config.SERVER_PRIVATE = "120.138.72.33";    //QC1 -> qiuqiu
Config.PORT = 10351;
Config.SERVER_PRIVATE_2 = "120.138.72.33";   //DEV1 -> qiuqiu
Config.PORT_2 = 10347;
Config.SERVER_PRIVATE_3 = "118.102.3.18";//QC2
Config.PORT_3 = 10241;
Config.SERVER_PRIVATE_4 = "118.102.3.18";//DEV2
Config.PORT_4 = 10141;
Config.SERVER_PRIVATE_5 = "118.102.3.18";//QC3
Config.PORT_5 = 10300;
Config.SERVER_PRIVATE_6 = "118.102.3.18";//DEV3
Config.PORT_6 = 10117;
Config.SERVER_PRIVATE_7 = "118.102.3.18";//QC4
Config.PORT_7 = 10431;
Config.SERVER_PRIVATE_8 = "118.102.3.18";//DEV4
Config.PORT_8 = 10428;
Config.SERVER_PRIVATE_9 = "127.0.0.1";//LOCAL
Config.PORT_9 = 10116;


Config.SERVER_LIVE = "3.0.24.143";
Config.PORT_LIVE = 443;

Config.SERVER_DEV = "120.138.65.103";
// Config.SERVER_DEV = "172.28.48.62";
Config.PORT_DEV = 10116;

function ejectDebugFunc() {
    db.DBCCFactory.getInstance()._old_loadDragonBonesData = db.DBCCFactory.getInstance().loadDragonBonesData;
    db.DBCCFactory.getInstance().loadDragonBonesData = function () {
        cc.log("[DEBUG]: db.DBCCFactory.loadDragonBonesData " + JSON.stringify(arguments));

        if (!jsb.fileUtils.isFileExist(arguments[0])) {
            throw new Error("File's not exist!");
        }

        return db.DBCCFactory.getInstance()._old_loadDragonBonesData.apply(db.DBCCFactory.getInstance(), arguments);
    }

    db.DBCCFactory.getInstance()._old_loadTextureAtlas = db.DBCCFactory.getInstance().loadTextureAtlas;
    db.DBCCFactory.getInstance().loadTextureAtlas = function () {
        cc.log("[DEBUG]: db.DBCCFactory.loadTextureAtlas " + JSON.stringify(arguments));

        if (!jsb.fileUtils.isFileExist(arguments[0])) {
            throw new Error("File's not exist!");
        }

        return db.DBCCFactory.getInstance()._old_loadTextureAtlas.apply(db.DBCCFactory.getInstance(), arguments);
    }

    // db.DBCCFactory.getInstance()._old_buildArmatureNode = db.DBCCFactory.getInstance().buildArmatureNode;
    // db.DBCCFactory.getInstance().buildArmatureNode = function () {
    //     cc.log("[DEBUG]: db.DBCCFactory.buildArmatureNode " + JSON.stringify(arguments));
    //     let node = db.DBCCFactory.getInstance()._old_buildArmatureNode.apply(db.DBCCFactory.getInstance(), arguments);
    //
    //     node._old_gotoAndPlay = node.gotoAndPlay;
    //     node.gotoAndPlay = function () {
    //         cc.log("[DEBUG]: db.DBCCFactory.prototype.gotoAndPlay " + JSON.stringify(arguments));
    //         return this._old_gotoAndPlay.apply(this, arguments);
    //     }
    //
    //     return node;
    // }

    // jsb.AudioEngine._old_play2d = jsb.AudioEngine.play2d;
    // jsb.AudioEngine.play2d = function () {
    //     cc.log("[DEBUG]: jsb.AudioEngine.play2d " + JSON.stringify(arguments));
    //     return jsb.AudioEngine._old_play2d.apply(jsb.AudioEngine, arguments);
    // }

    sp._old_SkeletonAnimation = sp.SkeletonAnimation;
    sp.SkeletonAnimation = function () {
        cc.log("[DEBUG]: sp.SkeletonAnimation " + JSON.stringify(arguments));

        if (!jsb.fileUtils.isFileExist(arguments[0]) || !jsb.fileUtils.isFileExist(arguments[1])) {
            throw new Error("File's not exist!");
        }

        return sp._old_SkeletonAnimation.apply(sp._old_SkeletonAnimation, arguments);
    }
}
// FEATURES
Config.IS_GAPLE_MAINTAIN = false;
Config.IS_GAPLE_DISABLE = false;


