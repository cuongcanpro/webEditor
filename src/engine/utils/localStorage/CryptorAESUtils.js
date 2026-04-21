/**
 * Created by phuongnm5 on 19.08.2021.
 */

CryptorAESUtils = {
    /***
     * decrypt AES, if fail =>
     *      - Play social + connected: notify + send request to server to get new info
     *      - Play social + disconnect: notify + request login
     *      - Play guest: notify + reset data to init default
     * @param encryptedText
     * @param encryptKey
     * @param dataKey
     */
    decryptAES : function (encryptedText, encryptKey, dataKey) {
        var isLog = true;
        try{
            return CryptorAESUtils.decryptAESWithoutCatch(encryptedText, encryptKey);
        } catch (e){
            if (isLog && dataKey != null){
                cc.log("cur decrypt key:", encryptKey);
                cc.log("logBugCrypt_val:", cc.sys.localStorage.getItem("logBugCrypt_val_" + dataKey));
                cc.log("logBugCrypt_key:", cc.sys.localStorage.getItem("logBugCrypt_key_" + dataKey));
            }
            cc.warn(e.message);
            cc.warn("CryptorAESUtils.decryptAES ERROR decrypt");
            CryptorAESUtils.decryptExceptionHandler(e);
        }
    },

    decryptAESWithoutCatch : function (encryptedText, key) {
        let decryptedText = CryptoJS.AES.decrypt(encryptedText.toString(), key).toString(CryptoJS.enc.Utf8);
        return decryptedText;
    },

    /***
     * nếu k derypt được:
     - Đang chơi social và có mạng (sync thành công, modeplay = true) : thông báo cố user là có lỗi xảy ra, đồng thời request lấy tài nguyên
     - Đang chơi social và k có mạng: thông báo cố user là có lỗi xảy ra và bắt login
     - Đang chơi guest: thông báo lỗi và reset tài nguyên về default nhé
     */
    decryptExceptionHandler : function (error){
        cc.log("CryptorAESUtils.decryptExceptionHandler");
        // eventProcessor.isNeedNotifyNet = GameConstant.ERROR_CRYPTOR;

        //TODO: cần check lại vì có thể lỗi ở chỗ getinstance nên có lấy được info từ sv thì vẫn k ổn
        // cc.director.runScene(new GUILoadingBoardScene);
        // if(modePlay)
        // {
        //     cc.log("CryptorAESUtils.decryptExceptionHandler No guest + modePlay = true");
        //     gv.clientNetwork.connector.sendGetUserInfo();
        //     CryptorAESUtils.myTimeOut = setTimeout(CryptorAESUtils.onEndTimeOut, gv.PING_TIME.TIME_OUT_DISCONNECT);
        // } else
        // {
        //     cc.sys.localStorage.clear();
        //     cc.director.runScene(new SceneLogin);
        //     throw error;
        // }

        cc.sys.localStorage.clear();
        cc.director.runScene(new SceneLogin);
        throw error;
    },

    /***
     * nếu hết timeout mà k nhận đc reponse server thì bắt login
     */
    onEndTimeOut : function (){
        cc.log("CryptorAESUtils.onEndTimeOut");
        clearTimeout(CryptorAESUtils.myTimeOut);
        // eventProcessor.isNeedNotifyNet = GameConstant.ERROR_CRYPTOR;
        cc.director.runScene(new SceneLogin);
        throw e;
    }
}