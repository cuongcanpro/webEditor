/**
 * Created by AnhVTT on 31/8/2021.
 */
var NodePopupGUIEndGame = cc.Node.extend({
    ctor: function (parentLayer) {
        this._super();
        this.parentLayer = parentLayer;
        this.initUI();
    },

    initUI: function () {
        var json = ccs.load(res.ZCSD_NODE_POPUP_GUI_END_GAME);
        this._rootNode = json.node;
        this.addChild(this._rootNode);
        UIUtils.mappingChildren(this._rootNode, this);
        this.setVisible(false);

    },

    show: function (type) {
        let size = cc.size(this.popup.width, this.popup.height);
        this.setVisible(true);
        this.popup.setPosition(-size.width/2 + 100, size.height/2 - 35);
        // this.popup.setPosition(0, 0);
        this.popup.setScale(0);
        this.popup.setOpacity(0);
        switch (type) {
            case NodePopupGUIEndGame.POPUP_TYPE.WIN_STREAK:
                this.showWinStreak();
                break;
            case NodePopupGUIEndGame.POPUP_TYPE.EVENT_COLLECT:
                this.showEventCollect();
                break;
            case NodePopupGUIEndGame.POPUP_TYPE.OUT_OF_HEART:
                this.showAlertOutOfHeart();
                break;
        }
        this.popup.runAction(cc.spawn(

            // cc.moveBy(0.25, size.width/2 - 30, -size.height/2),
            cc.fadeIn(0.25)
        ));
        this.popup.runAction(cc.sequence(
            cc.scaleTo(0.2, 1.05, 1.05),
            cc.scaleTo(0.1, 0.95, 0.95),
            cc.scaleTo(0.1, 1.0, 1.0)
        ))
        // this.popup.runAction(cc.spawn(
        //     cc.scaleTo(0.25, 1, 1),
        //     cc.moveBy(0.25, size.width/2 - 30, -size.height/2),
        //     cc.fadeIn(0.25)
        // ).easing(cc.easeBezierAction(0.42, 0, 0.69, 1.0)));
    },

    hide: function () {
        let size = cc.size(this.popup.width, this.popup.height);
        // this.popup.runAction(cc.spawn(
        //     cc.scaleTo(0.25, 0, 0),
        //     cc.moveTo(0.25, -size.width/2 + 30, size.height/2),
        //     cc.fadeOut(0.1)
        // ).easing(cc.easeBezierAction(0.42, 0, 0.69, 1.0)));
        this.popup.runAction(cc.fadeOut(0.1));
        if(this.popup.getChildByName("winstreak").progressBar){
            this.popup.getChildByName("winstreak").progressBar.setPercentage(0);
        }
    },

    showWinStreak: function () {

        this.popup.getChildByName('description').setString(fr.Localization.text("lang_lose_winstreak_end_game"));
        this.popup.getChildByName('collectEvent').setVisible(false);
        this.popup.getChildByName('winstreak').setVisible(true);
        this.popup.getChildByName('lastHeart').setVisible(false);
        this.popup.setCascadeOpacityEnabled(true);
        // bottle
        let bg = this.popup.getChildByName('winstreak');
        let winstreak = userMgr.getData().getWinStreakLevel();
        let bottlePath = 'winstreak/bottle_02.png';
        if (winstreak == 3)
            bottlePath = 'winstreak/bottle_03.png';
        bg.getChildByName('bottle').setTexture(bottlePath);
        bg.setCascadeOpacityEnabled(true);
        // prize
        let PUs = gv.winStreakCfg.getBonusByStreak(winstreak);
        switch (PUs.length) {
            case 2:
                bg.getChildByName('prize').getChildByName('p0').setPosition(-30, 0);
                bg.getChildByName('prize').getChildByName('p1').setPosition(30, 0);
                break;
            case 3:
                bg.getChildByName('prize').getChildByName('p0').setPosition(-30, 0);
                bg.getChildByName('prize').getChildByName('p1').setPosition(30, 0);
                bg.getChildByName('prize').getChildByName('p2').setPosition(0, 0);
                break;
            case 4:
                bg.getChildByName('prize').getChildByName('p0').setPosition(-30, -10);
                bg.getChildByName('prize').getChildByName('p1').setPosition(30, -10);
                bg.getChildByName('prize').getChildByName('p2').setPosition(0, -10);
                bg.getChildByName('prize').getChildByName('p3').setPosition(0, 20);
                break;
        }
        var pSlot = 0;
        for (let i in PUs) {
            let type = PUs[i];
            let path = 'winstreak/' + type + '.png';
            let node = bg.getChildByName('prize').getChildByName('p' + pSlot);
            node.setTexture(path);
            node.setVisible(true);
            pSlot++;
        }
        for (var i = pSlot; i < 4; i++)
            bg.getChildByName('prize').getChildByName('p' + i).setVisible(false);

        // progressbar
        if (!bg.progressBar) {
            let progressBar = new ProgressComponent(
                'game/gui/end_game/progress_bar_bg.png',
                'game/gui/end_game/progress_bar.png'
            );

            progressBar.setPosition(100, -40);
            bg.addChild(progressBar);
            bg.progressBar = progressBar;

            // number
            let number = new ccui.Text(winstreak + "/3", res.FONT_GAME_BOLD, 26);
            number.enableOutline(cc.color(41, 106, 9), 2);
            number.enableShadow(cc.color(41, 106, 9), cc.size(1, -1), 1);
            progressBar.addChild(number);
            number.setPosition(progressBar.width/2, progressBar.height/2);

            // divider
            for (let i = 1; i < 3; i++) {
                let div = new cc.Sprite(win_streak_res.progress_splitter);
                div.setPosition(progressBar.hpBar.width/3*i, progressBar.hpBar.height/2);
                progressBar.hpBar.addChild(div);
            }
        }
        bg.progressBar.hpBar.runAction(cc.progressTo(0, winstreak/3*100));
    },

    showEventCollect: function () {
        this.popup.getChildByName('description').setString(fr.Localization.text('lang_lose_collection_end_game_1'));
        this.popup.getChildByName('collectEvent').setVisible(true);
        this.popup.getChildByName('winstreak').setVisible(false);
        this.popup.getChildByName('lastHeart').setVisible(false);

        let targetType = EvtCollectMgr.getInstance().getTarget();
        let rewardType = EvtCollectMgr.getInstance().rewardType;
        let rewardAmount = EvtCollectMgr.getInstance().rewardAmount;
        let addedAmount = this.parentLayer.mainScene.mainBoard.countCollectedGemByType(targetType);

        let bg = this.popup.getChildByName('collectEvent');
        if (targetType != null) {
            fr.changeSprite(bg.getChildByName('icon'), "game/element/" + targetType + ".png");
            let icon = bg.getChildByName('progressBar').getChildByName('icon');
            fr.changeSprite(icon, "game/element/" + targetType + ".png");
            icon.setScale(Math.min(74/icon.width, 52/icon.height));
        }
        if (rewardType != null && rewardAmount != null) {
            this.setSprReward(rewardType, rewardAmount);
        }
        if (addedAmount != null) {
            bg.getChildByName('amount').setString('x' + addedAmount);
        }
    },

    showAlertOutOfHeart: function () {
        this.popup.getChildByName('description').setString(fr.Localization.text('lang_last_heart_end_game'));
        this.popup.getChildByName('collectEvent').setVisible(false);
        this.popup.getChildByName('winstreak').setVisible(false);
        this.popup.getChildByName('lastHeart').setVisible(true)
    },

    setSprReward: function (rewardType, rewardAmount) {
        let path = "", pos = cc.p(427, 50), scale = 0.8;
        let isInfiniteReward = false;
        switch (rewardType) {
            case ResourceType.GANG_TAY:
                path = "game/gui/tool/tool_0.png";
                pos = cc.p(427, 50);
                scale = 0.9;
                break;
            case ResourceType.BUA:
                path = "game/gui/tool/tool_1.png";
                pos = cc.p(430, 50);
                scale = 0.85;
                break;
            case ResourceType.BUA_TA:
                path = "game/gui/tool/tool_2.png";
                pos = cc.p(429, 51)
                break;
            case ResourceType.HEART_FREE:
                path = "lobby/icon_life.png";
                pos = cc.p(427, 48)
                scale = 1;
                isInfiniteReward = true;
                break;
            case ResourceType.GOLD:
                path = "lobby/icon_gold.png";
                pos = cc.p(427, 45);
                scale = 1.1;
                break;
            case ResourceType.BOM_PHAO:
                path = "game/gui/booster/booster_1.png";
                pos = cc.p(427, 50);
                scale = 1.1;
                break;
            case ResourceType.BOM_PHAO_FREE:
                path = "game/gui/booster/booster_1.png";
                pos = cc.p(427, 50);
                scale = 1.1;
                isInfiniteReward = true;
                break;
            case ResourceType.MAY_BAY:
                path = "game/gui/booster/booster_0.png";
                pos = cc.p(425, 48);
                scale = 1.1;
                break;
            case ResourceType.MAY_BAY_FREE:
                path = "game/gui/booster/booster_0.png";
                pos = cc.p(425, 48);
                scale = 1.1;
                isInfiniteReward = true;
                break;
            case ResourceType.HAT5:
                path = "game/gui/booster/booster_2.png";
                pos = cc.p(427, 50);
                scale = 1;
                break;
            case ResourceType.HAT5_FREE:
                path = "game/gui/booster/booster_2.png";
                pos = cc.p(427, 50);
                scale = 1;
                isInfiniteReward = true;
                break;
            case ResourceType.PACK:
                path = "items/pack_card.png";
                pos = cc.p(427, 50);
                scale = 0.55;
                break;
        }
        let bg = this.popup.getChildByName('collectEvent').getChildByName('progressBar');
        let spr = bg.getChildByName('reward');
        fr.changeSprite(spr, path);
        spr.setPosition(pos);
        spr.setScale(scale);
        var strAmount = isInfiniteReward ? fr.timeToText(rewardAmount * 60 * 1000) : ('x' + rewardAmount);
        bg.getChildByName('rewardAmount').setString(strAmount);
    },
})

NodePopupGUIEndGame.POPUP_TYPE = {
    WIN_STREAK: 1,
    EVENT_COLLECT: 2,
    OUT_OF_HEART: 3
}
NodePopupGUIEndGame.json = "game/csd/NodePopupGUIEndGame.json";