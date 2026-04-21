
var SpineUtil = {
    createEffectClock: function (sprClock) {
        var spineClock = gv.createSpineAnimation("event_collect/clock");
        spineClock.setPosition(sprClock.getPosition());
        spineClock.setLocalZOrder(sprClock.getLocalZOrder());
        sprClock.getParent().addChild(spineClock);
        sprClock.removeFromParent(true);
        spineClock.setAnimation(0, "anim", true);
        return spineClock;
    }
};