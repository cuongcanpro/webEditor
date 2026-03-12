/**
 * Created by AnhVTT on 4/28/2021.
 */
var ActionQueue = cc.Class.extend({
    ctor: function(parent) {
        this.running = false;
        this.actionQueue = [];
        this.actionDuration = [];
        this.parent = parent;
    },

    pushAction: function(action, duration) {
        this.actionQueue.push(action);
        this.actionDuration.push(duration);
        if (!this.running) {
            this.triggerAction();
        }
    },

    triggerAction: function() {
        if (this.actionQueue.length == 0) {
            this.running = false;
            return;
        }

        this.running = true;
        var duration = this.actionDuration[0]; this.actionDuration.shift();
        var action = this.actionQueue[0]; this.actionQueue.shift();

        if (action) action();
        this.parent.runAction(cc.sequence(
            cc.delayTime(duration),
            cc.callFunc(this.triggerAction.bind(this))
        ))
    }
})