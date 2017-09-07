const Promise = require('bluebird');
const path = require('path');
const fs = require('fs-extra');
const S3 = require('aws-sdk/clients/s3');
const config = require('./config');
const logStep = require('./logStep');

const storageType = config.target.documentStorage.storageType;

const writeLocalFile = () => (path, stream) => {
  const storageDir = config.target.documentStorage.local.storageDir;
  const Key = path.join([storageDir, path]);
  logStep(`Reading file from ${Key}`);
  const writeStream = fs.createWriteStream(Key);
  return new Promise((resolve, reject) => {
    stream.pipe(writeStream);
    stream.on('end', resolve);
    stream.on('error', reject);
  });
}

const writeS3File = () => {
  const s3Config = config.target.documentStorage.s3;
  const s3Client = new S3({
    accessKeyId: s3Config.accessKeyId,
    secretAccessKey: s3Config.secretAccessKey,
    region: s3Config.region,
    apiVersion: '2006-03-01',
    signatureVersion: 'v4',
    sslEnabled: true,
  });
  return (path, stream) => {
    const subFolder = config.target.documentStorage.s3.subFolder;
    const Bucket = s3Config.bucketName;
    const Key = path.join([subFolder, path]);
    const Body = stream;
    logStep(`Writing file to ${key}`);
    return s3Client.upload({ Body, Bucket, Key }).promise();
  }
}

module.exports = () => {
  if (storageType === 'local') {
    return writeLocalFile();
  }
  if (storageType === 's3') {
    return writeS3File();
  }

  throw new Error(`Unknown target storage type (${storageType})`);
}
