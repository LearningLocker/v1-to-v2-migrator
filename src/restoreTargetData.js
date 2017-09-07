const exec = require('./exec');
const config = require('./config');
const createCLIOption = require('./createCLIOption');
const createCLIFlag = require('./createCLIFlag');
const logStep = require('./logStep');

const targetDb = config.target.database;

module.exports = () => {
  logStep('Restoring target data', true);
  const user = createCLIOption('-u', targetDb.user);
  const password = createCLIOption('-p', targetDb.password);
  const authDb = createCLIOption('--authenticationDatabase', targetDb.authenticationDatabase);
  const ssl = createCLIFlag('--ssl', targetDb.ssl);
  const quiet = createCLIFlag('--quiet', targetDb.quiet);
  return exec(`mongorestore ${ssl} --db=${targetDb.name} --host ${targetDb.hosts} ${authDb} ${user} ${password} ${quiet} --noIndexRestore --gzip ${config.local.targetDumpLocation}/${config.local.database}`);
};
