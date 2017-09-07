module.exports = (step, br) => {
  if (br) {
    console.log('----------------------------------------');
  }
  console.log((new Date()).toISOString(), step);
  if (br) {
    console.log('----------------------------------------');
  }
};
