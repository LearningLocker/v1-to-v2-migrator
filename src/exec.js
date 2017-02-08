const shelljs = require('shelljs');
const Promise = require('bluebird');

module.exports = (command) => {
  console.log('exec', command);
  return new Promise((resolve, reject) => {
    shelljs.exec(command, {}, (code, stdout, stderr) => {
      if (code === 0) return resolve(stdout);
      return reject({
        stderr,
        code,
      });
    });
  });
};
