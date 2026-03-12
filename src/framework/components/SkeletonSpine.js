/**
 * Created by AnhVTT on 01/10/2022.
 */

var SkeletonSpine = sp.SkeletonAnimation.extend({
    ctor: function (jsonFile, alas) {
        this._super(jsonFile, alas);
        this.boneNode = {};
        this.schedule(this._updateAttachNodeByBone.bind(this), 0.01);
    },

    attachNodeToBone: function (node, boneName) {
        this.addChild(node.node);
        this.addAttachInfo(node, boneName);
    },
    addAttachInfo: function (node, boneName) {
        if (!this.boneNode[boneName]) this.boneNode[boneName] = [node];
        else this.boneNode[boneName].push(node);
    },
    _getBoneByName: function (_boneName) {
        for (let boneName in this.boneNode) {
            if (_boneName === boneName) {
                var nodeList = this.boneNode[boneName];
            }

        }
    },

    _updateAttachNodeByBone: function () {
        let node, bone, nodeList, option;
        for (let boneName in this.boneNode) {
            bone = this.findBone(boneName);
            if (!bone) {
                continue;
            }

            nodeList = this.boneNode[boneName];
            for (let i = 0; i < nodeList.length; i++) {
                node = nodeList[i].node;
                option = nodeList[i].option;
                option['position'] && node.setPosition(bone.worldX + option['dx'], bone.worldY + option['dy']);
                option['rotation'] && node.setRotation(bone.rotation)
                option['scale'] != 0 && node.setScale(bone.scaleX * option['scale'], bone.scaleY * option['scale']);
            }
        }
    },

    removeNodeFromBone: function (node, boneName) {
        let boneList = this.boneNode[boneName];
        let idx = boneList.indexOf(node);
        if (idx != -1) {
            boneList.splice(idx, 1);
        }
    },

    removeAllAttachNode: function () {
        for (let boneName in this.boneNode) {
            let nodeList = this.boneNode[boneName];
            for (let i = 0; i < nodeList.length; i++) {
                nodeList[i].removeFromParent(true);
            }
            nodeList = [];
        }
    }
})

var AttachBoneNode = cc.Class.extend({
    ctor: function (node, option) {
        this.node = node;
        if (!option) {
            this.option = {
                'position': true,
                'rotation': true,
                'scale': 1,
                'dx': 0,
                'dy': 0
            }
        } else {
            this.option = option;
        }
    }
})