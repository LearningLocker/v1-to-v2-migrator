const Promise = require('bluebird');
const path = require('path');
const fs = require('fs');
const S3 = require('aws-sdk/clients/s3');
const config = require('./config');
const logStep = require('./logStep');

const storageType = config.source.documentStorage.storageType;

const listLocalPaths = () => (dirpath) => {
  const storageDir = config.source.documentStorage.local.storageDir;
  const Key = path.join(storageDir, dirpath);
  logStep(`Getting all files from ${Key}`);

  return new Promise((resolve, reject) => {
    console.log('101.1');
    fs.readdir(Key, (err, items) => {
      if (err) return reject(err);
      resolve(items);
    });
  });
}

const listS3Paths = () => {
  const s3Config = config.source.documentStorage.s3;
  const s3Client = new S3({
    accessKeyId: s3Config.accessKeyId,
    secretAccessKey: s3Config.secretAccessKey,
    region: s3Config.region,
    apiVersion: '2006-03-01',
    signatureVersion: 'v4',
    sslEnabled: true,
  });
  return (dirpath) => {
    const Key = path.join(subFolder, dirpath);
    logStep(`Getting all files from ${Key}`);
    const prefix = config.source.documentStorage.s3.subFolder;
    const listParams = {
      Bucket: s3Config.bucketName,
      Prefix: prefix,
      StartAfter: prefix,
      MaxKeys: 2147483647, // Maximum allowed by S3 API,
    };

    return s3Client.listObjectsV2(listParams).promise().then((data) => {
      return _.map(data.Contents, 'Key');
    });
  }
}

module.exports = () => {
  if (storageType === 'local') {
    return listLocalPaths();
  }
  if (storageType === 's3') {
    return listS3Paths();
  }

  throw new Error(`Unknown source storage type (${storageType})`);
}
