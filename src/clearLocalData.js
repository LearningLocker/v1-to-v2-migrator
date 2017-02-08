const fs = require('fs-extra');
const mongodb = require('mongodb');
const config = require('./config');
const logStep = require('./logStep');

const rmdir = (dir) =>
  new Promise((resolve, reject) =>
    fs.remove(dir, (err) => {
      if (err) return reject(err);
      console.log(`Deleted ${dir} directory`);
      return resolve();
    })
  );

const dropDatabase = () =>
  new Promise((resolve, reject) => {
    const mongoUrl = `mongodb://localhost:27017/${config.local.database}`;
    mongodb.MongoClient.connect(mongoUrl, (err, db) => {
      if (err) return reject(err);
      resolve(db.dropDatabase().then(() => {
        console.log(`Dropped ${config.local.database} database`);
        db.close();
      }));
    });
  })

module.exports = () => {
  logStep('Clearing local data');
  return Promise.all([
    rmdir(config.local.sourceDumpLocation),
    rmdir(config.local.targetDumpLocation),
    dropDatabase(),
  ]);
};
