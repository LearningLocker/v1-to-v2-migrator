const configFileName = process.argv[2];
module.exports = require(`${process.cwd()}/${configFileName}`);
