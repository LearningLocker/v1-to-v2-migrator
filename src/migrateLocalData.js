const Promise = require('bluebird');
const mongodb = require('mongodb');
const config = require('./config');
const logStep = require('./logStep');

const mongoUrl = `mongodb://localhost:27017/${config.local.database}`;
const connect = (log, fn) =>
  mongodb.MongoClient.connect(mongoUrl, {
    socketOptions: {
      connectTimeoutMS: Number(config.local.connectTimeoutMS || 30000),
      socketTimeoutMS: Number(config.local.socketTimeoutMS || 30000),
    },
  }).then((db) => {
    console.log(`Started ${log}`);
    const result = fn(db);
    result.then(() => {
      db.close();
      console.log(`Finished ${log}`);
    });
    return result;
  });

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

const migrateAuthority = client =>
  updateClient(client, {
    $set: {
      title: `V1 Client - ${client.created_at}`,
      authority: (
        client.authority.constructor === Object ?
        JSON.stringify(client.authority) :
        client.authority
      ),
    }
  });

const getClients = () =>
  connect('getting clients', db =>
    db.collection('client').find().toArray().then((clients) => {
      db.close();
      return clients;
    })
  );

module.exports = () => {
  logStep('Migrating local data');
  return getClients().then((clients) => {
    const orgMigrations = migrateOrgs();
    const clientMigrations = clients.map(client =>
      Promise.all([
        migrateStatementsClient(client),
        migrateScopes(client),
        migrateAuthority(client),
      ])
    );

    return Promise.all([
      orgMigrations,
      clientMigrations,
    ]);
  });
};
