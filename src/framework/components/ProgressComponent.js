/**
 * Created by AnhVTT on 3/17/2021.
 */
var ProgressComponent = cc.Sprite.extend({
    /**
     * Create progress bar with animation when changing process
     * @param background: path to background image
     * @param progress: path to progress image
     */
    ctor: function(background, progress) {
        this._super(background);

        this.hpBar = new cc.ProgressTimer(new cc.Sprite(progress));
        this.hpBar.type = cc.ProgressTimer.TYPE_BAR;
        this.hpBar.setMidpoint(cc.p(0, 0));
        this.hpBar.setBarChangeRate(cc.p(1, 0));
        this.hpBar.setPosition(cc.p(this.width/2, this.height/2));
        this.hpBar.runAction(cc.progressTo(0, 0));
        this.addChild(this.hpBar);
        this.setCascadeOpacityEnabled(true);
        this.hpBar.setCascadeOpacityEnabled(true);

    },
    setPercentage:function(val){
        this.hpBar.setPercentage(val);
    },
    setPadding: function(padding) {
        this.hpBar.x += padding;
    }
});