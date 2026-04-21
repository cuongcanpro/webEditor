/**
 * Base Class for all User Data Managers
 * @class
 */
const BaseMgr = cc.Class.extend({

    ctor: function () {
        BaseMgr.addToList(this);

        if (this.getAssetPath() !== "") {
            assetMgr.addDownloadFeature(this.getAssetPath(), this.getModuleName(), this);
        }
    },

    init: function () {

    },

    resetData: function () {

    },

    isReady : function() {
        return true;
    },

    update: function (dt) {

    },

    onReceived: function (cmd, data) {
        return false;
    },

    sendPacket: function (cmd) {
        GameClient.getInstance().sendPacket(cmd);
    },

    sendPacketCMD : function (cmdId) {
        let packet = new CmdSendCommon();
        packet.initData(100);
        packet.setControllerId(1);
        packet.setCmdId(cmdId);
        packet.packHeader();
        packet.updateSize();
        this.sendPacket(packet);

        packet.clean();
    },

    sendPacketData: function(_class, ...args) {
        const packet = new _class();
        packet.putData(...args);
        this.sendPacket(packet);

        packet.clean();
    },

    changeLanguage: function (lang) {

    },

    onLanguageChanged: function (ISOLangCode) {

    },

    /**
     * ISO lang code
     * eg:
     * config = {
     *     en: [<path to localized files>],
     *     id: ['Setting/Localized_id', 'Setting/Features1/Localized_id']
     * }
     * */
    configLocalized: function (config) {
        this._localizedConfig = config;
    },

    /* region Function Download Content */
    getAssetPath: function () {
        return "";
    },

    getModuleName: function () {
        return "";
    },

    onDownloadFinish: function (nameFeature) {

    },

    onDownloadFail: function (nameFeature) {

    },

    onDownloadUpdateProgression: function (percent, nameFeature) {

    }
    /* endregion Download Content */
});

// region Static function
BaseMgr.addToList = function (mgr) {
    BaseMgr.getList().push(mgr);
}
BaseMgr.getList = function () {
    if(!BaseMgr.arList) BaseMgr.arList = [];

    return BaseMgr.arList;
}
BaseMgr.initAll = function () {
    for(let mgr of BaseMgr.getList()) {
        if(mgr.isReady())
            mgr.init();
    }
}
BaseMgr.onReceived = function (cmd, pkg) {
    for(let mgr of BaseMgr.getList()) {
        if(mgr.isReady()) {
            mgr.onReceived(cmd, pkg);
        }
    }
}
BaseMgr.update = function (dt) {
    for(let mgr of BaseMgr.getList()) {
        mgr.update(dt);
    }
};
// endregion