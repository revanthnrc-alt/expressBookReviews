const express = require('express');
const axios = require('axios');
const { books, getBook } = require('./catalog');
const { validCredentials, registerUser } = require('./users');
const public_users = express.Router();

public_users.post('/register', async (req, res, next) => {
  try {
    const { username, password } = req.body || {};
    if (!validCredentials(username, password)) {
      return res.status(400).json({ message: 'Provide a username (1–64 letters, digits, underscores or hyphens) and a nonempty password (up to 128 characters).' });
    }
    if (!await registerUser(username, password)) {
      return res.status(409).json({ message: 'Username already exists.' });
    }
    return res.status(201).json({ message: 'User successfully registered. You can now log in.' });
  } catch (error) {
    next(error);
  }
});

// Public API routes read the provided catalog; no external book API is used.
public_users.get('/', (req, res) => res.json(books));

public_users.get('/isbn/:isbn', (req, res) => {
  const book = getBook(req.params.isbn);
  if (!book) return res.status(404).json({ message: 'Book not found.' });
  return res.json(book);
});

function searchBooks(field, term) {
  const query = term.trim().toLowerCase();
  if (!query) return {};
  return Object.fromEntries(Object.entries(books).filter(([, book]) =>
    book[field].toLowerCase().includes(query)));
}

for (const field of ['author', 'title']) {
  public_users.get(`/${field}/:term`, (req, res) => {
    const matches = searchBooks(field, req.params.term);
    if (!Object.keys(matches).length) {
      return res.status(404).json({ message: `No books found for that ${field}.` });
    }
    return res.json(matches);
  });
}

public_users.get('/review/:isbn', (req, res) => {
  const book = getBook(req.params.isbn);
  if (!book) return res.status(404).json({ message: 'Book not found.' });
  return res.json(book.reviews);
});

// Asynchronous Axios implementations for the final assignment. These are HTTP
// clients of the routes above, called by the CLI or another module. The route
// handlers do not call themselves, avoiding recursive requests.
function bookClient(baseURL = process.env.BOOKS_API_URL || 'http://127.0.0.1:5000') {
  return axios.create({ baseURL, timeout: 5000 });
}

// Retrieve every book using async/await with Axios.
async function getAllBooks(baseURL) {
  const response = await bookClient(baseURL).get('/');
  return response.data;
}

// Retrieve a book by ISBN using Axios Promise callbacks.
function getBookByISBN(isbn, baseURL) {
  return bookClient(baseURL).get(`/isbn/${encodeURIComponent(isbn)}`)
    .then((response) => response.data);
}

// Retrieve matching books by author using async/await with Axios.
async function getBooksByAuthor(author, baseURL) {
  const response = await bookClient(baseURL).get(`/author/${encodeURIComponent(author)}`);
  return response.data;
}

// Retrieve matching books by title using async/await with Axios.
async function getBooksByTitle(title, baseURL) {
  const response = await bookClient(baseURL).get(`/title/${encodeURIComponent(title)}`);
  return response.data;
}

module.exports = { general: public_users, getAllBooks, getBookByISBN, getBooksByAuthor, getBooksByTitle };

if (require.main === module) {
  const [operation = 'all', value] = process.argv.slice(2);
  const methods = { all: getAllBooks, isbn: getBookByISBN, author: getBooksByAuthor, title: getBooksByTitle };
  if (!Object.hasOwn(methods, operation) || (operation !== 'all' && !value)) {
    console.error('Usage: node router/general.js all|isbn <ISBN>|author "<author>"|title "<title>"');
    process.exitCode = 1;
  } else {
    const request = operation === 'all' ? getAllBooks() : methods[operation](value);
    request.then((data) => console.log(JSON.stringify(data, null, 2)))
      .catch((error) => {
        console.error(error.response?.data || error.message);
        process.exitCode = 1;
      });
  }
}
