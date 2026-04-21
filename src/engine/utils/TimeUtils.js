
var TimeUtils = function () {}

TimeUtils.getCurrentTime = function () {
    return new Date().getTime();
}

TimeUtils.getCurrentHMS = function () {
    let today = new Date();
    let hh = today.getHours().toString();
    let mm = today.getMinutes().toString();
    let ss = today.getSeconds().toString();
    return StringUtil.formatNumber00(hh) + ':' + StringUtil.formatNumber00(mm) + ':' + StringUtil.formatNumber00(ss);
}

TimeUtils.getCurrentDMY = function () {
    let today = new Date();
    let dd = today.getDate().toString();
    let mm = (today.getMonth() + 1).toString();
    let yyyy = today.getFullYear().toString();
    return StringUtil.formatNumber00(dd) + '-' + StringUtil.formatNumber00(mm) + '-' + yyyy;
}

TimeUtils.getCurrentDMYHMS = function () {
    return TimeUtils.getCurrentDMY() + " " + TimeUtils.getCurrentHMS();
}

TimeUtils.stringifyMSToHH_MM_SS = function ( ms ) {
    // 1- Convert into seconds:
    let seconds = Math.ceil(ms / 1000);
    // 2- Extract hours:
    const hours = Math.floor( seconds / 3600 ); // 3,600 seconds in 1 hour
    seconds = seconds % 3600; // seconds remaining after extracting hours
    // 3- Extract minutes:
    const minutes = Math.floor( seconds / 60 ); // 60 seconds in 1 minute
    // 4- Keep only seconds not extracted to minutes:
    seconds = seconds % 60;
    return (hours >= 10 ? hours : ('0' + hours)) + ":" + (minutes >= 10 ? minutes : ('0' + minutes)) + ":" + (seconds >= 10 ? seconds : ('0' + seconds));
}

TimeUtils.stringifyMSToHH_MM = function ( ms ) {
    // 1- Convert to seconds:
    let seconds = Math.round(ms / 1000);
    // 2- Extract hours:
    const hours = parseInt( seconds / 3600 ); // 3,600 seconds in 1 hour
    seconds = seconds % 3600; // seconds remaining after extracting hours
    // 3- Extract minutes:
    const minutes = parseInt( seconds / 60 ); // 60 seconds in 1 minute
    // 4- Keep only seconds not extracted to minutes:
    seconds = seconds % 60;
    return ( hours+":"+minutes);
}