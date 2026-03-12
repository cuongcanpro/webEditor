/**
 * Created by TienNT on 12/24/2017.
 */

fr.isElementInArray = function(arr, element) {
    for (var i in arr) {
        if (element == arr[i])
         return true;
    }
    return false;
};