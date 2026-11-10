const { randomBytes } = require('node:crypto');

// Local defaults are generated per process. Set these environment variables to
// stable, separate random secrets when deploying the application.
module.exports = {
  sessionSecret: process.env.SESSION_SECRET || randomBytes(32).toString('hex'),
  jwtSecret: process.env.JWT_SECRET || randomBytes(32).toString('hex'),
};
