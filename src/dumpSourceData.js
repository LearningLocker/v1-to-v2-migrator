const Promise = require('bluebird');
const exec = require('./exec');
const config = require('./config');
const createCLIOption = require('./createCLIOption');
const createCLIFlag = require('./createCLIFlag');
const logStep = require('./logStep');

const sourceDb = config.source.database;

const dumpCollection = (collection, query = '{}') => {
  const user = createCLIOption('-u', sourceDb.user);
  const password = createCLIOption('-p', sourceDb.password);
  const authDb = createCLIOption('--authenticationDatabase', sourceDb.authenticationDatabase);
  const ssl = createCLIFlag('--ssl', sourceDb.ssl);
  return exec(`mongodump ${ssl} --host ${sourceDb.hosts} --db ${sourceDb.name} ${user} ${password} ${authDb} --collection ${collection} --query '${query}' --gzip --out ${config.local.sourceDumpLocation}`);
};

module.exports = () => {
  logStep('Dumping source data');
  const timestampFilter = config.timestamp ? `, stored: {$gte: "${config.timestamp}"}` : '';
  const statementFilter = `{lrs_id: ObjectId("${config.source.lrsId}")${timestampFilter}}`
  return Promise.all([
    dumpCollection('statements', statementFilter),
    dumpCollection('client'),
    dumpCollection('lrs'),
  ]);
};
