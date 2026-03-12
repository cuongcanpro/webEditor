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

    for (var name in classBase) {
        // Check if we're overwriting an existing function
        if(CoreGame.FakeUI.ElementUI.prototype[name] == undefined)
            if(typeof classBase[name] == "function")
                CoreGame.FakeUI.ElementUI.prototype[name] = function (){
                    return 0;
                }
            else
                CoreGame.FakeUI.ElementUI.prototype[name] = classBase[name]
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
            if(CoreGame[name].prototype && CoreGame[name].prototype.isElementUI)
                CoreGame.FakeUI.backupClass(name, CoreGame[name]);
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