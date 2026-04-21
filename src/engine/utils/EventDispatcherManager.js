/**
 * @type {EventDispatcherManager}
 */
const dispatcherMgr = (function(){
    /**
     * @class
     * @extends cc.Class
     * @property {Object.<string, [{
     *     target: object,
     *     callback: function
     * }]>} eventList
     */
    const EventDispatcherManager = cc.Class.extend({

        ctor: function () {
            this.eventList = {};
        },

        /**
         * @param {string} strEvent
         * @param {object} target
         * @param {function} [callback] default call onReceiveEvent function of target object
         */
        addListener: function(strEvent, target, callback) {
            if (callback == null){
                if (target.onReceiveEvent)
                    callback = target.onReceiveEvent.bind(target);
                else {
                    cc.error("MISSING CALLBACK", strEvent);
                    return;
                }
            }

            if (target instanceof cc.Node)
                this._addListenerForNode(strEvent, target, callback);
            else this._addListenerForClass(strEvent, target, callback);
        },

        /**
         * @param {string} strEvent
         * @param {*} [data]
         */
        dispatchEvent: function (strEvent, data) {
            this._dispatchEventForNode(strEvent, data);
            this._dispatchEventForClass(strEvent, data);
        },

        /**
         * @private
         * @param {string} strEvent
         * @param {object} target
         * @param {function} callback
         */
        _addListenerForNode: function(strEvent, target, callback) {
            cc.eventManager.addListener({
                event: cc.EventListener.CUSTOM,
                eventName: strEvent,
                callback: function(e) {
                    callback.call(target, strEvent, e.getUserData());
                }
            }, target);
        },

        /**
         * @param {string} strEvent
         * @param {*} [data]
         */
        _dispatchEventForNode: function(strEvent, data) {
            cc.eventManager.dispatchCustomEvent(strEvent, data);
        },

        /**
         * @param {string} strEvent
         * @param {object} target
         * @param {function} callback
         */
        _addListenerForClass: function(strEvent, target, callback) {
            if (this.eventList[strEvent]) {
                const listenerList = this.eventList[strEvent];
                for (let listener of listenerList) {
                    if (listener.target === target) {
                        cc.error("LISTENER ALREADY EXISTED FOR TARGET", strEvent);
                        return;
                    }
                }
                this.eventList[strEvent].push({
                    target: target,
                    callback: callback
                });
            } else {
                this.eventList[strEvent] = [{
                    target: target,
                    callback: callback
                }];
            }
        },

        /**
         * @param {string} strEvent
         * @param {*} [data]
         */
        _dispatchEventForClass: function(strEvent, data) {
            const listenerList = this.eventList[strEvent];
            if(listenerList){
                for(let i = 0; i < listenerList.length; i++){
                    const listener = listenerList[i];
                    if(listener.target instanceof cc.Node && !cc.sys.isObjectValid(listener.target)){
                        listenerList.splice(i--, 1);
                        continue;
                    }

                    try {
                        if (listener.callback !== undefined)
                            listener.callback.call(listener.target, strEvent, data);
                    }
                    catch (e) {
                        cc.error(e);
                        cc.error("ERROR DISPATCH EVENT", strEvent, e.stack);
                    }
                }
            }
        }
    });

    return new EventDispatcherManager();
})();