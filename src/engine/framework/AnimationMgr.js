/**
 * Created by GSN on 6/10/2015.
 * Updated by AnhVTT on 4/26/2022
 *  - Add loaded tlfx to list and remove when unloaded (to prevent crash if reload tlfx when it is using)
 */
var gv = gv || {};
gv.listEfk = [];
gv.listTlfx = [];
gv.tlfxPools = {};
gv.efkPools = {};
gv.spinePools = {};
gv.pool = {
    _pools: {},
    _listActive: [],
    get: function (key, factory) {
        if (!this._pools[key]) this._pools[key] = [];
        var list = this._pools[key];
        var obj;
        if (list.length > 0) {
            obj = list.pop();
            if (obj && cc.sys.isObjectValid(obj)) {
                if (obj.getParent() && typeof obj.removeFromParent === "function") {
                    obj.removeFromParent(false);
                }
                if (typeof obj.stopAllActions === "function") obj.stopAllActions();
                if (typeof obj.autorelease === "function") obj.autorelease();
            }
        } else {
            obj = factory();
            if (obj) obj._poolKey = key;
        }
        if (obj) this._listActive.push(obj);
        return obj;
    },
    push: function (obj) {
        if (!obj || !cc.sys.isObjectValid(obj)) return;
        var idx = this._listActive.indexOf(obj);
        if (idx !== -1) this._listActive.splice(idx, 1);
        var key = obj._poolKey;
        if (key && this._pools[key]) {
            if (typeof obj.stopAllActions === "function") obj.stopAllActions();
            if (typeof obj.retain === "function") obj.retain();
            if (typeof obj.removeFromParent === "function") obj.removeFromParent(false);
            if (this._pools[key].indexOf(obj) === -1) {
                this._pools[key].push(obj);
            }
        } else {
            if (typeof obj.removeFromParent === "function") obj.removeFromParent(true);
        }
    },
    pushAll: function () {
        var snapshot = this._listActive.slice();
        for (var i = 0; i < snapshot.length; i++) {
            this.push(snapshot[i]);
        }
        this._listActive.length = 0;
    },
    unloadAll: function () {
        this._listActive.length = 0;
        for (var key in this._pools) {
            var list = this._pools[key];
            for (var i = 0; i < list.length; i++) {
                var obj = list[i];
                if (obj && cc.sys.isObjectValid(obj) && typeof obj.release === "function") {
                    obj.release();
                }
            }
        }
        this._pools = {};
    }
};

gv.getSprite = function (fileName, fullPath) {
    var key = "Sprite_" + (fullPath || fileName);
    var spr = gv.pool.get(key, function () {
        return fr.createSprite(fileName, fullPath);
    });
    if (spr) {
        spr.setVisible(true);
        spr.setOpacity(255);
        spr.setScale(1.0);
        spr.setRotation(0);
        spr.setColor(cc.color(255, 255, 255));
    }
    return spr;
};

gv.pushSprite = function (sprite) {
    if (!sprite) return;
    gv.pool.push(sprite);
};

gv.pushAllSprites = function () {
    gv.pool.pushAll();
};

gv.unloadAllSprites = function () {
    gv.pool.unloadAll();
};

gv.createTLFX = function (name, pos, parent, zOrder) {
    if (!cc.sys.isNative)
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
    if (!cc.sys.isNative)
        return;
    if (gv.listTlfx.indexOf(fileName) == -1) {
        tlfx.CCEffectsLibrary.getInstance().Load('game/animation/tlfx/' + fileName);
        gv.listTlfx.push(fileName);
    }
}
gv.unloadTLFX = function (name) {
    if (!cc.sys.isNative)
        return;
    let fileName = resParticle[name];
    let idx = gv.listTlfx.indexOf(fileName);
    if (idx == -1) return;
    tlfx.CCEffectsLibrary.getInstance().clear(fileName);
    gv.listTlfx.splice(idx, 1);
}
gv.unloadAllTLFX = function () {
    if (!cc.sys.isNative)
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
    if (!cc.sys.isNative)
        return new cc.Node();
    var tlfxEff = gv.createTLFX(name, pos, parent, zOrder);
    if (tlfxEff) {
        tlfxEff.setScale(scale);
    }
    return tlfxEff;
}
gv.createEfk = function (efkMgr, path, isParsed = false) {
    if (!efkMgr) return new cc.Node();

    if (!gv.efkPools[path]) {
        gv.efkPools[path] = [];
    }

    var effParticle;
    var pool = gv.efkPools[path];
    if (pool.length > 0) {
        effParticle = pool.pop();
    } else {
        effParticle = efk.EffectEmitter.create(efkMgr);
        var effect = efk.Effect.create(path);
        effParticle.setEffect(effect);
        effParticle.retain();
    }

    effParticle.stop();
    effParticle.setPlayOnEnter(!isParsed);
    effParticle.setIsLooping(false);
    effParticle.setRemoveOnStop(false);

    if (typeof effParticle.setCompleteListener === "function") {
        effParticle.setCompleteListener(function (eff) {
            eff.retain();
            eff.removeFromParent(false);
            if (gv.efkPools[path].indexOf(eff) === -1) {
                gv.efkPools[path].push(eff);
            }
        });
    }

    gv.listEfk.push(effParticle);

    return effParticle;
}
gv.removeAllEfk = function () {
    for (let i in gv.listEfk) {
        if (gv.listEfk[i] && cc.sys.isObjectValid(gv.listEfk[i])) {
            gv.listEfk[i].removeFromParent();
        }
    }
    gv.listEfk = [];
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
    var key = path + "_" + difPath;

    if (!gv.spinePools[key]) {
        gv.spinePools[key] = [];
    }

    var spine;
    var pool = gv.spinePools[key];
    if (pool.length > 0) {
        spine = pool.pop();
    } else {
        var jsonFile = path + ".json";
        var alas = difPath + ".atlas";
        cc.log("json file " + jsonFile + "atlas file " + alas);
        spine = new sp.SkeletonAnimation(jsonFile, alas);
        spine.retain();
        spine._poolKey = key;
    }

    spine.stopAllActions();
    spine.setScale(1);
    spine.setRotation(0);
    spine.setOpacity(255);
    spine.setColor(cc.color(255, 255, 255));

    return spine;
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
            if (spine && cc.sys.isObjectValid(spine)) {
                spine.removeFromParent(false);
                var key = spine._poolKey;
                if (key && gv.spinePools[key]) {
                    if (gv.spinePools[key].indexOf(spine) === -1) {
                        gv.spinePools[key].push(spine);
                    }
                }
            }
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