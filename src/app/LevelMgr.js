// src/app/LevelMgr.js
var LevelMgr = BaseMgr.extend({
    ctor: function () {
        this._super();
        this.mapDataList = {};
    },

    getMapDataConfig: function (level) {
        if (level === undefined || level === -1) {
            level = userMgr.getData().getLevel();
        }

        let levelStr = level.toString();
        if (!this.mapDataList[levelStr]) {
            let levelPath = "res/maps/level_" + levelStr + ".json";
            let rawData = jsb.fileUtils.getStringFromFile(levelPath);
            if (!rawData) {
                cc.warn("LevelMgr: file not found", levelPath);
                return null;
            }
            let mapData = JSON.parse(rawData);
            mapData["levelId"] = mapData["levelId"] || level;

            if (mapData['genDescription'] && mapData['genDescription']['difficulty']) {
                mapData['difficulty'] = LevelMgr.DIFFICULTY_CODE[mapData['genDescription']['difficulty']];
            } else {
                mapData['difficulty'] = 0;
            }

            this.mapDataList[levelStr] = mapData;
        }

        return this.mapDataList[levelStr];
    }
});

LevelMgr.DIFFICULTY_CODE = {
    easy: 0,
    medium: 1,
    hard: 2
};

LevelMgr._instance = null;
LevelMgr.getInstance = function () {
    if (!LevelMgr._instance) {
        LevelMgr._instance = new LevelMgr();
    }
    return LevelMgr._instance;
};

var levelMgr = LevelMgr.getInstance();
