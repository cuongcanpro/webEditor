/**
 * Created by AnhLMT on 2/3/2020.
 */
var BoardUtils = {
    getPriorityOfMatch: function (type) {
        if (type == null) return -1;
        var priority = CoreGame.Config.MatchPriority[type];
        if (priority == -1) priority = 1000000;
        return priority;
    },

    getDirOfSwap: function (slot1, slot2) {
        if (slot1.getCol() < slot2.getCol()) return 0;// left right
        if (slot1.getCol() > slot2.getCol()) return 2;// right left
        if (slot1.getRow() < slot2.getRow()) return 1;// up down
        if (slot1.getRow() > slot2.getRow()) return 3;// down up
        return null;
    },

    idxToGrid: function (index, gridWidth) {
        gridWidth = gridWidth || CoreGame.Config.WIDTH;
        var row = Math.floor(index / gridWidth);
        var col = index - (row * gridWidth);
        return {row: row, col: col}
    },

    gridToIndex: function (row, col) {
        return row * CoreGame.Config.WIDTH + col;
    },

    isCellOnBoard: function (row, col, width, height) {
        width = width || CoreGame.Config.WIDTH;
        height = height || CoreGame.Config.HEIGHT;
        if (row < 0 || row >= height || col < 0 || col >= width) return false;
        return true;
    },

    getGemTypeName: function (gemTypeId) {
        this.getKeyByValue(CoreGame.Config.ElementType, gemTypeId);
    },

    getKeyByValue: function (object, value) {
        for (var key in object) {
            if (object[key] == value) return key;
        }
        return null;
    },

    getMovePriority: function (typeId) {
        if (ElementUtils.isLayered(typeId)) typeId = BoardUtils.convertType(typeId).type;
        let key = this.getKeyByValue(CoreGame.Config.ElementType, typeId);
        if (key == null) return 0;
        return CoreGame.Config.MovePriority[key] || 0;
    },

    getZOrderOfElement: function (typeId) {
        if (ElementUtils.isLayered(typeId)) typeId = BoardUtils.convertType(typeId).type;
        var key = this.getKeyByValue(CoreGame.Config.ElementType, typeId);
        if (key == null) return 0;
        return CoreGame.Config.zOrder[key] || 0;
    },

    forEach: function (array2D, callback) {
        for (var row = 0; row < array2D.length; row++) {
            for (var col = 0; col < array2D[row].length; col++) {
                callback(row, col, array2D[row][col]);
            }
        }
    }
};

BoardUtils.isTwoCellAdjacent = function (cell1, cell2) {
    return Math.abs(cell1.row - cell2.row) + Math.abs(cell1.col - cell2.col) == 1;
}

BoardUtils.convertType = function (type) {
    //cc.log("convertType " + type)
    if (type < CoreGame.Config.ElementType.GRASS) return {type: type};// min TypeId cua cac loai element co nhieu lop
    var num;
    if (10000 <= type && type < 20000) {// boss
        num = type % 10000;
    } else {
        num = type % 100;
    }
    type -= num;
    //cc.log("result type=" + type + ", num=" + num)
    return {type: type, num: num};
}

BoardUtils.randomWeight = function (weights) {
    var sumWeight = 0;
    for (var i in weights) sumWeight += weights[i];
    var rand = Math.random() * sumWeight;
    for (var i in weights) {
        if (rand < weights[i]) return i;
        rand -= weights[i];
    }
    return null;
};

BoardUtils.shuffle = function (a) {
    var j, x, i;
    for (i = a.length - 1; i > 0; i--) {
        j = Math.floor(Math.random() * (i + 1));
        x = a[i];
        a[i] = a[j];
        a[j] = x;
    }
    return a;
}


BoardUtils.addObjToObj = function (obj1, obj2) {
    for (var key2 in obj2) obj1[key2] = obj2[key2];
    return obj1;
}

BoardUtils.createCombineObj = function (listObj, len) {
    var listCombine = [[]];
    for (var i = 0; i < len; i++) {
        var tmpList = [];
        for (var j = 0; j < listObj.length; j++)
            for (var k = 0; k < listCombine.length; k++)
                tmpList.push(listCombine[k].concat([listObj[j]]))
        listCombine = tmpList;
    }
    return listCombine;
}

BoardUtils.checkSuccess100 = function (p) {
    if (p < 0) {
        p = 0;
    }
    var x = Math.floor(Math.random() * Math.floor(100));
    if (x < p) {
        return true;
    }
    return false;
};

BoardUtils.log = function (s) {
    cc.log(s);
};

cc.cloneObj = function (obj) {
    return JSON.parse(JSON.stringify(obj));
}

BoardUtils.initMatchPattern = function () {
    let listPattern = CoreGame.Config.BasicMatchPattern;
    for (let type in listPattern) {
        let listRot = [1, 2, 3];
        if (type == CoreGame.Config.ElementType.MATCH_4_V || type == CoreGame.Config.ElementType.MATCH_4_H) listRot = [2];
        let basicPattern = listPattern[type].pop();
        //duyet tung phan tu cua pattern, moi lan duyet chon 1 ptu lam pivot cua match
        for (let i = 0; i < basicPattern.length; i++) {
            let pivot = basicPattern[i];

            let patternWithOutPivot = [];
            for (let j = 0; j < basicPattern.length; j++) {
                if (j == i) continue;
                let difRow = basicPattern[j][0] - pivot[0],
                    difCol = basicPattern[j][1] - pivot[1];
                patternWithOutPivot.push([difRow, difCol]);
            }
            cc.log("patternWithOutPivot " + JSON.stringify(patternWithOutPivot))
            //add pattern and rotation to list
            listPattern[type].push(patternWithOutPivot);
            for (let k = 0; k < listRot.length; k++)
                listPattern[type].push(
                    PointUtils.patternRot90(listRot[k], patternWithOutPivot)
                );

        }
    }
    CoreGame.Config.MatchPattern = CoreGame.Config.BasicMatchPattern;
    cc.log("initMatchPattern " + JSON.stringify(listPattern))
}