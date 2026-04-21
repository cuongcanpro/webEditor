
var GuiMiniSaga = cc.Node.extend({
    ctor: function () {
        this._super();
        this.nodeCloud = null;
        this.initUI();
        this.nodeCloud.retain();
        this.nodeCloud.setVisible(false);

        this.numLevelToShowAtFuture = 50;
        this._lastLevelShown = fr.UserData.getNumberFromKeyByUId(userMgr.getData().getUId(), KeyStorage.LAST_LEVEL_MINI_SAGA, 1);
    },

    onExit: function(){
        this._super();
        this.nodeCloud.release();
    },

    initUI: function () {
        var json = ccs.load(res.ZCSD_GUI_MINI_SAGA, "");
        this._rootNode = json.node;
        this.addChild(this._rootNode);
        UIUtils.mappingChildren(this._rootNode, this);

        // clipping
        this.clipping = cc.ClippingNode();
        this.clipping.stencil = this.stencil;
        this.clipping.anchorX = 0.5;
        this.clipping.anchorY = 0.5;
        this.clipping.alphaThreshold = 0.1;
        this.clipping.setPosition(0,0);
        this.bg.addChild(this.clipping);

        // table view
        this.visibleSize = this.bg.getContentSize();
        this.itemSize = cc.size(100, 70);
        this._firstOffset = 100;
        this.tableView = new cc.TableView(this, this.visibleSize);
        this.tableView.setPosition(0, 0);
        this.tableView.setDelegate(this);
        this.tableView.setDirection(cc.SCROLLVIEW_DIRECTION_HORIZONTAL);
        this.tableView.setCascadeOpacityEnabled(true);
        this.tableView.getContainer().setCascadeOpacityEnabled(true);
        this.clipping.addChild(this.tableView);
        this.currentLevel = userMgr.getData().getLevel();
    },

    getSize: function(){
        return this.bg_border.getContentSize();
    },

    tableCellSizeForIndex:function (table, idx) {
        if (idx == 0){
            return cc.size(this.itemSize.width + this._firstOffset, this.itemSize.height);
        }
        else{
            return this.itemSize;
        }
    },
    tableCellAtIndex:function (table, idx) {
        let cell = table.dequeueCell();
        try {
            if (!cell) {
                cell = new cc.TableViewCell();
                cell.setCascadeOpacityEnabled(true);
                let node = new NodeSagaPoint();
                cell.addChild(node);
                node.setName("NodeSagaPoint");
                node.setPosition(0, this.visibleSize.height/2 - 20);
            }
            cell.getChildByName("NodeSagaPoint").setPositionX(idx==0 ? this._firstOffset: 0);
            let sagaLevel = idx+1;
            let userLevel = this.currentLevel;
            let maxLevel = gv.miniSagaCfg.numLevel;
            cell.getChildByName("NodeSagaPoint").refreshSagaPoint(sagaLevel, userLevel, maxLevel);
            cell.setLocalZOrder(idx);

            if (idx == this.currentLevel + this.numLevelToShowAtFuture-1){
                // show node cloud here:
                this.nodeCloud.removeFromParent(true);
                cell.addChild(this.nodeCloud);
                this.nodeCloud.setName("NodeCloud");
                this.nodeCloud.setVisible(true);
                this.nodeCloud.setPosition(this.itemSize.width, this.visibleSize.height/2);
                cc.log("cloud pos, ", this.nodeCloud.getPosition());
            }
            else{
                if (cell.getChildByName("NodeCloud")) cell.getChildByName("NodeCloud").setVisible(false);
            }

        } catch (e) {
            cc.warn(e.message);
            cc.log(e.stack);
        }
        return cell;
    },
    numberOfCellsInTableView:function () {
        return Math.min(gv.miniSagaCfg.numLevel+1, (this.currentLevel + this.numLevelToShowAtFuture));
    },

    setToCurrentLevel: function (currentLevel) {
        if (this._lastLevelShown < currentLevel){
            this.tableView.setScrollEnabled(false);
            this._lastLevelShown = currentLevel;
            fr.UserData.setNumberFromKeyByUId(userMgr.getData().getUId(), KeyStorage.LAST_LEVEL_MINI_SAGA, currentLevel-1);
            currentLevel -= 1;
            // show cat at old level:
            this.currentLevel = currentLevel;
            this.tableView.reloadData();
            let offset = this._getOffsetOfLevel(currentLevel);
            this.tableView.setContentOffset(cc.p(offset.x - this.itemSize.width, offset.y));
            let catSpr = this.tableView.cellAtIndex(currentLevel-1).getChildByName("NodeSagaPoint").cat;
            let nextCatSpr = this.tableView.cellAtIndex(currentLevel).getChildByName("NodeSagaPoint").cat;
            let nextPos = UIUtils.getOtherPosAtNodeSpace(catSpr, nextCatSpr);
            catSpr.runAction(cc.sequence(
                cc.delayTime(1.5),
                cc.moveTo(0.5, nextPos).easing(cc.easeBackOut()),
                cc.callFunc(function () {
                    this.setToCurrentLevel(currentLevel+1);
                }.bind(this))
            ))
        }
        else{
            this.tableView.setScrollEnabled(true);
            this.currentLevel = currentLevel;
            this.tableView.reloadData();
            this.tableView.setContentOffset(this._getOffsetOfLevel(currentLevel));
        }
    },

    _getOffsetOfLevel: function (currentLevel) {
        if (currentLevel < 3){
            return cc.p(0, 0);
        }
        else{
            let p0AtCurrentLevel = -(this._firstOffset + (currentLevel-1)*this.itemSize.width);
            let midPointAtCurrentLevel = p0AtCurrentLevel + this.visibleSize.width/2;
            return cc.p(midPointAtCurrentLevel, 0);
        }
    },
});

var NodeSagaPoint = cc.Node.extend({
    ctor: function () {
        this._super();

        this.level = null;
        this.construct = null;
        this.cat = null;

        this.initUI();
    },

    initUI: function () {
        var json = ccs.load(res.ZCSD_NODE_SAGA_POINT, "");
        this._rootNode = json.node;
        this.addChild(this._rootNode);
        UIUtils.mappingChildren(this._rootNode, this);
        // this.construct.setPosition(0,-70);
    },

    _setSpecialTargetTexture: function (specialTarget) {
        let miniSagaPath = "game/gui/minisaga/special_item/"+ specialTarget +".png";
        let origPath = "game/element/icon/" + specialTarget + ".png";
        if (jsb.fileUtils.isFileExist(miniSagaPath)) this.icon.setTexture(miniSagaPath);
        else if (jsb.fileUtils.isFileExist(origPath)) this.icon.setTexture(origPath);
    },

    refreshSagaPoint: function(sagaLevel, userLevel, maxLevel){
        let haveLevel = sagaLevel <= maxLevel;
        this.level.setVisible(haveLevel);
        this.construct.setVisible(!haveLevel);

        // positioning
        let isUp = sagaLevel%2 == 0;
        let dy = 35;
        this._rootNode.setPositionY(isUp ? -dy : dy);

        if (!haveLevel){
            if (!this.construct.getChildByName("animConstruct")){
                let animConstruct = gv.createSpineAnimation(resAni.minisaga_build_up);
                this.construct.addChild(animConstruct);
                animConstruct.setName("animConstruct");
                animConstruct.setAnimation(0, "animation", true);
            }
        }
        else{
            // level info:
            let isPassed = sagaLevel < userLevel;
            let isCurrent = sagaLevel == userLevel;
            let isNext = sagaLevel > userLevel;

            let specialTarget = gv.miniSagaCfg.getSpecialTargetAtLevel(sagaLevel);
            let haveSpecialTarget = specialTarget != null;
            this.normalLevel.setVisible(!haveSpecialTarget);
            this.specialLevel.setVisible(haveSpecialTarget);
            if (haveSpecialTarget){
                this._setSpecialTargetTexture(specialTarget);
            }
            else{
                // visible:
                this.pp.setVisible(isPassed);
                this.pc.setVisible(isCurrent);
                this.pn.setVisible(isNext);
                this.lbpp.setString(sagaLevel);
                this.lbpc.setString(sagaLevel);
                this.lbpn.setString(sagaLevel);
            }

            // direction nodes:
            this.up.setVisible(isUp);
            this.down.setVisible(!isUp);

            // sprite cat
            this.cat.setVisible(isCurrent);
            this.cat.setPosition(0, 70);
            this.cat.stopAllActions();
            if (this.cat.isVisible()){
                this.cat.runAction(cc.sequence(
                    cc.spawn(
                        cc.moveTo(1, 0, 60).easing(cc.easeCircleActionInOut()),
                        cc.scaleTo(1, 1.05, 0.98)
                    ),
                    cc.spawn(
                        cc.moveTo(1, 0, 70).easing(cc.easeCircleActionInOut()),
                        cc.scaleTo(1, 1.0, 1.0)
                    ),
                    cc.delayTime(0.2)
                ).repeatForever());
            }

            // line
            this.lines.setVisible(isPassed);
            this.lines1.setVisible(isPassed);
            this.line.setVisible(!isPassed);
            this.line1.setVisible(!isPassed);
        }
    }
})