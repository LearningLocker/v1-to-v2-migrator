const mongodb = require('mongodb');
const config = require('./config');
const logStep = require('./logStep');
const mongoUrl = `mongodb://localhost:27017/${config.local.database}`;
module.exports = (log, fn) =>
  mongodb.MongoClient.connect(mongoUrl, {
    socketOptions: {
      connectTimeoutMS: Number(config.local.connectTimeoutMS || 300000),
      socketTimeoutMS: Number(config.local.socketTimeoutMS || 300000),
    },
  }).then((db) => {
    logStep(`Started ${log}`);
    const result = fn(db);
    result.then(() => {
      db.close();
      logStep(`Finished ${log}`);
    });
    return result;
  });
