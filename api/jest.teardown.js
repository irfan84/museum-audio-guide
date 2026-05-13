module.exports = async () => {
  const pool = require('./src/db/index');
  await pool.end();
};