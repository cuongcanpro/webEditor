/**
 * Created by AnhVTT on 5/10/2021.
 */

fr.Sound = {};
fr.Sound.isFirstRun = false;
fr.Sound.extSoundFile = "";
fr.Sound.defaultButtonSound = resSound.button_click;
fr.Sound.effectOn = false;
fr.Sound.musicOn = false;
fr.Sound.soundIdMap = [];
fr.Sound.soundEffectVolume = 1.0;
fr.Sound.musicVolume = 1.0;
fr.Sound.musicId = -1;
fr.Sound.maxAudioInstance = 10;
fr.Sound.playedSound = 0;
fr.Sound.seedDropTimeStamp = [];
fr.Sound.vibrateOn = false;


fr.Sound.init = function () {
    fr.Sound.preloadAll();
    fr.Sound.loadSetting();
    jsb.AudioEngine.setMaxAudioInstance(fr.Sound.maxAudioInstance);

    cc.eventManager.addCustomListener(cc.game.EVENT_HIDE, function () {
        jsb.AudioEngine.pauseAll();
    });
    cc.eventManager.addCustomListener(cc.game.EVENT_SHOW, function () {
        if (fr.Sound.musicOn) {
            jsb.AudioEngine.resumeAll();
        }
    });
};

fr.Sound.playGemMatchSound = function (counted = 0) {
    let soundString = resSound["match_3_" + Math.min(counted, 7)];
    if (counted === 0) {
        fr.Sound.playSoundEffect(soundString[Math.floor(Math.random() * soundString.length)]);
    } else {
        fr.Sound.playSoundEffect(soundString);
    }
};

fr.Sound.playMonsterSound = function (monsterId, soundId) {
    let soundPath = resSound.monster[monsterId.toString()][soundId];
    if (Array.isArray(soundPath)) {
        soundPath = soundPath[Math.floor(Math.random() * soundPath.length)];
    }

    fr.Sound.playSoundEffect(soundPath);
};

fr.Sound.playSoundEffect = function (soundPath, isLoop = false) {
    if (fr.Sound.effectOn == false || !soundPath) {
        return -1;
    }

    if (soundPath == resSound.seed_drop) {
        let currentTime = Date.now();
        // remove all timeStamp played over 1s
        while (fr.Sound.seedDropTimeStamp.length > 0 && currentTime - fr.Sound.seedDropTimeStamp[0] >= 1000) {
            fr.Sound.seedDropTimeStamp.shift();
        }
        // only play maximum of 5 sound in 1s
        if (fr.Sound.seedDropTimeStamp.length < 5) {
            jsb.AudioEngine.play2d(soundPath, isLoop, fr.Sound.soundEffectVolume);
            fr.Sound.seedDropTimeStamp.push(currentTime);
            // cc.audioEngine.playEffect(soundPath, isLoop);
        }
        return -1;
    }

    fr.Sound.playedSound++;
    var id = jsb.AudioEngine.play2d(soundPath, isLoop, fr.Sound.soundEffectVolume);
    if (fr.Sound.soundIdMap[soundPath])
        fr.Sound.soundIdMap[soundPath].push(id);
    else
        fr.Sound.soundIdMap[soundPath] = [id];
    cc.log("Played " + fr.Sound.playedSound + "sounds ", soundPath, id, fr.Sound.soundIdMap[soundPath].length);
    return id;
};

fr.Sound.stopSound = function () {
    for (var key in fr.Sound.soundIdMap) {
        var ids = fr.Sound.soundIdMap[key];
        for (var i in ids) {
            var id = ids[i];
            jsb.AudioEngine.stop(id);
        }
    }
};

fr.Sound.stopSoundById = function (id) {
    jsb.AudioEngine.stop(id);
};

fr.Sound.addHideAndShowGameListener = function (scene) {
    var gameOnHideListener = cc.EventListenerCustom.create("game_on_hide", function () {
        // stop music & sound
        jsb.AudioEngine.pauseAll();
    });
    cc.eventManager.addListener(gameOnHideListener, scene);

    var gameOnShowListener = cc.EventListenerCustom.create("game_on_show", function () {
        // start music and sound
        jsb.AudioEngine.resumeAll();
    });
    cc.eventManager.addListener(gameOnShowListener, scene);
}

fr.Sound.playMusic = function (musicPath, isLoop) {
    if (!fr.Sound.musicOn)
        return;
    if (fr.Sound.musicId != -1) jsb.AudioEngine.stop(fr.Sound.musicId);

    fr.Sound.musicId = jsb.AudioEngine.play2d(musicPath, isLoop, fr.Sound.musicVolume);
    return fr.Sound.musicId;
};

fr.Sound.stopMusic = function () {
    if (fr.Sound.musicId != -1) jsb.AudioEngine.stop(fr.Sound.musicId);
};

fr.Sound.loadSetting = function () {
    fr.Sound.effectOn = fr.UserData.getBoolFromKey("sound_effect", true);
    fr.Sound.musicOn = fr.UserData.getBoolFromKey("sound_music", true);
    fr.Sound.vibrateOn = fr.UserData.getBoolFromKey("vibrate", true);
};

fr.Sound.saveSetting = function () {
    fr.UserData.setBoolFromKey("sound_effect", fr.Sound.effectOn);
    fr.UserData.setBoolFromKey("sound_music", fr.Sound.musicOn);
};

fr.Sound.preloadAll = function () {
    fr.Sound.preloadSoundFile(resSound);
    cc.audioEngine.preloadEffect(resSound.seed_drop);
};

fr.Sound.preloadSoundFile = function (path) {
    if (typeof path === "string") {
        jsb.AudioEngine.preload(path);
        return;
    }

    if (Array.isArray(path)) {
        for (let sound of path) {
            fr.Sound.preloadSoundFile(sound);
        }
    } else {
        for (let key in path) {
            fr.Sound.preloadSoundFile(path[key]);
        }
    }
};

fr.Sound.preloadEffect = function (soundPath) {
    jsb.AudioEngine.preload(soundPath + this.extSoundFile);
};

fr.Sound.playEffectClickButton = function () {
    fr.Sound.playSoundEffect(fr.Sound.defaultButtonSound, false);
};

fr.Sound.switchSound = function () {
    fr.Sound.effectOn = !fr.Sound.effectOn;
    if (!fr.Sound.effectOn) fr.Sound.stopSound();
    fr.UserData.setBoolFromKey("sound_effect", fr.Sound.effectOn);
    return fr.Sound.effectOn;
};

fr.Sound.switchMusic = function () {
    fr.Sound.musicOn = !fr.Sound.musicOn;
    if (fr.Sound.musicOn) {
        fr.Sound.playMusicByScene();
    } else {
        fr.Sound.stopMusic();
    }

    fr.UserData.setBoolFromKey("sound_music", fr.Sound.musicOn);
    return fr.Sound.musicOn;
};

fr.Sound.playMusicByScene = function () {
    if (fr.Sound.musicOn) {
        let scene = sceneMgr.getMainLayer();

        if (scene.getSceneMusic) {
            fr.Sound.playMusic(scene.getSceneMusic(), true);
        } else {
            fr.Sound.playMusic(resMusic.lobby, true);
        }

    }
}

fr.Sound.switchVibrate = function () {
    fr.Sound.vibrateOn = !fr.Sound.vibrateOn;
    fr.UserData.setBoolFromKey("vibrate", fr.Sound.vibrateOn);
    return fr.Sound.vibrateOn;
};

fr.Sound.playVibrate = function (duration) {
    return;
    if (!fr.Sound.vibrateOn) return;
    if (duration == null) duration = 0.1;
    cc.Device.vibrate(duration);
}

fr.Sound.playHaptic = function (type) {
    if (!fr.Sound.vibrateOn) return;
    fr.platformWrapper.hapticTouch(type);
};