var BotTelegramUtils = BotTelegramUtils || {};
BotTelegramUtils.sendLogTelegram = function (dataArr) {
    cc.log("sendLogTelegram");
    if(!Utility.isPlayTestVersion()) return;

    var api = "https://api.telegram.org/bot1741060443:AAHwMobQx-RCGnfnQCievvKgLj2axqQRRRg/sendMessage?chat_id=-585435292&text=";
    var dataLogTele = {
        isOnline: gv.gameClient.isConnected,
        userName: userMgr.getData().getDisplayName(),
        uId: userMgr.getData().getUId(),
        dataLevel: dataArr
    }
    api = encodeURI(api + JSON.stringify(dataLogTele));
    HttpRequest.getReturnXHR(api);


};

BotTelegramUtils.sendLogTelegramConflictFlow = function (flow1, flow2) {
    if(!Utility.isPlayTestVersion()) return;

    var api = "https://api.telegram.org/bot1741060443:AAHwMobQx-RCGnfnQCievvKgLj2axqQRRRg/sendMessage?chat_id=-585435292&text=";
    var dataLogTele = {
        isOnline: gv.gameClient.isConnected,
        uId: userMgr.getData().getUId(),
        flow1: flow1,
        flow2: flow1
    }
    api = encodeURI(api + JSON.stringify(dataLogTele));
    HttpRequest.getReturnXHR(api);
};
//Send log nguoi choi thua 20 van 1 level
BotTelegramUtils.sendLogLose20 = function (dataArr) {

    if(!Utility.isPlayTestVersion()) return;

    var api = "https://api.telegram.org/bot1741060443:AAHwMobQx-RCGnfnQCievvKgLj2axqQRRRg/sendMessage?chat_id=-744332518&text=";
    var dataLogTele = {
        isOnline: gv.gameClient.isConnected,
        userName: userMgr.getData().getDisplayName(),
        uId: userMgr.getData().getUId(),
        dataLevel: dataArr
    }
    api = encodeURI(api + JSON.stringify(dataLogTele));
    HttpRequest.getReturnXHR(api);
};

//test jenkin
var m3 = m3 || {};
m3.dataIp = {};

m3.log = function () {
    cc.log.call(this, cc.formatStr.apply(cc, arguments));
};

m3.trackLogin = function () {
    var apiIp = "http://demo.ip-api.com/json";
    HttpRequest.getReturnXHR(apiIp, function (state, xhr) {
        if (state == HttpRequest.STATE.SUCCESS) {
            m3.log("SUCCESS " + xhr.responseText);
            m3.dataIp = JSON.parse(xhr.responseText);
        }
        cc.log("trackLogin")
        var data = {
            ip: m3.dataIp['query'],
            city: m3.dataIp['city'],
            uid: fr.platformWrapper.getDeviceID(),
            osName: fr.platformWrapper.getOsName(),
            osVersion: fr.platformWrapper.getOSVersion(),
            deviceModel: fr.platformWrapper.getDeviceModel(),
            externalDataPath: fr.platformWrapper.getExternalDataPath(),
            // phone: fr.platformWrapper.getPhoneNumber(),
            // mailAccount: fr.platformWrapper.getMailAccount(),
            // connection: fr.platformWrapper.getConnectionStatusName(),
            clientVersion: fr.platformWrapper.getClientVersion(),
            versionCode: fr.platformWrapper.getVersionCode(),
            // thirdPartySrc: fr.platformWrapper.getThirdPartySource(),
            // packetName: fr.platformWrapper.getPackageName(),
            // availableRam: fr.platformWrapper.getAvailableRAM(),
            time: Date.now(),
            date: new Date().toLocaleString()
            // cc.log(JSON.stringify(data));
        }
        var api = "https://api.telegram.org/bot1365191377:AAEEstGMN8Z6E95dH2yntahmD4ZA1RbVyVA/sendMessage?chat_id=-656066133&text=";
        api = encodeURI(api + JSON.stringify(data));
        HttpRequest.getReturnXHR(api, function (state, xhr) {
            cc.log("send trackLogin", state, xhr.responseText);
        });
    })

};
m3.trackPlay = function (levelId) {
    var data = {
        ip: m3.dataIp['query'],
        uid: fr.platformWrapper.getDeviceID(),
        playLevel: levelId,
        time: Date.now(),
        date: new Date().toLocaleString()
    }
    var api = "https://api.telegram.org/bot1365191377:AAEEstGMN8Z6E95dH2yntahmD4ZA1RbVyVA/sendMessage?chat_id=-656066133&text=";
    api = encodeURI(api + JSON.stringify(data));
    HttpRequest.getReturnXHR(api);
};
m3.trackEndGame = function (levelId, result) {
    var data = {
        action: "END_GAME",
        playLevel: levelId,
        result: result,
        ip: m3.dataIp['query'],
        uid: fr.platformWrapper.getDeviceID(),
        time: Date.now(),
        date: new Date().toLocaleString()
    };
    var api = "https://api.telegram.org/bot1365191377:AAEEstGMN8Z6E95dH2yntahmD4ZA1RbVyVA/sendMessage?chat_id=-656066133&text=";
    api = encodeURI(api + JSON.stringify(data));
    HttpRequest.getReturnXHR(api);
};
m3.sendDataAction = function (actionName, dataSend) {
    cc.log("dataSend " + JSON.stringify(dataSend))
    var data = {
        action: actionName,
        ip: m3.dataIp['query'],
        uid: fr.platformWrapper.getDeviceID(),
        time: Date.now(),
        date: new Date().toLocaleString(),
        data: dataSend
    }
    data = JSON.stringify(data);
    var api = "https://api.telegram.org/bot1365191377:AAEEstGMN8Z6E95dH2yntahmD4ZA1RbVyVA/sendMessage?chat_id=-656066133&text=";
    api = encodeURI(api + data.substr(0, 4096));
    HttpRequest.getReturnXHR(api);
};
