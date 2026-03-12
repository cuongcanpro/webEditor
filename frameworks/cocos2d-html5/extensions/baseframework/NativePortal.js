 var fr = fr||{};

fr.NativePortal = {
    getSessionKey:function(){
        if(typeof portal_session_key !== 'undefined')
        {
            return portal_session_key;
        }
        return null;
    },
    getSocialType:function(){
        if(typeof portal_social_type !== 'undefined')
        {
            return portal_social_type;
        }
        return null;
    },
    isShowLocalShop:function(){
        return true;
    },
    getLoadingIcon:function () {
        if(typeof portal_loading_icon !== 'undefined')
        {
            return portal_loading_icon;
        }
        return null;
    },
    getPortalUrl:function()
    {
        //return "https://portal-gsn.mto.zing.vn/gsn/portal_vn_web/";
        if(typeof portal_url !== 'undefined')
        {
            return portal_url;
        }
        return null;
    },
    backToPortal:function () {
        window.open(this.getPortalUrl(), "_self","", true );
    },
    getResPath:function(){
        if(typeof portal_game_res !== 'undefined')
        {
            return portal_game_res;
        }
        return "";
    }
};