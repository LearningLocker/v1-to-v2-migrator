module.exports = (option, value) => (
  value ? `${option} '${value}'` : ''
);
