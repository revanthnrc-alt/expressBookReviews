const express = require('express');
const session = require('express-session');
const { sessionSecret } = require('./config');
const { authenticated, authenticate } = require('./router/auth_users');
const { general } = require('./router/general');

const app = express();
app.disable('x-powered-by');
app.set('json spaces', 2);
app.use(express.json({ limit: '16kb' }));
app.use('/customer', session({
  name: 'bookstore.sid',
  secret: sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: 'lax', maxAge: 60 * 60 * 1000 },
}));
app.use('/customer/auth', authenticate);
app.use('/customer', authenticated);
app.use('/', general);
app.use((req, res) => res.status(404).json({ message: 'Route not found.' }));
app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  const status = error.status >= 400 && error.status < 500 ? error.status : 500;
  res.status(status).json({ message: status === 500 ? 'Internal server error.' : 'Invalid request.' });
});

if (require.main === module) {
  const port = Number(process.env.PORT || 5000);
  const host = process.env.HOST || '127.0.0.1';
  app.listen(port, host, () => console.log(`Bookstore API listening on http://${host}:${port}`));
}

module.exports = app;
