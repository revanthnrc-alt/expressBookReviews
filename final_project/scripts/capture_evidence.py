#!/usr/bin/env python3
"""Capture real cURL commands and responses for the bookstore assignment."""
import argparse
import base64
import json
from pathlib import Path
import re
import secrets
import shlex
import subprocess
import tempfile
from urllib.parse import quote


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--base-url', default='http://127.0.0.1:5000')
    parser.add_argument('--repo', help='Your public GitHub fork as OWNER/REPOSITORY')
    parser.add_argument('--output-dir', default=str(Path(__file__).resolve().parents[2] / 'submission'))
    args = parser.parse_args()
    if args.repo and not re.fullmatch(r'[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+', args.repo):
        parser.error('--repo must be OWNER/REPOSITORY')
    output = Path(args.output_dir).resolve()
    output.mkdir(parents=True, exist_ok=True)
    api = args.base_url.rstrip('/')
    collected = {}
    username = 'bookstore_student_' + secrets.token_hex(4)
    # Disposable demonstration credentials, never a real account password.
    credentials = json.dumps({'username': username, 'password': 'Bookstore-demo-password'})

    with tempfile.TemporaryDirectory(prefix='bookstore-evidence-') as temp:
        def curl(*arguments):
            command = ['curl', '--silent', '--show-error', '--fail-with-body', '--max-time', '20', *arguments]
            result = subprocess.run(command, cwd=temp, capture_output=True, text=True)
            if result.returncode:
                raise RuntimeError(f'{shlex.join(command)}\n{result.stderr}{result.stdout}')
            return command, result.stdout, json.loads(result.stdout)

        def save(name, command, body, append=False):
            transcript = '$ ' + shlex.join(command) + '\n' + body.rstrip() + '\n'
            if append:
                collected[name] += '\n' + transcript
            else:
                collected[name] = transcript
            (output / name).write_text(collected[name], encoding='utf-8')

        def capture(name, *arguments, append=False):
            command, raw, data = curl(*arguments)
            save(name, command, raw, append)
            return data

        if args.repo:
            command, raw, repo = curl('-H', 'Accept: application/vnd.github+json', f'https://api.github.com/repos/{args.repo}')
            allowed = {'ibm-developer-skills-network/expressBookReviews', 'ibm-developer-skills-network/expressBookReview'}
            lineage = {repo.get(key, {}).get('full_name') for key in ('parent', 'source')}
            if not repo.get('fork') or repo.get('private') or not allowed.intersection(lineage):
                raise RuntimeError('The repository must be a public fork of the IBM bookstore starter.')
            projection = 'import json,sys; r=json.load(sys.stdin); print(json.dumps({k:r[k] for k in ("full_name","html_url","fork","default_branch")} | {k:{"full_name":r[k]["full_name"],"html_url":r[k]["html_url"]} for k in ("parent","source")}, indent=2))'
            filtered = subprocess.run(['python3', '-c', projection], input=raw, capture_output=True, text=True, check=True).stdout
            collected['githubrepo'] = '$ ' + shlex.join(command) + ' | ' + shlex.join(['python3', '-c', projection]) + '\n' + filtered
            (output / 'githubrepo').write_text(collected['githubrepo'], encoding='utf-8')
            _, _, source = curl('-H', 'Accept: application/vnd.github+json', f'https://api.github.com/repos/{args.repo}/contents/final_project/router/general.js')
            code = base64.b64decode(source['content']).decode('utf-8')
            for required in ('axios', 'getAllBooks', 'getBookByISBN', 'getBooksByAuthor', 'getBooksByTitle'):
                if required not in code:
                    raise RuntimeError('Push the completed general.js before capturing the submission URL.')
            general_url = source['html_url']
            (output / 'general-js-url.txt').write_text(general_url + '\n', encoding='utf-8')
        else:
            general_url = None

        books = capture('getallbooks', api + '/')
        if not books or not isinstance(books, dict):
            raise RuntimeError('Expected a nonempty catalog keyed by ISBN.')
        isbn = next(iter(books))
        book = books[isbn]
        # Prefer an author with multiple books to demonstrate all matches.
        author = max((b['author'] for b in books.values()), key=lambda name: sum(b['author'] == name for b in books.values()))
        capture('getbooksbyISBN', api + '/isbn/' + quote(isbn, safe=''))
        capture('getbooksbyauthor', api + '/author/' + quote(author, safe=''))
        capture('getbooksbytitle', api + '/title/' + quote(book['title'], safe=''))
        capture('getbookreview', api + '/review/' + quote(isbn, safe=''))
        capture('register', '-X', 'POST', '-H', 'Content-Type: application/json', '-d', credentials, api + '/register')
        capture('login', '-X', 'POST', '-H', 'Content-Type: application/json', '-c', 'cookies.txt', '-d', credentials, api + '/customer/login')
        review_url = api + '/customer/auth/review/' + quote(isbn, safe='')
        first = 'An engaging book with memorable characters.'
        updated = 'Updated review: an engaging book with memorable characters and thoughtful themes.'
        capture('reviewadded', '-X', 'PUT', '-b', 'cookies.txt', '-H', 'Content-Type: application/json', '-d', json.dumps({'review': first}), review_url)
        actual = capture('reviewadded', api + '/review/' + quote(isbn, safe=''), append=True)
        if actual.get(username) != first:
            raise RuntimeError('Added review was not returned by the public review endpoint.')
        capture('reviewadded', '-X', 'PUT', '-b', 'cookies.txt', '-H', 'Content-Type: application/json', '-d', json.dumps({'review': updated}), review_url, append=True)
        actual = capture('reviewadded', api + '/review/' + quote(isbn, safe=''), append=True)
        if actual.get(username) != updated:
            raise RuntimeError('Updated review was not persisted in the running application.')
        capture('deletereview', '-X', 'DELETE', '-b', 'cookies.txt', review_url)
        actual = capture('deletereview', api + '/review/' + quote(isbn, safe=''), append=True)
        if username in actual:
            raise RuntimeError('Deleted review is still present.')

    names = ['githubrepo', 'getallbooks', 'getbooksbyISBN', 'getbooksbyauthor', 'getbooksbytitle', 'getbookreview', 'register', 'login', 'reviewadded', 'deletereview']
    sections = ['# Assignment responses\n\nCommands and outputs below were captured from real requests. Copy each question’s command and output into its answer box.\n']
    for number, name in enumerate(names, 1):
        content = '```text\n' + collected[name] + '```' if name in collected else 'Pending: rerun with `--repo OWNER/REPOSITORY` after publishing your fork.'
        sections.append(f'## Question {number} — {name}\n\n{content}\n')
    sections.append('## Question 11 — general.js URL\n\n' + (general_url or 'Pending: publish your fork and rerun with `--repo OWNER/REPOSITORY`.') + '\n')
    (output / 'ANSWERS.md').write_text('\n'.join(sections), encoding='utf-8')
    print(f'Saved {len(collected)} evidence files and ANSWERS.md in {output}')


if __name__ == '__main__':
    main()
