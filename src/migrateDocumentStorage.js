const Promise = require('bluebird');
const path = require('path');
const highland = require('highland');
const exec = require('./exec');
const config = require('./config');
const logStep = require('./logStep');
const connect = require('./localConnect');
const generateEtag = require('./generateEtag');
const readSourceFileFactory = require('./readSourceFile');
const writeTargetFileFactory = require('./writeTargetFile');
const batchSize = 1000;

const getExtension = (doc) => {
  if (doc.contentType === 'application/json') {
    return 'json';
  }
  const { ext: extWithDot } = path.parse(doc.content);
  return extWithDot.replace('.', '');
}

const createNewBaseDocObject = ({
  originalDoc,
  organisation
}) => {
  const extension = getExtension(originalDoc);

  return Object.assign(
    {},
    {
      _id: originalDoc._id,
      contentType: originalDoc.contentType,
      etag: generateEtag(),
      extension,
      lrs: originalDoc.lrs,
      organisation,
      updatedAt: originalDoc.updated_at
    },
    originalDoc.contentType === 'application/json' ? { content: originalDoc.content } : {},
    originalDoc.registration !== undefined ? { registration: originalDoc.registration } : {}
  );
};

const migrateDocuments = ({
  documentType,
  newCollection,
  targetSubfolder,
  docCreator,
  readSourceFile,
  writeTargetFile
}) => {
  return connect(`Getting ${documentType} documents from v1`, db => {
    const stream = highland(db.collection('documentapi').find({
      documentType,
      migrated: { $exists: false }
    }));

    const streamHandler = stream.batch(batchSize).flatMap((documents) => {
      logStep(`Starting new batch of ${batchSize}`);

      const oldDocumentsBulkOp = db.collection('documentapi').initializeUnorderedBulkOp();
      const newDocumentsBulkOp = db.collection(newCollection).initializeUnorderedBulkOp();

      const filePromises = documents.map((doc) => {
        const isJSON = doc.contentType === 'application/json';
        // create a new document in respective collection
        const newDoc = docCreator(doc);

        // add to bulk insert
        newDocumentsBulkOp.insert(newDoc);

        // update old doc to mark as migrated
        oldDocumentsBulkOp.find({ _id: doc._id }).updateOne({ $set: { migrated: true } });


        if (!isJSON && doc.content !== undefined) {
          // find the file in source location
          const sourcePath = path.join(doc.lrs.toString(), 'documents', doc.content);
          const readStream = readSourceFile(sourcePath);

          // move file to target
          const targetFilename = `${doc._id.toString()}.${newDoc.extension}`;
          const targetPath = path.join(doc.lrs.toString(), targetSubfolder, targetFilename);

          // return file promise
          return writeTargetFile(targetPath, readStream);
        }

        return Promise.resolve();
      });

      // execute the promises
      const oldDocumentsPromise = oldDocumentsBulkOp.execute();
      const newDocumentsPromise = newDocumentsBulkOp.execute();

      const promises = [oldDocumentsPromise, newDocumentsPromise].concat(filePromises);
      // return all the promises
      return highland(Promise.all(promises));
    });

    return new Promise((resolve, reject) => {
      streamHandler.on('error', reject);
      streamHandler.apply(() => {
        logStep('Finished migrating documents');
        resolve();
      })
    });
  });
};

const migrateStates = ({ organisation, readSourceFile, writeTargetFile }) => {
  const docCreator = (doc) => {
    return Object.assign(
      {},
      {
        activityId: doc.activityId,
        agent: doc.agent,
        stateId: doc.identId,
      },
      createNewBaseDocObject({ originalDoc: doc, organisation })
    );
  };

  return migrateDocuments({
    documentType: 'state',
    newCollection: 'states',
    targetSubfolder: 'states',
    docCreator,
    readSourceFile,
    writeTargetFile
  });
};

const migrateAgentProfiles = ({ organisation, readSourceFile, writeTargetFile }) => {
  const docCreator = (doc) => {
    return Object.assign(
      {},
      {

        agent: doc.agent,
        profileId: doc.identId,
      },
      createNewBaseDocObject({ originalDoc: doc, organisation })
    );
  };

  return migrateDocuments({
    documentType: 'agentProfile',
    newCollection: 'agentProfiles',
    targetSubfolder: 'agentProfiles',
    docCreator,
    readSourceFile,
    writeTargetFile
  });
};

const migrateActivityProfiles = ({ organisation, readSourceFile, writeTargetFile }) => {
  const docCreator = (doc) => {
    return Object.assign(
      {},
      {
        activityId: doc.activityId,
        profileId: doc.identId,
      },
      createNewBaseDocObject({ originalDoc: doc, organisation })
    );
  };

  return migrateDocuments({
    documentType: 'activityProfile',
    newCollection: 'activityProfiles',
    targetSubfolder: 'activityProfiles',
    docCreator,
    readSourceFile,
    writeTargetFile
  });
};

module.exports = () => {
  logStep('Migrate documents', true);

  const organisation = config.target.orgId;

  const targetStorageType = config.target.documentStorage.storageType;

  const readSourceFile = readSourceFileFactory();
  const writeTargetFile = writeTargetFileFactory();

  return Promise.all([
    migrateStates({ organisation, readSourceFile, writeTargetFile }),
    migrateActivityProfiles({ organisation, readSourceFile, writeTargetFile }),
    migrateAgentProfiles({ organisation, readSourceFile, writeTargetFile })
  ]);
};
