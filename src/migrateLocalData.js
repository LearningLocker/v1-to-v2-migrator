const Promise = require('bluebird');
const mongodb = require('mongodb');
const config = require('./config');
const logStep = require('./logStep');
const highland = require('highland');
const _ = require('lodash');
const objectHash = require('object-hash');
const migrateDocumentStorage = require('./migrateDocumentStorage');
const connect = require('./localConnect');


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

const migrateStatementDocument = (unorderedBulkOp, doc) => {
  const stored = doc.statement.stored;
  const timestamp = doc.statement.timestamp;

  const hashingStatement = {
    id: doc.statement.id,
    actor: doc.statement.actor,
    verb: doc.statement.verb,
    object: doc.statement.object,
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

  const hash = objectHash.sha1(hashingStatement);
  unorderedBulkOp.find({ _id: doc._id }).updateOne({ $set: { hash } });
}

const migrateStatements = () => {
  const batchSize = 10000;

  connect('Adding object hash to statements', db => {
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
