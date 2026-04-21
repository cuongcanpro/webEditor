var Manifest = cc.Class.extend({
    ctor: function (path) {
        var json = null;
        try {
            var data = jsb.fileUtils.getStringFromFile(path);
            var json = JSON.parse(data);
        } catch (e) {
            cc.log("AssetsManager Manifest parse JSON ERROR", data, e.toString());
            json = null;
        }


        if (json) {
            this.packageUrl = json["packageUrl"];
            this.remoteManifestUrl = json["remoteManifestUrl"];
            this.remoteVersionUrl = json["remoteVersionUrl"];
            this.version = parseInt(json["version"]);
            this.assets = json["assets"];
            this.group = json["group"];
            this.engineVersion = json["engineVersion"];
            this.searchPaths = json["searchPaths"];
            this._isLoaded = true;
        } else {
            this._isLoaded = false;
        }
    },

    isLoaded: function () {
        return this._isLoaded;
    },

    getVersion: function () {
        return this.version;
    },

    getManifestFileUrl: function () {
        return this.remoteManifestUrl;
    },

    getUrl: function () {
        return this.packageUrl;
    },

    setLocalInfo: function (version, packageUrl) {
        this.version = version;
        this.packageUrl = packageUrl;
        this._isLoaded = true;
    }
});
