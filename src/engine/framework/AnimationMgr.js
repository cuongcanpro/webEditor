/**
 * Created by GSN on 6/10/2015.
 * Updated by AnhVTT on 4/26/2022
 *  - Add loaded tlfx to list and remove when unloaded (to prevent crash if reload tlfx when it is using)
 */
var gv = gv || {};
gv.listEfk = [];
gv.listTlfx = [];
gv.tlfxPools = {};
gv.createTLFX = function (name, pos, parent, zOrder) {
    if(!cc.sys.isNative)
        return new cc.Node();
    if (!gv.tlfxPools[name]) {
        gv.tlfxPools[name] = [];
    }

    var tlfxEff;
    var pool = gv.tlfxPools[name];
    if (pool.length > 0) {
        tlfxEff = pool[pool.length - 1];
        pool.length--;
    } else {
        let fileName = resParticle[name];
        gv.loadTLFX(fileName);
        tlfxEff = tlfx.EffectRenderer.createWithName(name);
        if (tlfxEff) {
            tlfxEff.retain();
        }
    }

    if (tlfxEff) {
        tlfxEff.setPosition(pos);
        parent.addChild(tlfxEff, zOrder);
        tlfxEff.release();
        tlfxEff.start();
        tlfxEff.setScale(1);
        tlfxEff.setCompleteListener(function (eff) {
            eff.retain();
            eff.removeFromParent(false);
            gv.tlfxPools[name].push(eff);
        });
    }
    return tlfxEff;
}
gv.loadTLFX = function (fileName) {
    if(!cc.sys.isNative)
        return;
    if (gv.listTlfx.indexOf(fileName) == -1) {
        tlfx.CCEffectsLibrary.getInstance().Load('game/animation/tlfx/' + fileName);
        gv.listTlfx.push(fileName);
    }
}
gv.unloadTLFX = function (name) {
    if(!cc.sys.isNative)
        return;
    let fileName = resParticle[name];
    let idx = gv.listTlfx.indexOf(fileName);
    if (idx == -1) return;
    tlfx.CCEffectsLibrary.getInstance().clear(fileName);
    gv.listTlfx.splice(idx, 1);
}
gv.unloadAllTLFX = function () {
    if(!cc.sys.isNative)
        return;
    tlfx.CCEffectsLibrary.getInstance().ClearAll();
    gv.listTlfx = [];
    for (var name in gv.tlfxPools) {
        var list = gv.tlfxPools[name];
        for (var i = 0; i < list.length; i++) {
            list[i].release();
        }
    }
    gv.tlfxPools = {};
}
gv.createTLFXWithScale = function (name, pos, parent, zOrder, scale) {
    if(!cc.sys.isNative)
        return new cc.Node();
    var tlfxEff = gv.createTLFX(name, pos, parent, zOrder);
    if (tlfxEff) {
        tlfxEff.setScale(scale);
    }
    return tlfxEff;
}
gv.createEfk = function (efkMgr, path, isParsed = false) {
    var excludes = [
        resAni.efk_an3
        , resAni.efk_an4
        , resAni.efk_an5
        , resAni.efk_anSquare
        , resAni.efk_anT
        , resAni.efk_anL
    ]
    if (!efkMgr) return new cc.Node();

    var effParticle = efk.EffectEmitter.create(efkMgr);
    var effect = efk.Effect.create(path);

    effParticle.setEffect(effect);
    effParticle.setPlayOnEnter(!isParsed);
    effParticle.setIsLooping(false);
    effParticle.setRemoveOnStop(!isParsed);
    gv.listEfk.push(effParticle);

    return effParticle;
}
gv.removeAllEfk = function () {
    for (let i in gv.listEfk) {
        if (gv.listEfk[i] && cc.sys.isObjectValid(gv.listEfk[i])) {
            gv.listEfk[i].removeFromParent();
        }
    }
}

gv.isHaveSpineAnimation = function (path) {
    let pathExt = [".json", ".atlas", ".png"];
    for (let i = 0; i < pathExt.length; i++) {
        let filePath = path + pathExt[i];
        cc.log("check SpineAnimation " + filePath);
        if (!jsb.fileUtils.isFileExist(filePath)) {
            cc.log("check SpineAnimation failed: ", filePath);
            return false;
        }
    }
    return true;
};

gv.createSpineAnimation = function (path, difPath) {
    difPath = difPath || path;

    var jsonFile = path + ".json";
    var alas = difPath + ".atlas";
    cc.log("json file " + jsonFile + "atlas file " + alas);
    return new sp.SkeletonAnimation(jsonFile, alas);
};

gv.createSkeletonSpine = function (path) {
    var jsonFile = path + ".json";
    var alas = path + ".atlas";
    cc.log("json file " + jsonFile + "atlas file " + alas);
    return new SkeletonSpine(jsonFile, alas);
}

gv.removeSpineAfterRun = function (spine) {
    // return;
    spine.setCompleteListener(function () {
        setTimeout(function () {
            if (spine && cc.sys.isObjectValid(spine))
                spine.removeFromParent(1);
        });
    })
}



// dragonbone animations:
gv.createDBAnimationById = function (key, object) {
    return gv.createDBAnimation(resDBAni[key], key, object);
}
gv.createDBAnimationAsyncById = function (key, object) {
    return gv.createDBAnimationAsync(resDBAni[key], key, key, object);
}

gv.createDBAnimation = function (folderPath, key, object) {
    if (typeof folderPath == 'undefined') {
        cc.log(folderPath);
    }

    gv.loadDBAnimationData(folderPath, key, object);
    return db.DBCCFactory.getInstance().buildArmatureNode(key);
};
gv.createDBAnimationAsync = function (folderPath, armatureName, name, object) {
    if (folderPath == undefined) {
        cc.log("createAnimationAsync", folderPath, name);
    }
    if (object != undefined && object != null) {
        if (typeof (object.listAnimationLoaded) == 'undefined') {
            object.listAnimationLoaded = {};
        }
        object.listAnimationLoaded[name] = name;
    }
    return db.DBCCHelper.getInstance().buildAsyncArmatureNode(folderPath + "/skeleton.xml",
        folderPath + "/texture.plist", armatureName, name == undefined ? armatureName : name);
};
gv.loadDBAnimationData = function (folderPath, key, object) {
    cc.log(folderPath + " key " + key + " object" + object);
    if (object != undefined && object != null) {
        if (object.listAnimationLoaded == undefined) {
            object.listAnimationLoaded = {};
        }
        if (key in object.listAnimationLoaded)
            return;
        object.listAnimationLoaded[key] = key;
    }
    db.DBCCFactory.getInstance().loadTextureAtlas(folderPath + "/texture.plist", key);
    db.DBCCFactory.getInstance().loadDragonBonesData(folderPath + "/skeleton.xml", key);

};
gv.unloadAllDBAnimationData = function (object) {
    if (object.listAnimationLoaded == undefined) {
        return;
    }
    for (var keyStored in object.listAnimationLoaded) {
        db.DBCCFactory.getInstance().removeTextureAtlas(keyStored, false);
    }
    object.listAnimationLoaded = {};
};
gv.preloadAllDBAnimation = function (object) {
    for (var key in resDbAniPreload) {
        gv.loadDBAnimationData(resDbAniPreload[key], key, object);
    }
}