var GUIStartGame = cc.Node.extend({
    ctor: function (mainScene) {
        this._super();
        this.mainScene = mainScene;
        this.hided = false;
        this.initUI();
    },
    initUI: function () {
        var json = ccs.load(res.ZCSD_GUI_START_GAME, "");
        this._rootNode = json.node;
        m3.log(JSON.stringify(cc.winSize))
        this.addChild(this._rootNode);
        UIUtils.mappingChildren(this._rootNode, this);

        let spriteBatchNode = new cc.SpriteBatchNode(gui_start_game_res.bg_target);
        this.bgTarget = new cc.Scale9Sprite();
        this.bgTarget.updateWithBatchNode(spriteBatchNode, cc.rect(0, 0, 825, 190), false, cc.rect(200, 0, 200, 190));
        this.bgTarget.setPosition(0, 0);
        this.nodeNpc.addChild(this.bgTarget);
        this.bgTarget.width = cc.winSize.width + 100;
        this.bgTarget.bg = new cc.Sprite(gui_start_game_res.bg_target_objective);
        this.bgTarget.addChild(this.bgTarget.bg);
        this.bgTarget.bg.setPosition(this.bgTarget.width*0.5681, this.bgTarget.height*0.54);
        this.bgTarget.lblTarget = new ccui.Text(fr.Localization.text("lang_target"), res.FONT_GAME_BOLD, 38);
        this.bgTarget.lblTarget.setColor(cc.color(123, 82, 9));
        this.bgTarget.lblTarget.setPosition(this.bgTarget.width*0.1748, this.bgTarget.height*0.54);
        this.bgTarget.addChild(this.bgTarget.lblTarget);
    },
    setListTarget: function (target) {
        let bg = this.bgTarget.bg;
        var rootPos = cc.p(bg.width/2, bg.height * 0.6);l
        var listNode = [];
        for (var type in target) {
            var node = this.createTarget(type, target[type]);
            bg.addChild(node);
            listNode.push(node);
        }
        let padding = 120;
        if (listNode.length == 3) padding = 110;
        if (listNode.length >= 4) padding = 95;
        for (var i in listNode) listNode[i].setPosition(rootPos.x + (i - (listNode.length - 1) / 2) * padding, rootPos.y);

        if (this.mainScene.mainBoard.isLevelBonusGold) {
                this.bgTarget.lblTarget.setString(fr.Localization.text("lang_collect"));
        } else {
            this.bgTarget.lblTarget.setString(fr.Localization.text("lang_target"));
        }
    },
    createTarget: function (type, number) {
        var bg = new cc.Node();

        var spr = new cc.Sprite("game/element/icon/" + type + ".png");
        bg.addChild(spr);

        if (type != CoreGame.Config.ElementType.GOLD_BONUS) {
            var lbl = new ccui.Text(number + "", res.FONT_GAME_BOLD, 30);
            lbl.setPosition(0, -50);
            lbl.enableOutline(cc.color(149, 86, 64, 255), 2);
            lbl.enableShadow(cc.color(149, 86, 64), cc.size(1, -1), 2);
            bg.addChild(lbl);
        } else {
            spr.setPositionY(-15);
        }

        bg.setAnchorPoint(0.5, 0.5)
        return bg;
    },
    showListTarget: function () {
        if (this.mainScene.replayed) {
            this.runAction(cc.sequence(
                cc.delayTime(0.2),
                cc.callFunc(function () {
                    this.mainScene.showToolGuis();
                    this.mainScene.mainBoard.flyBoardIn();
                }.bind(this)),
                cc.delayTime(0.6),
                cc.callFunc(function () {
                    this.onFinishGuiStartGame();
                }.bind(this))
            ));
            return;
        }
        fr.showTopPanel(this.mainScene);

        this.hided = false;
        this.setVisible(true);
        fr.Sound.playSoundEffect(resSound.game_start, false);
        this.fog.addTouchEventListener(this.touchFog, this);
        this.runAction(cc.sequence(
            cc.delayTime(1.0),
            cc.callFunc(function () {
                this.hide();
            }.bind(this))
        ))
    },
    touchFog: function (sender, type) {
        if (type == ccui.Widget.TOUCH_ENDED) this.hide();
    },
    hide: function () {
        if (this.hided) return;
        this.hided = true;

        this.nodeNpc.runAction(cc.sequence(
            cc.spawn(
                cc.moveTo(0.5, cc.winSize.width + 1500, this.nodeNpc.y).easing(cc.easeQuadraticActionIn()),
                cc.fadeOut(0.5)
            )
        ));
        this.runAction(cc.sequence(
            cc.delayTime(0.8),
            cc.callFunc(function () {
                fr.hideTopPanel(this.mainScene);
                this.mainScene.mainBoard.flyBoardIn();
            }.bind(this)),
            cc.delayTime(0.6),
            cc.callFunc(function () {
                this.setVisible(false);
                this.onFinishGuiStartGame();
            }.bind(this))
        ))
    },

    onFinishGuiStartGame: function () {
        this.mainScene.mainBoard.renderAfterIntroduced();
    }
});
