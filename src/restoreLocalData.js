const exec = require('./exec');
const config = require('./config');
const logStep = require('./logStep');
const createCLIFlag = require('./createCLIFlag');

const sourceDb = config.source.database;
const compression = createCLIFlag('--gzip', sourceDb.compression);

module.exports = () => {
  logStep('Restoring local data', true);
  return exec(`mongorestore --db ${config.local.database} ${compression} --noIndexRestore ${config.local.sourceDumpLocation}/${sourceDb.name}`);
};
