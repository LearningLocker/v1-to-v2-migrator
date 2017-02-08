'use strict';
const clearLocalData = require('./clearLocalData');
const writeTimestamp = require('./writeTimestamp');
const dumpSourceData = require('./dumpSourceData');
const restoreLocalData = require('./restoreLocalData');
const migrateLocalData = require('./migrateLocalData');
const dumpLocalData = require('./dumpLocalData');
const restoreTargetData = require('./restoreTargetData');

const steps = [
  clearLocalData,
  writeTimestamp,
  dumpSourceData,
  restoreLocalData,
  migrateLocalData,
  dumpLocalData,
  restoreTargetData,
];
const startStep = process.argv[3] || 0;
const endStep = process.argv[4] || steps.length;

const waterfall = (steps, promise = Promise.resolve(), step = 0) => {
  if (step >= steps.length) return promise;
  return waterfall(steps, promise.then(steps[step]), step + 1)
};

waterfall(steps.slice(startStep, endStep)).catch(console.error.bind(console));
