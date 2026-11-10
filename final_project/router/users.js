const { randomBytes, scrypt, timingSafeEqual } = require('node:crypto');
const { promisify } = require('node:util');
const deriveKey = promisify(scrypt);
const users = new Map();

function validCredentials(username, password) {
  return typeof username === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(username)
    && typeof password === 'string' && password.trim().length > 0 && password.length <= 128;
}

async function registerUser(username, password) {
  if (users.has(username)) return false;
  const salt = randomBytes(16).toString('hex');
  const hash = await deriveKey(password, salt, 64);
  // Recheck after asynchronous hashing so simultaneous registrations cannot
  // overwrite an account created while this request was awaiting its hash.
  if (users.has(username)) return false;
  users.set(username, { salt, hash });
  return true;
}

async function authenticatedUser(username, password) {
  const user = users.get(username);
  if (!user) return false;
  const hash = await deriveKey(password, user.salt, 64);
  return timingSafeEqual(user.hash, hash);
}

module.exports = { users, validCredentials, registerUser, authenticatedUser };
