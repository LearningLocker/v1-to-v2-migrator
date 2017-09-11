const Promise = require('bluebird');
const path = require('path');
const async = require('async');
const highland = require('highland');
const config = require('./config');
const logStep = require('./logStep');
const connect = require('./localConnect');
const _ = require('lodash');
const listSourcePathsFactory = require('./listSourcePaths');
const readSourceFileFactory = require('./readSourceFile');
const writeTargetFileFactory = require('./writeTargetFile');
const batchSize = 1;

const listSourcePaths = listSourcePathsFactory();
const readSourceFile = readSourceFileFactory();
const writeTargetFile = writeTargetFileFactory();

const getPaths = (documents) => {
  logStep(`Starting new LRS batch of ${batchSize}`);

  const pathsStream = highland(documents)
    .flatMap((lrs) => {
      const _id = lrs._id.toString();
      const attachmentsPath = path.join(lrs._id.toString(), 'attachments');
      const sourcePathsPromise = listSourcePaths(attachmentsPath)
        .then((filepaths) => {
          const paths = _.flatMap(filepaths, (filename) => ({
            lrs_id: _id,
            filename
          }));
          return paths;
        }).catch((err) => {
          console.error(`ERROR GETTING FILES FOR ${attachmentsPath}`);
          return [];
        });
      return highland(sourcePathsPromise);
    }).flatten();


  return pathsStream;
};

const copyFile = ({ lrs_id, filename }) => {
  console.log(lrs_id, filename);
  const attachmentsPath = path.join(lrs_id, 'attachments');
  const filePath = path.join(attachmentsPath, filename);
  logStep(`Moving ${filePath} to target`);

  const readStream = readSourceFile(filePath);

  // return file promise
  return highland(writeTargetFile(filePath, readStream));
};

const migrateAttachments = () => {
  return connect(`Migrating attachements from 'source' to 'target'`, db => {

    // loop through every LRS we are migrating
    const stream = highland(db.collection('lrs').find());
    const streamHandler = stream.batch(batchSize)
      .flatMap(getPaths)
      .flatMap(copyFile);


    return new Promise((resolve, reject) => {
      streamHandler.on('error', reject);
      // streamHandler.collect().toArray((items) => {
      //   console.log('103', JSON.stringify(items, null, 2));
      //   resolve();
      // });
      streamHandler.done(() => {
        logStep('Finished migrating attachments');
        resolve();
      })
    });
  });
}

module.exports = () => {
  logStep('Migrate attachments', true);

  const organisation = config.target.orgId;

  const targetStorageType = config.target.documentStorage.storageType;


  return Promise.all([
    migrateAttachments(listSourcePaths),
  ]);
};
