# Certificates Guide

## Overview

The certificates module issues printable, verifiable certificates for students.

## Screens

- `/certificates`
- `/certificates/templates`
- `/certificates/generate`
- `/certificates/:id`
- `/verify-certificate/:code`

## Flow

1. Create a template.
2. Select a student and generate a certificate.
3. Print or download the issued certificate.
4. Share the public verification link.

## API endpoints

- `GET /api/certificates/templates`
- `POST /api/certificates/templates`
- `PATCH /api/certificates/templates/:id`
- `DELETE /api/certificates/templates/:id`
- `GET /api/certificates`
- `POST /api/certificates/generate`
- `GET /api/certificates/:id`
- `DELETE /api/certificates/:id`
- `GET /api/certificates/verify/:code`
- `GET /api/certificates/student/:id`
