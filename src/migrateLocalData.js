const Promise = require('bluebird');
const mongodb = require('mongodb');
const config = require('./config');
const logStep = require('./logStep');
const highland = require('highland');
const _ = require('lodash');
const objectHash = require('object-hash');
const migrateDocumentStorage = require('./migrateDocumentStorage');
const connect = require('./localConnect');

const getActivitiesFromStatement = require('@learninglocker/xapi-statements/dist/service/storeStatements/queriables/getActivitiesFromStatement');
const getAgentsFromStatement = require('@learninglocker/xapi-statements/dist/service/storeStatements/queriables/getAgentsFromStatement');
const getRegistrationsFromStatement = require('@learninglocker/xapi-statements/dist/service/storeStatements/queriables/getRegistrationsFromStatement');
const getVerbsFromStatement = require('@learninglocker/xapi-statements/dist/service/storeStatements/queriables/getVerbsFromStatement');

const TARGET_VERSION = 2.1;

const updateOrg = collection =>
  connect(`updating orgs for ${collection}`, db =>
    db.collection(collection).update(
      {},
      { $set: { organisation: mongodb.ObjectId(config.target.orgId) } },
      { multi: true }
    )
  );

const migrateOrgs = () =>
  Promise.all([
    updateOrg('lrs'),
    updateOrg('client'),
    updateOrg('statements'),
  ]);

const migrateStatementsClient = client =>
  connect(`migrating statements client for ${client._id}`, db =>
    db.collection('statements').update(
      { client_id: client._id.toString() },
      { $set: { client: client._id } },
      { multi: true }
    )
  );

const updateClient = (client, update) =>
  connect(`updating client ${client._id}`, db =>
    db.collection('client').update({ _id: client._id }, update)
  );

const migrateScopes = (client) => {
  if (client.scopes.indexOf('all/read') !== -1) {
    return updateClient(client, { $push: { scopes: 'xapi/read' } }).then(() =>
      updateClient(client, { $pull: { scopes: 'all/read' } })
    );
  }
  return Promise.resolve();
};

const migrateAuthority = client => {
  const wasNamed = (
    !client.title ||
    client.title.length === 0 ||
    client.title === 'New Client'
  );
  const title = wasNamed ? `V1 Client - ${client.created_at}` : client.title;

  return updateClient(client, {
    $set: {
      title,
      authority: (
        client.authority.constructor === Object ?
          JSON.stringify(client.authority) :
          client.authority
      ),
    }
  })
};

const getClients = () =>
  connect('getting clients', db =>
    db.collection('client').find().toArray().then((clients) => {
      db.close();
      return clients;
    })
  );

const defaultAuthority = {
  mbox: 'mailto:hello@learninglocker.net',
  name: 'New Client',
  objectType: 'Agent',
};

const getAuthorityUpdate = (doc) => {
  if (!_.has(doc, ['statement', 'authority'])) {
    doc.statement.authority = defaultAuthority;
    return { 'statement.authority': defaultAuthority };
  }
  return {};
}

const getContextUpdate = (doc) => {
  const update = {};
  if (_.has(doc, ['statement', 'context', 'contextActivities'])) {
    _.forIn(doc.statement.context.contextActivities, (value, key) => {
      switch (key) {
        default:
          break;
        case 'grouping':
        case 'parent':
        case 'category':
        case 'other':
          if (!Array.isArray(value)) {
            _.set(doc, `statement.context.contextActivities.${key}`, [value]);
            update[`statement.context.contextActivities.${key}`] = [value];
          }
      }
    });
  }
  return update;
};

const getQueriables = (doc) => {
  const statement = doc.statement;
  const refs = doc.refs ? doc.refs : [];

  const statements = [statement, ...refs];
  return {
    activities: _.union(...statements.map(getActivitiesFromStatement.getActivitiesFromStatement)),
    agents: _.union(...statements.map(getAgentsFromStatement.getAgentsFromStatement)),
    registrations: _.union(...statements.map(getRegistrationsFromStatement.getRegistrationsFromStatement)),
    relatedActivities: _.union(...statements.map(getActivitiesFromStatement.getRelatedActivitiesFromStatement)),
    relatedAgents: _.union(...statements.map(getAgentsFromStatement.getRelatedAgentsFromStatement)),
    verbs: _.union(...statements.map(getVerbsFromStatement.getVerbsFromStatement)),
  };
}

const hashStatement = (doc) => {
  const hashingStatement = {
    actor: doc.statement.actor,
    id: doc.statement.id,
    object: doc.statement.object,
    verb: doc.statement.verb,
  };

  if (doc.statement.context !== undefined) {
    hashingStatement.context = doc.statement.context;
  }
  if (doc.statement.result !== undefined) {
    hashingStatement.result = doc.statement.result;
  }
  if (doc.statement.attachments !== undefined) {
    hashingStatement.attachments = doc.statement.attachments;
  }
  if (doc.statement.timestamp !== doc.statement.stored) {
    hashingStatement.timestamp = doc.statement.timestamp;
  }

  return objectHash(hashingStatement);
};

const migrateStatementDocumentUpdate = (doc) => {
  const authorityUpdate = getAuthorityUpdate(doc);
  const contextUpdate = getContextUpdate(doc);
  const queriables = getQueriables(doc);
  const hash = hashStatement(doc);

  return {
    $addToSet: {
      activities: { $each: queriables.activities },
      agents: { $each: queriables.agents },
      registrations: { $each: queriables.registrations },
      relatedActivities: { $each: queriables.relatedActivities },
      relatedAgents: { $each: queriables.relatedAgents },
      verbs: { $each: queriables.verbs },
    },
    $set: {
      hash,
      rev: constants.TARGET_VERSION,
      ...contextUpdate,
      ...authorityUpdate,
    },
  };
};

const migrateStatementDocument = (unorderedBulkOp, doc) => {
  const update = migrateStatementDocumentUpdate(doc);
  unorderedBulkOp.find({ _id: doc._id }).updateOne(update);
}

const migrateStatements = () => {
  const batchSize = 10000;

  return connect('Adding object hash to statements', db => {
    const documentStream = highland(db.collection('statements').find({ hash: { $exists: false } }));

    const handleDoc = Promise.promisify(migrateStatementDocument);

    const handler = documentStream.batch(batchSize).flatMap((documents) => {
      logStep(`Starting new batch of ${batchSize}`);
      const unorderedBulkOp = db.collection('statements').initializeUnorderedBulkOp();
      documents.forEach((doc) => {
        return migrateStatementDocument(unorderedBulkOp, doc);
      });

      return highland(unorderedBulkOp.execute());
    });

    return new Promise((resolve, reject) => {
      handler.on('error', reject);
      handler.apply(() => {
        logStep('Finished migrating statement hashes');
        resolve();
      });
    });
  });
}

module.exports = () => {
  logStep('Migrating local data', true);
  return getClients().then((clients) => {
    const orgMigrations = migrateOrgs();
    const clientMigrations = clients.map(client =>
      Promise.all([
        migrateStatementsClient(client),
        migrateScopes(client),
        migrateAuthority(client),
      ])
    );

    const statementsMigration = migrateStatements();

    return Promise.all([
      orgMigrations,
      clientMigrations,
      statementsMigration,
    ]);
  });
};
