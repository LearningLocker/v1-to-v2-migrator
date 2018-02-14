const exec = require('./exec');
const config = require('./config');
const logStep = require('./logStep');

module.exports = () => {
  logStep('Dumping local data', true);
  return exec(`mongodump --db ${config.local.database} ${config.local.compression} --out ${config.local.targetDumpLocation}`);
};
