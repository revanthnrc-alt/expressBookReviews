const express = require('express');
const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../config');
const { getBook } = require('./catalog');
const { users, validCredentials, authenticatedUser } = require('./users');
const regd_users = express.Router();

const isValid = (username) => users.has(username);

function authenticate(req, res, next) {
  const token = req.session?.authorization?.accessToken;
  if (!token) return res.status(401).json({ message: 'Please log in first.' });
  try {
    const claims = jwt.verify(token, jwtSecret, { algorithms: ['HS256'] });
    if (typeof claims.sub !== 'string' || !users.has(claims.sub)) {
      return res.status(401).json({ message: 'Invalid session. Please log in again.' });
    }
    req.username = claims.sub;
    return next();
  } catch {
    return res.status(401).json({ message: 'Session expired or invalid. Please log in again.' });
  }
}

regd_users.post('/login', async (req, res, next) => {
  try {
    const { username, password } = req.body || {};
    if (!validCredentials(username, password)) {
      return res.status(400).json({ message: 'Provide a valid username and password.' });
    }
    if (!await authenticatedUser(username, password)) {
      return res.status(401).json({ message: 'Invalid username or password.' });
    }
    req.session.regenerate((error) => {
      if (error) return next(error);
      req.session.authorization = {
        accessToken: jwt.sign({}, jwtSecret, { subject: username, expiresIn: '1h', algorithm: 'HS256' }),
      };
      req.session.save((saveError) => {
        if (saveError) return next(saveError);
        return res.json({ message: 'User successfully logged in.', username });
      });
    });
  } catch (error) {
    next(error);
  }
});

regd_users.put('/auth/review/:isbn', (req, res) => {
  const book = getBook(req.params.isbn);
  if (!book) return res.status(404).json({ message: 'Book not found.' });
  const review = req.body?.review ?? req.query.review;
  if (typeof review !== 'string' || !review.trim() || review.length > 5000) {
    return res.status(400).json({ message: 'Provide a nonempty review of at most 5000 characters.' });
  }
  const exists = Object.hasOwn(book.reviews, req.username);
  // Identity comes only from the verified session, never from request input.
  // This mutation is synchronous: concurrent users update separate keys.
  Object.defineProperty(book.reviews, req.username, {
    value: review.trim(), enumerable: true, configurable: true, writable: true,
  });
  return res.json({ message: exists ? 'Review successfully updated.' : 'Review successfully added.', reviews: book.reviews });
});

regd_users.delete('/auth/review/:isbn', (req, res) => {
  const book = getBook(req.params.isbn);
  if (!book) return res.status(404).json({ message: 'Book not found.' });
  if (!Object.hasOwn(book.reviews, req.username)) {
    return res.status(404).json({ message: 'You have no review for this book.' });
  }
  delete book.reviews[req.username];
  return res.json({ message: 'Review successfully deleted.', reviews: book.reviews });
});

module.exports = { authenticated: regd_users, authenticate, isValid, users, authenticatedUser };
