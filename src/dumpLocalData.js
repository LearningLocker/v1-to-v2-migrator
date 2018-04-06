const exec = require('./exec');
const config = require('./config');
const logStep = require('./logStep');
const createCLIFlag = require('./createCLIFlag');

const localDb = config.local;
const compression = createCLIFlag('--gzip', localDb.compression);

module.exports = () => {
  logStep('Dumping local data', true);
  return exec(`mongodump --db ${localDb.database} ${compression} --out ${localDb.targetDumpLocation}`);
};
