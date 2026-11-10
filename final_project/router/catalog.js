const fs = require('node:fs');
const path = require('node:path');

// Keep the supplied starter data unchanged. A grader can provide an alternative
// JSON object keyed by ISBN through BOOKS_JSON_PATH.
const books = process.env.BOOKS_JSON_PATH
  ? JSON.parse(fs.readFileSync(path.resolve(process.env.BOOKS_JSON_PATH), 'utf8'))
  : require('./booksdb');

if (!books || typeof books !== 'object' || Array.isArray(books)) {
  throw new Error('Book data must be a JSON object keyed by ISBN.');
}
for (const book of Object.values(books)) {
  if (!book || typeof book.author !== 'string' || typeof book.title !== 'string') {
    throw new Error('Each book must have author and title strings.');
  }
  if (book.reviews === undefined) book.reviews = {};
  if (!book.reviews || typeof book.reviews !== 'object' || Array.isArray(book.reviews)) {
    throw new Error('Book reviews must be an object keyed by username.');
  }
}

const getBook = (isbn) => Object.hasOwn(books, isbn) ? books[isbn] : undefined;
module.exports = { books, getBook };
