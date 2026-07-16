# Library Module

The library module manages books, copies, members, circulation, and fines inside the existing madrassa workspace model.

## Screens

- `/library`
- `/library/books`
- `/library/books/:id`
- `/library/categories`
- `/library/authors`
- `/library/publishers`
- `/library/members`
- `/library/issues`
- `/library/reports`

## Core flows

- Create book categories, authors, and publishers.
- Register books with a unique book code.
- Add physical copies with barcodes and accession numbers.
- Auto-create library members from students and employees.
- Issue and return copies with due-date tracking.
- Record fines and optionally post them into finance.

## API summary

- `GET /api/library/categories`
- `POST /api/library/categories`
- `PATCH /api/library/categories/:id`
- `DELETE /api/library/categories/:id`
- `GET /api/library/books`
- `POST /api/library/books`
- `GET /api/library/books/:id`
- `PATCH /api/library/books/:id`
- `DELETE /api/library/books/:id`
- `POST /api/library/books/:id/copies`
- `GET /api/library/members`
- `GET /api/library/issues`
- `POST /api/library/issues`
- `POST /api/library/issues/:id/return`
- `GET /api/library/reports/books`
- `GET /api/library/reports/issues`
- `GET /api/library/reports/fines`
