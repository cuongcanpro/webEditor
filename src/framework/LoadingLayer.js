/**
 * Created by GSN on 9/9/2015.
 */

fr.LoadingLayer = cc.Layer.extend(
    {
        ctor:function()
        {
            this._super();
            this._listTask = [];
            this._listAtlas = [];
            this._currentListAtlasIndex = -1;
            this._currentTaskIndex = 0;
            this._percent = 0;
            this._taskPercent = 0;
        },
        //logic
        addTaskLoadAtlas:function(listAtlas, label, percent)
        {
            var action = this._doLoadAtlas.bind(this);
            this._listAtlas.push(listAtlas);
            this.addTask(action, label, percent);
        },
        addTask:function(action, label, percent)
        {
            var task = {
                action:action,
                label:label,
                percent:percent
            };

            this._listTask.push(task);
        },
        onFinishTask:function()
        {
            this._percent += this._listTask[this._currentTaskIndex].percent;
            this._taskPercent = 0;
            this._currentTaskIndex++;
            if(this._currentTaskIndex < this._listTask.length)
            {
                this._listTask[this._currentTaskIndex].action();
            }
            else
            {
                this.onFinishAllTask();
            }
        },
        onFinishAllTask:function()
        {
            
        },
        start:function()
        {
            if(this._listTask.length == 0)
            {
                cc.log("Error: Need at least one task!");
            }
            this._currenAtlasIndex = 0;
            this._currentListAtlasIndex = -1;
            this._percent = 0;
            this._taskPercent = 0;
            this._currentTaskIndex = 0;
            this._listTask[this._currentTaskIndex].action();
        },
        _doLoadAtlas:function()
        {
            this._taskPercent = 0;
            this._currentListAtlasIndex++;
           // cc.log(this._getCurrentAtlas() + '.png');
            cc.textureCache.addImageAsync(this._getCurrentAtlas() + '.png', this._onAtlasLoaded, this);

        },
        _onAtlasLoaded:function()
        {
            this._taskPercent = (this._currenAtlasIndex +1)/this._listAtlas[this._currentListAtlasIndex].length* this._listTask[this._currentTaskIndex].percent;

            cc.spriteFrameCache.addSpriteFrames(this._getCurrentAtlas() + '.plist', this._getCurrentAtlas() + '.png');
            cc.log(this._getCurrentAtlas() + '.png');
            this._currenAtlasIndex ++;
            if(this._currenAtlasIndex < this._listAtlas[this._currentListAtlasIndex].length)
            {
                cc.textureCache.addImageAsync(this._getCurrentAtlas() + '.png', this._onAtlasLoaded, this);
            }
            else{
                //finish loaded one atlas list
                this.onFinishTask();
            }
            cc.log(cc.textureCache.getCachedTextureInfo());
        },
        _getCurrentAtlas:function()
        {
            return this._listAtlas[this._currentListAtlasIndex][this._currenAtlasIndex];
        },
        getCountOfTask:function()
        {
            return this._listTask.length;
        },
        getPercent:function()
        {
            return this._percent + this._taskPercent;
        }

    }
);