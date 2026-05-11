/**
 * LoginMgr - Simple login gate.
 * Checks local user data; if present, skip LayerLogin and open SceneLobby
 * directly using the stored user. Otherwise fall back to LayerLogin.
 */
var LoginMgr = LoginMgr || {};

/**
 * @returns {string|null} stored uId or null when none exists.
 */
LoginMgr.getLocalUserId = function () {
    return fr.UserData.getStringFromKey(KeyStorage.USER_ID, gv.socialMgr.getPortalId());
};

/**
 * @returns {boolean} true when a previous user is stored locally.
 */
LoginMgr.hasLocalUser = function () {
    var uId = LoginMgr.getLocalUserId();
    return !!uId;
};

/**
 * Normal login with an explicit uId. Persists the uId to local storage so
 * the next run can auto-login, then feeds userMgr with it and opens the
 * lobby.
 * @param {string|number} uId - user id to log in with.
 */
LoginMgr.login = function (uId) {
    if (uId === null || uId === undefined || uId === "") {
        cc.warn("LoginMgr.login: missing uId");
        return;
    }

    var uIdStr = uId.toString();
    cc.log("LoginMgr.login uId=" + uIdStr);

    // Persist for next session so autoLogin picks it up.
    fr.UserData.setStringFromKey(KeyStorage.USER_ID, uIdStr);

    try {
        var userInfo = userMgr.getData();
        if (userInfo) {
            userInfo.uId = uIdStr;
        }
    } catch (e) {
        cc.warn("LoginMgr.login: cannot set uId on userMgr - " + e);
    }

    if (window.abTestMgr) abTestMgr.setUserId(uIdStr);

    var p = CoreGame.Metrics._buildPrefix();
    p.type = "login";
    p.user_id = uIdStr;
    p.max_level = CoreGame.Metrics._getMaxLevel();
    p.gold_balance = CoreGame.Metrics._getGold();
    p.lives = CoreGame.Metrics._getLives();
    p.is_day_install = (function () { try { return gameMgr.isDayInstall() ? 1 : 0; } catch (e) { return -1; } })();
    CoreGame.Metrics.send(p);

    CoreGame.Metrics.startHeartbeat();
    sceneMgr.openScene(SceneLobby.className);
};

/**
 * Auto-login using the stored uId and open the lobby.
 * Mirrors the "Play Now" path in LayerLogin: feed userMgr with the stored
 * uId so initResources picks it up, then open SceneLobby.
 */
LoginMgr.autoLogin = function () {
    var uId = LoginMgr.getLocalUserId();
    cc.log("LoginMgr.autoLogin uId=" + uId);

    try {
        var userInfo = userMgr.getData();
        if (userInfo) {
            userInfo.uId = uId;
        }
    } catch (e) {
        cc.warn("LoginMgr.autoLogin: cannot set uId on userMgr - " + e);
    }

    if (window.abTestMgr) abTestMgr.setUserId(String(uId));

    var p = CoreGame.Metrics._buildPrefix();
    p.type = "login";
    p.user_id = String(uId);
    p.max_level = CoreGame.Metrics._getMaxLevel();
    p.gold_balance = CoreGame.Metrics._getGold();
    p.lives = CoreGame.Metrics._getLives();
    p.is_day_install = (function () { try { return gameMgr.isDayInstall() ? 1 : 0; } catch (e) { return -1; } })();
    CoreGame.Metrics.send(p);

    CoreGame.Metrics.startHeartbeat();
    setTimeout(function () {
        sceneMgr.openScene(SceneLobby.className);
    }, 500);
};

/**
 * Entry point called from GameMgr.startGame. If local user data is
 * available, skip the login screen; otherwise show LayerLogin as before.
 */
LoginMgr.start = function () {
    fr.UserData.setStringFromKey(KeyStorage.USER_ID, gv.socialMgr.getPortalId());
    challengeRoomMgr.load();

    var isFirstRun = !StorageUtil.getString("game_install_date");

    var ps = CoreGame.Metrics._buildPrefix();
    ps.type = "session_start";
    ps.livesAtStart = CoreGame.Metrics._getLives();
    ps.goldBalance = CoreGame.Metrics._getGold();
    ps.coldStartMs = CoreGame.Metrics._loadTime ? (Date.now() - CoreGame.Metrics._loadTime) : 0;
    CoreGame.Metrics.send(ps);

    if (isFirstRun) {
        var pi = CoreGame.Metrics._buildPrefix();
        pi.type = "install";
        pi.platform = (function () { try { return cc.sys.os || ""; } catch (e) { return ""; } })();
        pi.device_model = (function () { try { return cc.sys.platform || ""; } catch (e) { return ""; } })();
        CoreGame.Metrics.send(pi);
    }

    if (LoginMgr.hasLocalUser()) {
        LoginMgr.autoLogin();
    } else {
        sceneMgr.openScene(LayerLogin.className);
    }
};
