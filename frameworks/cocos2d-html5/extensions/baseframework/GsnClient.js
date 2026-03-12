/**
 * Created by KienVN on 1/25/2016.
 */

var WebSocket = WebSocket || window.WebSocket || window.MozWebSocket;
fr.ClientState = {
    kStateConnecting:0,
    kStateOpen:1,
    kStateClosing:2,
    kStateClosed:3
};

var POW_2 = {
    "56": 72057594037927940,
    "48": 281474976710656,
    "40": 1099511627776,
    "32": 4294967296,
    "24": 16777216,
    "16": 65536,
    "8": 256,
    "0": 1
};

fr.GsnClient = cc.Class.extend(
    {
        ctor:function()
        {
            this._webSocket = null;
            this._isReconnecting = false;
            this._dataSend = new Int8Array(0);
            this._clientState = fr.ClientState.kStateClosed;
        },
        connect:function(host,port,isSsl)
        {
            if (this._clientState == fr.ClientState.kStateConnecting)
            {
                cc.log("Client is processing connect, please try later!");
                return;
            }
            if (this._clientState == fr.ClientState.kStateOpen || this._clientState == fr.ClientState.kStateClosing)
            {
                this.reconnect();
                return;
            }
            this._host = host;
            this._port = port;
            this._isSsl =  isSsl;

            this._webSocket = new WebSocket("ws" + (isSsl?"s":"") + "://"+host+":"+port+"/websocket");
            this._webSocket.binaryType = "arraybuffer";
            this._webSocket.onopen = this.onopen.bind(this);
            this._webSocket.onmessage = this.onmessage.bind(this);
            this._webSocket.onerror = this.onerror.bind(this);
            this._webSocket.onclose = this.onclose.bind(this);
            this._isReconnecting = false;
            this._clientState = fr.ClientState.kStateConnecting;
        },
        reconnect:function()
        {
            if(this._host == undefined)
            {
                console.log("Call connect first!");
                return;
            }
            if (this._clientState == fr.ClientState.kStateOpen || this._clientState == fr.ClientState.kStateClosing)
            {
                this._isReconnecting = true;
                this.disconnect();
            }
            else if (this._clientState ==  fr.ClientState.kStateClosed)
            {
                this.connect(this._host, this._port, this._isSsl);
            }
        },
        onopen:function(evt)
        {
            this._clientState = fr.ClientState.kStateOpen;
            cc.log("WebSocket opened");
            if(this._finishConnectListener)
            {
                this._finishConnectListener(true);
            }
        },
        onmessage:function(evt)
        {
            var data = new Int8Array(evt.data);
            //cc.log("Receive: " + this.hexToString(data));

            var cmd = PacketHeaderAnalyze.getCmdIdFromData(data);

            if (this._receiveDataListener)
                this._receiveDataListener(cmd, data);

        },
        onerror:function(evt)
        {
            cc.log("onerror: " + evt.data);
        },
        onclose:function(evt)
        {
            cc.log("Websocket instance closed.");
            this._webSocket = null;
            var oldClientState = this._clientState;
            this._clientState = fr.ClientState.kStateClosed;
            if(oldClientState == fr.ClientState.kStateConnecting)
            {

                if(this._finishConnectListener)
                {
                    this._finishConnectListener(false);
                }
            }else if(this._isReconnecting)
            {
                this._isReconnecting = false;
                this.connect(this._host, this._port, this._isSsl);
            }
            else
            {
                if(this._disconnectListener)
                {
                    this._disconnectListener();
                }
            }
        },
        disconnect:function()
        {
            if (this._webSocket)
                this._webSocket.close();
        },
        send:function(packet)
        {
           // cc.log("Send: " + this.hexToString(packet.getData()));
            if(this._clientState != fr.ClientState.kStateOpen) {
                console.error("Need connect to server before send packet!");
                return;
            }
            if (this._webSocket)
            {
                var data = new Int8Array(packet.getData());
                this._webSocket.send(data.buffer);
            }
        },
        setFinishConnectListener:function(listener)
        {
            this._finishConnectListener = listener;
        },
        setDisconnectListener:function(listener)
        {
            this._disconnectListener = listener;
        },
        setReceiveDataListener:function(listener)
        {
            this._receiveDataListener = listener;
        },
        hexToString:function(data) {
            var binaryStr = "[" + data.length +  "]: ";
            var str = "";
            for (var i = 0; i < data.length; i++) {
                    var b = data[i];
                    var hexChar = b < 0x10? '0'+b.toString("16"):b.toString("16");
                    str += (hexChar + " ");
            }

            binaryStr += str ;
            return binaryStr;
        },
        isConnected:function()
        {
            return this._clientState == fr.ClientState.kStateOpen;
        }
    }
);
fr.GsnClient.create = function()
{
    return new fr.GsnClient();
};

var INDEX_SIZE_PACKET = 1;

fr.platform = {};

fr.platform.InPacket = cc.Class.extend({
    _className : "InPacket",
    ctor: function () {

    },
    init: function (pkg) {
        this._pos = 0;
        this._data = pkg;
        this._length = pkg.length;
        this._controllerId = this.parseByte();
        this._cmdId = this.getShort();
        this._error = this.parseByte();
    },
    getCmdId: function () {
        return this._cmdId;
    },
    getControllerId: function () {
        return this._controllerId;
    },
    getError: function () {
        return this._error;
    },
    parseByte: function () {
        cc.assert(this._pos < this._length, "IndexOutOfBoundsException");
        var b = this._data[this._pos++];
        return b;
    },
    getByte: function () {
        return this.parseByte();
    },
    getBool: function () {
        cc.assert(this._pos < this._length, "IndexOutOfBoundsException");
        var b = this._data[this._pos++];
        return b > 0;
    },
    getBytes: function (size) {
        cc.assert(this._pos + size <= this._length, "IndexOutOfBoundsException");
        var bytes = [];
        for (var i = 0; i < size; i++) {
            bytes.push(this.parseByte());
        }
        return bytes;
    },
    getShort: function () {
        cc.assert(this._pos + 2 <= this._length, "IndexOutOfBoundsException");
        if (this._pos + 2 > this._length) {
            return 0;
        }
        return ((this.parseByte() << 8) + (this.parseByte() & 255));
    },
    getUnsignedShort: function () {
        cc.assert(this._pos + 2 <= this._length, "getUnsignedShort: IndexOutOfBoundsException");
        var a = (this.parseByte() & 255) << 8;
        var b = (this.parseByte() & 255) << 0;
        return a + b;
    },
    getInt: function () {
        cc.assert(this._pos + 4 <= this._length, "getInt: IndexOutOfBoundsException");
        return ((this.parseByte() & 255) << 24) +
            ((this.parseByte() & 255) << 16) +
            ((this.parseByte() & 255) << 8) +
            ((this.parseByte() & 255) << 0);
    },
    getLong: function () {
        cc.assert(this._pos + 8 <= this._length, "getLong: IndexOutOfBoundsException");
        var firstByte = this.parseByte();
        if(firstByte < 0)
        {
            cc.log("Min value of getLong should be min of int32: -2147483647");
            return ((firstByte & 255) << 56) +
                ((this.parseByte() & 255) << 48) +
                ((this.parseByte() & 255) << 40) +
                ((this.parseByte() & 255) << 32) +
                ((this.parseByte() & 255) << 24) +
                ((this.parseByte() & 255) << 16) +
                ((this.parseByte() & 255) << 8) +
                ((this.parseByte() & 255) << 0) + 1;
        }else
        {
            return ((firstByte & 255) * 72057594037927940) +
                ((this.parseByte() & 255) * 281474976710656) +
                ((this.parseByte() & 255) * 1099511627776) +
                ((this.parseByte() & 255) * 4294967296) +
                ((this.parseByte() & 255) * 16777216) +
                ((this.parseByte() & 255) * 65536) +
                ((this.parseByte() & 255) * 256) +
                ((this.parseByte() & 255));
        }
    },
    getDouble: function () {
        cc.assert(this._pos + 8 <= this._length, "getDouble: IndexOutOfBoundsException");
        var buffer = new ArrayBuffer(8);
        var int8array = new Int8Array(buffer);

        for(var i=7;i>=0;i--)
        {
            int8array[7-i] = this.parseByte();
        }
        var dataview = new DataView(buffer);

        return dataview.getFloat64(0);
    },
    getCharArray: function () {
        var size = this.getUnsignedShort();
        return this.getBytes(size);
    },
    getString: function () {
        var out = this.getCharArray();
        var uintarray = new Uint8Array(out.length);
        for(var i=0;i<out.length;i++)
        {
            uintarray[i] = parseInt(out[i],10);
        }
        var encode = String.fromCharCode.apply(null,uintarray);
        var decode = decodeURIComponent(escape(encode));

        return decode;
    }
});

fr.platform.OutPacket = cc.Class.extend(
    {
        _className : "OutPacket",
        ctor: function () {
            this._controllerId = 1;
            this._cmdId = 0;
            this.reset();
        },
        setCmdId: function(cmdId)
        {
            this._cmdId = cmdId;
        },
        getCmdId: function()
        {
            return this._cmdId;
        },
        setControllerId: function(controllerId)
        {
            this._controllerId = controllerId;
        },
        initData: function (capacity) {
            this._data = [capacity];
            this._capacity = capacity;
        },
        reset: function () {
            this._pos = 0;
            this._length = 0;
            this._isPackedHeader = false;
        },
        packHeader: function () {
            if (this._isPackedHeader) {
                return;
            }
            this._isPackedHeader = true;

            var header = PacketHeaderAnalyze.genHeader(false, false);
            this.putByte(header);
            this.putUnsignedShort(this._length);
            this.putByte(this._controllerId);
            this.putShort(this._cmdId);
        },

        putByte: function (b) {
            this._data[this._pos++] = b;
            this._length = this._pos;
            return this;
        },

        putByteArray: function (bytes) {
            this.putShort(bytes.length);
            this.putBytes(bytes);
            return this;
        },

        putBytes: function (bytes) {
            for (var i = 0; i < bytes.length; i++) {
                this.putByte(bytes[i]);
            }
            return this;
        },

        putShort: function (v) {
            this.putByte((v >> 8) & 0xFF);
            this.putByte((v >> 0) & 0xFF);
            return this;
        },
        putUnsignedShort: function (v) {
            this.putByte(v >> 8);
            this.putByte(v >> 0);
            return this;
        },
        putInt: function (v) {
            this.putByte((v >> 24) & 0xff);
            this.putByte((v >> 16) & 0xff);
            this.putByte((v >> 8) & 0xff);
            this.putByte((v >> 0) & 0xff);
            return this;
        },
        putLong: function (v) {
            this.putByte(0);
            this.putByte(0);
            this.putByte(0);
            this.putByte(0);
            this.putByte((v >> 24) & 0xff);
            this.putByte((v >> 16) & 0xff);
            this.putByte((v >> 8) & 0xff);
            this.putByte((v >> 0) & 0xff);
            return this;
        },
        putDouble:function(v){
            var buffer = new ArrayBuffer(8);
            var dataView = new DataView(buffer);
            dataView.setFloat64(0,v);
            var arr = new Int8Array(dataView.buffer);
            for(var i=7;i>=0;i--)
            {
                this.putByte(arr[7-i]);
            }
            return this;
        },
        putString: function (str) {
            this.putByteArray(this._stringConvertToByteArray(str));
            return this;
        },
        updateUnsignedShortAtPos: function (v, pos) {
            this._data[pos] = v >> 8;
            this._data[pos + 1] = v >> 0;
        },
        updateSize: function () {
            this.updateUnsignedShortAtPos(this._length - 3, INDEX_SIZE_PACKET);
        },
        getData: function () {
            return this._data.slice(0, this._length);
        },
        _stringConvertToByteArray:function (strData) {
            //fix by Bach
            strData = unescape(encodeURIComponent(strData));
            var arrData = new Uint8Array(strData.length);
            for (var i = 0; i < strData.length; i++) {
                arrData[i] = strData.charCodeAt(i);
            }
            return arrData;
        },
        clean: function(){

        }
    }
);

fr.platform.InPacket64 = fr.platform.InPacket.extend({
    _className : "InPacket64",
    getLong: function () {
        cc.assert(this._pos + 8 <= this._length, "getLong: IndexOutOfBoundsException");
        var buffer = new ArrayBuffer(8);
        var int8array = new Int8Array(buffer);

        for(var i=7;i>=0;i--)
        {
            int8array[7-i] = this.parseByte();
        }
        var dataview = new DataView(buffer);
        return Number(dataview.getBigInt64(0));
    }
});

fr.platform.OutPacket64 = fr.platform.OutPacket.extend({
    _className : "OutPacket64",
    putLong: function (v) {
        var buffer = new ArrayBuffer(8);
        var dataView = new DataView(buffer);
        dataView.setBigInt64(0, BigInt(v));
        var arr = new Int8Array(dataView.buffer);
        for(var i=7;i>=0;i--)
        {
            this.putByte(arr[7-i]);
        }
        return this;
    },
});

/**
 * Reference: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/BigInt/BigInt
 * @returns {boolean|boolean}
 */
fr.platform.isSupportBigInt = function(){
  return cc.sys.browserType !== cc.sys.BROWSER_TYPE_SAFARI
      && cc.sys.browserType !== cc.sys.BROWSER_TYPE_IE;
};

fr.InPacket = fr.platform.isSupportBigInt() ? fr.platform.InPacket64 : fr.platform.InPacket;
fr.OutPacket = fr.platform.isSupportBigInt() ? fr.platform.OutPacket64 : fr.platform.OutPacket;

var BIT_IS_BINARY_INDEX = 7;
var BIT_IS_ENCRYPT_INDEX = 6;
var BIT_IS_COMPRESS_INDEX = 5;
var BIT_IS_BLUE_BOXED_INDEX = 4;
var BIT_IS_BIG_SIZE_INDEX = 3;
var BYTE_PACKET_SIZE_INDEX = 1;
var BIG_HEADER_SIZE = 5;
var NORMAL_HEADER_SIZE = 3;

PacketHeaderAnalyze = {
    getDataSize: function (data) {
        var bigSize = this.isBigSize(data);
        if (bigSize)
            return this.getIntAt(data, BYTE_PACKET_SIZE_INDEX);
        else
            return this.getUnsignedShortAt(data, BYTE_PACKET_SIZE_INDEX);
    },
    getCmdIdFromData: function (data) {
        return this.getShortAt(data, 1);
    },
    isBigSize: function (data) {
        return this.getBit(data[0], BIT_IS_BIG_SIZE_INDEX);
    },
    isCompress: function (data) {
        return this.getBit(data[0], BIT_IS_COMPRESS_INDEX);
    },
    getValidSize: function (data) {
        var bigSize = this.isBigSize(data);
        var dataSize = 0;
        var addSize = 0;
        if (bigSize) {
            if (length < BIG_HEADER_SIZE)
                return -1;
            dataSize = this.getIntAt(data, BYTE_PACKET_SIZE_INDEX);
            addSize = BIG_HEADER_SIZE;
        }
        else {
            if (length < NORMAL_HEADER_SIZE)
                return -1;
            dataSize = this.getUnsignedShortAt(data, BYTE_PACKET_SIZE_INDEX);
            addSize = NORMAL_HEADER_SIZE;
        }
        return dataSize + addSize;
    },
    getBit: function (input, index) {
        var result = input & (1 << index);
        return (result != 0);
    },
    genHeader: function (bigSize, compress) {
        var header = 0;
        //set bit dau la binary hay ko
        header = this.setBit(header, 7, true);
        //bit 2: ko ma hoa
        header = this.setBit(header, 6, false);
        //bit 3: ko nen
        header = this.setBit(header, 5, compress);
        //bit 4: isBlueBoxed?
        header = this.setBit(header, 4, true);
        //bit 5: isBigSize?
        header = this.setBit(header, 3, bigSize);
        return header;
    },
    setBit: function (input, index, hasBit) {
        if (hasBit) {
            input |= 1 << index;
        } else {
            input &= ~(1 << index);
        }
        return input;
    },
    getIntAt: function (data, index) {
        return ((data[index] & 255) << 24) +
            ((data[index + 1] & 255) << 16) +
            ((data[index + 2] & 255) << 8) +
            ((data[index + 3] & 255) << 0);
    },
    getUnsignedShortAt: function (data, index) {
        var a = (data[index] & 255) << 8;
        var b = (data[index + 1] & 255) << 0;
        return a + b;
    },
    getShortAt: function (data, index) {
        return (data[index] << 8) + (data[index + 1] & 255);
    }
};