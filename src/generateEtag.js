const sha1 = require('sha1');
const { v4: uuid } = require('uuid');

module.exports = () => {
  const id = uuid();
  const timestamp = (new Date()).toISOString();
  return sha1(`${id}-${timestamp}`);
};
