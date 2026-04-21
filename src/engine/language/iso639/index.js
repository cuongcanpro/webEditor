const LANGUAGES = {};
const LANGUAGES_BY_NAME = {};
const LANGUAGE_CODES = [];
const LANGUAGE_NAMES = [];
const LANGUAGE_NATIVE_NAMES = [];

for (let code in LANGUAGES_LIST) {
  const { name, nativeName } = LANGUAGES_LIST[code];
  LANGUAGES[code] =
    LANGUAGES_BY_NAME[name.toLowerCase()] =
    LANGUAGES_BY_NAME[nativeName.toLowerCase()] =
      { code, name, nativeName };
  LANGUAGE_CODES.push(code);
  LANGUAGE_NAMES.push(name);
  LANGUAGE_NATIVE_NAMES.push(nativeName);
}

let ISO6391 = {};

ISO6391.getLanguages = function (codes = []) {
  return codes.map(code =>
      ISO6391.validate(code)
          ? Object.assign({}, LANGUAGES[code])
          : { code, name: '', nativeName: '' }
  );
}

ISO6391.getName = function (code) {
  return ISO6391.validate(code) ? LANGUAGES_LIST[code].name : '';
}

ISO6391.getAllNames = function () {
  return LANGUAGE_NAMES.slice();
}

ISO6391.getNativeName = function (code) {
  return ISO6391.validate(code) ? LANGUAGES_LIST[code].nativeName : '';
}

ISO6391.getAllNativeNames = function () {
  return LANGUAGE_NATIVE_NAMES.slice();
}

ISO6391.getCode = function (name) {
  name = name.toLowerCase();
  return LANGUAGES_BY_NAME.hasOwnProperty(name)
      ? LANGUAGES_BY_NAME[name].code
      : '';
}

ISO6391.getAllCodes = function () {
  return LANGUAGE_CODES.slice();
}

ISO6391.validate = function (code) {
  return LANGUAGES_LIST.hasOwnProperty(code);
}
