/***
 * Number is second
 * @returns {string}
 */
Number.prototype.formatAsTime = function () {
    let number = this;
    let oneDay = 24 * 60 * 60;
    let oneHours = 60 * 60;
    let oneMinute = 60;

    let obj = {};
    obj.day = Math.floor(number / oneDay);
    if (obj.day < 10) obj.day = "0" + obj.day;
    obj.hours = Math.floor((number - obj.day * oneDay) / (oneHours));
    if (obj.hours < 10) obj.hours = "0" + obj.hours;
    obj.minute = Math.floor((number - obj.day * oneDay - obj.hours * oneHours) / oneMinute);
    if (parseInt(obj.minute) < 10) {
        obj.minute = "0" + obj.minute;
        cc.log("obj.minute", obj.minute);
    }
    else {
        cc.log("obj.minute > 10 ", obj.minute);
    }
    obj.second = Math.floor((number - obj.day * oneDay - obj.hours * oneHours - obj.minute * oneMinute));
    if (parseInt(obj.second) < 10) {
        obj.second = "0" + obj.second;
        cc.log("obj.second", obj.second);
    }
    else {
        cc.log("obj.second > 10 ", obj.second);
    }

    let str = "";
    if (Number(obj.day) > 0) {
        str = obj.day + 'd' + obj.hours + 'h';
    } else if (Number(obj.hours) > 0)
        str = obj.hours + 'h' + obj.minute + 'm';
    else
        str = obj.minute + ':' + obj.second;
    cc.log("str", str);
    return str;
};

Number.prototype.formatAsTimeTwoElement = function () {
    let number = this;
    let oneDay = 24 * 60 * 60;
    let oneHours = 60 * 60;
    let oneMinute = 60;

    let obj = {};
    obj.day = Math.floor(number / oneDay);
    if (obj.day < 10) obj.day = "0" + obj.day;
    obj.hours = Math.floor((number - obj.day * oneDay) / (oneHours));
    if (obj.hours < 10) obj.hours = "0" + obj.hours;
    obj.minute = Math.floor((number - obj.day * oneDay - obj.hours * oneHours) / oneMinute);
    if (obj.minute < 10) obj.minute = "0" + obj.minute;
    obj.second = Math.floor((number - obj.day * oneDay - obj.hours * oneHours - obj.minute * oneMinute));
    if (obj.second < 10) obj.second = "0" + obj.second;

    let str = "";
    if (Number(obj.day) > 0) {
        str = Number(obj.day) + 'd ' + Number(obj.hours) + 'h';
    } else if (Number(obj.hours) > 0)
        str = Number(obj.hours) + 'h ' + Number(obj.minute) + 'p';
    else
        str = Number(obj.minute) + 'p ' + Number(obj.second) + 's';

    return str;
};

Number.prototype.formatAsTimeOneElement = function () {
    let number = this;
    let oneDay = 24 * 60 * 60;
    let oneHours = 60 * 60;
    let oneMinute = 60;

    let obj = {};
    obj.day = Math.floor(number / oneDay);
    if (obj.day < 10) obj.day = "0" + obj.day;
    obj.hours = Math.floor((number - obj.day * oneDay) / (oneHours));
    if (obj.hours < 10) obj.hours = "0" + obj.hours;
    obj.minute = Math.floor((number - obj.day * oneDay - obj.hours * oneHours) / oneMinute);
    if (obj.minute < 10) obj.minute = "0" + obj.minute;
    obj.second = Math.floor((number - obj.day * oneDay - obj.hours * oneHours - obj.minute * oneMinute));
    if (obj.second < 10) obj.second = "0" + obj.second;

    let str = "";
    if (Number(obj.day) > 0) {
        str = Number(obj.day) + 'd';
    } else if (Number(obj.hours) > 0)
        str = Number(obj.hours) + 'h';
    else if (Number(obj.minute) > 0)
        str = Number(obj.minute) + 'm';
    else
        str = Number(obj.second) + 's';

    return str;
};

Number.prototype.formatAsTimeFromSeconds = function () {
    var day = Math.floor(this / 3600 / 24);
    var hour = Math.floor((this - day * 3600 * 24) / 3600);
    var minute = Math.floor((this - day * 3600 * 24 - hour * 3600) / 60);
    var second = this - day * 3600 * 24 - hour * 3600 - minute * 60;

    var string = "";
    if (day > 0) {
        string += day + ":";
    }
    if (hour > 0) {
        if (hour < 10) {
            string += "0" + hour + ":";
        } else {
            string += hour + ":";
        }

    }
    if (minute > 0) {
        if (minute < 10) {
            string += "0" + minute + ":";
        } else {
            string += minute + ":";
        }

    }
    if (second > 0 || string.length == 0) {
        if (second < 10) {
            string += "0" + second + ":";
        } else {
            string += second + ":";
        }

    }
    string = string.substr(0, string.length - 1);
    return string;
};

Number.prototype.formatAsMoney = function () {
    var string = this.toString();
    var remainingString = string;
    var constructedString = "";
    var newPart = null;
    while (remainingString.length > 3) {
        newPart = remainingString.substr(remainingString.length - 3, 3);
        remainingString = remainingString.substr(0, remainingString.length - 3);
        constructedString = newPart + "." + constructedString;
    }
    constructedString = remainingString + "." + constructedString;
    constructedString = constructedString.substr(0, constructedString.length - 1);
    return constructedString;
    // return this.toLocaleString();
    // var string = new Intl.NumberFormat().format(this);
    // console.log(string);
    // return string;
};

Number.prototype.formatAsTimeSimpleForm = function (showDay, showHour, showMinute, showSecond) {
    let day = Math.floor(this / 3600 / 24);
    let hour = Math.floor((this - day * 3600 * 24) / 3600);
    let minute = Math.floor((this - day * 3600 * 24 - hour * 3600) / 60);
    let second = this - day * 3600 * 24 - hour * 3600 - minute * 60;

    let string = "";
    let count = 0;
    if (day > 0 && showDay) {
        if (day < 10) string += "0";
        string += day + ":";
        count++;
    }
    if (!showDay) hour += day * 24;
    if (hour > 0 || count > 0 && showHour) {
        if (hour < 10) string += "0";
        string += hour + ":";
        count++;
    }
    if (!showHour) minute += hour * 60;
    if (minute > 0 || count > 0 && showMinute) {
        if (minute < 10) string += "0";
        string += minute + ":";
        count++;
    }
    if (!showMinute) second += minute * 60;
    if ((second > 0 || count > 0) && showSecond) {
        if (second < 10) string += "0";
        string += second + ":";
        count++;
    }
    if (string.length > 0)
        string = string.substr(0, string.length - 1);
    else
        string = second > 0 ? "1" : "0";
    if (count <= 1) {
        if (showSecond) string += "s";
        else if (showMinute) string += "m";
        else if (showHour) string += "h";
        else if (showDay) string += "d";
    }
    return string;
};

Number.prototype.formatAsShortForm = function (showDay, showHour, showMinute, showSecond) {
    let day = Math.floor(this / 3600 / 24);
    let hour = Math.floor((this - day * 3600 * 24) / 3600);
    let minute = Math.floor((this - day * 3600 * 24 - hour * 3600) / 60);
    let second = this - day * 3600 * 24 - hour * 3600 - minute * 60;

    let string = "";
    let count = 0;
    if (day > 0 && showDay) {
        string += day + "d";
        count++;
    }
    if (!showDay) hour += day * 24;
    if (showHour && (hour > 0 || count > 0)) {
        string += hour + "h";
        count++;
    }
    if (!showHour) minute += hour * 60;
    if (showMinute && (minute > 0 || count > 0)) {
        string += minute + "m";
        count++;
    }
    if (!showMinute) second += minute * 60;
    if (showSecond && (second > 0 || count > 0)) {
        string += second + "s";
        count++;
    }
    if (string.length == 0) {
        string = second > 0 ? "1" : "0";
        if (showSecond) string += "s";
        else if (showMinute) string += "m";
        else if (showHour) string += "h";
        else if (showDay) string += "d";
    }
    return string;
};

Number.prototype.formatAsTimeFullForm = function (showDay, showHour, showMinute, showSecond) {
    let string = this.formatAsShortForm(showDay, showHour, showMinute, showSecond);
    var day = " " + fr.Localization.text("day") + " ";
    string = string.replace("d", day);
    var hours = " " + fr.Localization.text("hour") + " ";
    var minute = " " + fr.Localization.text("minute") + " ";
    var second = " " + fr.Localization.text("second") + " ";
    string = string.replace("h", hours);
    string = string.replace("m", minute);
    string = string.replace("s", second);
    string = string.substr(0, string.length - 1);
    return string;
}