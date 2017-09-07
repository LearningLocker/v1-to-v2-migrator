const path = require('path');
const fs = require('fs-extra');
const S3 = require('aws-sdk/clients/s3');
const config = require('./config');

const storageType = config.source.documentStorage.storageType;

const readLocalFile = () => (path) => {
  const storageDir = config.source.documentStorage.local.storageDir;
  const Key = path.join([storageDir, path]);
  logStep(`Writing file to ${Key}`);
  return fs.createReadStream(Key);
}

const readS3File = () => {
  const s3Config = config.source.documentStorage.s3;
  const s3Client = new S3({
    accessKeyId: s3Config.accessKeyId,
    secretAccessKey: s3Config.secretAccessKey,
    region: s3Config.region,
    apiVersion: '2006-03-01',
    signatureVersion: 'v4',
    sslEnabled: true,
  });
  return (path) => {
    const subFolder = config.source.documentStorage.s3.subFolder;
    const Bucket = s3Config.bucketName;
    const Key = path.join([subFolder, path]);
    logStep(`Reading file from ${Key}`);
    return s3Client.getObject({ Bucket, Key }).createReadStream();
  }
}

module.exports = () => {
  if (storageType === 'local') {
    return readLocalFile();
  }
  if (storageType === 's3') {
    return readS3File();
  }

  throw new Error(`Unknown source storage type (${storageType})`);
}
