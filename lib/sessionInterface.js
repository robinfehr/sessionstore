var sessionInterface,
    expressPkg;

try {
  expressPkg = require('express/package.json');
} catch (err) {
  throw new Error('No express found.');
}

var version = parseInt(expressPkg.version.split('.')[0], 10);

if (version < 4) {
  sessionInterface = require('express').session;
} else if (version === 4) {
  try {
    require('express-session/package.json');
  } catch (err) {
    throw new Error('No express-session found.');
  }

  sessionInterface = require('express-session');
} else {
  throw new Error('Express version number is higher than 4');
}

module.exports = sessionInterface;
