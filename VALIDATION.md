# Validation

Executed with Node.js v22.20.0 using `npm test` in `final_project`.

Result: **11 tests passed, 0 failed, 0 skipped**.

- Full supplied catalog returned, including all 10 starter books.
- ISBN, author, and title searches returned correct matches and missing-book errors.
- Initial reviews returned an empty object.
- Registration validated input, rejected duplicates, and stored password hashes.
- Login required correct credentials; anonymous and forged sessions were rejected.
- Reviews could be added, updated, retrieved, and deleted.
- A second user could not overwrite or delete another user's review.
- Three simultaneous registrations for one username created exactly one account.
- Six users' concurrent reviews were retained during simultaneous reads, edits, and deletion.
- All four Axios clients made successful HTTP calls and propagated HTTP errors.
- A separately supplied JSON catalog was served without relying on the starter ISBNs.

The server is an in-memory, single-process assignment implementation. The tests
do not establish durable storage or coordination across multiple server processes.
