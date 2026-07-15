import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { execFileSync } from 'node:child_process';
import { rmSync, existsSync } from 'node:fs';
import path from 'node:path';
import { hashPassword } from '../src/lib/auth.ts';

process.env.DATABASE_URL = 'file:./test.db';
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-that-is-long-enough';
process.env.CLIENT_URL = 'http://localhost:5173';

vi.setConfig({ hookTimeout: 60000, testTimeout: 60000 });

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
  const schemaEnginePath = path.resolve(__dirname, '../../node_modules/@prisma/engines/schema-engine-windows.exe');
  const serverDirectory = path.resolve(__dirname, '..');

  execFileSync(schemaEnginePath, ['cli', '--datasource', 'file:./prisma/test.db', 'create-database'], {
    cwd: serverDirectory,
    stdio: 'inherit',
  });

  execFileSync(process.execPath, [prismaCliPath, 'migrate', 'deploy'], {
    cwd: serverDirectory,
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

  it('creates a verification token for the new user', async () => {
    const token = await prisma.emailVerificationToken.findFirst({
      where: { user: { email: 'qa@example.com' } },
      orderBy: { createdAt: 'desc' },
    });

    expect(token?.token).toBeTruthy();
    expect(token?.expiresAt.getTime()).toBeGreaterThan(Date.now());
  });

  it('rejects login with invalid credentials', async () => {
    const response = await request(app).post('/api/auth/login').set('Cookie', `csrf_token=${csrfToken}`).set('X-CSRF-Token', csrfToken).send({ email: 'qa@example.com', password: 'WrongPass' });
    expect(response.status).toBe(401);
    expect(response.body.error).toMatchObject({ code: 'INVALID_CREDENTIALS', message: 'Invalid credentials' });
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
    expect(profile.body.user.profile.email).toBe('qa@example.com');
    expect(profile.body.user.permissions).toContain('auth:me');
  });

  it('supports email verification and password reset flows', async () => {
    const verification = await prisma.emailVerificationToken.findFirst({
      where: { user: { email: 'qa@example.com' } },
      orderBy: { createdAt: 'desc' },
    });

    const verify = await request(app)
      .post('/api/auth/verify-email')
      .set('Cookie', `csrf_token=${csrfToken}`)
      .set('X-CSRF-Token', csrfToken)
      .send({ token: verification?.token });

    expect(verify.status).toBe(200);

    const forgot = await request(app)
      .post('/api/auth/forgot-password')
      .set('Cookie', `csrf_token=${csrfToken}`)
      .set('X-CSRF-Token', csrfToken)
      .send({ email: 'qa@example.com' });

    expect(forgot.status).toBe(200);

    const reset = await prisma.passwordResetToken.findFirst({
      where: { user: { email: 'qa@example.com' } },
      orderBy: { createdAt: 'desc' },
    });

    const resetResponse = await request(app)
      .post('/api/auth/reset-password')
      .set('Cookie', `csrf_token=${csrfToken}`)
      .set('X-CSRF-Token', csrfToken)
      .send({ token: reset?.token, password: 'NewSecurePass123!' });

    expect(resetResponse.status).toBe(200);
  });

  it('blocks suspended users from logging in', async () => {
    await prisma.user.update({ where: { email: 'qa@example.com' }, data: { status: 'SUSPENDED' } });
    const response = await request(app)
      .post('/api/auth/login')
      .set('Cookie', `csrf_token=${csrfToken}`)
      .set('X-CSRF-Token', csrfToken)
      .send({ email: 'qa@example.com', password: 'NewSecurePass123!' });

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('ACCOUNT_INACTIVE');
  });

  it('blocks non-admin users from listing all users', async () => {
    await request(app)
      .post('/api/auth/register')
      .set('Cookie', `csrf_token=${csrfToken}`)
      .set('X-CSRF-Token', csrfToken)
      .send({ name: 'Second User', email: 'second@example.com', password: 'SecurePass123!' });

    const login = await request(app)
      .post('/api/auth/login')
      .set('Cookie', `csrf_token=${csrfToken}`)
      .set('X-CSRF-Token', csrfToken)
      .send({ email: 'second@example.com', password: 'SecurePass123!' });

    const response = await request(app).get('/api/users').set('Cookie', login.headers['set-cookie']);
    expect(response.status).toBe(403);
  });

  it('allows admin users to access the admin dashboard APIs', async () => {
    await prisma.user.create({
      data: {
        name: 'Admin User',
        email: 'admin-check@example.com',
        passwordHash: await hashPassword('SecurePass123!'),
        role: 'ADMIN',
        settings: { create: {} },
      },
    });

    const login = await request(app)
      .post('/api/auth/login')
      .set('Cookie', `csrf_token=${csrfToken}`)
      .set('X-CSRF-Token', csrfToken)
      .send({ email: 'admin-check@example.com', password: 'SecurePass123!' });

    expect(login.status).toBe(200);

    const dashboard = await request(app).get('/api/admin/dashboard').set('Cookie', login.headers['set-cookie']);
    expect(dashboard.status).toBe(200);
    expect(dashboard.body.metrics.totalUsers).toBeGreaterThanOrEqual(1);

    const users = await request(app).get('/api/admin/users').set('Cookie', login.headers['set-cookie']);
    expect(users.status).toBe(200);
    expect(Array.isArray(users.body.users)).toBe(true);
  });

  it('creates a madrassa profile and branch scoped to the workspace', async () => {
    const madrassaOwnerPassword = 'SecurePass123!';
    const madrassaOwner = await prisma.user.create({
      data: {
        name: 'Madrassa Owner',
        email: 'madrassa-owner@example.com',
        passwordHash: await hashPassword(madrassaOwnerPassword),
        role: 'USER',
        status: 'ACTIVE',
        emailVerified: true,
        settings: { create: {} },
      },
    });
    await prisma.organization.create({
      data: {
        name: 'Madrassa Workspace',
        ownerId: madrassaOwner.id,
        members: { create: { userId: madrassaOwner.id, role: 'OWNER' } },
      },
    });

    const profileLogin = await request(app)
      .post('/api/auth/login')
      .set('Cookie', `csrf_token=${csrfToken}`)
      .set('X-CSRF-Token', csrfToken)
      .send({ email: 'madrassa-owner@example.com', password: madrassaOwnerPassword });

    const profile = await request(app)
      .put('/api/madrassa/profile')
      .set('Cookie', [...(profileLogin.headers['set-cookie'] ?? []), `csrf_token=${csrfToken}`])
      .set('X-CSRF-Token', csrfToken)
      .send({
        name: 'Northstar Madrassa',
        registrationNo: 'REG-001',
        address: 'Main Road',
        phone: '123456789',
        email: 'info@example.com',
        website: 'https://example.com',
        principalName: 'Principal One',
        establishmentYear: 2020,
        description: 'Primary madrassa',
      });

    expect(profile.status).toBe(200);
    expect(profile.body.madrassa.name).toBe('Northstar Madrassa');

    const branch = await request(app)
      .post('/api/madrassa/branches')
      .set('Cookie', [...(profileLogin.headers['set-cookie'] ?? []), `csrf_token=${csrfToken}`])
      .set('X-CSRF-Token', csrfToken)
      .send({ name: 'Main Branch', address: 'Branch Address', contactInfo: '555-0100', managerName: 'Branch Manager' });

    expect(branch.status).toBe(201);
    expect(branch.body.branch.name).toBe('Main Branch');

    const branches = await request(app).get('/api/madrassa/branches').set('Cookie', profileLogin.headers['set-cookie']);
    expect(branches.status).toBe(200);
    expect(branches.body.branches).toHaveLength(1);
  });

  it('creates and transfers a student within the madrassa workspace', async () => {
    const owner = await prisma.user.create({
      data: {
        name: 'Student Owner',
        email: 'student-owner@example.com',
        passwordHash: await hashPassword('SecurePass123!'),
        role: 'USER',
        status: 'ACTIVE',
        emailVerified: true,
        settings: { create: {} },
      },
    });
    const organization = await prisma.organization.create({
      data: {
        name: 'Student Workspace',
        ownerId: owner.id,
        members: { create: { userId: owner.id, role: 'OWNER' } },
      },
    });
    const madrassa = await prisma.madrassa.create({ data: { organizationId: organization.id, name: 'Student Madrassa' } });
    const branch = await prisma.branch.create({ data: { madrassaId: madrassa.id, name: 'North Branch' } });

    const login = await request(app)
      .post('/api/auth/login')
      .set('Cookie', `csrf_token=${csrfToken}`)
      .set('X-CSRF-Token', csrfToken)
      .send({ email: 'student-owner@example.com', password: 'SecurePass123!' });

    const admission = await request(app)
      .post('/api/students/admission')
      .set('Cookie', [...(login.headers['set-cookie'] ?? []), `csrf_token=${csrfToken}`])
      .set('X-CSRF-Token', csrfToken)
      .send({
        fullName: 'Ali Hassan',
        fatherName: 'Hassan',
        dateOfBirth: '2012-01-01',
        gender: 'Male',
        branchId: branch.id,
        academicYearId: null,
        guardian: { name: 'Guardian One', relationship: 'Father', phone: '03001234567' },
      });

    expect(admission.status).toBe(201);
    expect(admission.body.student.registrationNumber).toMatch(/^STU-\d{4}-\d{4}$/);

    const transfer = await request(app)
      .post(`/api/students/${admission.body.student.id}/transfer`)
      .set('Cookie', [...(login.headers['set-cookie'] ?? []), `csrf_token=${csrfToken}`])
      .set('X-CSRF-Token', csrfToken)
      .send({ newBranchId: branch.id, reason: 'Class placement' });

    expect(transfer.status).toBe(201);

    const profile = await request(app).get(`/api/students/${admission.body.student.id}`).set('Cookie', login.headers['set-cookie']);
    expect(profile.status).toBe(200);
    expect(profile.body.student.transfers).toHaveLength(1);
  });

  it('marks attendance, prevents duplicates, and returns student attendance summaries', async () => {
    const owner = await prisma.user.create({
      data: {
        name: 'Attendance Owner',
        email: 'attendance-owner@example.com',
        passwordHash: await hashPassword('SecurePass123!'),
        role: 'USER',
        status: 'ACTIVE',
        emailVerified: true,
        settings: { create: {} },
      },
    });
    const organization = await prisma.organization.create({
      data: {
        name: 'Attendance Workspace',
        ownerId: owner.id,
        members: { create: { userId: owner.id, role: 'OWNER' } },
      },
    });
    const madrassa = await prisma.madrassa.create({ data: { organizationId: organization.id, name: 'Attendance Madrassa' } });
    const branch = await prisma.branch.create({ data: { madrassaId: madrassa.id, name: 'Attendance Branch' } });
    const student = await prisma.student.create({
      data: {
        madrassaId: madrassa.id,
        registrationNumber: `STU-2026-${Date.now()}`,
        fullName: 'Attendance Student',
        branchId: branch.id,
        status: 'ACTIVE',
        admissionDate: new Date(),
      },
    });

    const login = await request(app)
      .post('/api/auth/login')
      .set('Cookie', `csrf_token=${csrfToken}`)
      .set('X-CSRF-Token', csrfToken)
      .send({ email: 'attendance-owner@example.com', password: 'SecurePass123!' });

    const mark = await request(app)
      .post('/api/attendance')
      .set('Cookie', [...(login.headers['set-cookie'] ?? []), `csrf_token=${csrfToken}`])
      .set('X-CSRF-Token', csrfToken)
      .send({
        date: '2026-07-01',
        branchId: branch.id,
        records: [{ studentId: student.id, status: 'PRESENT' }],
      });

    expect(mark.status).toBe(201);
    expect(mark.body.records).toHaveLength(1);

    const duplicate = await request(app)
      .post('/api/attendance')
      .set('Cookie', [...(login.headers['set-cookie'] ?? []), `csrf_token=${csrfToken}`])
      .set('X-CSRF-Token', csrfToken)
      .send({
        date: '2026-07-01',
        branchId: branch.id,
        records: [{ studentId: student.id, status: 'ABSENT' }],
      });

    expect(duplicate.status).toBe(409);

    const studentReport = await request(app)
      .get(`/api/attendance/student/${student.id}`)
      .set('Cookie', login.headers['set-cookie']);

    expect(studentReport.status).toBe(200);
    expect(studentReport.body.summary.totalDays).toBe(1);
    expect(studentReport.body.summary.presentDays).toBe(1);

    const dailyReport = await request(app)
      .get('/api/attendance/reports/daily?date=2026-07-01')
      .set('Cookie', login.headers['set-cookie']);

    expect(dailyReport.status).toBe(200);
    expect(dailyReport.body.summary.present).toBe(1);
  });
});
