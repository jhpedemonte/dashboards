// Adapted from [code](http://stackoverflow.com/a/10402443) written by
// [Richard Astbury](http://stackoverflow.com/users/349014), based on general algorithm by
// [pimvdb](http://stackoverflow.com/users/514749).
// Licensed under [cc by-sa 3.0](http://creativecommons.org/licenses/by-sa/3.0/)

function encodeWebSocket(data) {
    var masks = data.masks;
    var bytesRaw = data.payload;
    var bytesFormatted = [];
    bytesFormatted[0] = 129;
    if (bytesRaw.length <= 125) {
        bytesFormatted[1] = bytesRaw.length;
    } else if (bytesRaw.length >= 126 && bytesRaw.length <= 65535) {
        bytesFormatted[1] = 126;
        bytesFormatted[2] = ( bytesRaw.length / Math.pow(2, 8) ) & 255;
        bytesFormatted[3] = ( bytesRaw.length                  ) & 255;
    } else {
        bytesFormatted[1] = 127;
        bytesFormatted[2] = ( bytesRaw.length / Math.pow(2, 56) ) & 255;
        bytesFormatted[3] = ( bytesRaw.length / Math.pow(2, 48) ) & 255;
        bytesFormatted[4] = ( bytesRaw.length / Math.pow(2, 40) ) & 255;
        bytesFormatted[5] = ( bytesRaw.length / Math.pow(2, 32) ) & 255;
        bytesFormatted[6] = ( bytesRaw.length / Math.pow(2, 24) ) & 255;
        bytesFormatted[7] = ( bytesRaw.length / Math.pow(2, 16) ) & 255;
        bytesFormatted[8] = ( bytesRaw.length / Math.pow(2,  8) ) & 255;
        bytesFormatted[9] = ( bytesRaw.length                   ) & 255;
    }
    if (masks) {
        bytesFormatted[1] += 128; // set that it is masked
        for (var j = 0, lenj = masks.length; j < lenj; j++) {
            bytesFormatted.push(masks[j]);
        }
    }
    var code;
    for (var i = 0, len = bytesRaw.length; i < len; i++) {
        code = bytesRaw.charCodeAt(i);
        if (masks) {
            code = code ^ data.masks[i % 4];
        }
        bytesFormatted.push(code);
    }
    return new Buffer(bytesFormatted);
}

function decodeWebSocket(data) {
    if (data[0] !== 129) {
        // non-text data
        return null;
    }
    var datalength = data[1] & 127;
    var isMasked = !!(data[1] & 128);
    var indexFirstMask = 2;
    if (datalength == 126) {
        indexFirstMask = 4;
        // calculate real length
        datalength = (data[2] * Math.pow(2, 8)) +
                      data[3];
    } else if (datalength == 127) {
        indexFirstMask = 10;
        // calculate real length
        datalength = (data[2] * Math.pow(2, 56)) +
                     (data[3] * Math.pow(2, 48)) +
                     (data[4] * Math.pow(2, 40)) +
                     (data[5] * Math.pow(2, 32)) +
                     (data[6] * Math.pow(2, 24)) +
                     (data[7] * Math.pow(2, 16)) +
                     (data[8] * Math.pow(2,  8)) +
                      data[9];
    }
    var i = 4;
    var masks;
    if (isMasked) {
        masks = data.slice(indexFirstMask, indexFirstMask + 4);
        i += indexFirstMask;
    }
    var end = datalength + i;
    var index = 0;
    var output = '';
    var code;
    while (i < end) {
        code = isMasked ?
                data[i++] ^ masks[index++ % 4] :
                data[i++];
        output += String.fromCharCode(code);
    }
    return {
        masks: isMasked ? masks : null,
        payload: output
    };
}

module.exports = {
    encodeWebSocket: encodeWebSocket,
    decodeWebSocket: decodeWebSocket
};
