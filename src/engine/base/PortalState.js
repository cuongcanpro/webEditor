/**
 * Created by KienVN on 7/13/2018.
 */

var fr = fr ||{};

fr.portalState = {
    init:function()
    {
        this.loadState();
    },
    getDataPath:function()
    {
        return jsb.fileUtils.getWritablePath() + "/portal_state";
    },
    loadState:function()
    {
        var txt =  jsb.fileUtils.getStringFromFile(this.getDataPath());
        if(txt == "" || txt == undefined)
        {
            this._state = {};
        }else {
            try {
                this._state = JSON.parse(txt);
            }catch(e){

            }
        }
        if(!this._state)
        {
            this._state = {}
        }
    },
    saveState:function()
    {
        var data = JSON.stringify(this._state);
        jsb.fileUtils.writeStringToFile(data, this.getDataPath());
    },
    setRequireLogout:function(isNeedLogout)
    {
        this._state.isNeedLogout = isNeedLogout;
        this.saveState();
    },
    isRequireLogout:function()
    {
        return this._state.isNeedLogout;
    },
	setAccessToken:function(accessToken)
	{
		this._state.accessToken = accessToken;
		this.saveState();
	},
	getAccessToken:function()
	{
		return this._state.accessToken
	},
    //vi, my(Burmese), th, id
    getCurrentLanguage:function()
    {
        return this._state.currentLanguage;
    },
	setCurrentLanguage:function(currentLanguage)
	{
		this._state.currentLanguage = currentLanguage;
		this.saveState();
	},
    getCountryCode:function()
    {
        return this._state.countryCode;
    },
    setCountryCode:function(countryCode)
    {
        this._state.countryCode = countryCode;
        this.saveState();
    }
};