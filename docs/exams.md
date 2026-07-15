# Exams & Results Guide

## Overview

The exams module manages exam creation, subject setup, marks entry, automatic grading, ranking, and printable result cards.

## Screens

- `/exams`
- `/exams/create`
- `/exams/:id`
- `/exams/marks-entry`
- `/exams/results`
- `/exams/result-card`

## Flow

1. Create an exam.
2. Add subjects with total and passing marks.
3. Enter marks for students.
4. The system calculates grades and positions.
5. Review results or print a result card.

## API endpoints

- `GET /api/exams`
- `POST /api/exams`
- `PATCH /api/exams/:id`
- `DELETE /api/exams/:id`
- `GET /api/exams/:id/subjects`
- `POST /api/exams/:id/subjects`
- `GET /api/exams/:id/results`
- `POST /api/exams/:id/results`
- `GET /api/exams/student/:id`
- `GET /api/exams/result-card/:studentId/:examId`
- `GET /api/exams/reports/class`
- `GET /api/exams/reports/subject`
