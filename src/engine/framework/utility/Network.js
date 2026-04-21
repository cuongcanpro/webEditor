/**
 * Created by KienVN on 1/21/2016.
 */

fr.Network = {
    //publicUrl: "http://49.213.81.41:8080",// public server
    privateUrl: "https://zingplaysocial.mto.zing.vn",// private server
    publicUrl: "https://zp.play.zing.vn",// public server
    localUrl: "https://10.198.48.140:8080",// local server
    urlServiceGetSSKZingPlay:"https://zplogin.g6.zing.vn/?service_name=getSessionKey",
    urlServiceGetSSKZingPlayIndo:"https://login.zingplay.com/?service_name=getSessionKey",
    urlServiceGetSSKZingPlaySea:"https://sub.zingplay.com/mobile/id.php?service_name=getSessionKeyPortal",
    urlServiceGetSSKBrazil:"https://brazil-login.zingplay.com",
    secretkeyBrazil:"CNevjLRTGeB7Wx@P",

    urlServiceGetSSKGlobal: "https://login-global.zingplay.com/?",
    secretKeyGlobal: "p#v^v#=fU3@NdZ?3",
    initXmlHttp: function(callbackFunc){
        var timeout = setTimeout(function()
        {
            if(callbackFunc != undefined)
            {
                callbackFunc(false, "Request time out!");
            }
        }, 15000);
        var callBack = function(result, data)
        {
            clearTimeout(timeout);
            if(callbackFunc != undefined)
            {
                callbackFunc(result, data);
            }
        };
        var xhr = cc.loader.getXMLHttpRequest();
        xhr.onreadystatechange = function () {
            if (xhr.readyState == 4 && (xhr.status >= 200 && xhr.status <= 207)) {
                callBack(true, xhr.responseText);
            }
            else{
                if(!cc.sys.isNative && (xhr.status == 200 || xhr.status == 0))
                {
                    return;
                }
                callBack(false, "error: " + xhr.readyState + "," + xhr.status);
            }
        };
        xhr.onerror = function(){
            cc.log("Request error!");
            callBack(false, "onerror");
        };
        xhr.ontimeout = function(){
            cc.log("Request time out!");
            callBack(false, "ontimeout");
        };
        xhr.onabort = function () {
            cc.log("Request aborted!");
            callBack(false, "ontimeout");
        };
        xhr.timeout = 10000;
        return xhr;
    },
    xmlHttpRequestGet: function(urlRequest, callbackFunc){
        cc.log(urlRequest);
        var xhr = this.initXmlHttp(callbackFunc);
        xhr.open("GET", urlRequest, true);
        xhr.send();
    },
    xmlHttpPostForm: function(url, args, callbackFunc){
		cc.log(url, args);
        var xhr = this.initXmlHttp(callbackFunc);
        xhr.setRequestHeader("Content-Type","application/x-www-form-urlencoded");
        xhr.open("POST", url);
        xhr.timeout = 5000;
        xhr.send(args);
    },
    xmlHttpRequestPost: function(url,data, callbackFunc){
        cc.log(url);
        var xhr = this.initXmlHttp(callbackFunc);
        xhr.open("POST", url);
        xhr.setRequestHeader("Content-Type","application/json;charset=UTF-8");
        var arguements = JSON.stringify(data);
        xhr.send(arguements);
    },

    // sendGetSessionKeyGame: function(gameId,accesToken,callbackFunc){
    //     var data = {
    //         "service":  "Game",
    //         "method":   "getSessionGame",
    //         "accessToken":accesToken,
    //         "gameId":gameId,
    //         "fromResource":GV.SOCIAL_ID,
    //         "fromOperator":1
    //     };
    //     this.requestJsonPost(data, callbackFunc);
    // },
    // sendGetSessionKeyZingplaySeaGuest:function(gameId, callbackFunc){
    //     var gameCode = GV.RESOURCE_MGR.getDataGameConfigs(gameId).code;
    //
    //     var userName =  fr.BrazilAccount.getIdForGuest();
    //     this.userName = userName;
    //     var secretKey = '$ecRe!l<ei';
    //     var mac = md5(userName + secretKey);
    //     var url = "https://login.zingplay.com/";
    //     var args = "service_name=zacc_guest&gameId=" + gameCode +
    //         "&deviceId=" + userName + "&mac=" + mac +"&isPortal=1";
    //     var tempCallback = function(result, data){
    //         data["gameId"] = gameId;
    //         callbackFunc(result, data);
    //     };
    //     fr.Network.requestJsonPost(url,args,tempCallback);
    // },
    // sendGetSessionKeyZingplayService: function(gameId, gameCode, serviceType, accesToken,callbackFunc){
    //     var urlRoot = this.urlServiceGetSSKZingPlay;
    //     if(serviceType == SERVICE_ID.ZINGPLAY_SEA_HIEUPT)
    //     {
    //         urlRoot = this.urlServiceGetSSKZingPlayIndo;
    //     }
    //     var socialType = Utility.getSocialTypeById(GV.SOCIAL_ID);
    //     if(GV.SOCIAL_ID == SOCIAL_ID.ZPACCOUNT)
    //     {
    //         socialType = 'zacc';
    //     }
    //
    //     var partnerId = "portal_" + fr.Localization.getInstance().getCurrentLanguageCode();
    //     var url = urlRoot +"&gameId="+ gameCode + "&distribution=dis_tienlen&clientInfo=default&social="
    //         +socialType+"&flatform=IOS&accessToken="+accesToken+"&partnerId=" + partnerId +"&deviceId=default";
    //     cc.log('SessionKeyZingplay', url)
	// 	fr.Network.requestJsonGet(url,callbackFunc);
    // },
    // sendGetSessionKeyZingplaySeaService: function(gameId,accesToken,callbackFunc){
    //     var socialType = Utility.getSocialTypeById(GV.SOCIAL_ID);
    //     if(GV.SOCIAL_ID == SOCIAL_ID.ZACCOUNT)
    //     {
    //         socialType = 'zacc';
    //     }
    //     var partnerId = "portal_" + fr.Localization.getInstance().getCurrentLanguageCode();
    //     var gameCode = GV.RESOURCE_MGR.getDataGameConfigs(gameId).code;
    //     var url = this.urlServiceGetSSKZingPlaySea +"&gameId="+gameCode+"&distribution=dis_"+gameCode+"&clientInfo=default&social="+socialType+"&flatform=IOS&accessToken="+accesToken+"&partnerId=" + partnerId +"&deviceId=default";
    //      var tempCallback = function(result, data){
    //          data["gameId"] = gameId;
    //          callbackFunc(result, data);
    //      };
    //     fr.Network.requestJsonGet(url,tempCallback);
    // },
    // sendGetSessionKeyGlobalService:function(gameId,accessToken,callbackFunc){
    //     var socialType = Utility.getSocialTypeById(GV.SOCIAL_ID);
    //     if(GV.SOCIAL_ID == SOCIAL_ID.ZACCOUNT)
    //     {
    //         socialType = 'zacc';
    //     }
    //     var deviceId = fr.platformWrapper.getDeviceID();
    //     var gameCode = GV.RESOURCE_MGR.getDataGameConfigs(gameId).code;
    //     cc.log("sendGetSessionKeyGlobalService gameCode " + gameCode + " gameId " + gameId);
    //     var clientInfo = 'default';
    //     //mac : md5(social+accessToken+clientInfo+deviceId +gameId+secretkey1)
    //     var mac = CryptoJS.MD5(socialType + accessToken + clientInfo + deviceId + "portal" + this.secretKeyGlobal);
    //     var args = "service_name=getSessionKey&gameId="+gameCode+ "&clientInfo=default&social="+socialType
    //         +"&accessToken="+accessToken +"&deviceId="+deviceId + "&mac=" + mac + "&isPortal=1";
    //     var tempCallback = function(result, data){
    //
    //         if(result){
    //             data["gameId"] = gameId;
    //             callbackFunc(result, data);
    //         }else{
    //
    //             callbackFunc(result, data);
    //         }
    //
    //     };
    //     fr.Network.requestJsonPost(this.urlServiceGetSSKGlobal,args,tempCallback);
    // },
    // sendGetSessionKeyBrazilService: function(gameId,accessToken,callbackFunc){
    //     var socialType = Utility.getSocialTypeById(GV.SOCIAL_ID);
    //     if(GV.SOCIAL_ID == SOCIAL_ID.ZACCOUNT)
    //     {
    //         socialType = 'zacc';
    //     }
    //     var deviceId = fr.platformWrapper.getDeviceID();
    //     var gameCode = GV.RESOURCE_MGR.getDataGameConfigs(gameId).code;
    //     cc.log("sendGetSessionKeyBrazilService gameCode " + gameCode + " gameId " + gameId)
    //     var clientInfo = 'default';
    //         //mac : md5(social+accessToken+clientInfo+deviceId +gameId+secretkey1)
    //     var mac = CryptoJS.MD5(socialType + accessToken + clientInfo + deviceId + "portal" + this.secretkeyBrazil);
    //     var args = "service_name=getSessionKey&gameId="+gameCode+ "&clientInfo=default&social="+socialType
    //         +"&accessToken="+accessToken +"&deviceId="+deviceId + "&mac=" + mac + "&isPortal=1";
    //     var tempCallback = function(result, data){
    //
    //         if(result){
    //             data["gameId"] = gameId;
    //             callbackFunc(result, data);
    //         }else{
    //
    //             callbackFunc(result, data);
    //         }
    //
    //     };
    //     fr.Network.requestJsonPost(this.urlServiceGetSSKBrazil,args,tempCallback);
    // },
    // sendGetSessionKeyBrazilGuest:function(gameId, callbackFunc){
	// 	var gameCode = GV.RESOURCE_MGR.getDataGameConfigs(gameId).code;
    //     var userName =  fr.BrazilAccount.getIdForGuest();
    //     this.userName = userName;
    //     var secretKey = this.secretkeyBrazil;
    //     var mac = md5(userName + 'portal' + secretKey);
    //     var url = "https://brazil-login.zingplay.com";
    //     var args = "service_name=zacc_guest&gameId=" + gameCode +
    //         "&deviceId=" + userName + "&mac=" + mac + "&isPortal=1";
    //     fr.Network.requestJsonPost(url,args,callbackFunc);
    // },
    // sendGetIpPortal: function(from, callbackFunc){
    //     var url = this.getUrl() + "/?service=Get&method=checkIpAddress&ipFrom=" + from;
    //     this.requestJsonGet(url, callbackFunc);
    // },

    requestJsonPost:function(url, arg, callbackFunc)
    {
        this.xmlHttpPostForm(url, arg, function(result, response)
        {
			cc.log("requestJsonPost",result, response);
            if(result)
            {
                try{
                    var data = Utility.parseJSON(response);
                    callbackFunc(true, data);
                }
                catch(e){
                    cc.log("callbackFunc is wrong!");
                }
            }
            else
            {
                callbackFunc(false,response);
            }
        });
    },
    requestCountryCode:function(callback)
    {

        var input = {
            country:fr.Localization.getInstance().getCurrentLanguageCode(),
            deviceId:fr.platformWrapper.getDeviceID(),
            model:fr.platformWrapper.getDeviceModel(),
            networkOperator:fr.platformWrapper.getNetworkOperator()
        };
        var url = "https://zp.play.zing.vn/service/gate.php?data=";

        this.requestEncryptData(url, input, function(result, data)
        {
            if(result)
            {
                callback(true, data.country, data.vng);
            }
            else
            {
                callback(false);
            }
        });
    },

    requestEncryptData:function(url, data, callback)
    {
        var key =  "zp_portal_gsn";
        var encryptData = fr.Crypt.encodeXOR(JSON.stringify(data),key);
        var fullUrl = url + encryptData;
        this.xmlHttpRequestGet(fullUrl, function(result, response)
        {
            if(result)
            {
                var dataOut;
                try{
                    var decodeData =  fr.Crypt.decodeXOR(response,key);
                    dataOut = JSON.parse(decodeData);
                }
                catch(e){
                    callback(false);
                    return;
                }
                callback(true, dataOut);
            }
            else
            {
                callback(false, response);
            }
        });
    },

    requestConfigData:function(callback) {
        var input = {
            pkg: fr.platformWrapper.getPackageName()
        };
        var url = "https://zp.play.zing.vn/service/config.php?data=";
        this.requestEncryptData(url, input, callback);
    },

    requestJsonGet:function(urlRequest, callbackFunc)
    {
        cc.log("requestJsonGet", urlRequest);
        this.xmlHttpRequestGet(urlRequest, function(result, response)
        {
            cc.log("requestJsonGet", urlRequest, result, response)
            if(result)
            {
                var data;
                try{
                    data = JSON.parse(response);
                    cc.log("response", urlRequest, JSON.stringify(data));
                }
                catch(e){
                    callbackFunc(false,"parse error : " + urlRequest + " : " + response);
                    return;
                }
                if(data) {
                    callbackFunc(true, data);
                }else{
                    callbackFunc(false,"parse error: " + urlRequest + " : " + response);
                }
            }
            else
            {
                callbackFunc(false,response);
            }
        });
    },

    getUrl: function(){
        if(PlatformUltis.isMobile()){
            switch (GV.SERVER_MODE)
            {
                case GV.MODE_SERVER.PRIVATE:
                    return this.privateUrl;
                case GV.MODE_SERVER.LIVE:
                    return this.publicUrl;
                default :
                    return this.privateUrl;
            }
        }else{
            return this.localUrl;
        }
    }

};