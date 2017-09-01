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
  const timestampFilter = config.timestamp ? `, stored: {$gte: new Date("${config.timestamp}")}` : '';
  const createdAtFilter = config.timestamp ? `, created_at: {$gte: new Date("${config.timestamp}")}` : '';

  const statementFilter = `{active: true, lrs_id: ObjectId("${config.source.lrsId}")${timestampFilter}}`
  const documentFilter = `{lrs_id: ObjectId("${config.source.lrsId}")${createdAtFilter}}`;
  const clientFilter = `{lrs_id: ObjectId("${config.source.lrsId}")}`;
  const lrsFilter = `{_id: ObjectId("${config.source.lrsId}")}`;

  return Promise.all([
    dumpCollection('statements', statementFilter),
    dumpCollection('documentapi', documentFilter),
    dumpCollection('client', clientFilter),
    dumpCollection('lrs', lrsFilter),
  ]);
};
