/**
 * @class
 * @extends cc.Class
 * @property {Object.<string, SideButtonDataSource>} sideButtonSources
 * @property {Object.<string, TopButtonDataSource>} topButtonSources
 * @property {Object.<string, BoardButtonDataSource>} boardButtonSources
 */
const DynamicButtonMgr = cc.Class.extend({
    ctor : function() {
        this.sideButtonSources = {};
        this.topButtonSources = {};
        this.boardButtonSources = {};
    },

    /* region Manage Side Button */

    /**
     * @param {string} id
     * @param {SideButtonDataSource} source
     */
    registerSideButton: function(id, source) {
        if (!this.sideButtonSources[id]) {
            this.sideButtonSources[id] = source;

            dispatcherMgr.dispatchEvent(DynamicButtonMgr.Event.REGISTER_SIDE_BUTTON);
        }
    },

    /**
     * @return {string[]}
     */
    getListSideButton: function() {
        const list = [];
        for (let buttonId in this.sideButtonSources)
            list.push(buttonId)
        return list;
    },

    /**
     * @param {string} id
     * @return {cc.Node}
     */
    getSideButtonNode: function(id) {
        if (this.sideButtonSources[id])
            return this.sideButtonSources[id].getSideButtonNode(id);
        return null;
    },

    /**
     * @param {string} id
     * @return {boolean}
     */
    isSideButtonVisible: function(id) {
        if (this.sideButtonSources[id])
            return this.sideButtonSources[id].isSideButtonVisible(id);
        return false;
    },

    /**
     * @param {string} id
     */
    onSideButtonClicked: function(id) {
        if (this.sideButtonSources[id])
            this.sideButtonSources[id].onSideButtonClicked(id);
    },

    /* endregion Manage Side Button */

    /* endregion Manage Top Button */

    /**
     * @param {string} id
     * @param {TopButtonDataSource} source
     */
    registerTopButton: function(id, source) {
        if (!this.topButtonSources[id]) {
            this.topButtonSources[id] = source;

            dispatcherMgr.dispatchEvent(DynamicButtonMgr.Event.REGISTER_TOP_BUTTON);
        }
    },

    /**
     * @return {string[]}
     */
    getListTopButton: function() {
        const list = [];
        for (let buttonId in this.topButtonSources)
            list.push(buttonId)
        return list;
    },

    /**
     * @param {string} id
     * @return {cc.Node}
     */
    getTopButtonNode: function(id) {
        if (this.topButtonSources[id])
            return this.topButtonSources[id].getTopButtonNode(id);
        return null;
    },

    /**
     * @param {string} id
     * @return {boolean}
     */
    isTopButtonVisible: function(id) {
        if (this.topButtonSources[id])
            return this.topButtonSources[id].isTopButtonVisible(id);
        return false;
    },

    /**
     * @param {string} id
     */
    onTopButtonClicked: function(id) {
        if (this.topButtonSources[id])
            this.topButtonSources[id].onTopButtonClicked(id);
    },

    /* endregion Manage Top Button */

    /* endregion Manage Board Button */

    /**
     * @param {string} id
     * @param {BoardButtonDataSource} source
     */
    registerBoardButton: function(id, source) {
        if (!this.boardButtonSources[id]) {
            this.boardButtonSources[id] = source;

            dispatcherMgr.dispatchEvent(DynamicButtonMgr.Event.REGISTER_TOP_BUTTON);
        }
    },

    /**
     * @return {string[]}
     */
    getListBoardButton: function() {
        const list = [];
        for (let buttonId in this.boardButtonSources)
            list.push(buttonId)
        return list;
    },

    /**
     * @param {string} id
     * @return {cc.Node}
     */
    getBoardButtonNode: function(id) {
        if (this.boardButtonSources[id])
            return this.boardButtonSources[id].getBoardButtonNode(id);
        return null;
    },

    /**
     * @param {string} id
     * @return {number}
     */
    getBoardButtonWidth: function(id) {
        if (this.boardButtonSources[id])
            return this.boardButtonSources[id].getBoardButtonWidth(id);
        return 0;
    },

    /**
     * @param {string} id
     * @return {boolean}
     */
    isBoardButtonVisible: function(id) {
        if (this.boardButtonSources[id])
            return this.boardButtonSources[id].isBoardButtonVisible(id);
        return false;
    },

    /**
     * @param {string} id
     */
    onBoardButtonClicked: function(id) {
        if (this.boardButtonSources[id])
            return this.boardButtonSources[id].onBoardButtonClicked(id);
    }

    /* endregion Manage Board Button */
});

DynamicButtonMgr.getInstance = (function() {
    let instance = null;

    return (function() {
        if (!instance)
            instance = new DynamicButtonMgr();
        return instance;
    });
})();
/**
 * @type {DynamicButtonMgr}
 */
const dynamicButtonMgr = DynamicButtonMgr.getInstance();

DynamicButtonMgr.Event = {};
DynamicButtonMgr.Event.REGISTER_SIDE_BUTTON = "LobbyMgrRegisterSideButton";
DynamicButtonMgr.Event.REGISTER_TOP_BUTTON = "LobbyMgrRegisterTopButton";
DynamicButtonMgr.Event.REGISTER_BOARD_BUTTON = "LobbyMgrRegisterBoardButton";

/**
 * @interface
 */
const SideButtonDataSource = cc.Class.extend({

    /**
     * @virtual
     * @param {string} id
     * @return {cc.Node}
     */
    getSideButtonNode: function(id) {
        return null;
    },

    /**
     * @virtual
     * @param {string} id
     * @return {boolean}
     */
    isSideButtonVisible: function(id) {
        return false;
    },

    /**
     * @virtual
     * @param {string} id
     */
    onSideButtonClicked: function(id) {

    }
});

/**
 * @interface
 */
const TopButtonDataSource = cc.Class.extend({

    /**
     * @virtual
     * @param {string} id
     * @return {cc.Node}
     */
    getTopButtonNode: function(id) {
        return null;
    },

    /**
     * @virtual
     * @param {string} id
     * @return {boolean}
     */
    isTopButtonVisible: function(id) {
        return false;
    },

    /**
     * @virtual
     * @param {string} id
     */
    onTopButtonClicked: function(id) {

    }
});

/**
 * @interface
 */
const BoardButtonDataSource = cc.Class.extend({

    /**
     * @virtual
     * @param {string} id
     * @return {cc.Node}
     */
    getBoardButtonNode: function(id) {
        return null;
    },

    /**
     * @return {number}
     */
    getBoardButtonWidth: function(id) {
        return 0;
    },

    /**
     * @virtual
     * @param {string} id
     * @return {boolean}
     */
    isBoardButtonVisible: function(id) {
        return false;
    },

    /**
     * @virtual
     * @param {string} id
     */
    onBoardButtonClicked: function(id) {

    }
});