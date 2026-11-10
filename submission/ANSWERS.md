# Assignment responses

Commands and outputs below were captured from real requests. Copy each question’s command and output into its answer box.

## Question 1 — githubrepo

```text
$ curl --silent --show-error --fail-with-body --max-time 20 -H 'Accept: application/vnd.github+json' https://api.github.com/repos/revanthnrc-alt/expressBookReviews | python3 -c 'import json,sys; r=json.load(sys.stdin); print(json.dumps({k:r[k] for k in ("full_name","html_url","fork","default_branch")} | {k:{"full_name":r[k]["full_name"],"html_url":r[k]["html_url"]} for k in ("parent","source")}, indent=2))'
{
  "full_name": "revanthnrc-alt/expressBookReviews",
  "html_url": "https://github.com/revanthnrc-alt/expressBookReviews",
  "fork": true,
  "default_branch": "main",
  "parent": {
    "full_name": "ibm-developer-skills-network/expressBookReviews",
    "html_url": "https://github.com/ibm-developer-skills-network/expressBookReviews"
  },
  "source": {
    "full_name": "ibm-developer-skills-network/expressBookReviews",
    "html_url": "https://github.com/ibm-developer-skills-network/expressBookReviews"
  }
}
```

## Question 2 — getallbooks

```text
$ curl --silent --show-error --fail-with-body --max-time 20 http://127.0.0.1:5000/
{
  "1": {
    "author": "Chinua Achebe",
    "title": "Things Fall Apart",
    "reviews": {}
  },
  "2": {
    "author": "Hans Christian Andersen",
    "title": "Fairy tales",
    "reviews": {}
  },
  "3": {
    "author": "Dante Alighieri",
    "title": "The Divine Comedy",
    "reviews": {}
  },
  "4": {
    "author": "Unknown",
    "title": "The Epic Of Gilgamesh",
    "reviews": {}
  },
  "5": {
    "author": "Unknown",
    "title": "The Book Of Job",
    "reviews": {}
  },
  "6": {
    "author": "Unknown",
    "title": "One Thousand and One Nights",
    "reviews": {}
  },
  "7": {
    "author": "Unknown",
    "title": "Njál's Saga",
    "reviews": {}
  },
  "8": {
    "author": "Jane Austen",
    "title": "Pride and Prejudice",
    "reviews": {}
  },
  "9": {
    "author": "Honoré de Balzac",
    "title": "Le Père Goriot",
    "reviews": {}
  },
  "10": {
    "author": "Samuel Beckett",
    "title": "Molloy, Malone Dies, The Unnamable, the trilogy",
    "reviews": {}
  }
}
```

## Question 3 — getbooksbyISBN

```text
$ curl --silent --show-error --fail-with-body --max-time 20 http://127.0.0.1:5000/isbn/1
{
  "author": "Chinua Achebe",
  "title": "Things Fall Apart",
  "reviews": {}
}
```

## Question 4 — getbooksbyauthor

```text
$ curl --silent --show-error --fail-with-body --max-time 20 http://127.0.0.1:5000/author/Unknown
{
  "4": {
    "author": "Unknown",
    "title": "The Epic Of Gilgamesh",
    "reviews": {}
  },
  "5": {
    "author": "Unknown",
    "title": "The Book Of Job",
    "reviews": {}
  },
  "6": {
    "author": "Unknown",
    "title": "One Thousand and One Nights",
    "reviews": {}
  },
  "7": {
    "author": "Unknown",
    "title": "Njál's Saga",
    "reviews": {}
  }
}
```

## Question 5 — getbooksbytitle

```text
$ curl --silent --show-error --fail-with-body --max-time 20 http://127.0.0.1:5000/title/Things%20Fall%20Apart
{
  "1": {
    "author": "Chinua Achebe",
    "title": "Things Fall Apart",
    "reviews": {}
  }
}
```

## Question 6 — getbookreview

```text
$ curl --silent --show-error --fail-with-body --max-time 20 http://127.0.0.1:5000/review/1
{}
```

## Question 7 — register

```text
$ curl --silent --show-error --fail-with-body --max-time 20 -X POST -H 'Content-Type: application/json' -d '{"username": "bookstore_student_315a34a8", "password": "Bookstore-demo-password"}' http://127.0.0.1:5000/register
{
  "message": "User successfully registered. You can now log in."
}
```

## Question 8 — login

```text
$ curl --silent --show-error --fail-with-body --max-time 20 -X POST -H 'Content-Type: application/json' -c cookies.txt -d '{"username": "bookstore_student_315a34a8", "password": "Bookstore-demo-password"}' http://127.0.0.1:5000/customer/login
{
  "message": "User successfully logged in.",
  "username": "bookstore_student_315a34a8"
}
```

## Question 9 — reviewadded

```text
$ curl --silent --show-error --fail-with-body --max-time 20 -X PUT -b cookies.txt -H 'Content-Type: application/json' -d '{"review": "An engaging book with memorable characters."}' http://127.0.0.1:5000/customer/auth/review/1
{
  "message": "Review successfully added.",
  "reviews": {
    "bookstore_student_315a34a8": "An engaging book with memorable characters."
  }
}

$ curl --silent --show-error --fail-with-body --max-time 20 http://127.0.0.1:5000/review/1
{
  "bookstore_student_315a34a8": "An engaging book with memorable characters."
}

$ curl --silent --show-error --fail-with-body --max-time 20 -X PUT -b cookies.txt -H 'Content-Type: application/json' -d '{"review": "Updated review: an engaging book with memorable characters and thoughtful themes."}' http://127.0.0.1:5000/customer/auth/review/1
{
  "message": "Review successfully updated.",
  "reviews": {
    "bookstore_student_315a34a8": "Updated review: an engaging book with memorable characters and thoughtful themes."
  }
}

$ curl --silent --show-error --fail-with-body --max-time 20 http://127.0.0.1:5000/review/1
{
  "bookstore_student_315a34a8": "Updated review: an engaging book with memorable characters and thoughtful themes."
}
```

## Question 10 — deletereview

```text
$ curl --silent --show-error --fail-with-body --max-time 20 -X DELETE -b cookies.txt http://127.0.0.1:5000/customer/auth/review/1
{
  "message": "Review successfully deleted.",
  "reviews": {}
}

$ curl --silent --show-error --fail-with-body --max-time 20 http://127.0.0.1:5000/review/1
{}
```

## Question 11 — general.js URL

https://github.com/revanthnrc-alt/expressBookReviews/blob/main/final_project/router/general.js
