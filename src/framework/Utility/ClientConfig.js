/**
 * Created by KienVN on 5/27/2015.
 */

var g_clientConfig = null;
fr.ClientConfig = cc.Class.extend(
    {
        ctor:function()
        {
            this._configData = this.loadData();
            this._selectResource = null;
            this._isFirstSetSearchPath = true;
        },
        loadData:function()
        {
            var commonData;
            // native
            commonData = cc.loader.getRes("res/client_config.json");
            if(!commonData) {
                commonData = cc.loader.getRes("config.json");
            }
            cc.log("commonData:" + JSON.stringify(commonData));
            return commonData;
        },
        detectResourceFromScreenSize:function()
        {

            var frameSize = cc.view.getFrameSize();

            var wScale = frameSize.width / this._configData.widthDesign;
            var hScale = frameSize.height / this._configData.heightDesign;
            var frameScale = wScale < hScale ? wScale : hScale;
            var m_ImageScale;
            var list = this._configData.resources;
            //tinh imageScale, chon resource anh
            for (var i = 0; i< list.length;i++){

                var s = list[i];
                var  scale = frameScale/s.scale;
                if ((1 / scale >= 1) || (i == list.length - 1 && 1 / scale <= 1)){
                    m_ImageScale = scale;
                    this._selectResource = list[i];
                    break;

                }
                cc.log("sds: %d, %d", i, list.length);
                if (i < list.length - 1){
                    var nextSize = list[i + 1];
                    var nextScale = frameScale / nextSize.scale;
                    if (1 / nextScale>1){
                        var avgScale = 1 / scale + (1 / nextScale - 1 / scale)*this._configData.selectScale;
                        if (avgScale>1){
                            m_ImageScale = scale;
                            this._selectResource = list[i];
                        }
                        else{
                            m_ImageScale = nextScale;
                            this._selectResource = list[i + 1];
                        }
                        break;
                    }
                }
            }

        },
        updateResourceSearchPath:function()
        {
            if(cc.sys.isNative) {
                var listSearch = [];
                //multiscreen
                listSearch.push(fr.NativeService.getFolderUpdateAssets() + "/res");
                listSearch.push(fr.NativeService.getFolderUpdateAssets() + "/dwnld/res");
                listSearch.push(fr.NativeService.getFolderUpdateAssets() + "/res/common");
                listSearch.push(fr.NativeService.getFolderUpdateAssets() + "/dwnld/res/common");
                listSearch.push(fr.NativeService.getFolderUpdateAssets() + "/res/high");
                listSearch.push(fr.NativeService.getFolderUpdateAssets() + "/dwnld/res/high");
                listSearch.push(fr.NativeService.getFolderUpdateAssets() + "/" + this._selectResource.folder);
                listSearch.push(fr.NativeService.getFolderUpdateAssets() + "/dwnld/" + this._selectResource.folder);
                listSearch.push("res");
                listSearch.push("res/");
                listSearch.push("dwnld/res");
                listSearch.push("res/common");
                listSearch.push("dwnld/res/common");
                listSearch.push("res/high");
                listSearch.push("dwnld/res/high");
                listSearch.push(this._selectResource.folder);
                listSearch.push("dwnld/" + this._selectResource.folder);
                var listSearchOfLang = fr.Localization.getInstance().getFolderSearchPath();
                for (var i in listSearchOfLang) {
                    listSearch.push(listSearchOfLang[i]);
                }
                //original
                if (this._isFirstSetSearchPath) {
                    this._originPath = jsb.fileUtils.getSearchPaths();
                    this._isFirstSetSearchPath = false;
                }
                for (var i in this._originPath) {
                    listSearch.push(this._originPath[i]);
                }
                cc.log("updateResourceSearchPath: ", listSearch);
                cc.log("updateResourceSearchPath done!");
                jsb.fileUtils.setSearchPaths(listSearch);
            }
        },
        getPathFromResource:function(path)
        {
            var newPath = this._selectResource.folder + "/" + path;
            return newPath;
        },
        getResourceScale:function()
        {
            return this._selectResource.scale;
        },
        getDesignResolutionSize:function()
        {
            return cc.size(this._configData.widthDesign, this._configData.heightDesign);
        },
        //ty le w/h cua
        getMaxSupportScreenRatio:function()
        {
            if(_.isUndefined(this._configData.maxScreenRatio))
            {
                return 100;
            }
            return this._configData.maxScreenRatio;
        },
        getMinSupportScreenRatio:function()
        {
            if(_.isUndefined(this._configData.minScreenRatio))
            {
                return 0;
            }
            return this._configData.minScreenRatio;
        },
        isSupportThisDeviceScreen:function()
        {
            var frameSize = cc.view.getFrameSize();
            var ratio = frameSize.width/frameSize.height;
            return ratio <= this.getMaxSupportScreenRatio() &&  ratio >= this.getMinSupportScreenRatio();

        }
    }
);

fr.ClientConfig.getInstance = function()
{
    if(g_clientConfig == null)
    {
        g_clientConfig = new fr.ClientConfig();
    }
    return g_clientConfig;
};