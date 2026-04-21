Number.prototype.setMaxValue = function (maxValue) {
    return Math.min(this, maxValue);
}

Number.prototype.setMinValue = function (minValue) {
    return Math.max(this, minValue);
}

Number.prototype.setRange = function (minValue, maxValue) {
    return Math.max(minValue, Math.min(maxValue, this));
}