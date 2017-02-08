const exec = require('./exec');
const config = require('./config');
const createCLIOption = require('./createCLIOption');
const createCLIFlag = require('./createCLIFlag');
const logStep = require('./logStep');

const targetDb = config.target.database;

module.exports = () => {
  logStep('Restoring target data');
  const user = createCLIOption('-u', targetDb.user);
  const password = createCLIOption('-p', targetDb.password);
  const authDb = createCLIOption('--authenticationDatabase', targetDb.authenticationDatabase);
  const ssl = createCLIFlag('--ssl', targetDb.ssl);
  return exec(`mongorestore ${ssl} --db=${targetDb.name} --host ${targetDb.hosts} ${authDb} ${user} ${password} --noIndexRestore --gzip ${config.local.targetDumpLocation}/${config.local.database}`);
};
