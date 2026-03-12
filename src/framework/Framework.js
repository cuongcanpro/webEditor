/**
 * Created by KienVN on 5/22/2015.
 */
if(cc.sys.isNative) {
    fr.OutPacket.extend = cc.Class.extend;
    fr.InPacket.extend = cc.Class.extend;
}

fr.onStart = function()
{
    fr.platformWrapper.init();
    fr.fcm.init();
    fr.firebaseAnalytic.init();
    fr.firebaseAnalytic.testFirebaseAnalytic();

    fr.Sound.init();

    if(cc.sys.isNative) {
        cc.Device.setKeepScreenOn(true);
    }
};