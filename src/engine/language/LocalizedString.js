var g_localization = null;

var LocalizedString = cc.Class.extend({

    ctor : function () {
        this._localizedStrings = {};
        this._gameConfigs = {};

        this._localizedSearchPath = {};
        this._localizedSearchPathName = {};
        this.loadLocalized("res/Localized_vi");
        //this.loadLocalized("res/Localized_en");
        //this.loadLocalized("res/Localized_indo");
        this.loadLocalized("res/Board/BoardLocalized_vi");
        this.gameConfig();
    },

    preloadLocalized: function(){
        this.loadLocalized();
        this.gameConfig();
    },

    loadLocalized : function (fname) {
        {
            let path = fname.substring(0, fname.lastIndexOf('/') + 1);
            let name = fname.substring(fname.lastIndexOf('/') + 1);
            let firstName = name.split("_")[0];
            if (!this._localizedSearchPath[path]) {
                this._localizedSearchPath[path] = path;
                this._localizedSearchPathName[path] = firstName;
            }
        }

        var contents = "";
        fname = fname || "Localized_vi";

        cc.loader.loadTxt(fname, function (error, txt) {
            if (error != null) {
                cc.log("Load localization file error!");
            }
            else {
                contents = txt;
            }
        });
        var lines = contents.split('\n');

        for(var i in lines)
        {
            var line = lines[i];
            if (line.indexOf("/*",0) == -1 &&
                line.indexOf("//",0) == -1 &&
                line.indexOf("*/",0) == -1) //filter the valid string of one line
            {
                var validPos = line.indexOf('=', 0);
                if (validPos != -1)
                {
                    var keyStr = line.substring(0, validPos - 1);
                    // get valid string
                    var subStr = line.substring(validPos + 1, line.length - 1);

                    //trim space
                    keyStr = keyStr.slice(this.findFirstNotOf(keyStr," \t"));
                    keyStr = keyStr.slice(0,this.findLastNotOf(keyStr," \t") +1);

                    subStr = subStr.slice(this.findFirstNotOf(subStr," \t"));
                    subStr = subStr.slice(0,this.findLastNotOf(subStr," \t") +1);

                    //trim \"
                    keyStr = keyStr.slice(this.findFirstNotOf(keyStr,"\""));
                    keyStr = keyStr.slice(0,this.findLastNotOf(keyStr,"\"") +1);
                    var  findPosition = subStr.indexOf('\"', 0);
                    subStr = subStr.slice(this.findFirstNotOf(subStr,"\""));

                    //trim ; character and last \" character
                    subStr = subStr.slice(0,this.findLastNotOf(subStr,";") +1);
                    subStr = subStr.slice(0,this.findLastNotOf(subStr,"\"") +1);

                    //replace line feed with \n
                    subStr = subStr.replace(/\\n/g,"\n");

                    this._localizedStrings[keyStr] = subStr;
                }
            }
        }
    },

    gameConfig : function () {
        var contents = "";
        cc.loader.loadTxt("res/GameConfig", function (error, txt) {
            if (error != null) {
                cc.log("Load GameConfig file error!");
            }
            else {
                contents = txt;
            }
        });
        var lines = contents.split('\n');

        for(var i in lines)
        {
            var line = lines[i];
            if (line.indexOf("/*",0) == -1 &&
                line.indexOf("//",0) == -1 &&
                line.indexOf("*/",0) == -1) //filter the valid string of one line
            {
                var validPos = line.indexOf('=', 0);
                if (validPos != -1)
                {
                    var keyStr = line.substring(0, validPos - 1);
                    // get valid string
                    var subStr = line.substring(validPos + 1, line.length - 1);

                    //trim space
                    keyStr = keyStr.slice(this.findFirstNotOf(keyStr," \t"));
                    keyStr = keyStr.slice(0,this.findLastNotOf(keyStr," \t") +1);

                    subStr = subStr.slice(this.findFirstNotOf(subStr," \t"));
                    subStr = subStr.slice(0,this.findLastNotOf(subStr," \t") +1);

                    //trim \"
                    keyStr = keyStr.slice(this.findFirstNotOf(keyStr,"\""));
                    keyStr = keyStr.slice(0,this.findLastNotOf(keyStr,"\"") +1);
                    var  findPosition = subStr.indexOf('\"', 0);
                    subStr = subStr.slice(this.findFirstNotOf(subStr,"\""));

                    //trim ; character and last \" character
                    subStr = subStr.slice(0,this.findLastNotOf(subStr,";") +1);
                    subStr = subStr.slice(0,this.findLastNotOf(subStr,"\"") +1);

                    //replace line feed with \n
                    subStr = subStr.replace(/\\n/g,"\n");

                    this._gameConfigs[keyStr] = subStr;
                }
            }
        }
    },

    findLastNotOf:function(strSource,text) {
        var sourceLen = strSource.length;
        var strLen = text.length;
        if (strLen >sourceLen)
        {
            return -1;
        }
        var i = sourceLen - 1;
        while (i >= 0)
        {
            var result = false;
            for (var k = 0; k < strLen; k++)
            {
                if (text[k] == strSource[i])
                {
                    result = true;
                    break;
                }
            }
            if(result)
            {
                i-=1;
            }
            else
            {
                return i;
            }
        }
        return -1;
    },

    findFirstNotOf:function(strSource, text) {
        var sourceLen = strSource.length;
        var strLen = text.length;
        var i = 0;
        while (i < sourceLen - 1) {
            var result = false;
            for (var k = 0; k < strLen; k++) {
                if (text[k] == strSource[i]) {
                    result = true;
                    break;
                }
            }
            if (result) {
                i += 1;
            } else {
                return i;
            }

        }
        return -1;
    },

    getText : function (key) {
        if(key in this._localizedStrings)
        {
            return this._localizedStrings[key];
        }
        return key;
    },

    getGameConfig : function (key) {
        if(key in this._gameConfigs)
        {
            return this._gameConfigs[key];
        }
        return key;
    },

    setLanguage: function (isoCode, extCall) {
        if (this._currentLangIsoCode === isoCode) {
            return;
        }

        this._currentLangIsoCode = isoCode;

        for (let key in this._localizedSearchPath) {
            let path = key + this._localizedSearchPathName[key] + "_" + isoCode;
            if (jsb.fileUtils.isFileExist(path))
                LocalizedString.add(path);
        }

        if (extCall) {
            extCall();
        }

        let dotLang = '.' + isoCode;

        let onLangChangeds = [];

        sceneMgr.forEachAccessibleNode((node)=>{
            if (node._localizeImageLoaders) {
                let loaders = node._localizeImageLoaders;
                for (let i = 0; i < loaders.length; i++) {
                    let loader = loaders[i];
                    let args = [...loader.args];
                    args[loader.pathArgIdx] = loader.path.replace('@lang', dotLang);
                    //cc.log("====================================================> " + JSON.stringify(args))

                    loader.fn.call(node, ...args);
                }
            }

            if (node.setString && node._defaultLocalizedStr && node._defaultLocalizedStr.indexOf('str_') === 0) {
                node.setString(StringUtility.getStringLocalized(node._defaultLocalizedStr));
            }

            if (node.setTitleText && node._defaultLocalizedStr && node._defaultLocalizedStr.indexOf('str_') === 0) {
                node.setTitleText(StringUtility.getStringLocalized(node._defaultLocalizedStr));
            }

            if (node.setPlaceHolder && node._defaultLocalizedPlaceHolderStr && node._defaultLocalizedPlaceHolderStr.indexOf('str_') === 0) {
                node.setPlaceHolder(StringUtility.getStringLocalized(node._defaultLocalizedPlaceHolderStr));
            }

            if (node.onLanguageChanged) {
                //node.onLanguageChanged(isoCode);
                onLangChangeds.push(node);
            }
        });

        for (let i = 0; i < onLangChangeds.length; i++) {
            onLangChangeds[i].onLanguageChanged(isoCode);
        }
    }
});

LocalizedString.preload = function(){
    if(g_localization == null){
        g_localization = new LocalizedString();
    }
    return g_localization.preloadLocalized();
};

LocalizedString.add = function(fname){
    if(g_localization == null){
        g_localization = new LocalizedString();
    }
    return g_localization.loadLocalized(fname);
};

LocalizedString.to = function (keyLocalized) {
    if(g_localization == null)
    {
        g_localization = new LocalizedString();
    }
    return g_localization.getText(keyLocalized);
};

LocalizedString.config = function (key) {
    if(g_localization == null)
    {
        g_localization = new LocalizedString();
    }
    return g_localization.getGameConfig(key);
};

var localized = function(keyLocalized) {
    return LocalizedString.to(keyLocalized)
};

LocalizedString.setLanguage = function (isoCode, extCall) {
    if(g_localization == null)
    {
        g_localization = new LocalizedString();
    }
    return g_localization.setLanguage(isoCode, extCall);
};

LocalizedString.getCurrentLanguageIsoCode = function () {
    if(g_localization == null)
    {
        g_localization = new LocalizedString();
    }
    return g_localization._currentLangIsoCode;
};

LocalizedString.makeNodeLocalizable = function (node, localizationKey) {
    node._defaultLocalizedStr = 'str_' + localizationKey;
    node._defaultLocalizedPlaceHolderStr = node._defaultLocalizedStr;
}

LocalizedString.setLabelString = function (node, localizationKey) {
    LocalizedString.makeNodeLocalizable(node, localizationKey);
    node.setString(LocalizedString.to(localizationKey));
}

LocalizedString._getImagePathLangCode = function (path) {
    let idx1 = path.lastIndexOf('.');

    if (idx1 <= 0) {
        return undefined;
    }

    let idx = path.lastIndexOf('.', idx1 - 1);

    if (idx < 0) {
        return undefined;
    }

    let langCode = path.substring(idx + 1, idx1);
    if (ISO6391.validate(langCode)) {
        return langCode;
    }

    return undefined;
}

LocalizedString._formatImagePathLangCode = function (path, langCode) {
    return path.replace('.' + langCode, '@lang');
}

LocalizedString._onWidgetLoadImagePath = function (widget, datas) {
    //cc.log("LocalizedString._onWidgetLoadImagePath")
    let arr = [];

    for (let i = 0; i < datas.length; i++) {
        let data = datas[i];
        let langCode = LocalizedString._getImagePathLangCode(data.path);
        if (langCode !== undefined) {
            arr.push({
                path: LocalizedString._formatImagePathLangCode(data.path, langCode),
                pathArgIdx: data.idx,
                args: data.args,
                fn: data.fn
            });
        }
    }

    if (arr.length !== 0) {
        if (!widget._localizeImageLoaders) {
            widget._localizeImageLoaders = [];
        }

        widget._localizeImageLoaders.push(...arr);
    }
}

LocalizedString._invokeChangeLocalizedImage = function (node) {
    if (node._localizeImageLoaders) {
        let dotLang = '.' + LocalizedString.getCurrentLanguageIsoCode();
        let loaders = node._localizeImageLoaders;
        for (let i = 0; i < loaders.length; i++) {
            let loader = loaders[i];
            let args = [...loader.args];
            args[loader.pathArgIdx] = loader.path.replace('@lang', dotLang);
            //cc.log("_invokeChangeLocalizedImage =================> " + JSON.stringify(args))

            loader.fn.call(node, ...args);
        }
    }
}