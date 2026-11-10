# Bookstore final project

An Express application for the IBM back-end development assignment, based on
[ibm-developer-skills-network/expressBookReviews](https://github.com/ibm-developer-skills-network/expressBookReviews).

## Run

Use Node.js 22 or later. From the repository root:

```bash
cd final_project
npm ci
npm start
```

The API listens at `http://127.0.0.1:5000`. Set `PORT` if that port is occupied;
set `HOST=0.0.0.0` if your lab environment requires access through a port proxy.

## Features and routes

| Method | Route | Behavior |
| --- | --- | --- |
| GET | `/` | Return the full supplied catalog |
| GET | `/isbn/:isbn` | Return one book |
| GET | `/author/:author` | Return all matching books |
| GET | `/title/:title` | Return all matching books |
| GET | `/review/:isbn` | Return the book's reviews |
| POST | `/register` | Register with JSON `username` and `password` |
| POST | `/customer/login` | Log in and receive a session cookie |
| PUT | `/customer/auth/review/:isbn` | Add or update the logged-in user's review |
| DELETE | `/customer/auth/review/:isbn` | Delete only the logged-in user's review |

Author and title searches match case-insensitive substrings. Encode spaces and
other special characters in URLs. Review PUT requests accept a JSON `review`
field or the starter lab's `?review=...` query parameter. Use cURL `-c cookies.txt`
when logging in and `-b cookies.txt` when adding, updating, or deleting reviews.

Missing books and unmatched searches return 404. Invalid input returns 400,
unauthenticated requests return 401, and duplicate registration returns 409.

## Data source

The original `final_project/router/booksdb.js` is unchanged. Its keys `1` through
`10` are used as the starter dataset's ISBN identifiers. Initial reviews are
empty objects, so `{}` is the correct initial response for Question 6.

To use another supplied JSON file, pass its path when starting the server:

```bash
BOOKS_JSON_PATH=/absolute/path/to/books.json npm start
```

The JSON must be an object keyed by ISBN. Each entry has string `author` and
`title` fields and an optional `reviews` object keyed by username. The API does
not replace the supplied data with an external book service.

## Axios methods for Question 11

`final_project/router/general.js` contains the public routes and four exported
HTTP clients: `getAllBooks`, `getBookByISBN`, `getBooksByAuthor`, and
`getBooksByTitle`. ISBN lookup uses `.then()` Promise callbacks; the other
methods use `async/await` with Axios. Client errors propagate to the caller.
Run these commands in another terminal while the server is running:

```bash
cd final_project
npm run client -- all
npm run client -- isbn 1
npm run client -- author "Unknown"
npm run client -- title "Things Fall Apart"
```

Set `BOOKS_API_URL` if using a different server address or port.

## Capture submission responses

From `final_project`, with the server running, use Python 3.9 or later:

```bash
python3 scripts/capture_evidence.py --repo revanthnrc-alt/expressBookReviews
```

This executes cURL, verifies the public fork relationship, checks the published
`general.js`, registers a disposable demonstration account, and exercises the
review lifecycle. It writes the ten required evidence filenames and a combined
`submission/ANSWERS.md`. Question 9 includes both adding and updating a review;
Question 10 includes a GET confirming deletion. The cookie jar is temporary
and is never committed. The recorded password is a disposable local demo value.

Use `--base-url http://127.0.0.1:5001` for another port. Omit `--repo` to capture
only the local API questions while preparing a fork. Read each result before
copying it into the matching assignment answer box.

## Validation and concurrency

```bash
cd final_project
npm test
```

The 11 integration tests cover catalog retrieval, searches, initial reviews,
registration, login, authorization, review CRUD, ownership, simultaneous
registrations, simultaneous review operations, all four Axios clients, and an
alternate JSON dataset. They use isolated temporary HTTP ports.

Passwords are salted and hashed with asynchronous scrypt. Login regenerates
the session and stores an expiring JWT server-side. Duplicate usernames are
checked again after hashing to handle simultaneous registrations. Review
changes are synchronous and keyed by the authenticated username, so one user
cannot overwrite another user's entry. Simultaneous changes by the same user
use the last operation processed by the server.

This assignment runs as one Node.js process with in-memory accounts, sessions,
and reviews; restarting resets these changes. A multi-process or persistent
deployment would require a shared database and session store. Set separate
`SESSION_SECRET` and `JWT_SECRET` environment variables for a stable deployment;
local development generates fresh secrets per process.

The upstream project is licensed under Apache-2.0; see `LICENSE`.
