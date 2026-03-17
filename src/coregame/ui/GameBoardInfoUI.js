var CoreGame = CoreGame || {};

CoreGame.GameBoardInfoUI = BaseLayer.extend({
    nodeInfo: null,
    alert_180min_18: null,
    bgTop: null,

    pInfo: null,
    nodeMain: null,
    lbLevel: null,
    lbMove: null,
    pObjective: null,

    iconCollect: null,
    btnTest: null,
    nodeTest: null,
    nodeTest: null,

    listNode: [],

    ctor: function (mainScene) {
        this._super();
        this.mainScene = mainScene;

        this.initWithJsonFile(CoreGame.GameBoardInfoUI.JSON);
    },

    initLayer: function () {
        this.lbLevel.setString(this.mainScene ? this.mainScene.getLevel() : "-");
        this.setScale(cc.winSize.width / this.bgTop.width);
        this.setPositionOnNotchIOS();

        this.spine_cat = gv.createSpineAnimation(resAni.char_gui_board_info);
        this.spine_cat.setPosition(-260, -165);
        this.nodeMain.addChild(this.spine_cat);
        this.spine_cat.setAnimation(0, 'idle', true);

        this._initTest();
    },

    initItemCount: function (type, lbl) {
        this.nodeMain.getChildByName('itemCount').setVisible(true);
        this.nodeMain.getChildByName('itemCount').getChildByName('icon')
            .loadTexture('game/element/icon/' + type + '.png', ccui.Widget.LOCAL_TEXTURE);
        this.nodeMain.getChildByName('itemCount').getChildByName('lbl').setString(lbl);
    },

    initData: function (levelConfig) {
        this.setMove(levelConfig.mapConfig.numMove);
        this.setListTarget(levelConfig.mapConfig.targetElements);
    },

    setItemCountLbl: function (lbl) {
        this.nodeMain.getChildByName('itemCount').getChildByName('lbl').setString(lbl);
    },

    hideItemCount: function () {
        this.nodeMain.getChildByName('itemCount').setVisible(false);
    },

    setPositionOnNotchIOS: function () {
        cc.log("setPositionOnNotchIOS", cc.winSize.height / cc.winSize.width)
        if (fr.platformWrapper.isIOSHaveNotch()) {
            this.bgTop.height += GUIConst.IOS_NOTCH_HEIGHT;
            this.nodeMain.y -= GUIConst.IOS_NOTCH_HEIGHT;
        }
    },

    setMove: function (move) {
        cc.log("GameBoardInfoUI move", move);
        this.lbMove.setString(move);

        if (this.gameEnded) {
            return;
        }

        this.spine_cat.setAnimation(0, move <= 3 ? 'worry' : 'idle', true);
    },

    setListTarget: function (targetElements) {
        for (let node of this.listNode) {
            node.removeFromParent(true);
        }

        this.listNode = [];
        var count = 0, numTarget = targetElements.length;
        for (var element of targetElements) {
            var node = this.createTarget(element.id, element.count);
            node.setPosition(this['nodeDemo_' + numTarget + '_' + (count++)].getPosition());
            node.y -= 2;
            this.nodeMain.addChild(node);
            this.listNode.push(node);
        }

        for (var i = 0; i < numTarget - 1; i++) {
            this['dash_' + numTarget + '_' + i].setVisible(true);
        }
        this.numTarget = numTarget;
    },

    createTarget: function (type, number) {
        var node = new cc.Node();

        node.spr = new cc.Sprite("game/element/icon/" + type + ".png");
        node.spr.setPosition(5, 5);
        node.addChild(node.spr);

        node.lbl = new NumberLabel(res.FONT_GAME_BOLD, 40, number);
        node.lbl.label.enableOutline(cc.color(76, 86, 121, 255));
        node.lbl.setPosition(10, -20);
        node.addChild(node.lbl);
        node.setScale(0.8);

        node.check = new cc.Sprite(check_icon);
        node.check.setPosition(10, -20);
        node.check.setVisible(false);
        node.addChild(node.check);

        node.type = type;
        node.target = number;
        node.number = number;
        node.lastRemain = -1;

        switch (type) {
            case "coin":
                node.collectElement = function (amount) {
                    node.number += amount;
                    cc.log("collectElement number=" + node.number);
                    node.lbl.addValue(amount);
                    if (node.lbl.value <= 0) {
                        node.lbl.setVisible(false);
                        node.check.setVisible(true);
                    }
                }.bind(this);
                break;
            case CoreGame.Config.ElementType.GOLD_BONUS + "":
                cc.log("anhlmt")
                node.collectElement = function (amount) {
                    node.number -= amount;
                    node.lbl.addValue(-amount);
                }.bind(this);
                break;
            default:
                node.collectElement = function (amount) {
                    node.number += amount;
                    cc.log("collectElement number=" + node.number);
                    let remain = node.number;
                    cc.log("collectElement", remain, node.lastRemain, node.type)
                    if (node.lastRemain == remain) return;
                    node.lastRemain = remain;
                    node.lbl.addValue(remain - node.lbl.value);
                    if (node.lbl.value <= 0) {
                        node.lbl.setVisible(false);
                        node.check.setVisible(true);
                    }
                }.bind(this);
                break;
        }

        node.unCollectElement = function (amount = 0) {
            node.number += amount;
            cc.log("unCollect number=" + node.number);
            node.addValue(amount)
        };
        return node;
    },

    getNodeTarget: function (type) {
        for (var i in this.listNode) if (this.listNode[i].type == type) return this.listNode[i];
        return null;
    },

    suckElement: function (element) {
        cc.log("suckElement " + element.id, this.mainScene.mainBoard.listCurTarget[CoreGame.Config.ElementType.GOLD_BONUS]);

        if (element.getCurState() == Element.State.NONE) return;
        cc.log("element " + element.id + " suck " + element.type + ' ' + element.isCollected)
        var nodeTarget = this.getNodeTarget(element.getType());
        if (nodeTarget == null) return;
        if (!element.isCollectible()) {
            nodeTarget.collectElement(-1);
            return;
        }
        element.setCurState(Element.State.NONE);
        cc.log('isCollectible')

        element.getBoard().removeElement(element);
        for (let i = 0; i < element.width; i++)
            for (let j = 0; j < element.height; j++) {
                this.board.getSlot(element.row - i, element.col - j).removeElement(element);
            }

        UIUtils.changeParent(element, cc.director.getRunningScene());
        element.setScale(1.05);

        var wPosNodeTarget = nodeTarget.getParent().convertToWorldSpace(nodeTarget.getPosition());
        var posNodeTargetOnBoard = element.getBoard().panelBoard.convertToNodeSpace(wPosNodeTarget);
        // var posNodeTargetOnBoard = element.getParent().convertToNodeSpace(wPosNodeTarget);
        // var posNodeTarget = posNodeTargetOnBoard;

        var posNodeTarget = wPosNodeTarget;
        var isRight = posNodeTarget.x > element.x;

        element.stopAllActions();
        element.spr.stopAllActions();
        var zOrderInc = element.idxInPattern ? element.idxInPattern : 0;
        element.setLocalZOrder(BoardConst.zOrder.OBJECTIVE + zOrderInc);

        var timeDelay = element.idxInPattern ? (element.idxInPattern * 0.1) : 0;
        var timeMove = 0.7;
        var dX = isRight ? 200 : -200;
        var midPoint = PointUtils.getMiddlePointOfBezierCurve(cc.p(element.x + dX, element.y - 150), cc.p(posNodeTarget.x + 5, posNodeTarget.y + 5), 50, true);
        var bezier = [cc.p(element.x + dX, element.y - 150), midPoint, cc.p(posNodeTarget.x + 5, posNodeTarget.y + 5)];
        this.runAction(cc.sequence(
            cc.delayTime(timeDelay),
            cc.callFunc(function () {
                element.setCurState(Element.State.NONE);
                if (element.getType() >= CoreGame.Config.ElementType.GREEN && element.getType() <= CoreGame.Config.ElementType.CYAN) {
                    element.shadow = new CoreGame.GameBoardInfoUI.NodeShadow(element, timeMove, "icon_" + element.getType() + "_shadow.png");
                } else {
                    element.shadow = new CoreGame.GameBoardInfoUI.NodeShadow(element, timeMove);
                }
                element.shadow.setShadowZOder(BoardConst.zOrder.OBJECTIVE + zOrderInc - 1);
                element.runAction(cc.bezierTo(timeMove, bezier).easing(cc.easeSineInOut()));
            }),
            cc.delayTime(timeMove),
            cc.callFunc(function () {
                nodeTarget.collectElement(-1);
                cc.log('suckElement removeElement', element.id, element.type);
                element.removeSelf();
                element.shadow.remove();
                if (nodeTarget.spr.numberOfRunningActions() == 0) {
                    nodeTarget.spr.runAction(cc.spawn(
                        cc.sequence(
                            cc.scaleTo(0.15, 1.2, 0.9).easing(cc.easeSineIn()),
                            cc.scaleTo(0.13, 1, 1)
                        ),
                        cc.sequence(
                            cc.moveBy(0.15, 0, 5),
                            cc.moveBy(0.15, 0, -5)
                        )
                    ))
                }
            })
        ))
        element.runAction(cc.sequence(
            cc.delayTime(timeDelay),
            cc.scaleTo(timeMove / 2, 1.2),
            cc.scaleTo(timeMove / 2, 0.8)
        ))
    },

    initCoinCollect: function (amount) {
        this.showObjectiveBar(true);
        for (var i = 0; i < this.numTarget - 1; i++) this['dash_' + this.numTarget + '_' + i].setVisible(false);
        for (var i in this.listNode) {
            this.listNode[i].removeFromParent(true);
        }

        var coin = this.createTarget("coin", amount || 0);
        coin.setPosition(this['nodeDemo_1_0']);
        // this.mainScene.mainBoard.reward = amount || 0;
        this.coinTarget = coin;
        this.nodeMain.addChild(coin);
    },

    collectCoin: function (amount, position, zoomOut, delayAnim) {
        // create Coin at initial position
        this.mainScene.mainBoard.reward += amount;

        this.runAction(cc.sequence(
            cc.delayTime(delayAnim),
            cc.callFunc(function () {
                var coin = gv.createSpineAnimation(resAni.efk_coin_gold);
                coin.setAnimation(0, "xu_meo", true);
                var nodePosSlot = this.coinTarget.convertToNodeSpace(position);
                coin.setScale(100 / 80)
                coin.setPosition(nodePosSlot);
                this.coinTarget.addChild(coin, 100);

                // flying animation
                var timeY = Math.abs(coin.y) * 0.0012;
                var timeX = Math.abs(coin.x) * 0.0012;
                var timeMove = timeY + timeX;
                if (zoomOut) {
                    coin.setScale(0);
                    coin.runAction(cc.scaleTo(timeMove * 0.4, 100 / 80, 100 / 80));
                }
                var actionScaleShadow = cc.sequence(
                    cc.scaleTo(timeMove / 2, 1.5),
                    cc.scaleTo(timeMove - timeMove / 2, 1.0)
                )
                coin.shadow = new CoreGame.GameBoardInfoUI.NodeShadow(coin, timeMove, null, actionScaleShadow);
                coin.runAction(cc.sequence(
                    cc.bezierTo(timeMove, [cc.p(coin.x / 2 + 100, coin.y / 2 + 100), cc.p(coin.x / 2 + 50, coin.y / 2 + 100), cc.p(0, 0), cc.p(0, -40)]).easing(cc.easeSineInOut()),
                    cc.spawn(
                        cc.moveBy(0.01, 0, 30),
                        cc.fadeOut(0.01)
                    ),
                    cc.callFunc(function () {
                        this.coinTarget.collectElement(amount);
                        coin.shadow.remove();
                        coin.setVisible(false);
                        coin.removeFromParent(false);
                        this.coinTarget.stopAllActions();
                        this.coinTarget.runAction(cc.sequence(
                            cc.scaleTo(0.15, 1),
                            cc.scaleTo(0.15, 0.8)
                        ))
                    }.bind(this))
                ))
            }.bind(this))
        ))
    },

    showObjectiveBar: function (isShow) {
        this.pObjective.setVisible(isShow);
        for (let i in this.listNode)
            this.listNode[i].setVisible(isShow);
        this.spine_cat.setVisible(isShow);
        if (!isShow) { // ballon resize top bar
            this.bgTop.height = 50;
            if (fr.platformWrapper.isIOSHaveNotch()) {
                this.bgTop.height = 50 + GUIConst.IOS_NOTCH_HEIGHT
            }
        } else {
            this.bgTop.height = 75;
        }
    },

    onShowSpineCatTalking: function (newParent, zOrder) {
        this.spineCatData = {
            parent: this.nodeMain,
            zOrder: 1,
            visible: this.spine_cat.isVisible()
        }
        UIUtils.changeParent(this.spine_cat, newParent, zOrder);
        this.spine_cat.setVisible(true);
        this.spine_cat.setAnimation(0, 'happy', false);
        this.spine_cat.addAnimation(0, 'idle', true);
    },

    stopSpineCatTalking: function () {
        if (this.spineCatData != null) {
            UIUtils.changeParent(this.spine_cat, this.spineCatData.parent, 1);
            this.spine_cat.setAnimation(0, 'idle', true);
            this.spine_cat.setVisible(this.spineCatData.visible);
            this.spineCatData = null;
        }
    },

    getBgObjective: function () {
        return this.nodeMain.getChildByName('bgObjective');
    },

    getDialogWorldPosAlignToSpineCat: function () {
        var catWPos = this.spine_cat.getParent().convertToWorldSpace(this.spine_cat.getPosition());
        return cc.p(catWPos.x, catWPos.y);
    },

    _initTest: function () {
        this.btnTest.setVisible(!gv.isRelease);
        this.nodeTest.setVisible(false);
        this.showTest = function () {
            if (!gv.isRelease) this.nodeTest.setVisible(!this.nodeTest.isVisible());
        };
        this.btnTest.addClickEventListener(this.showTest.bind(this));
        this.onTestSetMove = function () {
            if (!gv.isRelease) {
                var inputMove = Number(this.tfTestSetMove.getString());
                if (1 <= inputMove && inputMove <= 100) {
                    this.board.setMove(inputMove);
                }
            }
        };
        this.btnTestSetMove.addClickEventListener(this.onTestSetMove.bind(this));
    },

});
CoreGame.GameBoardInfoUI.JSON = "zcsd/game/GameBoardInfoUI.json";

/**
 * Create shadowFake, add child to object Flying
 * Create shadow and move along to shadowFake position.
 */
CoreGame.GameBoardInfoUI.NodeShadow = cc.Node.extend({
    /**
     *
     * @param objectFly: object want to add shadow
     * @param shadowResourcesPath: resources path of shadow
     * @param actionScale: customize action scale shadow if needed
     * @param shadowZOrder: ZOder shadow
     * @param timeMove: total time move animation
     */
    ctor: function (objectFly, timeMove, shadowResourcesPath, actionScale) {
        this._super();
        objectFly.getParent().addChild(this);
        this.objectFly = objectFly;

        //init shadow resources path
        if (_.isUndefined(shadowResourcesPath) || shadowResourcesPath == null) {
            shadowResourcesPath = res.img_shadow;
        }

        this._shadow = UIUtils.createSprite(shadowResourcesPath, objectFly.getParent());
        this._shadow.setLocalZOrder(objectFly.getLocalZOrder() - 1);
        // run action scale custom, if actionScale = null then scale on update with scale rate = object fly'scale rate
        if (!_.isUndefined(actionScale) && actionScale != null) {
            this.actionScaleCustome = actionScale;
            this._shadow.runAction(actionScale);
        }
        this.timeMove = timeMove;
        if (_.isUndefined(timeMove) || timeMove == null) {
            this.timeMove = 1.0;
        }


        this._shadow.getParent().runAction(cc.sequence(
            cc.delayTime(timeMove * 0.9),
            cc.callFunc(function () {
                this.remove();
            }.bind(this))
        ))


        this.distance = { x: 0, y: 0 };
        this.delta = 5;
        this.timeFly = 0;
        this.scheduleUpdate();

    },
    setShadowZOder: function (shadowZOrder) {
        this._shadow.setLocalZOrder(shadowZOrder);
    },
    /**
     * remove after fly done
     */
    remove: function () {

        if (this._shadow == null) return;

        this._shadow.setVisible(false);
        this._shadow.removeFromParent(false);
        this._shadow = null;
        this.unscheduleUpdate();
        // this.removeFromParent(false);
    },
    /**
     * Update _shadow position along to shadowFake position.
     */
    update: function (dt) {
        if (_.isUndefined(this._shadow) || this._shadow == null) return;

        this.timeFly += dt;

        if (this.timeFly < this.timeMove / 2) {
            this.distance.y -= this.delta;
            this.distance.x -= this.delta;
        }
        else {
            this.distance.y += this.delta;
            this.distance.x += this.delta;
        }
        if (!cc.sys.isObjectValid(this.objectFly)) {
            return;
        }
        this._shadow.x = this.objectFly.x + this.distance.x;
        this._shadow.y = this.objectFly.y + this.distance.y;
        if (this._shadow.y > this.objectFly.y) {
            this._shadow.y = this.objectFly.y;
        }
        if (this._shadow.x > this.objectFly.x) {
            this._shadow.x = this.objectFly.x;
        }

        if (_.isUndefined(this.actionScaleCustome)) {

            this._shadow.setScale(this.objectFly.getScaleX(), this.objectFly.getScaleY());
        }
    }
});

CoreGame.GameBoardBg = BaseLayer.extend({
    pBg: null,

    ctor: function (mainScene) {
        this._super();
        this.mainScene = mainScene;

        this.initWithJsonFile(CoreGame.GameBoardBg.JSON);
    }
});
CoreGame.GameBoardBg.JSON = "res/zcsd/game/GameBoardBg.json";