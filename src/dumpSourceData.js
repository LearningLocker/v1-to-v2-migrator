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
  return exec(
    `mongodump ${ssl} --host ${sourceDb.hosts} --db ${sourceDb.name} ${user} ${password} ${authDb} --collection ${collection} --query '${query}' ${sourceDb.commpression} --out ${config.local.sourceDumpLocation}`
  ).catch((err) => {
    console.error(`ERROR DUMPING SOURCE ${collection}. This collection may not exist`, err);
  });
};

const createQueryFilter = (filters) => {
  return `{${filters.join(', ')}}`;
};

module.exports = () => {
  logStep('Dumping source data', true);
  const timestampFilter = config.timestamp ? [`stored: {$gte: new Date("${config.timestamp}")}`] : [];
  const createdAtFilter = config.timestamp ? [`created_at: {$gte: new Date("${config.timestamp}")}`] : [];
  const lrsIDFilter = config.source.lrsId ? [`lrs_id: ObjectId("${config.source.lrsId}")`] : [];
  const lrsFilter = config.source.lrsId ? [`_id: ObjectId("${config.source.lrsId}")`] : [];

  const statementFilter = createQueryFilter(['active: true'].concat(lrsIDFilter, timestampFilter));
  const documentFilter = createQueryFilter(lrsIDFilter.concat(createdAtFilter));
  const clientFilter = createQueryFilter(lrsIDFilter);
  const storeFilter = createQueryFilter(lrsFilter);

  return Promise.all([
    dumpCollection('statements', statementFilter),
    dumpCollection('documentapi', documentFilter),
    dumpCollection('client', clientFilter),
    dumpCollection('lrs', storeFilter),
  ]);
};
