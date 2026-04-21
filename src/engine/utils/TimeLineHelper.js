Cocot = {};

Cocot.load_animations_from_meta = function (gui, path, delegate) {
    try {
        var meta = Cocot.nodeGetCustomProperty(gui);
        var animations = {};
        for (var name in meta.animations) {
            animations[name] = gui.runAction(ccs._load(path + meta.animations[name], "action", ""));
            animations[name].setFrameEventCallFunc(Cocot.frameCallFunc.bind(delegate));
            Cocot.log("load_animations_from_meta", name, meta.animations[name]);
        }
        return animations;
    } catch (error) {
        Cocot.log("error loading animations", error, error.stack);
        return {};
    }
}
Cocot.frameCallFunc = function (frame) {
    let func = JSON.parse(frame.getEvent());
    let { method, args } = func;
    let node = frame.getNode();
    if (node.getName() == "_animation_delegate") {
        this[method].apply(this, args);
    } else {
        node[method].apply(node, args);
    }
}

Cocot.nodeGetCustomProperty = function (node) {
    let json = node._customProperty;
    try {
        return JSON.parse(json);
    } catch (error) {
        return {};
    }
}

Cocot.log = function (...args) {
    cc.log("[Cocot]", ...args);
}