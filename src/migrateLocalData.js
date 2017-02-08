const Promise = require('bluebird');
const mongodb = require('mongodb');
const config = require('./config');
const logStep = require('./logStep');

const migrateOrgs = (db) => {
  const orgUpdate = { $set: { organisation: mongodb.ObjectId(config.target.orgId) } };
  const opts = { multi: true };
  return Promise.all([
    db.collection('lrs').update({}, orgUpdate, opts),
    db.collection('client').update({}, orgUpdate, opts),
    db.collection('statements').update({}, orgUpdate, opts),
  ]);
};

const migrateStatementsClient = (db, client) =>
  db.collection('statements').update(
    {
      client_id: client._id.toString(),
      client: {$exists: false}
    },
    {
      $set: { client: client._id }
    },
    { multi: true }
  );

const migrateScopes = (db, client) => {
  if (client.scopes.indexOf('all/read') !== -1) {
    return db.collection('client').update(
      { _id: client._id },
      { $push: { scopes: 'xapi/read' } }
    ).then(() =>
      db.collection('client').update(
        { _id: client._id },
        { $pull: { scopes: 'all/read' } }
      )
    );
  }
  return Promise.resolve();
};

const migrateAuthority = (db, client) =>
  db.collection('client').update({ _id: client._id }, {
    $set: {
      title: `V1 Client - ${client.created_at}`,
      authority: JSON.stringify(client.authority)
    }
  });

module.exports = () => {
  logStep('Migrating local data');
  const mongoUrl = `mongodb://localhost:27017/${config.local.database}`;
  return new Promise((resolve, reject) => {
    mongodb.MongoClient.connect(mongoUrl, (err, db) => {
      if (err) return reject(err);

      const orgMigrations = migrateOrgs(db);
      const clientMigrations = Promise.all(
        db.collection('client').find().toArray().then(clients =>
          clients.map(client => {
            const clientId = client._id.toString();
            const clientIdFilter = { _id: client._id };

            console.log(`Migrating ${clientId} client`);
            return Promise.all([
              migrateStatementsClient(db, client),
              migrateScopes(db, client),
              migrateAuthority(db, client),
            ]).then(() => {
              console.log(`Migrated ${clientId} client`);
              db.close();
            });
          })
        )
      );

      return resolve(Promise.all([
        orgMigrations,
        clientMigrations,
      ]));
    });
  });
};
