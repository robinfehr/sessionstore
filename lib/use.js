var prequire = require('parent-require');

module.exports = function (toRequire) {
  var required;
  try {
    required = require(toRequire);
  } catch (e) {
    // workaround when `npm link`'ed for development
    required = prequire(toRequire);
  }
  return required;
};
