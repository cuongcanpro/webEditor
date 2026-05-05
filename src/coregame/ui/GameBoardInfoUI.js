var CoreGame = CoreGame || {};

GameBoardInfoUI = BaseLayer.extend({
    alert_180min_18: null,
    demo: null,

    // Top bar / info
    pInfo: null,
    lbMove: null,
    lbMoveTitle: null,
    bg_move: null,
    pObjective: null,
    bgObjective: null,
    bgTop: null,

    nodeCat: null,
    borderCat: null,
    bgCat: null,

    iconCollect: null,
    amountCollect: null,
    btnTest: null,
    btnTestSetMove: null,
    tfTestSetMove: null,
    nodeTest: null,

    listNode: [],

    // Objective intro panel
    pIntro: null,
    pFogIntroObjective: null,
    nodeObjectives: null,
    imgCatObj: null,
    lbObjectives: null,
    bgObjIntro: null,
    pObjectiveIntro: null,

    // Monster banner block
    nodeMonster: null,
    pBgMonster: null,
    imgDecorMonster: null,
    imgMonsterBg: null,
    imgMonsterBg_left: null,
    imgMonsterBg_right: null,
    imgMonsterName: null,
    lbMeetUpMonster: null,
    nodeMonsterSprite: null,

    // Extra monster info strip (small avatar + icon + description)
    bgExtraMonsterInfo: null,
    imgSmallAvatar: null,
    imgIconExtraInfo: null,
    lbExtraInfo: null,

    // Speech bubble
    lbTextBubble: null,
    lbTextBubblePhantom: null,
    imgBubble: null,

    // Intro block (new-blocker tutorial)
    lbBlockName: null,
    lbBlockNotice: null,
    imgBlock: null,
    nodeBlock: null,
    lbIntroBlock: null,
    bgIntroBlock: null,
    nodeIntroBlock: null,
    btnNextIntro: null,
    imgGlow: null,
    imgParticle: null,

    // Skip panel
    pSkip: null,
    btnSkip: null,
    lbContinue: null,

    //Stars
    pStarProgress: null,
    starProgressBar: null,
    starBg_0: null,
    starBg_1: null,
    starBg_2: null,
    starReached_0: null,
    starReached_1: null,
    starReached_2: null,

    ctor: function (gameUI) {
        this._super();
        this.gameUI = gameUI;

        this.initWithJsonFile(GameBoardInfoUI.JSON);
    },

    initLayer: function () {
        this.spine_cat = gv.createSpineAnimation(resAni.char_gui_board_info);
        this.spine_cat.setPosition(0, 0);
        this.nodeCat.addChild(this.spine_cat);
        this.spine_cat.setAnimation(0, 'idle', true);

        for (let node of this.listNode) {
            node.removeFromParent();
        }
        this.listNode = [];

        this.lbIntroBlock = fr.replaceByRichText(this.lbIntroBlock);

        this._initTest();

        this.pIntro.setVisible(false);

        this.nodeMonster.setVisible(false);
        this.nodeIntroBlock.setVisible(false);

        this.lbTextBubble.setVisible(false);

        this.lbTextBubble.ignoreContentAdaptWithSize(true);
        this.lbTextBubblePhantom.ignoreContentAdaptWithSize(true);
        this.imgMonsterName.ignoreContentAdaptWithSize(true);
        this.imgSmallAvatar.ignoreContentAdaptWithSize(true);

        this.pSkip.setVisible(false);
        this.demo.setVisible(false);
    },

    //region EFX
    efxIn: function (delayTime = 0, monsterBanner = false) {
        let efxTime = 0.5;
        let waitShowTime = 1;
        let lifeTime = 0;

        if (monsterBanner && this.nodeMonster.isVisible()) {
            let efxTimeMonster = 0.5;
            let deltaTimeMonster = 0.25;
            waitShowTime = 3;

            this.imgMonsterBg.stopAllActions();
            this.imgMonsterBg.setOpacity(0);
            this.imgMonsterBg.setPosition(this.imgMonsterBg.rawPos);
            this.imgMonsterBg.x -= cc.winSize.width;
            this.imgMonsterBg.runAction(cc.sequence(
                cc.delayTime(delayTime),
                cc.callFunc(function () {
                    fr.Sound.playSoundEffect(resSound.game_start);
                }),
                cc.spawn(
                    cc.fadeIn(efxTimeMonster),
                    cc.moveTo(efxTimeMonster, this.imgMonsterBg.rawPos).easing(cc.easeBackOut())
                )
            ));

            // imgDecorMonster: pops in alongside the bg
            if (this.imgDecorMonster) {
                this.imgDecorMonster.stopAllActions();
                this.imgDecorMonster.setOpacity(0);
                this.imgDecorMonster.setScale(0);
                this.imgDecorMonster.runAction(cc.sequence(
                    cc.delayTime(delayTime),
                    cc.spawn(
                        cc.fadeIn(efxTimeMonster),
                        cc.scaleTo(efxTimeMonster, 1).easing(cc.easeBackOut())
                    )
                ));
            }

            // lbMeetUpMonster: drops in from above with a fade, prefacing the name
            if (this.lbMeetUpMonster) {
                if (this.lbMeetUpMonster.rawPos == null) {
                    this.lbMeetUpMonster.rawPos = cc.p(this.lbMeetUpMonster.getPosition());
                }
                this.lbMeetUpMonster.stopAllActions();
                this.lbMeetUpMonster.setOpacity(0);
                this.lbMeetUpMonster.setPosition(this.lbMeetUpMonster.rawPos.x, this.lbMeetUpMonster.rawPos.y + 80);
                this.lbMeetUpMonster.runAction(cc.sequence(
                    cc.delayTime(delayTime + 0.5 * deltaTimeMonster),
                    cc.spawn(
                        cc.fadeIn(efxTimeMonster),
                        cc.moveTo(efxTimeMonster, this.lbMeetUpMonster.rawPos).easing(cc.easeBackOut())
                    )
                ));
            }

            // imgMonsterName replaced the label version — it's a sprite now,
            // so animate it the same way (fade in + scale down from 2.5).
            this.imgMonsterName.stopAllActions();
            this.imgMonsterName.setOpacity(0);
            this.imgMonsterName.setScale(2.5);
            this.imgMonsterName.runAction(cc.sequence(
                cc.delayTime(delayTime + deltaTimeMonster),
                cc.spawn(
                    cc.fadeIn(efxTimeMonster),
                    cc.scaleTo(efxTimeMonster, 1).easing(cc.easeIn(5))
                )
            ));

            this.nodeMonsterSprite.stopAllActions();
            this.nodeMonsterSprite.setOpacity(0);
            this.nodeMonsterSprite.setScale(2.5);
            this.nodeMonsterSprite.runAction(cc.sequence(
                cc.delayTime(delayTime + 2 * deltaTimeMonster),
                cc.spawn(
                    cc.fadeIn(efxTimeMonster),
                    cc.scaleTo(efxTimeMonster, 1).easing(cc.easeIn(5))
                )
            ));

            // bgExtraMonsterInfo: slides in from the right after the monster sprite
            if (this.bgExtraMonsterInfo) {
                if (this.bgExtraMonsterInfo.rawPos == null) {
                    this.bgExtraMonsterInfo.rawPos = cc.p(this.bgExtraMonsterInfo.getPosition());
                }
                this.bgExtraMonsterInfo.stopAllActions();
                this.bgExtraMonsterInfo.setOpacity(0);
                this.bgExtraMonsterInfo.setPosition(this.bgExtraMonsterInfo.rawPos.x + cc.winSize.width, this.bgExtraMonsterInfo.rawPos.y);
                this.bgExtraMonsterInfo.runAction(cc.sequence(
                    cc.delayTime(delayTime + 2.5 * deltaTimeMonster),
                    cc.spawn(
                        cc.fadeIn(efxTimeMonster),
                        cc.moveTo(efxTimeMonster, this.bgExtraMonsterInfo.rawPos).easing(cc.easeBackOut())
                    )
                ));
            }

            lifeTime = efxTimeMonster + 2 * deltaTimeMonster + waitShowTime;
            this.nodeMonster.stopAllActions();
            this.nodeMonster.setVisible(true);
            this.nodeMonster.setOpacity(255);
            this.nodeMonster.runAction(cc.sequence(
                cc.delayTime(delayTime + lifeTime),
                cc.fadeOut(efxTimeMonster).easing(cc.easeOut(2.5))
            ));
        } else {
            this.nodeMonster.setVisible(false);
            //Intro
            let efxObjTime = 0.25;
            let efxObjTimeDelta = 0.05;
            let delayShowObj = efxObjTime - efxObjTimeDelta + 1;
            let listNodeIntro = this.pObjectiveIntro.getChildren();
            for (let i = 0; i < listNodeIntro.length; i++) {
                let node = listNodeIntro[i].bg;
                if (node.isVisible()) {
                    node.stopAllActions();
                    node.setOpacity(0);
                    node.setScale(2.5);
                    node.runAction(cc.sequence(
                        cc.delayTime(delayTime + efxTime + efxObjTimeDelta * i),
                        cc.spawn(
                            cc.fadeIn(efxObjTime),
                            cc.scaleTo(efxObjTime, 1).easing(cc.easeIn(5))
                        )
                    ));

                    delayShowObj += efxObjTimeDelta;
                }
            }

            this.nodeObjectives.stopAllActions();
            this.nodeObjectives.setVisible(true);
            this.nodeObjectives.setOpacity(0);
            this.nodeObjectives.setPosition(this.nodeObjectives.rawPos);
            this.nodeObjectives.x -= cc.winSize.width;
            this.nodeObjectives.runAction(cc.sequence(
                cc.delayTime(delayTime),
                cc.callFunc(function () {
                    fr.Sound.playSoundEffect(resSound.game_start);
                }),
                cc.spawn(
                    cc.moveTo(efxTime, this.nodeObjectives.rawPos).easing(cc.easeBackOut()),
                    cc.fadeIn(efxTime).easing(cc.easeOut(2.5)),
                    cc.delayTime(delayShowObj + waitShowTime)
                ),
                cc.spawn(
                    cc.moveBy(efxTime, cc.winSize.width, 0).easing(cc.easeBackIn()),
                    cc.fadeOut(efxTime).easing(cc.easeOut(2.5))
                )
            ));

            this.imgCatObj.stopAllActions();
            this.imgCatObj.setScale(0);
            this.imgCatObj.runAction(cc.sequence(
                cc.delayTime(delayTime),
                cc.scaleTo(efxTime * 0.5, 0.8, 1.2).easing(cc.easeOut(2.5)),
                cc.scaleTo(efxTime, 1).easing(cc.easeElasticOut(2.5))
            ));

            lifeTime = waitShowTime + delayShowObj;
        }

        //FOG
        this.pFogIntroObjective.stopAllActions();
        this.pFogIntroObjective.setOpacity(0);
        this.pFogIntroObjective.runAction(cc.sequence(
            cc.delayTime(delayTime),
            cc.spawn(
                cc.fadeIn(efxTime).easing(cc.easeOut(2.5)),
                cc.delayTime(lifeTime)
            ),
            cc.fadeOut(efxTime).easing(cc.easeOut(2.5))
        ));
        //end FOG

        //PANEL INTRO
        this.pIntro.stopAllActions();
        this.pIntro.setVisible(true);
        this.pIntro.runAction(cc.sequence(
            cc.delayTime(delayTime + efxTime + lifeTime),
            cc.hide()
        ));
        //END PANEL INTRO

        this.pInfo.stopAllActions();
        this.pInfo.setPosition(this.pInfo.rawPos);
        this.pInfo.y += 250;
        this.pInfo.runAction(cc.sequence(
            cc.delayTime(delayTime + efxTime + lifeTime),
            cc.moveTo(efxTime, this.pInfo.rawPos).easing(cc.easeBackOut())
        ));

        this.pStarProgress.stopAllActions();
        this.pStarProgress.setPosition(this.pStarProgress.rawPos);
        this.pStarProgress.y += 100;
        this.pStarProgress.runAction(cc.sequence(
            cc.delayTime(delayTime + efxTime + lifeTime + efxTime),
            cc.moveTo(efxTime, this.pStarProgress.rawPos).easing(cc.easeOut(2.5))
        ));
    },

    efxNpcGuide: function (config) {
        this.lbTextBubble.stopAllActions();
        this.lbTextBubble.setString(fr.Localization.text(config["dialog"]));
        this.lbTextBubblePhantom.setString(fr.Localization.text(config["dialog"]));
        ccui.Helper.doLayout(this.lbTextBubble);

        let efxTime = 0.25;
        this.lbTextBubble.stopAllActions();
        this.lbTextBubble.setScale(0);
        this.lbTextBubble.runAction(cc.sequence(
            cc.delayTime(config["delayTime"]),
            cc.show(),
            cc.scaleTo(efxTime, 1).easing(cc.easeBackOut()),
            cc.delayTime(config["lifeTime"]),
            cc.scaleTo(efxTime, 0).easing(cc.easeBackIn()),
            cc.hide()
        ))
    },
    //endregion EFX

    initData: function (levelConfig) {
        this.setMove(levelConfig.mapConfig.numMove);
        this.setListTarget(levelConfig.mapConfig.targetElements);

        this.pSkip.setVisible(false);
    },

    setMove: function (move) {
        cc.log("GameBoardInfoUI move", move);
        this.lbMove.setString(move);

        if (this.gameEnded) {
            return;
        }

        this.spine_cat.setAnimation(0, move <= 3 ? 'worry' : 'idle', true);
    },

    setScore: function (score, scoreConfig) {
        if (!cc.sys.isObjectValid(this.starProgressBar)) {
            return;
        }

        if (!this.pStarProgress.isVisible())
            return;

        // cc.log("GAME BOARD INFO SET SCORE: ", JSON.stringify(score), JSON.stringify(scoreConfig));

        let maxScore = scoreConfig.star3Threshold;

        this.starProgressBar.setPercent(score * 100 / maxScore);

        for (let i = 0; i < 3; i++) {
            let star = this["starBg_" + i];
            let starReached = this["starReached_" + i];
            let mileStone = scoreConfig["star" + (i + 1) + "Threshold"];

            star.x = this.starProgressBar.width * (mileStone / maxScore);

            if (score >= mileStone && !starReached.isVisible()) {
                let efxTime = 0.5;
                starReached.stopAllActions();
                starReached.setScale(2.5);
                starReached.setOpacity(0);
                starReached.setRotation(0);
                starReached.runAction(cc.spawn(
                    cc.scaleTo(efxTime, 1).easing(cc.easeIn(2.5)),
                    cc.fadeIn(efxTime),
                    cc.rotateBy(efxTime, 2 * 360).easing(cc.easeIn(2.5))
                ))
            }

            starReached.setVisible(score >= mileStone);
        }
    },

    setListTarget: function (targetElements) {
        this.pObjective.width = GameBoardInfoUI.TARGET_SIZE * targetElements.length;
        ccui.Helper.doLayout(this.pObjective);

        for (let i = 0; i < Math.max(this.listNode.length, targetElements.length); i++) {
            if (i >= this.listNode.length) {
                this.createTarget(this.pObjective, this.listNode);
            }

            if (i >= targetElements.length) {
                this.listNode[i].setVisible(false);
            } else {
                this.listNode[i].setVisible(true);
                this.setInfoTarget(this.listNode[i], targetElements[i].id, targetElements[i].count);
                this.listNode[i].x = i * GameBoardInfoUI.TARGET_SIZE;
                this.listNode[i].y = - 0.5 * GameBoardInfoUI.TARGET_SIZE;
            }
        }

        let elementSizeIntro = GameBoardInfoUI.TARGET_SIZE * 1.2;
        this.pObjectiveIntro.width = elementSizeIntro * targetElements.length;
        ccui.Helper.doLayout(this.pObjectiveIntro);
        let listNodeIntro = this.pObjectiveIntro.getChildren();
        for (let i = 0; i < Math.max(listNodeIntro.length, targetElements.length); i++) {
            if (i >= listNodeIntro.length) {
                this.createTarget(this.pObjectiveIntro, listNodeIntro, true);
            }

            if (i >= targetElements.length) {
                listNodeIntro[i].setVisible(false);
            } else {
                listNodeIntro[i].setVisible(true);
                this.setInfoTarget(listNodeIntro[i], targetElements[i].id, targetElements[i].count);
                listNodeIntro[i].x = i * elementSizeIntro + (elementSizeIntro - GameBoardInfoUI.TARGET_SIZE) * 0.5;
                listNodeIntro[i].y = - 0.5 * GameBoardInfoUI.TARGET_SIZE + 20;
            }
        }

        let baseMonster = 10000;

        this.nodeMonster.setVisible(false);
        for (let element of targetElements) {
            if (element.id >= baseMonster) {
                //Set Info
                let config = GameBoardInfoUI.animMonster[element.id];
                if (!config) {
                    config = {
                        name: "Dangerous\nBeast",
                        scale: 1,
                        offset: cc.p(0, 0),
                        anim: "idle"
                    }
                }

                this.nodeMonster.setVisible(true);
                // imgMonsterName is an image per monster instead of a label.
                // TODO: finalize the art path convention; current placeholder
                // loads a texture keyed by element.id from the monster art folder.
                this.imgMonsterName.loadTexture(
                    "res/modules/game/gui/start_game/imgMonsterName_" + element.id + ".png"
                );
                this.imgSmallAvatar.loadTexture(
                    "res/modules/game/element/icon/" + element.id + ".png"
                );
                this.imgIconExtraInfo.loadTexture(
                    "res/modules/game/gui/start_game/imgIcon_" + element.id + ".png"
                );
                this.lbExtraInfo.setString(fr.Localization.text(
                    "lang_boss_intro_" + element.id + "_des"
                ));

                this.nodeMonsterSprite.removeAllChildren();
                if (resAni["spine_" + element.id + "_main"]) {
                    let spine = gv.createSpineAnimation(resAni["spine_" + element.id + "_main"]);
                    this.nodeMonsterSprite.addChild(spine);
                    spine.setAnimation(0, config.anim, true);
                    spine.setScale(config.scale);
                    spine.setPosition(config.offset);
                }

                //
                this.nodeObjectives.setVisible(false);
            }
        }
    },

    createTarget: function (parent, list, isIntro = false) {
        let newTargetNode = ccs.load(
            "game/csd/GameBoardInfoObjectiveSlot" + (isIntro ? "Intro" : "") + ".json",
            ""
        ).node;
        newTargetNode.setContentSize(cc.size(
            GameBoardInfoUI.TARGET_SIZE,
            GameBoardInfoUI.TARGET_SIZE
        ));
        ccui.Helper.doLayout(newTargetNode);

        newTargetNode.bg = null;
        newTargetNode.spr = null;
        newTargetNode.label = null;
        newTargetNode.check = null;

        parent.addChild(newTargetNode);

        BaseLayer._syncInNode(newTargetNode, newTargetNode);

        list.push(newTargetNode);
    },

    setInfoTarget: function (node, type, number) {
        node.spr.ignoreContentAdaptWithSize(true);
        node.spr.loadTexture("game/element/icon/" + type + ".png");

        node.lbl = new NumberLabelClass(node.label, number);
        node.check.setVisible(false);

        node.type = type;
        node.target = number;
        node.number = number;
        node.lastRemain = -1;

        switch (type) {
            case "coin":
                node.collectElement = function (amount) {
                    node.number += amount;
                    //cc.log("collectElement number=" + node.number);
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
                    //cc.log("collectElement number=" + node.number);
                    let remain = node.number;
                    //cc.log("collectElement", remain, node.lastRemain, node.type)
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
            //cc.log("unCollect number=" + node.number);
            node.addValue(amount)
        };
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
        element.setLocalZOrder(CoreGame.Config.zOrder.OBJECTIVE + zOrderInc);

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
                    element.shadow = new GameBoardInfoUI.NodeShadow(element, timeMove, "icon_" + element.getType() + "_shadow.png");
                } else {
                    element.shadow = new GameBoardInfoUI.NodeShadow(element, timeMove);
                }
                element.shadow.setShadowZOder(CoreGame.Config.zOrder.OBJECTIVE + zOrderInc - 1);
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

        // this.setListTarget([{
        //     id: "coin",
        //     count: amount || 0
        // }]);
        // this.coinTarget = this.listNode[0];
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
                coin.shadow = new GameBoardInfoUI.NodeShadow(coin, timeMove, null, actionScaleShadow);
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
        for (let i in this.listNode) {
            this.listNode[i].setVisible(isShow);
        }
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

    showSkip: function () {
        try {
            this.pSkip.setVisible(true);
        } catch (e) {
            cc.log("GameBoardInfoUI showSkip error:", e.stack);
        }
    },

    setIntroNewBlock: function (config) {
        this.lbIntroBlock.setString(fr.Localization.text("lang_block_des_" + config["blockId"]));
        this.lbBlockName.setString(fr.Localization.text("lang_block_name_" + config["blockId"]));
        this.imgBlock.loadTexture("res/modules/game/element/bigElements/" + config["blockId"] + ".png");

        let efxTime = 0.5;
        let delta = 0.125;

        //FOG
        this.pFogIntroObjective.stopAllActions();
        this.pFogIntroObjective.setOpacity(0);
        this.pFogIntroObjective.runAction(cc.fadeIn(efxTime).easing(cc.easeOut(2.5)));
        //end FOG

        //PANEL INTRO
        this.pIntro.stopAllActions();
        this.pIntro.setVisible(true);

        // nodeIntroBlock children entrance animation
        this.nodeIntroBlock.setVisible(true);

        // imgBlock — zoom bounce from center
        this.nodeBlock.stopAllActions();
        this.nodeBlock.setScale(0);
        this.nodeBlock.runAction(cc.sequence(
            cc.spawn(
                cc.scaleTo(efxTime, 1).easing(cc.easeBackOut())
            )
        ));

        // imgGlow — slow rotating pulse
        this.imgGlow.stopAllActions();
        this.imgGlow.setOpacity(180);
        this.imgGlow.setRotation(0);
        this.imgGlow.runAction(cc.repeatForever(
            cc.spawn(
                cc.rotateBy(3.0, 360),
                cc.sequence(
                    cc.scaleTo(1.2, 1.15, 1.15).easing(cc.easeSineInOut()),
                    cc.scaleTo(1.2, 0.9, 0.9).easing(cc.easeSineInOut())
                ),
                cc.sequence(
                    cc.fadeTo(1.2, 255).easing(cc.easeSineInOut()),
                    cc.fadeTo(1.2, 140).easing(cc.easeSineInOut())
                )
            )
        ));

        // imgParticle — sparkling fade with random rotation and expanding scale
        this.imgParticle.stopAllActions();
        this.imgParticle.setOpacity(0);
        this.imgParticle.setScale(0.85);
        this.imgParticle.setRotation(Math.random() * 360);
        this.imgParticle.runAction(cc.repeatForever(cc.sequence(
            cc.spawn(
                cc.sequence(
                    cc.fadeTo(0.4, 255).easing(cc.easeSineOut()),
                    cc.delayTime(0.3),
                    cc.fadeTo(0.5, 0).easing(cc.easeSineIn())
                ),
                cc.scaleTo(1.2, 1.15).easing(cc.easeSineOut())
            ),
            cc.callFunc(function () {
                this.imgParticle.setRotation(Math.random() * 360);
                this.imgParticle.setScale(0.25);
            }.bind(this)),
            cc.delayTime(0.2)
        )));

        // lbBlockName — drop in from above
        this.lbBlockName.stopAllActions();
        this.lbBlockName.setOpacity(0);
        this.lbBlockName.setPosition(this.lbBlockName.rawPos);
        this.lbBlockName.y += 40;
        this.lbBlockName.runAction(cc.sequence(
            cc.delayTime(delta),
            cc.spawn(
                cc.fadeIn(efxTime).easing(cc.easeOut(2.5)),
                cc.moveTo(efxTime, this.lbBlockName.rawPos).easing(cc.easeBackOut())
            )
        ));

        // lbBlockNotice — drop in from above, more delay
        this.lbBlockNotice.stopAllActions();
        this.lbBlockNotice.setOpacity(0);
        this.lbBlockNotice.setPosition(this.lbBlockNotice.rawPos);
        this.lbBlockNotice.y += 30;
        this.lbBlockNotice.runAction(cc.sequence(
            cc.delayTime(delta * 2),
            cc.spawn(
                cc.fadeIn(efxTime).easing(cc.easeOut(2.5)),
                cc.moveTo(efxTime, this.lbBlockNotice.rawPos).easing(cc.easeBackOut())
            )
        ));

        // bgIntroBlock — slide up from below
        this.bgIntroBlock.stopAllActions();
        this.bgIntroBlock.setScale(0);
        this.bgIntroBlock.runAction(cc.sequence(
            cc.delayTime(delta * 3),
            cc.scaleTo(efxTime, this.bgIntroBlock.rawScale).easing(cc.easeBackOut())
        ));
    },

    hideIntroNewBlock: function () {
        var self = this;
        var efxTime = 0.3;
        var delta = 0.08;

        // bgIntroBlock — shrink down first
        this.bgIntroBlock.stopAllActions();
        this.bgIntroBlock.runAction(cc.sequence(
            cc.scaleTo(efxTime, 0).easing(cc.easeBackIn())
        ));

        // lbBlockNotice — fade up and out
        this.lbBlockNotice.stopAllActions();
        this.lbBlockNotice.runAction(cc.sequence(
            cc.delayTime(delta),
            cc.spawn(
                cc.fadeOut(efxTime).easing(cc.easeOut(2.5)),
                cc.moveBy(efxTime, 0, 30).easing(cc.easeBackIn())
            )
        ));

        // lbBlockName — fade up and out
        this.lbBlockName.stopAllActions();
        this.lbBlockName.runAction(cc.sequence(
            cc.delayTime(delta * 2),
            cc.spawn(
                cc.fadeOut(efxTime).easing(cc.easeOut(2.5)),
                cc.moveBy(efxTime, 0, 40).easing(cc.easeBackIn())
            )
        ));

        // nodeBlock — shrink to zero last
        this.nodeBlock.stopAllActions();
        this.nodeBlock.runAction(cc.sequence(
            cc.delayTime(delta * 3),
            cc.scaleTo(efxTime, 0).easing(cc.easeBackIn()),
            cc.callFunc(function () {
                self.nodeIntroBlock.setVisible(false);
            })
        ));

        // FOG — fade out
        this.pFogIntroObjective.stopAllActions();
        this.pFogIntroObjective.runAction(cc.sequence(
            cc.delayTime(delta * 3 + efxTime),
            cc.fadeOut(efxTime).easing(cc.easeOut(2.5)),
            cc.callFunc(function () {
                self.pIntro.setVisible(false);

                // stop glow & particle loops
                self.imgGlow.stopAllActions();
                self.imgParticle.stopAllActions();
            })
        ));
    },

    onButtonRelease: function (btn, id) {
        switch (btn) {
            case this.btnSkip:
                this.gameUI.boardUI.boardMgr.skipRemainingMovesBonus();
                break;

            case this.btnNextIntro:
                narrativeMgr.nextStep();
                this.hideIntroNewBlock();
                break;
        }
    }
});
GameBoardInfoUI.JSON = "game/csd/GameBoardInfoUI.json";
// GameBoardInfoUI.JSON = "zcsd/game/GameBoardInfoUI.json";
GameBoardInfoUI.TARGET_SIZE = 90;
GameBoardInfoUI.animMonster = {
    15000: {
        name: "Mischievous\nMonkeys",
        scale: 0.25,
        offset: cc.p(0, 0),
        anim: "idle"
    },
    10000: {
        name: "Giant\nKong",
        scale: 1.5,
        offset: cc.p(0, 0),
        anim: "anim0_idle"
    }
};

/**
 * Create shadowFake, add child to object Flying
 * Create shadow and move along to shadowFake position.
 */
GameBoardInfoUI.NodeShadow = cc.Node.extend({
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

GameBoardBg = BaseLayer.extend({
    pBg: null,
    bg: null,

    ctor: function (mainScene) {
        this._super();
        this.mainScene = mainScene;

        this.initWithJsonFile(GameBoardBg.JSON);
        this.setBackground();
    },

    setBackground: function (texture = "res/modules/game/board/3.jpg") {
        this.bg.loadTexture(texture);

        this.bg.setScale(1);
        if (this.bg.width < cc.winSize.width) {
            this.bg.setScale(cc.winSize.width / this.bg.width);
        }
        if (this.bg.height * this.getScale() < cc.winSize.height) {
            this.bg.setScale(cc.winSize.height / this.bg.height);
        }
    },
});
GameBoardBg.JSON = "game/csd/GameBoardBg.json";