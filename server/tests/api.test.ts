import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { execFileSync } from 'node:child_process';
import { rmSync, existsSync } from 'node:fs';
import path from 'node:path';

process.env.DATABASE_URL = 'file:./test.db';
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-that-is-long-enough';
process.env.CLIENT_URL = 'http://localhost:5173';

let app: any;
let prisma: any;
let csrfToken = '';

beforeAll(async () => {
  const serverModule = await import('../src/server.ts');
  const prismaModule = await import('../src/lib/prisma.ts');

  app = serverModule.app;
  prisma = prismaModule.prisma;

  const dbPath = path.resolve(__dirname, '../prisma/test.db');
  if (existsSync(dbPath)) {
    rmSync(dbPath);
  }

  const prismaCliPath = path.resolve(__dirname, '../../node_modules/prisma/build/index.js');

  execFileSync(process.execPath, [prismaCliPath, 'db', 'push', '--skip-generate'], {
    cwd: path.resolve(__dirname, '..'),
    env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL! },
    stdio: 'inherit',
  });

  await prisma.$connect();
  await prisma.$executeRaw`PRAGMA foreign_keys = ON`;
  const csrf = await request(app).get('/api/auth/csrf-token');
  csrfToken = csrf.body.csrfToken;
});

afterAll(async () => {
  await prisma.$disconnect();
  const dbPath = path.resolve(__dirname, '../prisma/test.db');
  if (existsSync(dbPath)) {
    try {
      rmSync(dbPath);
    } catch {
      // Ignore Windows file-lock cleanup issues in test runs.
    }
  }
});

describe('Authentication and users API', () => {
  it('registers a new user and returns a success response', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .set('Cookie', `csrf_token=${csrfToken}`)
      .set('X-CSRF-Token', csrfToken)
      .send({ name: 'QA Tester', email: 'qa@example.com', password: 'SecurePass123!' });

    expect(response.status).toBe(201);
    expect(response.body.user).toMatchObject({ name: 'QA Tester', email: 'qa@example.com' });
    expect(response.body.message).toContain('Registration successful');
  });

  it('rejects login with invalid credentials', async () => {
    const response = await request(app).post('/api/auth/login').set('Cookie', `csrf_token=${csrfToken}`).set('X-CSRF-Token', csrfToken).send({ email: 'qa@example.com', password: 'WrongPass' });
    expect(response.status).toBe(401);
    expect(response.body.message).toBe('Invalid credentials');
  });

  it('allows a registered user to log in and retrieve profile data', async () => {
    const login = await request(app).post('/api/auth/login').set('Cookie', `csrf_token=${csrfToken}`).set('X-CSRF-Token', csrfToken).send({ email: 'qa@example.com', password: 'SecurePass123!' });

    expect(login.status).toBe(200);
    expect(login.body.user.email).toBe('qa@example.com');
    expect(login.headers['set-cookie']).toBeDefined();

    const profile = await request(app)
      .get('/api/auth/me')
      .set('Cookie', login.headers['set-cookie']);

    expect(profile.status).toBe(200);
    expect(profile.body.user.email).toBe('qa@example.com');
  });

  it('blocks non-admin users from listing all users', async () => {
    const login = await request(app).post('/api/auth/login').set('Cookie', `csrf_token=${csrfToken}`).set('X-CSRF-Token', csrfToken).send({ email: 'qa@example.com', password: 'SecurePass123!' });
    const response = await request(app).get('/api/users').set('Cookie', login.headers['set-cookie']);
    expect(response.status).toBe(403);
  });
});
