/**
 * Export util functions
 */

const DEG2RAD = Math.PI / 180;
const EARTH_RADIUS = 6378137;
const WM_R = EARTH_RADIUS * Math.PI; // Webmercator *radius*: half length Earth's circumference
const WM_2R = WM_R * 2; // Webmercator coordinate range (Earth's circumference)

function projectToWebMercator(latLng) {
    let lat = latLng.lat * DEG2RAD;
    let lng = latLng.lng * DEG2RAD;
    let x = lng * EARTH_RADIUS;
    let y = Math.log(Math.tan(lat / 2 + Math.PI / 4)) * EARTH_RADIUS;
    return { x, y };
}

function isUndefined(value) {
    return value === undefined;
}

function isString(value) {
    return typeof value == 'string';
}

function isNumber(value) {
    return typeof value == 'number';
}

function isObject(value) {
    const type = typeof value;
    return value != null && (type == 'object' || type == 'function');
}

export {
    WM_R,
    WM_2R,
    projectToWebMercator,
    isUndefined,
    isString,
    isNumber,
    isObject
};
