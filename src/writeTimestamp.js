const fs = require('fs');
const config = require('./config');
const logStep = require('./logStep');

module.exports = () => {
  logStep(`Writing timestamp`);
  const configFileName = `${process.cwd()}/${process.argv[2]}`;
  const startTimestamp = (new Date()).toISOString();
  return new Promise((resolve, reject) => {
    const newConfig = Object.assign({}, config, {
      timestamp: startTimestamp,
    });
    fs.writeFile(configFileName, JSON.stringify(newConfig, null, 2), (err) => {
      if (err) return reject(err);
      console.log(`Wrote timestamp to ${configFileName} file`);
      return resolve();
    });
  })
}
