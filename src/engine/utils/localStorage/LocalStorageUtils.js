/**
 * md5(KeyC + deviceId)
 * Created by phuongnm5 on 28.06.2021.
 */

LocalStorageUtils = {
    /***
     * Lấy KEY để encrypt dữ liệu trên local storage bằng uId
     * encrypt bằng md5 với keyC + deviceId đã lưu và lấy 20 ký tự đầu
     */
    getKeyLocalStorage : function (){
        var deviceId = fr.UserData.getStringFromKey(KeyStorage.DEVICE_ID_FOR_ENCRYPT, "");
        if (deviceId == ""){
            deviceId = fr.platformWrapper.getDeviceID();
            fr.UserData.setStringFromKey(KeyStorage.DEVICE_ID_FOR_ENCRYPT, deviceId);
        }
        let keyEncrypted = md5(this.getKeySync() + deviceId).toString();
        keyEncrypted = keyEncrypted.slice(0,20);
        return keyEncrypted;
    },

    getKeySync : function (){
        let keySync = "m@tch3_uAons$!2021_!CtpZP5_aw762^x";
        return keySync;
    },
};
