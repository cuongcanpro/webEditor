/**
 * Created by KienVN on 11/10/2015.
 * Modified by AnhVTT on 6/15/2021
 */

fr.Random = cc.Class.extend({
    ctor:function(seed, countOfRandom)
    {
        this.m = new MersenneTwister(seed);
        this.countOfRandom = 0;
        if(countOfRandom)
        {
            for(var i = 0; i < countOfRandom; i++)
            {
                this.random();
            }
        }
    },
    /*
        return a random number between (0 inclusive) and 1 (exclusive)
     */
    random:function()
    {
        this.countOfRandom++;
        return this.m.random();
    },
    randomBool:function()
    {
        return this.random() > 0.5;
    },
    /*
        return a random integer between min (included) and max (excluded)
     */
    randomInt:function(min, max)
    {
        if(max != undefined) {
            return Math.floor(this.random() * (max - min)) + min;
        }
        else{
            return Math.floor(this.random() * (min));
        }
    },
    /*
        return a random integer between min(included) and max(included)
     */
    randomIntInclusive:function(min, max)
    {
        if(max != undefined) {
            return Math.floor(this.random() * (max - min + 1)) + min;
        }
        else{
            return Math.floor(this.random() * (min + 1));
        }
    },
    checkSuccess100:function(p) {

        if ( p < 0 ) {
            p = 0;
        }
        var x = this.randomInt(100);
        if ( x < p ) {
            return true;
        }
        return false;
    }
});

/*
    return a random integer between min(included) and max(included)
 */
fr.generateRandomInt = function (min, max) {
    if ( max == undefined && min == undefined){
        return null;
    }
    else if( typeof max != "undefined") {
        return Math.floor(Math.random() * (max - min)) + min;
    }
    else{
        return Math.floor(Math.random() * (min));
    }
};

fr.generateRandomElement = function (array) {
    if (array.length == 0) return null;
    return array[fr.generateRandomInt(0, array.length)];
}

/**
 *
 * @param min: min of random (include)
 * @param max: max of random (exclude)
 * @param intDiff: random must be different with this param
 * @returns {int} rand: a random number.
 */

fr.generateRandomIntWithDiff = function (min, max, intDiff ) {
    var rand = fr.generateRandomInt(min, max);
    while ( rand == intDiff  ){
        rand = fr.generateRandomInt(min, max);
    }
    return rand;
};

var UInt48 = cc.Class.extend({
    ctor: function (n) {
        if (n instanceof UInt48) {
            this.w0 = n.w0;
            this.w1 = n.w1;
            this.w2 = n.w2;
        } else if (typeof n === 'number') {
            this.w0 = n & 0xffff;
            n /= 0x10000;
            this.w1 = n & 0xffff;
            n /= 0x10000;
            this.w2 = n & 0xffff;
        }
    },

    norm: function () {
        if (this.w0 >= 0x10000) {
            let carry = Math.floor(this.w0 / 0x10000);
            this.w1 += carry;
            this.w0 &= 0xffff;
        }
        if (this.w1 >= 0x10000) {
            let carry = Math.floor(this.w1 / 0x10000);
            this.w2 += carry;
            this.w1 &= 0xffff;
        }
        this.w2 &= 0xffff;

        return this;
    },

    add: function (n) {
        let tmp = new UInt48(this);

        tmp.w0 += n.w0;
        tmp.w1 += n.w1;
        tmp.w2 += n.w2;

        return tmp.norm();
    },

    xor: function (n) {
        let tmp = new UInt48(this);

        tmp.w2 ^= n.w2;
        tmp.w1 ^= n.w1;
        tmp.w0 ^= n.w0;

        return tmp;
    },

    mul: function (n) {
        let tmp1 = new UInt48(n);
        tmp1.w2 = tmp1.w2 * this.w0;
        tmp1.w1 = tmp1.w1 * this.w0;
        tmp1.w0 = tmp1.w0 * this.w0;
        tmp1.norm();

        let tmp2 = new UInt48(n);
        tmp2.w2 = tmp2.w1 * this.w1;
        tmp2.w1 = tmp2.w0 * this.w1;
        tmp2.w0 = 0;
        tmp2.norm();

        let tmp3 = new UInt48(n);
        tmp3.w2 = tmp3.w0 * this.w2;
        tmp3.w1 = 0;
        tmp3.w0 = 0;
        tmp3.norm();

        return tmp3.add(tmp2).add(tmp1);
    },

    valueOf: function () {
        return 0x10000 * (0x10000 * this.w2 + this.w1) + this.w0;
    }
});

fr.JavaRandom = cc.Class.extend({
    MAX_INT: 2147483647,

    ctor: function (seed) {
        this.mul = new UInt48(0x5deece66d);
        this.add = new UInt48(0xb);

        if (seed === undefined) {
            seed = Math.floor(Math.random() * 0x1000000000000);
        }
        this.setSeed(seed);

    },

    setSeed: function (seed) {
        cc.log("setSeed", seed);
        this.seed = new UInt48(seed).xor(this.mul);
        cc.log("setSeed", this.seed);
    },

    next: function (bits) {
        this.seed = this.seed.mul(this.mul).add(this.add);
        return (this.seed / 0x10000) >> (32 - bits);
    },

    nextInt: function () {
        return this.next(32);
    },

    randomBool: function () {
        return this.nextInt() % 2 == 0;
    },

    randomInt: function (min, max) {
        // cc.log("randomInt", this.seed);
        var nextInt = this.nextInt();

        // cc.log("--randomInt", this.seed);

        var random = Math.abs(nextInt/this.MAX_INT);
        if (this.MAX_INT == nextInt) return max;
        return Math.floor(random * (max - min + 1)) + min;
    },

    saveSeed: function () {
        fr.UserData.setNumberWithCrypt(KeyStorage.RANDOM_SEED + userInfo.uId, this.seed.valueOf());
    }
});

// Init random with random seed
fr.initRandomSeed = function (uId) {
    var seed = fr.UserData.getNumberWithCrypt(KeyStorage.RANDOM_SEED + uId, null);
    if (seed == null)
        seed = fr.getSeedFromUId(uId);
    fr.seedRandom = new fr.JavaRandom(seed);
};

fr.deleteRandomSeedByUId = function (userId) {
    fr.UserData.removeDataWithKeyByUId(userId, KeyStorage.RANDOM_SEED);
};

fr.setRandomSeed = function (seed) {
    fr.UserData.setNumberWithCrypt(KeyStorage.RANDOM_SEED + userInfo.uId.toString(), seed);
    fr.seedRandom.setSeed((new UInt48(Number(seed))).xor(new UInt48(0x5deece66d)));
};

fr.getSeedFromUId = function (uId) {
    uId = uId.toString();
    var seed = 0;
    for (var i in uId) {
        seed += uId.charCodeAt(i);
    }

    fr.UserData.setNumberWithCryptByUId(uId, KeyStorage.RANDOM_SEED, seed);
    return seed;
}