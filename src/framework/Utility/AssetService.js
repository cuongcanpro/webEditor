var UpdateState = {
    UP_TO_DATE:0,
    PROCESSING:1,
    FINISHED:2
};
dataAppVer = {};
fr.AssetUpdate = (function () {
    return {
        update: function (done) {
            var manifestPath = 'project.manifest';

            var update_store_path = fr.NativeService.getFolderUpdateAssets();
            cc.log("AssetService::update - storage path: " + update_store_path);

            var assetManager = new jsb.AssetsManager(manifestPath, update_store_path);
            assetManager.retain();


            //updateState.state: 0: no update, 1: processing, 2: finish
            var callback = function(err, updateState) {
                if(err != null || updateState.state != UpdateState.PROCESSING) {
                    if (assetManager) {
                        assetManager.release();
                        assetManager = null;
                    }
                }

                done(err, updateState);
            };
            var timeOut = setTimeout(function()
            {
                callback(new Error(fr.Localization.text("lang_update_failed") + ": Timeout!" ));
            },10000);

            var failCount = 0;

            if (!assetManager.getLocalManifest().isLoaded()) {
                callback(new Error(fr.Localization.text("lang_local_manifest_file_found")));
            }
            else {
                var listener = new jsb.EventListenerAssetsManager(assetManager, function (event) {
                    cc.log("EventListenerAssetsManager:  " + event.getEventCode());
                    clearTimeout(timeOut);
                    switch (event.getEventCode()) {
                        case jsb.EventAssetsManager.ERROR_NO_LOCAL_MANIFEST:
                            callback(new Error(fr.Localization.text("lang_local_manifest_file_found")));
                            break;
                        case jsb.EventAssetsManager.UPDATE_PROGRESSION:
                            var downloadFileProgress = event.getPercent();
                            var currentFileProgress = event.getPercentByFile();

                            var fileDownloaded = Math.round(assetManager.getTotalToDownload() * currentFileProgress/100);

                            var downloadState = {
                                state:UpdateState.PROCESSING,
                                downloadFileProgress:currentFileProgress,
                                fileDownloaded:fileDownloaded,
                                totalToDownload:assetManager.getTotalToDownload()
                            };
                            cc.log("downloadFileProgress:  " + JSON.stringify(downloadState) );
                            callback(null, downloadState);
                            var msg = event.getMessage();
                            if (msg) {
                                cc.log(msg);
                            }
                            cc.log(currentFileProgress + "%");
                            break;
                        case jsb.EventAssetsManager.ERROR_DOWNLOAD_MANIFEST:
                            cc.log("AssetService::update - download failed. " + event.getMessage());
                            callback(new Error(fr.Localization.text("lang_error_download_manifest")));
                            break;
                        case jsb.EventAssetsManager.ERROR_PARSE_MANIFEST:
                            cc.log("AssetService::update - parse failed. " + event.getMessage());
                            callback(new Error(fr.Localization.text("lang_error_parse_manifest")));
                            break;
                        case jsb.EventAssetsManager.ALREADY_UP_TO_DATE:
                            cc.log('AssetService::update - already up to date');
                            var downloadState = {
                                state:UpdateState.UP_TO_DATE
                            };
                            callback(null, downloadState);
                            break;
                        case jsb.EventAssetsManager.UPDATE_FINISHED:
                            cc.log("AssetService::update - finished. " + event.getMessage());
                            var downloadState = {
                                state:UpdateState.FINISHED
                            };
                            callback(null, downloadState);
                            break;
                        case jsb.EventAssetsManager.UPDATE_FAILED:
                            cc.log("AssetService::update - failed. " + event.getMessage());
                            failCount++;
                            if (failCount < 5) {
                                assetManager.downloadFailedAssets();
                            }
                            else {
                                cc.log("AssetService::update - reached max retry limit");
                                failCount = 0;
                                callback(new Error(fr.Localization.text("lang_update_failed") + ": " + jsb.EventAssetsManager.UPDATE_FAILED));
                            }
                            break;
                        case jsb.EventAssetsManager.ERROR_UPDATING:
                            cc.log("AssetService::update - error: " + event.getAssetId() + ", " + event.getMessage());
                            break;
                        case jsb.EventAssetsManager.ERROR_DECOMPRESS:
                            cc.log('AssetService::update - decompress error ' + event.getMessage());
                            break;
                        default:
                            break;
                    }
                });

                cc.eventManager.addListener(listener, 1);
                assetManager.update();
            }
        },

        requestAppVersion:function(callback)
        {
            var url = "";
            var key =  "linhdv";
            var data = {
                version:fr.platformWrapper.getVersionCode(),
                store:fr.platformWrapper.getStoreType()
            };
            var encryptData = fr.Crypt.encodeXOR(JSON.stringify(data),key);
            if (cc.sys.platform == cc.sys.WIN32)
            {
                 //url = "http://localhost/monopoly/versions/gate2.php?service=1&data=" + encryptData;
                url = "http://monstone-landing.mto.zing.vn/gate2.php?service=1&data=" + encryptData;
            }
            else
            {
                if (gv.isRelease) {
                    url = "http://monstone-landing.mto.zing.vn/gate2.php?service=1&data=" + encryptData;
                }
                else {
                    url = "http://monstone-landing.mto.zing.vn/gate2.php?service=1&data=" + encryptData;
                }
            }
            fr.Network.request(url, function(result, response)
            {
                if(result)
                {
                    try{
                        var decodeData =  fr.Crypt.decodeXOR(response,key);
                        var data = JSON.parse(decodeData);
                       // var data = JSON.parse(response);
                        cc.log("data = " + JSON.stringify(data));
                        dataAppVer = data;
                        callback(true, data);


                    }
                    catch(e){
                        callback(false);
                    }
                }
                else
                {
                    callback(false);
                }
            });
        }
    }

})();