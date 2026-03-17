CoreGame.FakeUI = {}
CoreGame.FakeUI.ElementUI = cc.Node.extend({
    ctor: function (){
        this._super();
    },
    onEnter: function (){
        this._super();
    },
    onExit: function (){
        this._super();
    }
});

CoreGame.FakeUI.initPrototype = function (classBase){
    // Walk the full prototype chain to catch both enumerable and non-enumerable methods.
    // 'for...in' only finds enumerable props, so methods defined via Object.defineProperty
    // (e.g. playMoveToAnim on some platforms) would be silently skipped.
    var visited = {};
    var proto = classBase;
    while (proto && proto !== Object.prototype) {
        var names = Object.getOwnPropertyNames(proto);
        for (var i = 0; i < names.length; i++) {
            var name = names[i];
            if (name === "constructor" || visited[name]) continue;
            visited[name] = true;

            var alreadyDefined = false;
            try {
                alreadyDefined = (CoreGame.FakeUI.ElementUI.prototype[name] !== undefined);
            } catch (e) {
                alreadyDefined = true; // getter threw on bare prototype — skip
            }
            if (alreadyDefined) continue;

            var descriptor = Object.getOwnPropertyDescriptor(proto, name);
            if (!descriptor) continue;
            if (typeof descriptor.value === "function") {
                // Stub every function with a no-op that returns 0
                CoreGame.FakeUI.ElementUI.prototype[name] = (function(){ return 0; });
            } else if (!descriptor.get && !descriptor.set) {
                // Plain value (non-getter): copy as-is
                CoreGame.FakeUI.ElementUI.prototype[name] = descriptor.value;
            }
            // Skip getter/setter properties — accessing them on a bare prototype
            // throws (e.g. cc.Node 'x' reads _position which is null).
        }
        proto = Object.getPrototypeOf(proto);
    }
}

CoreGame.FakeUI.backupClass = function (name, classBase){
    CoreGame.FakeUI.initPrototype(classBase.prototype)
    CoreGame.FakeUI.Backup[name] = classBase;
}

CoreGame.FakeUI.start = function (){
    if(CoreGame.FakeUI.Backup == undefined){
        CoreGame.FakeUI.Backup = {}
        CoreGame.FakeUI.backupClass("ElementUI", CoreGame.ElementUI);
        for(var name in CoreGame)
            if(CoreGame[name] && CoreGame[name].prototype && CoreGame[name].prototype.isElementUI)
                CoreGame.FakeUI.backupClass(name, CoreGame[name]);
            else if (!CoreGame[name]) {
                cc.log("Unknown class " + name);
            }
    }
    for(var name in CoreGame.FakeUI.Backup)
        CoreGame[name] = CoreGame.FakeUI.ElementUI;
}

CoreGame.FakeUI.restore = function (){
    if(CoreGame.FakeUI.Backup != undefined){
        for(var name in CoreGame.FakeUI.Backup)
            CoreGame[name] = CoreGame.FakeUI.Backup[name];
    }
}