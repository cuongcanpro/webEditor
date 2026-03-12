/**
 * Created by GSN on 9/29/2015.
 */
PORTAL_ERROR = {
    PARSE_JSON_FAIL:1001,
    FAIL:1002,
    CANNOT_CONNECT_TO_SERVER:1010,
    CONNECTION_TIMEOUT:1010,
    CONNECTION_ABORTED:1010
};
fr.portal = {
    SUCCESS:0,
    ZING_ME:"zingme",
    FACEBOOK:"facebook",
    GOOGLE:"google",
    ZALO:"zalo",
    GAME_ID:"250",//dev
    DISTRIBUTION:"vng",
    CLIENT_INFO:"Cotyphu",

    loginCallBack:null,

    loginZalo:function(callback)
    {
        this.loginCallBack = callback;
        fr.zalo.login(this.loginZaloResult.bind(this));
    },
    loginZaloResult:function(result,token)
    {
        if(result == 0)
        {
            this.requestSessionKeyFromPortal(this.loginCallBack,this.ZALO,token);
        }else{
            this.loginCallBack(result,"");
        }
    },
    //zing
    loginZingMe:function(username, pwd,callback)
    {
        this.loginCallBack = callback;
        fr.zingme.login(username,pwd,this.loginZingMeResult.bind(this));
    },
    loginZingMeResult:function(result,token)
    {
        if(result  ==  ZING_ME_ERROR.SUCCESS)
        {
            this.requestSessionKeyFromPortal(this.loginCallBack,this.ZING_ME,token);

        }else{
            this.loginCallBack(result,"");
        }
    },
    //facebook
    loginFacebook:function(callback)
    {
        this.loginCallBack = callback;
        fr.facebook.login(this.loginFacebookResult.bind(this));
    },
    loginFacebookResult:function(result,token)
    {
        cc.log("loginFacebookResult token = " + token);
        if(result == 0)
        {
            this.requestSessionKeyFromPortal(this.loginCallBack,this.FACEBOOK,token);
        }else{
            this.loginCallBack(result,"");
        }
    },
    //google
    loginGoogle:function(callback)
    {
        cc.log("fr.portal.loginGoogle");
        this.loginCallBack = callback;
        fr.google.login(this.loginGoogleResult.bind(this));
    },
    loginGoogleResult:function(result,token)
    {
        if(result == 0)
        {
            this.requestSessionKeyFromPortal(this.loginCallBack,this.GOOGLE,token);
        }else{
            this.loginCallBack(result,"");
        }
    },
    requestSessionKeyFromPortal:function(callback,social,accessToken)
    {
        fr.UserData.setStringFromKey("ClientToken", "");
        var url = "https://login.zingplay.com/?service_name=getSessionKey&gameId=" + this.GAME_ID + "&distribution="
            + this.DISTRIBUTION + "&clientInfo="+this.CLIENT_INFO + "&social=" + social + "&accessToken="+
                accessToken;

        cc.log("url:" + url);
        var self = this;
        var xhr = cc.loader.getXMLHttpRequest();
        xhr.onreadystatechange = function () {
            cc.log("requestSessionKeyFromPortal: xhr.onreadystatechange: " + xhr.readyState + ", " + xhr.status );
            if (xhr.readyState == 4 && (xhr.status >= 200 && xhr.status <= 207)) {
                var httpStatus = xhr.statusText;
                var response = xhr.responseText;

                cc.log("requestSessionKeyFromPortal: " + response);
                try{
                    var data = JSON.parse(response);
                    if(data.error == self.SUCCESS)
                    {
                        cc.log("getSessionKeySuccess:" + data.sessionKey);
                        callback(data.error,data.sessionKey);
                    }else{
                        cc.log("getSessionKeyError");
                        callback(data.error);
                        var _error = "login:" + data.error.toString();
                        // fr.gameAnalystic.summitDesignEvents(_error);
                    }

                }catch(e){
                 //   cc.log("Parse json from session key error!");
                  //  throw e;
                  //  callback(PORTAL_ERROR.PARSE_JSON_FAIL,"");
                }
            }
            else{
                if(!cc.sys.isNative && (xhr.status == 200 || xhr.status == 0))
                {
                    return;
                }
                callback(PORTAL_ERROR.FAIL,xhr.status);
                var _error = "login:" + xhr.status;
                // fr.gameAnalystic.summitDesignEvents(_error);

            }
        };
        xhr.onerror = function(){
            callback(PORTAL_ERROR.CANNOT_CONNECT_TO_SERVER,"");
            var _error = "login:cannotConnectSv";
            // fr.gameAnalystic.summitDesignEvents(_error);
        };
        xhr.ontimeout = function(){
            callback(PORTAL_ERROR.CONNECTION_TIMEOUT,"");
            var _error = "login:ontimeout";
            // fr.gameAnalystic.summitDesignEvents(_error);
        }
        xhr.onabort = function () {
            callback(PORTAL_ERROR.CONNECTION_ABORTED,"");
            var _error = "login:onabort";
            // fr.gameAnalystic.summitDesignEvents(_error);
        };
        xhr.timeout = 5000;
        xhr.open("GET", url, true);
        xhr.send();
        // fr.gameAnalystic.summitDesignEvents("login:portal");
    },
};