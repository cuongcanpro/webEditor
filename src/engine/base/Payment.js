
var pm = {};

pm.ERROR_CODE = {
    SUCCESS:                    10000,
    NEED_PHONE_NUMBER:          10001,
    NEED_CARD_NO:               10002,
    FAIL:                       10003,
    FAIL_OVER_REQUEST:          10004,
    FAIL_INVALID_CARD:          10011,
    FAIL_CARD_OVER_LIMIT:       10009,
    FAIL_INVALID_PHONE:         10005,
    FAIL_MAINTAIN:         		10013,

    OTP_FAIL_WRONG_OTP:         11001,
    OTP_FAIL_HASH:              11002,
    OTP_FAIL_EXCEPTION:         11003,
    OTP_FAIL_NOT_ENOUGHT_MONEY: 11004,
    OTP_FAIL_REACH_LIMIT:       11005,
    OTP_FAIL_TIMEOUT:           11008,
};

/*
Set lai localize neu dung ui lib
- Dung mac dinh tieng anh
- Trong code goi set lai cac text localize ben duoi (PaymentLocalize.ENG)
*/
// PaymentLocalize.ENG = {
//     TITLE_INPUT_PHONENUMBER: "Type Your Phone Number",
//     TITLE_BTN_OK: "OK",
//     TITLE_BTN_CANCEL: "Cancel",
//     TAP_TO_INPUT: "Touch to input",
//     INPUT_WARNING: "Please fill in required information!",
//     ACTION_FAILED: "Error during processing!",
//     TITLE_INPUT_OTP: "To complete your purchase, enter the OTP code and click 'Confirm'",
//     CONFIRM_TEXT: "Confirm",
//     CHOOSE_CARRIER_TEXT: "Choose The Operator",
//     TRANS_PROCESS_TEXT: "Processing Transaction",
//     CONFIRM_PURCHASE_SMS: "To complete your purchase, Choose The Operator",
//     SIM_POST_PAID: "Postpaid SIM",
//     SIM_PRE_PAID: "Prepaid SIM",
//     NOTIFY_RE_ENTER_OTP: "Enter error! Please re-enter the OTP",
//     ACTION_FAILED_INVALID_CARD: "Invalid card",
//     ACTION_FAILED_CARD_OVER_LIMIT: "Daily transaction limit exceeded",
//     ACTION_FAILED_INVALID_PHONE: "Invalid phone number",
//     ACTION_FAILED_OVER_REQUEST: "Please try again after 5 mintutes",
//     ACTION_FAILED_MAINTAIN: "The Operator under maintain. Please try again later!",
// };

pm.LANGUAGE = {
    ENGLISH:0,
    MYANMAR:1,
    THAILAND:2,
};

pm.PAYMENT_TYPE = {
    TH_DCB_AIS_PREPAID:    1001,
    TH_DCB_AIS_POSTPAID:    1002,
    TH_DCB_DTAC_PREPAID:    1003,
    TH_DCB_DTAC_POSTPAID:    1004,
    TH_DCB_TRUE_PREPAID:    1005,
    TH_DCB_CAT_PREPAID:    1007,
    TH_CARD_AIS:    1009,
    TH_CARD_TRUE:    1010,
    TH_WALLET_TRUE:    1011,
    TH_WALLET_LINE:    1012,
    TH_WALLET_MPAY:    1013,
    TH_IBANKING_AYUDHYA:    1014,
    TH_IBANKING_BANGKOK:    1015,
    TH_IBANKING_KRUNG:    1016,
    TH_IBANKING_SCB:    1017,
    TH_WALLET_SHOPEEPAY:    1018,
    TH_WALLET_DOLFIN:    1019,
    TH_IBANKING_THAILANDATM:    1020,
    TH_IBANKING_KPLUS:    1021,
    TH_IBANKING_PROMPTPAY:    1022,

    MM_DCB_MPT:    2001,
    MM_DCB_TELENOR:    2002,
    MM_DCB_OOREDOO:    2003,
    MM_WALLET_WAVEMONEY:    2004,
    MM_CARD_EASYPOINT:    2005,
    MM_DCB_MYTEL:    2006,
    MM_WALLET_KBZPAY:    2007,

    PH_DCB_GLOBE: 3001,
    PH_DCB_SMARTSUN: 3002,
    PH_WALLET_GCASH: 3003,
    PH_WALLET_PAYMAYA: 3004,
    PH_WALLET_GRABPAY: 3005,
    PH_WALLET_RAZERGOLD: 3006,
    PH_DCB_DITO: 3007,
    PH_CREDIT_VISAMASTER: 3008,

    ID_DCB_TELKOMSEL: 5001,
    ID_DCB_INDOSAT: 5002,
    ID_DCB_XL: 5003,
    ID_DCB_3H: 5004,
    ID_WALLET_GOPAY: 5005,
    ID_WALLET_DANA: 5006,
    ID_WALLET_LINKAJA: 5007,
    ID_WALLET_OVO: 5008,
    ID_WALLET_SHOPEEPAY: 5009,
    ID_CASH_INDOMARET: 5010,
    ID_WALLET_DOKU: 5011,
    ID_CASH_ALFAMART: 5012,
    ID_CASH_TRUEMONEY: 5013,
    ID_WALLET_BANKSFERINDO: 5014,

    MY_DCB_DIGI: 6001,
    MY_DCB_MAXIS: 6002,
    MY_DCB_CELCOM: 6003,
    MY_DCB_UMOBILE: 6004,
    MY_CARD_DIGI: 6005,
    MY_WALLET_GRABPAY: 6006,
    MY_WALLET_TOUCHNGO: 6007,
    MY_WALLET_BOOST: 6008,

    IN_WALLET_PAYTM: 7001,
    IN_UPI_PAYTM: 7002,
    IN_DCB_NETBANKING: 7003,
    IN_DCB_FREECHARGE: 7004,
    IN_WALLET_PAYZAPP: 7005,
    IN_WALLET_JIOMONEY: 7006,
    IN_WALLET_MOBIKWIK: 7007,

    RU_WALLET_YANDEX: 8001,
    RU_WALLET_QIWI: 8002,
    RU_DCB_BEELINE: 8003,
    RU_DCB_MTS: 8004,
    RU_DCB_MEGAFON: 8005,
    RU_DCB_TELE2: 8006,
    RU_NA_WEBMONEY: 8007,

    KH_DCB_SMARTAXIATA: 9001,
    KH_DCB_CELLCARD: 9002,
    KH_DCB_METFONE: 9003,
    KH_WALLET_WING: 9004,
    KH_WALLET_PIPAY: 9005,
    KH_WALLET_PAYGO: 9006,

    LA_DCB_UNITEL: 9010,
    LA_DCB_LAOTELECOM: 9011,

    SA_WALLET_ONECARD: 9501,
    SA_DCB_ZAIN: 9502,
    SA_CREDIT_SA: 9503,
    SA_CREDIT_MADA: 9504,
    SA_WALLET_STCPAY: 9505,

    KW_DCB_ZAIN: 9601,
    KW_DCB_OOREDOOKUWAIT: 9602,
    KW_GATEWAY_KNET: 9603,
    KW_WALLET_ONECARD: 9604,

    AE_WALLET_ONECARD: 9701,
    AE_DCB_ETISALAT: 9702,
    AE_DCB_PAYIT: 9703,		//wallet
    AE_WALLET_PAYBY: 9704,
    AE_CREDIT_UAE: 9705,

    TR_DCB_TURKTELECOM: 9801,
    TR_DCB_VODAFONE: 9802,
    TR_IBANKING_BANKTRANSFER: 9810,
    TR_CARD_ININAL: 9811,
    TR_WALLET_PAPARA: 9812,

    EG_STORE_FAWRY: 9901,
    EG_WALLET_VODAFONE: 9902,
    EG_CARD_MASARY: 9903,
    EG_STORE_MEEZA: 9904,
    EG_WALLET_ONECARD: 9905,
    EG_CREDIT_EG: 9906,
    EG_WALLET_ORANGE: 9907,
	
    PK_DCB_TELENOR: 10001,
    PK_DCB_UFONE: 10002,
    PK_WALLET_EASYPAISA: 10011,
    PK_WALLET_JAZZCASH: 10012,
    PK_WALLET_ALFAX: 10013,
    PK_WALLET_HBK: 10014,

    BD_WALLET_BKASH: 10021,
    BD_DCB_ROBI: 10022,
	
    TW_DCB_TAIWAN: 11001,
    TW_DCB_CHUNGHWA: 11002,
    TW_DCB_FAREASTONE: 11003,
    TW_DCB_ASIAPACIFIC: 11004,
    TW_STORE_GASH: 11005,
    TW_WALLET_LINEPAY: 11006,
    TW_WALLET_JKOPAY: 11007,
    TW_CREDIT_CARDPAYMENT: 11008,

};

pm.ENABLE_WEBVIEW = true;
pm.ZORDER_BASE_UI = 10000;

pm.payment = {

    init: function (productId, sessionKey, useUI, isLive) {
    },

    /**
     * set ssk after login
     * @param sessionKey
     */
    setSessionKey: function (sessionKey) {
    },

    /**
     * set language
     * @param lang
     */
    setLanguage: function (lang) {
    },

    /**
     * verify otp user nhap de hoan thanh transaction
     * @param paymentType
     * @param transId
     * @param refId
     * @param otp
     * @param sendPkgFunc
     * @param callback
     */
    processVerifyOTP:function(paymentType, transId, refId, otp, callback){
    },
	
    /**
     * Nap tin nhan
     * @param paymentType
     * @param accountName
     * @param accountId
     * @param phoneNumber
     * @param countryId
     * @param amount
     * @param extraData
     * @param callback
     * @returns {number}
     */
    processSMSCharge:function(paymentType, accountName, accountId, phoneNumber, countryId, amount, extraData, callback ){
    },

    /**
     * Nap Wallet
     * @param paymentType
     * @param accountName
     * @param accountId
     * @param phoneNumber
     * @param countryId
     * @param amount
     * @param extraData
     * @param callback
     * @returns {number}
     */
    processWalletCharge:function(paymentType, accountName, accountId, phoneNumber, countryId, amount, extraData, callback ){
    },

    /**
     * Nap Bank/ or Other (Credit/ Cash..)
     * @param paymentType
     * @param accountName
     * @param accountId
     * @param phoneNumber
     * @param countryId
     * @param amount
     * @param extraData
     * @param callback
     * @returns {number}
     */
    processBankCharge:function(paymentType, accountName, accountId, phoneNumber, countryId, amount, extraData, callback ){
    },

    /**
     * Nap the cao
     * @param paymentType
     * @param cardNo
     * @param accountName
     * @param accountId
     * @param countryId
     * @param amount
     * @param extraData
     * @param callback
     * @returns {number}
     */
    processCardCharge:function(paymentType, accountName, accountId, cardNo, pinCode, countryId, amount, extraData, callback){
    },
	
    /**
     * Show ui select partner before charge with list pmType
     * @param paymentTypeList
     * @param accountName
     * @param accountId
     * @param phoneNumber
     * @param countryId
     * @param amount
     * @param extraData
     * @param callback
     * @param orderdesc
     * @returns {number}
     */
    processChoosePartnerWithListPmType: function (paymentTypeList, accountName, accountId, phoneNumber, countryId, amount, extraData, callback,   orderdesc){
    },

    /**
     * Check kenh nap nay co can lay truoc so dien thoai cua user
     * @param paymentType
     * @returns {boolean}
     */
    checkNeedPhoneNumber: function (paymentType) {
    },
	
    hideWebview: function () {
    },


    /**
     * Send request to get paymentFlow by type
	 * (need send this request before call getPaymentFlowByPaymentType)
     */
    requestGetPaymentFlowByPaymentType: function(paymentType){
	},
	
    /**
     * Get paymentFlow by type
     * @returns {int} paymentFlow (-1 if undefine/ no data)
     */
    getPaymentFlowByPaymentType: function (paymentType) {
    },
	
};