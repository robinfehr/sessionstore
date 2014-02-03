function getSpecificStore(options) {
    options = options || { type: 'inMemory' };

    if (options.type === 'inMemory') {
        return require('express').session.MemoryStore;
    } else {

        options.type = options.type.toLowerCase();
        
        var dbPath = __dirname + "/databases/" + options.type + ".js";

        var exists = require('fs').existsSync || require('path').existsSync;
        if (exists(dbPath)) {
            try {
                var db = require(dbPath);
                return db;
            } catch (err) {
                if (err.message.indexOf("Cannot find module") >= 0 && err.message.indexOf("'") > 0 && err.message.lastIndexOf("'") !== err.message.indexOf("'")) {
                    var moduleName = err.message.substring(err.message.indexOf("'") + 1, err.message.lastIndexOf("'"));
                    console.log('Please install "' + moduleName + '" to work with db implementation "' + options.type + '"!');
                }

                throw err;
            }
        } else {
            return require('express').session.MemoryStore;
        }
    }
}

module.exports = {
    createSessionStore: function(options) {
        var Store = getSpecificStore(options);
        return new Store(options);
    }
};