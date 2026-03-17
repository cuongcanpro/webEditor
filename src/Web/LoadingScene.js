/****************************************************************************
 Copyright (c) 2011-2012 cocos2d-x.org
 Copyright (c) 2013-2014 Chukong Technologies Inc.

 http://www.cocos2d-x.org

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated documentation files (the "Software"), to deal
 in the Software without restriction, including without limitation the rights
 to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 copies of the Software, and to permit persons to whom the Software is
 furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in
 all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,f
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 THE SOFTWARE.
 ****************************************************************************/
/**
 * <p>cc.LoadingScene is a scene that you can load it when you loading files</p>
 * <p>cc.LoadingScene can present thedownload progress </p>
 * @class
 * @extends cc.Scene
 * @example
 * var lc = new cc.LoadingScene();
 */
cc.LoadingScene = cc.Scene.extend({
    _interval : null,
    _label : null,
    _className:"LoadingScene",
    cb: null,
    target: null,
    /**
     * Contructor of cc.LoadingScene
     * @returns {boolean}
     */
    init : function(){
        var self = this;

        //loading percent
        var label = self._label = new cc.LabelTTF("Đang tải... 0%", "Tahoma", 16);
        label.setPosition(cc.director.getWinSize().width/2,cc.director.getWinSize().height/6+25);
        label.setColor(cc.color(180, 180, 180));
        self.addChild(label, 10);
        // label.setVisible(false);
        
        return true;
    },

    /**
     * custom onEnter
     */
    onEnter: function () {
        var self = this;
        cc.Node.prototype.onEnter.call(self);
        self.schedule(self._startLoading, 0.3);

    },
    /**
     * custom onExit
     */
    onExit: function () {
        cc.Node.prototype.onExit.call(this);
      //  var tmpStr = "Đang tải... 0%";
      //  this._label.setString(tmpStr);
    },

    /**
     * init with resources
     * @param {Array} resources
     * @param {Function|String} cb
     * @param {Object} target
     */
    initWithResources: function (resources, cb, target) {
        if(cc.isString(resources))
            resources = [resources];
        this.resources = resources || [];
        this.cb = cb;
        this.target = target;
    },


    _startLoading: function () {
        var self = this;
        self.unschedule(self._startLoading);
        var res = self.resources;
        var BATCH_SIZE = 100;
        var totalCount = res.length;
        var loadedCount = 0;
        var batchIndex = 0;

        function loadNextBatch() {
            var batch = res.slice(batchIndex, batchIndex + BATCH_SIZE);
            batchIndex += BATCH_SIZE;
            if (batch.length === 0) {
                if (self.cb)
                    self.cb.call(self.target);
                return;
            }
            cc.loader.load(batch,
                function (result, count, batchLoaded) {
                    var percent = ((loadedCount + batchLoaded) / totalCount * 100) | 0;
                    percent = Math.min(percent, 100);
                    self._label.setString("Đang tải... " + percent + "%");
                },
                function () {
                    loadedCount += batch.length;
                    loadNextBatch();
                }
            );
        }

        loadNextBatch();
    }
});

cc.LoadingScene.preload = function(resources, cb, target){
    var _cc = cc;
    if(!_cc.loadingScene) {
        _cc.loadingScene = new cc.LoadingScene();
        _cc.loadingScene.init();
    }
    _cc.loadingScene.initWithResources(resources, cb, target);
    cc.director.runScene(_cc.loadingScene);
    return _cc.loadingScene;
};

