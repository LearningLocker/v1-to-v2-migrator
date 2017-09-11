'use strict';
const clearLocalData = require('./clearLocalData');
const writeTimestamp = require('./writeTimestamp');
const dumpSourceData = require('./dumpSourceData');
const restoreLocalData = require('./restoreLocalData');
const migrateLocalData = require('./migrateLocalData');
const migrateDocumentStorage = require('./migrateDocumentStorage');
const migrateAttachmentStorage = require('./migrateAttachmentStorage');
const dumpLocalData = require('./dumpLocalData');
const restoreTargetData = require('./restoreTargetData');

const steps = [
  writeTimestamp,
  clearLocalData,
  dumpSourceData,
  restoreLocalData,
  migrateLocalData,
  migrateDocumentStorage,
  migrateAttachmentStorage,
  dumpLocalData,
  restoreTargetData,
];
const startStep = Number(process.argv[3]) - 1 || 0;
const endStep = Number(process.argv[4]) || steps.length;

const waterfall = (steps, promise = Promise.resolve(), step = 0) => {
  if (step >= steps.length) return promise;
  return waterfall(steps, promise.then(steps[step]), step + 1)
};

waterfall(steps.slice(startStep, endStep)).catch((err) => {
  console.error(err);
});
