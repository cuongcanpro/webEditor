/**
 * Updated by hungdd on 19-04-2023
 * Using list package by portal services
 */

fr.iosiap = {
    pluginIAP: null,
    serverMode: false,

    init: function () {
        this.callback = null;
        if (plugin.PluginManager == null) return false;

        if (fr.iosiap.pluginIAP == null) {
            var pluginManager = plugin.PluginManager.getInstance();
            fr.iosiap.pluginIAP = pluginManager.loadPlugin("IOSIAP");
            fr.iosiap.pluginIAP.setListener(fr.iosiap);
            fr.iosiap.pluginIAP.callFuncWithParam("setServerMode");

            //fr.iosiap.requestProducts();
        }
        return true;
    },

    requestProducts: function (productIds) {
        var ar = fr.paymentInfo.getAllProductsID();
        cc.log("AppleIAP::requestProducts " + productIds);
        this.pluginIAP.callFuncWithParam("requestProducts", plugin.PluginParam(plugin.PluginParam.ParamType.TypeString, productIds));

        setTimeout(this.verifyIncompletePurchase.bind(this),500);
    },

    finishTransactions: function (listTrans) {
        cc.log("AppleIAP::finishTransactions: ", JSON.stringify(listTrans));
        listTrans = listTrans.split(",");
        if (listTrans) {
            for (var i = 0; i < listTrans.length; ++i) {
                if (listTrans[i]) {
                    cc.log("AppleIAP::tran-" + i + ":" + listTrans[i]);
                    this.pluginIAP.callFuncWithParam("finishTransaction", plugin.PluginParam(plugin.PluginParam.ParamType.TypeString, listTrans[i]));
                }
            }
        }
    },

    requestPayProduct: function (productKey) {
        var productId = fr.paymentInfo.getProductID(productKey);
        cc.log("AppleIAP::requestPayProduct " + productId);
        PaymentUtils.sendTelegram("AppleIAP::requestPayProduct " + productId);
        if (this.pluginIAP) {
            var paramMap = {};
            paramMap["productId"] = productId;
            this.pluginIAP.payForProduct(paramMap);
        }
    },

    onPayResult: function (ret, receipt, productInfo) {
        if (ret == plugin.ProtocolIAP.PayResultCode.PaySuccess) {
            cc.log("AppleIAP::onPayResult PaySuccess");
            // send receipt to game server
            if (receipt && receipt.length > 0) {
                // moduleMgr.getPaymentModule().sendIAPIOS(receipt);
                iapHandler.onIAPPurchase(JSON.stringify({
                    result: 1,
                    num: 1,
                    data0: receipt,
                    signature0: ""
                }));
            } else {
                cc.log("AppleIAP::onPayResult receipt is empty");
            }
        } else {
            Loading.clear();

            if (ret == plugin.ProtocolIAP.PayResultCode.PayFail) {
                cc.log("AppleIAP::onPayResult PayFail");
            } else if (ret == plugin.ProtocolIAP.PayResultCode.PayCancel) {
                cc.log("AppleIAP::onPayResult PayCancel");
            } else if (ret == plugin.ProtocolIAP.PayResultCode.PayTimeOut) {
                cc.log("AppleIAP::onPayResult PayTimeOut");
            }
        }
    },

    onRequestProductsResult: function (ret, productInfo) {
        if (ret == plugin.ProtocolIAP.RequestProductCode.RequestFail) {
            cc.log("AppleIAP::onRequestProductsResult fail");
        } else if (ret == plugin.ProtocolIAP.RequestProductCode.RequestSuccess) {
            cc.log("AppleIAP::onRequestProductsResult success");
        } else {
            cc.log("AppleIAP::onRequestProductsResult code = %d", ret);
        }
    },

    getProductLocalCurrencyById: function (productKey) {
        var productId = fr.paymentInfo.getProductID(productKey);
        var sCurrency = "";
        if (this.pluginIAP) {
            sCurrency = this.pluginIAP.callStringFuncWithParam("getProductLocalCurrencyById",
                plugin.PluginParam(plugin.PluginParam.ParamType.TypeString, productId));
        }
        cc.log("AppleIAP::getProductLocalCurrencyById " + productKey + " -> " + productId + " : " + sCurrency);
        return sCurrency;
    },

    verifyIncompletePurchase: function () {
        if (this.pluginIAP) {
            return this.pluginIAP.callFuncWithParam("verifyIncompletePurchase");
        }
    }
};