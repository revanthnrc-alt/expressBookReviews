const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
const app = require('../index');
const { books } = require('../router/catalog');
const { users } = require('../router/users');
const clients = require('../router/general');
let server;
let baseURL;

before(async () => {
  server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  baseURL = `http://127.0.0.1:${server.address().port}`;
});
after(() => new Promise((resolve) => server.close(resolve)));
beforeEach(() => {
  users.clear();
  for (const book of Object.values(books)) book.reviews = {};
});

async function request(route, { method = 'GET', body, cookie } = {}) {
  const response = await fetch(baseURL + route, {
    method,
    headers: { ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), ...(cookie ? { Cookie: cookie } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: response.status, data: await response.json(), cookie: response.headers.get('set-cookie')?.split(';')[0] };
}

async function account(username) {
  const body = { username, password: 'Bookstore-demo-password' };
  assert.equal((await request('/register', { method: 'POST', body })).status, 201);
  const login = await request('/customer/login', { method: 'POST', body });
  assert.equal(login.status, 200);
  assert.ok(login.cookie);
  return login.cookie;
}

test('all books come from the supplied catalog', async () => {
  const response = await request('/');
  assert.equal(response.status, 200);
  assert.deepEqual(response.data, books);
  assert.equal(Object.keys(response.data).length, 10);
});

test('ISBN, author and title searches return correct matches and handle misses', async () => {
  assert.deepEqual((await request('/isbn/1')).data, books['1']);
  assert.equal((await request('/isbn/missing')).status, 404);
  assert.equal((await request('/isbn/__proto__')).status, 404);
  assert.deepEqual(Object.keys((await request('/author/unknown')).data), ['4', '5', '6', '7']);
  assert.deepEqual(Object.keys((await request('/author/Hans%20Christian%20Andersen')).data), ['2']);
  assert.deepEqual(Object.keys((await request('/title/pride%20and%20prejudice')).data), ['8']);
  assert.deepEqual(Object.keys((await request('/title/' + encodeURIComponent("Njál's Saga"))).data), ['7']);
  assert.equal((await request('/title/no-such-book')).status, 404);
  assert.equal((await request('/author/no-such-author')).status, 404);
});

test('initial reviews are empty and unknown books return 404', async () => {
  assert.deepEqual((await request('/review/1')).data, {});
  assert.equal((await request('/review/missing')).status, 404);
});

test('registration validates input, rejects duplicates, and stores a hash', async () => {
  assert.equal((await request('/register', { method: 'POST', body: {} })).status, 400);
  assert.equal((await request('/register', { method: 'POST', body: { username: 'a', password: [] } })).status, 400);
  await account('alice');
  assert.equal((await request('/register', { method: 'POST', body: { username: 'alice', password: 'other' } })).status, 409);
  assert.equal(users.get('alice').password, undefined);
  assert.equal(users.get('alice').hash.length, 64);
});

test('login requires correct credentials and protected endpoints require a valid session', async () => {
  await account('alice');
  assert.equal((await request('/customer/login', { method: 'POST', body: { username: 'alice', password: 'wrong' } })).status, 401);
  assert.equal((await request('/customer/login', { method: 'POST', body: { username: 'nobody', password: 'wrong' } })).status, 401);
  assert.equal((await request('/customer/login', { method: 'POST', body: {} })).status, 400);
  assert.equal((await request('/customer/auth/review/1', { method: 'PUT', body: { review: 'x' } })).status, 401);
  assert.equal((await request('/customer/auth/review/1', { method: 'DELETE' })).status, 401);
  assert.equal((await request('/customer/auth/review/1', { method: 'DELETE', cookie: 'bookstore.sid=forged' })).status, 401);
});

test('a user can add, update and delete a review; invalid reviews are rejected', async () => {
  const cookie = await account('alice');
  const route = '/customer/auth/review/1';
  const added = await request(route, { method: 'PUT', cookie, body: { review: 'First review' } });
  assert.equal(added.status, 200);
  assert.equal(added.data.message, 'Review successfully added.');
  assert.deepEqual((await request('/review/1')).data, { alice: 'First review' });
  const updated = await request(route + '?review=Updated%20review', { method: 'PUT', cookie });
  assert.equal(updated.data.message, 'Review successfully updated.');
  assert.deepEqual(updated.data.reviews, { alice: 'Updated review' });
  assert.equal((await request(route, { method: 'PUT', cookie, body: { review: ' ' } })).status, 400);
  assert.equal((await request(route, { method: 'PUT', cookie, body: { review: ['bad'] } })).status, 400);
  assert.equal((await request('/customer/auth/review/missing', { method: 'PUT', cookie, body: { review: 'x' } })).status, 404);
  assert.equal((await request(route, { method: 'DELETE', cookie })).data.message, 'Review successfully deleted.');
  assert.deepEqual((await request('/review/1')).data, {});
  assert.equal((await request(route, { method: 'DELETE', cookie })).status, 404);
});

test('one user cannot overwrite or delete another user’s review', async () => {
  const alice = await account('alice');
  const bob = await account('bob');
  const route = '/customer/auth/review/1';
  await request(route, { method: 'PUT', cookie: alice, body: { review: 'Alice review' } });
  assert.equal((await request(route + '?username=alice', { method: 'DELETE', cookie: bob })).status, 404);
  await request(route, { method: 'PUT', cookie: bob, body: { username: 'alice', review: 'Bob review' } });
  assert.deepEqual((await request('/review/1')).data, { alice: 'Alice review', bob: 'Bob review' });
  await request(route + '?username=alice', { method: 'DELETE', cookie: bob });
  assert.deepEqual((await request('/review/1')).data, { alice: 'Alice review' });
});

test('concurrent registrations create exactly one account without replacing its password', async () => {
  const passwords = ['password-one', 'password-two', 'password-three'];
  const results = await Promise.all(passwords.map((password) => request('/register', {
    method: 'POST', body: { username: 'same_user', password },
  })));
  assert.deepEqual(results.map((r) => r.status).sort(), [201, 409, 409]);
  for (let i = 0; i < passwords.length; i++) {
    const result = await request('/customer/login', { method: 'POST', body: { username: 'same_user', password: passwords[i] } });
    assert.equal(result.status, results[i].status === 201 ? 200 : 401);
  }
});

test('concurrent users retain separate reviews during simultaneous reads, updates and deletes', async () => {
  const names = ['user1', 'user2', 'user3', 'user4', 'user5', 'user6'];
  const cookies = await Promise.all(names.map(account));
  const route = '/customer/auth/review/1';
  const adds = await Promise.all(cookies.map((cookie, i) => request(route, { method: 'PUT', cookie, body: { review: names[i] } })));
  assert.ok(adds.every((r) => r.status === 200));
  assert.equal(Object.keys((await request('/review/1')).data).length, names.length);
  await Promise.all([
    request(route, { method: 'DELETE', cookie: cookies[0] }),
    request(route, { method: 'PUT', cookie: cookies[1], body: { review: 'Updated concurrently' } }),
    ...Array.from({ length: 10 }, () => request('/')),
  ]);
  const reviews = (await request('/review/1')).data;
  assert.equal(reviews.user1, undefined);
  assert.equal(reviews.user2, 'Updated concurrently');
  for (const name of names.slice(2)) assert.equal(reviews[name], name);
});

test('all four Axios helpers perform HTTP requests and propagate missing-book errors', async () => {
  const [all, isbn, author, title] = await Promise.all([
    clients.getAllBooks(baseURL), clients.getBookByISBN('1', baseURL),
    clients.getBooksByAuthor('Unknown', baseURL), clients.getBooksByTitle('Things Fall Apart', baseURL),
  ]);
  assert.deepEqual(all, books);
  assert.deepEqual(isbn, books['1']);
  assert.deepEqual(Object.keys(author), ['4', '5', '6', '7']);
  assert.deepEqual(title, { '1': books['1'] });
  await assert.rejects(clients.getBookByISBN('missing', baseURL), (error) => error.response.status === 404);
});

test('an alternate supplied JSON catalog is served without hardcoded ISBNs or titles', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bookstore-test-'));
  const fixture = { '978-test': { author: 'Test Author', title: 'Supplied JSON', reviews: { reader: 'Existing review' } } };
  const fixturePath = path.join(dir, 'catalog.json');
  fs.writeFileSync(fixturePath, JSON.stringify(fixture));
  try {
    const script = `const app = require('./index');
      const server = app.listen(0, '127.0.0.1', async () => {
        try {
          const response = await fetch('http://127.0.0.1:' + server.address().port + '/');
          console.log(JSON.stringify(await response.json()));
        } finally { server.close(); }
      });`;
    const { stdout } = await promisify(execFile)(process.execPath, ['-e', script], {
      cwd: path.resolve(__dirname, '..'), env: { ...process.env, BOOKS_JSON_PATH: fixturePath }, timeout: 10000,
    });
    assert.deepEqual(JSON.parse(stdout), fixture);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
