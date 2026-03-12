/**
 * Created by KienVN on 8/2/2016.
 */
fr.AsyncSprite = cc.Sprite.extend(
{
    ctor:function(size, callbackDownload)
    {
        this._super('common/avatar.png');//fix tam
        if(callbackDownload === undefined)
        {
            this._callbackDownload = size;
            this._defaultSize = undefined;
        }else {
            this._defaultSize = size;
            this._callbackDownload = callbackDownload;
        }

    },
    updatePath:function(url, storePath)
    {
        if(url.length < 4) {
            if(this._callbackDownload)
            {
                this._callbackDownload(false);
            }
            return;
        }
        if(!this._downloading)
        {
            var self = this;
            self._downloading = true;
            cc.textureCache.addImageAsync(url,function(texture2d){
                self._downloading = false;
                if(texture2d instanceof cc.Texture2D && texture2d.getContentSize().width > 0 && texture2d.getContentSize().height > 0) {
                    self.setTexture(texture2d);
                    var contentSize = self.getContentSize();
                    if (self._defaultSize) {
                        self.setScaleX(self._defaultSize.width / contentSize.width);
                        self.setScaleY(self._defaultSize.height / contentSize.height);
                    }
                        if(self._callbackDownload)
                            self._callbackDownload(true);

                }else{
                    if(self._callbackDownload)
                        self._callbackDownload(false);
                }
            },this);

        }

    }
});
fr.AsyncSprite.create = function(size, callback)
{
    return new fr.AsyncSprite(size, callback);
};