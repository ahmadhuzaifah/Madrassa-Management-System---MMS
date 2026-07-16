import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { execFileSync } from 'node:child_process';
import { rmSync, existsSync } from 'node:fs';
import path from 'node:path';
import { createToken, hashPassword } from '../src/lib/auth.ts';

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

  it('creates fee structures, assigns fees, posts payments, and calculates outstanding balances', async () => {
    const owner = await prisma.user.create({
      data: {
        name: 'Fee Owner',
        email: 'fee-owner@example.com',
        passwordHash: await hashPassword('SecurePass123!'),
        role: 'USER',
        status: 'ACTIVE',
        emailVerified: true,
        settings: { create: {} },
      },
    });
    const organization = await prisma.organization.create({
      data: { name: 'Fee Workspace', ownerId: owner.id, members: { create: { userId: owner.id, role: 'OWNER' } } },
    });
    const madrassa = await prisma.madrassa.create({ data: { organizationId: organization.id, name: 'Fee Madrassa' } });
    const branch = await prisma.branch.create({ data: { madrassaId: madrassa.id, name: 'Fee Branch' } });
    const academicYear = await prisma.academicYear.create({ data: { madrassaId: madrassa.id, name: '2026', startDate: new Date('2026-01-01'), endDate: new Date('2026-12-31') } });
    const department = await prisma.department.create({ data: { madrassaId: madrassa.id, name: 'Hifz' } });
    const program = await prisma.program.create({ data: { madrassaId: madrassa.id, departmentId: department.id, name: 'Hifz Basic' } });
    const classRoom = await prisma.classRoom.create({ data: { madrassaId: madrassa.id, programId: program.id, academicYearId: academicYear.id, branchId: branch.id, name: 'Level 1' } });
    const student = await prisma.student.create({ data: { madrassaId: madrassa.id, registrationNumber: `STU-FEE-${Date.now()}`, fullName: 'Fee Student', branchId: branch.id, programId: program.id, classRoomId: classRoom.id, academicYearId: academicYear.id, status: 'ACTIVE', admissionDate: new Date() } });

    const ownerCookie = `token=${createToken({ sub: owner.id, role: 'USER', ver: 0 })}`;

    const structure = await request(app)
      .post('/api/fees/structures')
      .set('Cookie', [ownerCookie, `csrf_token=${csrfToken}`])
      .set('X-CSRF-Token', csrfToken)
      .send({ name: 'Monthly Hifz Fee', amount: 5000, frequency: 'MONTHLY', branchId: branch.id, academicYearId: academicYear.id, programId: program.id, classRoomId: classRoom.id });

    expect(structure.status).toBe(201);

    const assignment = await request(app)
      .post(`/api/fees/student/${student.id}/assign`)
      .set('Cookie', [ownerCookie, `csrf_token=${csrfToken}`])
      .set('X-CSRF-Token', csrfToken)
      .send({ feeStructureId: structure.body.structure.id, amount: 5000, discountAmount: 500, startDate: '2026-07-01' });

    expect(assignment.status).toBe(201);

    const payment = await request(app)
      .post('/api/fees/payments')
      .set('Cookie', [ownerCookie, `csrf_token=${csrfToken}`])
      .set('X-CSRF-Token', csrfToken)
      .send({ studentId: student.id, amount: 1000, paymentMethod: 'CASH', paymentDate: '2026-07-02' });

    expect(payment.status).toBe(201);
    expect(payment.body.receipt.receiptNumber).toMatch(/^RCPT-/);

    const feeProfile = await request(app).get(`/api/fees/student/${student.id}`).set('Cookie', ownerCookie);
    expect(feeProfile.status).toBe(200);
    expect(feeProfile.body.summary.totalAssigned).toBe(4500);
    expect(feeProfile.body.summary.outstanding).toBe(3500);

    const outstanding = await request(app).get('/api/fees/reports/outstanding').set('Cookie', ownerCookie);
    expect(outstanding.status).toBe(200);
    expect(outstanding.body.rows.some((row: { student: { id: string }; due: number }) => row.student.id === student.id && row.due === 3500)).toBe(true);

    const invoice = await request(app).get('/api/fees/invoices').set('Cookie', ownerCookie);
    expect(invoice.status).toBe(200);
    expect(invoice.body.invoices.length).toBeGreaterThanOrEqual(1);

    const otherOwner = await prisma.user.create({
      data: {
        name: 'Fee Other Owner',
        email: 'fee-other-owner@example.com',
        passwordHash: await hashPassword('SecurePass123!'),
        role: 'USER',
        status: 'ACTIVE',
        emailVerified: true,
        settings: { create: {} },
      },
    });
    const otherOrg = await prisma.organization.create({ data: { name: 'Other Fee Workspace', ownerId: otherOwner.id, members: { create: { userId: otherOwner.id, role: 'OWNER' } } } });
    await prisma.madrassa.create({ data: { organizationId: otherOrg.id, name: 'Other Fee Madrassa' } });
    const otherCookie = `token=${createToken({ sub: otherOwner.id, role: 'USER', ver: 0 })}`;
    const isolation = await request(app).get('/api/fees/structures').set('Cookie', otherCookie);
    expect(isolation.status).toBe(200);
    expect(isolation.body.structures).toHaveLength(0);
  });

  it('creates exams, enters marks, and generates result cards', async () => {
    const owner = await prisma.user.create({
      data: {
        name: 'Exam Owner',
        email: 'exam-owner@example.com',
        passwordHash: await hashPassword('SecurePass123!'),
        role: 'USER',
        status: 'ACTIVE',
        emailVerified: true,
        settings: { create: {} },
      },
    });
    const organization = await prisma.organization.create({ data: { name: 'Exam Workspace', ownerId: owner.id, members: { create: { userId: owner.id, role: 'OWNER' } } } });
    const madrassa = await prisma.madrassa.create({ data: { organizationId: organization.id, name: 'Exam Madrassa' } });
    const branch = await prisma.branch.create({ data: { madrassaId: madrassa.id, name: 'Exam Branch' } });
    const academicYear = await prisma.academicYear.create({ data: { madrassaId: madrassa.id, name: '2026', startDate: new Date('2026-01-01'), endDate: new Date('2026-12-31') } });
    const department = await prisma.department.create({ data: { madrassaId: madrassa.id, name: 'School' } });
    const program = await prisma.program.create({ data: { madrassaId: madrassa.id, departmentId: department.id, name: 'Grade 1' } });
    const classRoom = await prisma.classRoom.create({ data: { madrassaId: madrassa.id, programId: program.id, academicYearId: academicYear.id, branchId: branch.id, name: 'Class A' } });
    const subject = await prisma.subject.create({ data: { madrassaId: madrassa.id, programId: program.id, classRoomId: classRoom.id, name: 'Quran', code: 'QRN' } });
    const student1 = await prisma.student.create({ data: { madrassaId: madrassa.id, registrationNumber: `STU-EXAM-${Date.now()}-1`, fullName: 'Exam Student One', branchId: branch.id, programId: program.id, classRoomId: classRoom.id, academicYearId: academicYear.id, status: 'ACTIVE', admissionDate: new Date() } });
    const student2 = await prisma.student.create({ data: { madrassaId: madrassa.id, registrationNumber: `STU-EXAM-${Date.now()}-2`, fullName: 'Exam Student Two', branchId: branch.id, programId: program.id, classRoomId: classRoom.id, academicYearId: academicYear.id, status: 'ACTIVE', admissionDate: new Date() } });
    await prisma.gradeScale.create({ data: { organizationId: organization.id, name: 'Default', minPercentage: 90, maxPercentage: 100, grade: 'A+', description: 'Top' } });
    await prisma.gradeScale.create({ data: { organizationId: organization.id, name: 'A', minPercentage: 80, maxPercentage: 89.99, grade: 'A' } });

    const ownerCookie = `token=${createToken({ sub: owner.id, role: 'USER', ver: 0 })}`;

    const examResponse = await request(app)
      .post('/api/exams')
      .set('Cookie', [ownerCookie, `csrf_token=${csrfToken}`])
      .set('X-CSRF-Token', csrfToken)
      .send({ name: 'Annual Examination 2026', examType: 'ANNUAL', branchId: branch.id, academicYearId: academicYear.id, startDate: '2026-07-01', endDate: '2026-07-10' });

    expect(examResponse.status).toBe(201);

    const subjectResponse = await request(app)
      .post(`/api/exams/${examResponse.body.exam.id}/subjects`)
      .set('Cookie', [ownerCookie, `csrf_token=${csrfToken}`])
      .set('X-CSRF-Token', csrfToken)
      .send({ subjectId: subject.id, totalMarks: 100, passingMarks: 40 });

    expect(subjectResponse.status).toBe(201);

    const marksResponse = await request(app)
      .post(`/api/exams/${examResponse.body.exam.id}/results`)
      .set('Cookie', [ownerCookie, `csrf_token=${csrfToken}`])
      .set('X-CSRF-Token', csrfToken)
      .send({
        results: [
          { studentId: student1.id, subjectId: subject.id, obtainedMarks: 92, remarks: 'Excellent' },
          { studentId: student2.id, subjectId: subject.id, obtainedMarks: 76, remarks: 'Good' },
        ],
      });

    expect(marksResponse.status).toBe(201);

    const resultCard = await request(app).get(`/api/exams/result-card/${student1.id}/${examResponse.body.exam.id}`).set('Cookie', ownerCookie);
    expect(resultCard.status).toBe(200);
    expect(resultCard.body.card.grade).toBe('A+');
    expect(resultCard.body.results).toHaveLength(1);

    const examResults = await request(app).get(`/api/exams/student/${student1.id}`).set('Cookie', ownerCookie);
    expect(examResults.status).toBe(200);
    expect(examResults.body.cards).toHaveLength(1);

    const classReport = await request(app).get(`/api/exams/reports/class?examId=${examResponse.body.exam.id}`).set('Cookie', ownerCookie);
    expect(classReport.status).toBe(200);
    expect(classReport.body.cards).toHaveLength(2);

    const otherOwner = await prisma.user.create({ data: { name: 'Exam Other Owner', email: 'exam-other-owner@example.com', passwordHash: await hashPassword('SecurePass123!'), role: 'USER', status: 'ACTIVE', emailVerified: true, settings: { create: {} } } });
    const otherOrg = await prisma.organization.create({ data: { name: 'Other Exam Workspace', ownerId: otherOwner.id, members: { create: { userId: otherOwner.id, role: 'OWNER' } } } });
    await prisma.madrassa.create({ data: { organizationId: otherOrg.id, name: 'Other Exam Madrassa' } });
    const otherCookie = `token=${createToken({ sub: otherOwner.id, role: 'USER', ver: 0 })}`;
    const isolation = await request(app).get('/api/exams').set('Cookie', otherCookie);
    expect(isolation.status).toBe(200);
    expect(isolation.body.exams).toHaveLength(0);
  });

  it('creates certificate templates, generates certificates, verifies them, and enforces isolation', async () => {
    const owner = await prisma.user.create({
      data: {
        name: 'Certificate Owner',
        email: 'cert-owner@example.com',
        passwordHash: await hashPassword('SecurePass123!'),
        role: 'USER',
        status: 'ACTIVE',
        emailVerified: true,
        settings: { create: {} },
      },
    });
    const organization = await prisma.organization.create({ data: { name: 'Certificate Workspace', ownerId: owner.id, members: { create: { userId: owner.id, role: 'OWNER' } } } });
    const madrassa = await prisma.madrassa.create({ data: { organizationId: organization.id, name: 'Certificate Madrassa' } });
    const branch = await prisma.branch.create({ data: { madrassaId: madrassa.id, name: 'Certificate Branch' } });
    const academicYear = await prisma.academicYear.create({ data: { madrassaId: madrassa.id, name: '2026', startDate: new Date('2026-01-01'), endDate: new Date('2026-12-31') } });
    const department = await prisma.department.create({ data: { madrassaId: madrassa.id, name: 'Hifz' } });
    const program = await prisma.program.create({ data: { madrassaId: madrassa.id, departmentId: department.id, name: 'Hifz 1' } });
    const classRoom = await prisma.classRoom.create({ data: { madrassaId: madrassa.id, programId: program.id, academicYearId: academicYear.id, branchId: branch.id, name: 'Class A' } });
    const student = await prisma.student.create({ data: { madrassaId: madrassa.id, registrationNumber: `STU-CERT-${Date.now()}`, fullName: 'Certificate Student', branchId: branch.id, programId: program.id, classRoomId: classRoom.id, academicYearId: academicYear.id, status: 'ACTIVE', admissionDate: new Date() } });

    const ownerCookie = `token=${createToken({ sub: owner.id, role: 'USER', ver: 0 })}`;

    const template = await request(app)
      .post('/api/certificates/templates')
      .set('Cookie', [ownerCookie, `csrf_token=${csrfToken}`])
      .set('X-CSRF-Token', csrfToken)
      .send({ name: 'Completion Template', type: 'COURSE_COMPLETION', templateContent: 'Certificate for {{studentName}}' });

    expect(template.status).toBe(201);

    const generated = await request(app)
      .post('/api/certificates/generate')
      .set('Cookie', [ownerCookie, `csrf_token=${csrfToken}`])
      .set('X-CSRF-Token', csrfToken)
      .send({ studentId: student.id, templateId: template.body.template.id, type: 'COURSE_COMPLETION', title: 'Course Completion', description: 'Completed course' });

    expect(generated.status).toBe(201);
    expect(generated.body.certificate.certificateNumber).toMatch(/^CERT-2026-/);

    const detail = await request(app).get(`/api/certificates/${generated.body.certificate.id}`).set('Cookie', ownerCookie);
    expect(detail.status).toBe(200);

    const verify = await request(app).get(`/api/certificates/verify/${detail.body.certificate.verification.verificationCode}`);
    expect(verify.status).toBe(200);
    expect(verify.body.certificate.certificateNumber).toBe(generated.body.certificate.certificateNumber);

    const studentCertificates = await request(app).get(`/api/certificates/student/${student.id}`).set('Cookie', ownerCookie);
    expect(studentCertificates.status).toBe(200);
    expect(studentCertificates.body.certificates).toHaveLength(1);

    const revoke = await request(app)
      .delete(`/api/certificates/${generated.body.certificate.id}`)
      .set('Cookie', [ownerCookie, `csrf_token=${csrfToken}`])
      .set('X-CSRF-Token', csrfToken);
    expect(revoke.status).toBe(200);

    const revoked = await request(app).get(`/api/certificates/${generated.body.certificate.id}`).set('Cookie', ownerCookie);
    expect(revoked.body.certificate.status).toBe('REVOKED');

    const otherOwner = await prisma.user.create({ data: { name: 'Certificate Other Owner', email: 'cert-other-owner@example.com', passwordHash: await hashPassword('SecurePass123!'), role: 'USER', status: 'ACTIVE', emailVerified: true, settings: { create: {} } } });
    const otherOrg = await prisma.organization.create({ data: { name: 'Other Certificate Workspace', ownerId: otherOwner.id, members: { create: { userId: otherOwner.id, role: 'OWNER' } } } });
    await prisma.madrassa.create({ data: { organizationId: otherOrg.id, name: 'Other Certificate Madrassa' } });
    const otherCookie = `token=${createToken({ sub: otherOwner.id, role: 'USER', ver: 0 })}`;
    const isolation = await request(app).get('/api/certificates/templates').set('Cookie', otherCookie);
    expect(isolation.status).toBe(200);
    expect(isolation.body.templates).toHaveLength(0);
  });

  it('posts finance transactions, records donations and expenses, and preserves isolation', async () => {
    const owner = await prisma.user.create({
      data: {
        name: 'Finance Owner',
        email: 'finance-owner@example.com',
        passwordHash: await hashPassword('SecurePass123!'),
        role: 'USER',
        status: 'ACTIVE',
        emailVerified: true,
        settings: { create: {} },
      },
    });
    const organization = await prisma.organization.create({ data: { name: 'Finance Workspace', ownerId: owner.id, members: { create: { userId: owner.id, role: 'OWNER' } } } });
    const madrassa = await prisma.madrassa.create({ data: { organizationId: organization.id, name: 'Finance Madrassa' } });
    const otherOwner = await prisma.user.create({ data: { name: 'Finance Other Owner', email: 'finance-other-owner@example.com', passwordHash: await hashPassword('SecurePass123!'), role: 'USER', status: 'ACTIVE', emailVerified: true, settings: { create: {} } } });
    const otherOrg = await prisma.organization.create({ data: { name: 'Other Finance Workspace', ownerId: otherOwner.id, members: { create: { userId: otherOwner.id, role: 'OWNER' } } } });
    await prisma.madrassa.create({ data: { organizationId: otherOrg.id, name: 'Other Finance Madrassa' } });
    const cash = await prisma.account.create({ data: { organizationId: organization.id, accountCode: '1000', accountName: 'Cash', accountType: 'ASSET' } });
    const income = await prisma.account.create({ data: { organizationId: organization.id, accountCode: '4000', accountName: 'Donation Income', accountType: 'INCOME' } });
    const expenseAccount = await prisma.account.create({ data: { organizationId: organization.id, accountCode: '5000', accountName: 'Maintenance', accountType: 'EXPENSE' } });

    const ownerCookie = `token=${createToken({ sub: owner.id, role: 'USER', ver: 0 })}`;
    const financeAccount = await request(app)
      .post('/api/finance/accounts')
      .set('Cookie', [ownerCookie, `csrf_token=${csrfToken}`])
      .set('X-CSRF-Token', csrfToken)
      .send({ accountCode: '1100', accountName: 'Bank', accountType: 'ASSET', openingBalance: 0 });
    expect(financeAccount.status).toBe(201);

    const transaction = await request(app)
      .post('/api/finance/transactions')
      .set('Cookie', [ownerCookie, `csrf_token=${csrfToken}`])
      .set('X-CSRF-Token', csrfToken)
      .send({
        description: 'Donation received',
        transactionDate: '2026-07-01',
        lines: [
          { accountId: cash.id, debit: 1000, credit: 0 },
          { accountId: income.id, debit: 0, credit: 1000 },
        ],
      });
    expect(transaction.status).toBe(201);

    const donation = await request(app)
      .post('/api/finance/donations')
      .set('Cookie', [ownerCookie, `csrf_token=${csrfToken}`])
      .set('X-CSRF-Token', csrfToken)
      .send({ donorName: 'Ali', donationType: 'SADAQAH', amount: 500, paymentMethod: 'CASH', date: '2026-07-01' });
    expect(donation.status).toBe(201);
    expect(donation.body.receiptNumber).toMatch(/^DON-/);

    const expense = await request(app)
      .post('/api/finance/expenses')
      .set('Cookie', [ownerCookie, `csrf_token=${csrfToken}`])
      .set('X-CSRF-Token', csrfToken)
      .send({ categoryName: 'Maintenance', amount: 250, paymentMethod: 'CASH', paidTo: 'Vendor', expenseDate: '2026-07-02' });
    expect(expense.status).toBe(201);

    const ledger = await request(app).get('/api/finance/reports/ledger').set('Cookie', ownerCookie);
    expect(ledger.status).toBe(200);
    expect(ledger.body.lines.length).toBeGreaterThanOrEqual(2);

    const trial = await request(app).get('/api/finance/reports/trial-balance').set('Cookie', ownerCookie);
    expect(trial.status).toBe(200);
    expect(trial.body.rows.length).toBeGreaterThanOrEqual(3);

    const cashbook = await request(app).get('/api/finance/reports/cashbook').set('Cookie', ownerCookie);
    expect(cashbook.status).toBe(200);
    expect(cashbook.body.transactions.length).toBeGreaterThanOrEqual(1);

    const otherCookie = `token=${createToken({ sub: otherOwner.id, role: 'USER', ver: 0 })}`;
    const isolation = await request(app).get('/api/finance/accounts').set('Cookie', otherCookie);
    expect(isolation.status).toBe(200);
    expect(isolation.body.accounts).toHaveLength(0);
  });

  it('manages HR employees, attendance, leave, and payroll with finance integration', async () => {
    const owner = await prisma.user.create({
      data: {
        name: 'HR Owner',
        email: 'hr-owner@example.com',
        passwordHash: await hashPassword('SecurePass123!'),
        role: 'USER',
        status: 'ACTIVE',
        emailVerified: true,
        settings: { create: {} },
      },
    });
    const organization = await prisma.organization.create({ data: { name: 'HR Workspace', ownerId: owner.id, members: { create: { userId: owner.id, role: 'OWNER' } } } });
    await prisma.madrassa.create({ data: { organizationId: organization.id, name: 'HR Madrassa' } });
    const otherOwner = await prisma.user.create({ data: { name: 'HR Other Owner', email: 'hr-other-owner@example.com', passwordHash: await hashPassword('SecurePass123!'), role: 'USER', status: 'ACTIVE', emailVerified: true, settings: { create: {} } } });
    const otherOrg = await prisma.organization.create({ data: { name: 'Other HR Workspace', ownerId: otherOwner.id, members: { create: { userId: otherOwner.id, role: 'OWNER' } } } });
    await prisma.madrassa.create({ data: { organizationId: otherOrg.id, name: 'Other HR Madrassa' } });
    const department = await prisma.hrDepartment.create({ data: { organizationId: organization.id, name: 'Operations' } });
    const designation = await prisma.hrDesignation.create({ data: { organizationId: organization.id, departmentId: department.id, title: 'Coordinator' } });
    const cash = await prisma.account.create({ data: { organizationId: organization.id, accountCode: '1000', accountName: 'Cash', accountType: 'ASSET' } });
    const salaryExpense = await prisma.account.create({ data: { organizationId: organization.id, accountCode: '6000', accountName: 'Salary Expense', accountType: 'EXPENSE' } });

    const ownerCookie = `token=${createToken({ sub: owner.id, role: 'USER', ver: 0 })}`;
    const departmentRes = await request(app).post('/api/hr/departments').set('Cookie', [ownerCookie, `csrf_token=${csrfToken}`]).set('X-CSRF-Token', csrfToken).send({ name: 'Administration' });
    expect(departmentRes.status).toBe(201);

    const employeeRes = await request(app)
      .post('/api/hr/employees')
      .set('Cookie', [ownerCookie, `csrf_token=${csrfToken}`])
      .set('X-CSRF-Token', csrfToken)
      .send({
        firstName: 'Ali',
        lastName: 'Khan',
        employmentType: 'FULL_TIME',
        joiningDate: '2026-07-01',
        basicSalary: 40000,
        departmentId: department.id,
        designationId: designation.id,
      });
    expect(employeeRes.status).toBe(201);
    expect(employeeRes.body.employee.employeeNumber).toMatch(/^EMP-/);

    const employeeId = employeeRes.body.employee.id;
    const attendanceRes = await request(app)
      .post('/api/hr/attendance')
      .set('Cookie', [ownerCookie, `csrf_token=${csrfToken}`])
      .set('X-CSRF-Token', csrfToken)
      .send({ employeeId, attendanceDate: '2026-07-01', status: 'PRESENT' });
    expect(attendanceRes.status).toBe(201);

    const leaveRes = await request(app)
      .post('/api/hr/leaves')
      .set('Cookie', [ownerCookie, `csrf_token=${csrfToken}`])
      .set('X-CSRF-Token', csrfToken)
      .send({ employeeId, leaveType: 'Casual', startDate: '2026-07-10', endDate: '2026-07-11', reason: 'Family event' });
    expect(leaveRes.status).toBe(201);

    const payrollRes = await request(app)
      .post('/api/hr/payroll/generate')
      .set('Cookie', [ownerCookie, `csrf_token=${csrfToken}`])
      .set('X-CSRF-Token', csrfToken)
      .send({ employeeId, month: 7, year: 2026, allowances: 5000, deductions: 1000, overtime: 2000, bonus: 1000, paymentMethod: 'CASH' });
    expect(payrollRes.status).toBe(201);

    const payRes = await request(app)
      .post('/api/hr/payroll/pay')
      .set('Cookie', [ownerCookie, `csrf_token=${csrfToken}`])
      .set('X-CSRF-Token', csrfToken)
      .send({ payrollId: payrollRes.body.payroll.id, paymentMethod: 'CASH', cashAccountId: cash.id, salaryExpenseAccountId: salaryExpense.id });
    expect(payRes.status).toBe(200);

    const attendance = await request(app).get('/api/hr/attendance').set('Cookie', ownerCookie);
    expect(attendance.status).toBe(200);
    expect(attendance.body.attendance).toHaveLength(1);

    const payroll = await request(app).get('/api/hr/payroll').set('Cookie', ownerCookie);
    expect(payroll.status).toBe(200);
    expect(payroll.body.payroll).toHaveLength(1);

    const isolation = await request(app).get('/api/hr/employees').set('Cookie', `token=${createToken({ sub: otherOwner.id, role: 'USER', ver: 0 })}`);
    expect(isolation.status).toBe(200);
    expect(isolation.body.employees).toHaveLength(0);
  });

  it('manages inventory assets, stock movements, purchases, maintenance, and isolation', async () => {
    const owner = await prisma.user.create({
      data: {
        name: 'Inventory Owner',
        email: 'inventory-owner@example.com',
        passwordHash: await hashPassword('SecurePass123!'),
        role: 'USER',
        status: 'ACTIVE',
        emailVerified: true,
        settings: { create: {} },
      },
    });
    const organization = await prisma.organization.create({ data: { name: 'Inventory Workspace', ownerId: owner.id, members: { create: { userId: owner.id, role: 'OWNER' } } } });
    await prisma.madrassa.create({ data: { organizationId: organization.id, name: 'Inventory Madrassa' } });
    const otherOwner = await prisma.user.create({ data: { name: 'Inventory Other Owner', email: 'inventory-other-owner@example.com', passwordHash: await hashPassword('SecurePass123!'), role: 'USER', status: 'ACTIVE', emailVerified: true, settings: { create: {} } } });
    const otherOrg = await prisma.organization.create({ data: { name: 'Other Inventory Workspace', ownerId: otherOwner.id, members: { create: { userId: otherOwner.id, role: 'OWNER' } } } });
    await prisma.madrassa.create({ data: { organizationId: otherOrg.id, name: 'Other Inventory Madrassa' } });
    const cash = await prisma.account.create({ data: { organizationId: organization.id, accountCode: '1000', accountName: 'Cash', accountType: 'ASSET' } });
    const inventoryAccount = await prisma.account.create({ data: { organizationId: organization.id, accountCode: '1200', accountName: 'Inventory', accountType: 'ASSET' } });

    const ownerCookie = `token=${createToken({ sub: owner.id, role: 'USER', ver: 0 })}`;
    const categoryRes = await request(app)
      .post('/api/inventory/categories')
      .set('Cookie', [ownerCookie, `csrf_token=${csrfToken}`])
      .set('X-CSRF-Token', csrfToken)
      .send({ name: 'Electronics', description: 'Devices' });
    expect(categoryRes.status).toBe(201);

    const assetCategoryId = categoryRes.body.category.id;
    const itemCategoryRes = await request(app)
      .post('/api/inventory/categories')
      .set('Cookie', [ownerCookie, `csrf_token=${csrfToken}`])
      .set('X-CSRF-Token', csrfToken)
      .send({ name: 'Consumables', description: 'Stock items' });
    expect(itemCategoryRes.status).toBe(201);
    const itemCategoryId = itemCategoryRes.body.inventoryCategory.id;

    const assetRes = await request(app)
      .post('/api/inventory/assets')
      .set('Cookie', [ownerCookie, `csrf_token=${csrfToken}`])
      .set('X-CSRF-Token', csrfToken)
      .send({
        categoryId: assetCategoryId,
        name: 'Projector',
        purchaseDate: '2026-07-01',
        purchasePrice: 75000,
        currentValue: 72000,
        condition: 'GOOD',
        location: 'Main Hall',
        status: 'AVAILABLE',
      });
    expect(assetRes.status).toBe(201);
    expect(assetRes.body.asset.assetCode).toMatch(/^AST-/);

    const itemRes = await request(app)
      .post('/api/inventory/items')
      .set('Cookie', [ownerCookie, `csrf_token=${csrfToken}`])
      .set('X-CSRF-Token', csrfToken)
      .send({ categoryId: itemCategoryId, name: 'Printer Paper', sku: 'PAPER-001', quantity: 100, minimumStock: 20, unit: 'ream' });
    expect(itemRes.status).toBe(201);

    const stockRes = await request(app)
      .post(`/api/inventory/items/${itemRes.body.item.id}/stock`)
      .set('Cookie', [ownerCookie, `csrf_token=${csrfToken}`])
      .set('X-CSRF-Token', csrfToken)
      .send({ type: 'PURCHASE', quantity: 25, reference: 'PO-1' });
    expect(stockRes.status).toBe(201);
    expect(stockRes.body.item.quantity).toBe(125);

    const supplierRes = await request(app)
      .post('/api/inventory/suppliers')
      .set('Cookie', [ownerCookie, `csrf_token=${csrfToken}`])
      .set('X-CSRF-Token', csrfToken)
      .send({ name: 'Stationery Mart', phone: '111-2222', email: 'sales@stationery.test' });
    expect(supplierRes.status).toBe(201);

    const purchaseRes = await request(app)
      .post('/api/inventory/purchases')
      .set('Cookie', [ownerCookie, `csrf_token=${csrfToken}`])
      .set('X-CSRF-Token', csrfToken)
      .send({
        supplierId: supplierRes.body.supplier.id,
        invoiceNumber: 'INV-1001',
        purchaseDate: '2026-07-03',
        totalAmount: 2500,
        paymentStatus: 'PAID',
        items: [{ inventoryItemId: itemRes.body.item.id, quantity: 25, unitPrice: 100 }],
        debitAccountId: inventoryAccount.id,
        creditAccountId: cash.id,
      });
    expect(purchaseRes.status).toBe(201);

    const maintenanceRes = await request(app)
      .post('/api/inventory/maintenance')
      .set('Cookie', [ownerCookie, `csrf_token=${csrfToken}`])
      .set('X-CSRF-Token', csrfToken)
      .send({ assetId: assetRes.body.asset.id, issue: 'Lamp replacement', cost: 1200, date: '2026-07-04', remarks: 'Replaced lamp' });
    expect(maintenanceRes.status).toBe(201);

    const assets = await request(app).get('/api/inventory/reports/assets').set('Cookie', ownerCookie);
    expect(assets.status).toBe(200);
    expect(assets.body.assets).toHaveLength(1);

    const stock = await request(app).get('/api/inventory/reports/stock').set('Cookie', ownerCookie);
    expect(stock.status).toBe(200);
    expect(stock.body.items).toHaveLength(1);

    const purchases = await request(app).get('/api/inventory/reports/purchases').set('Cookie', ownerCookie);
    expect(purchases.status).toBe(200);
    expect(purchases.body.purchases).toHaveLength(1);

    const otherCookie = `token=${createToken({ sub: otherOwner.id, role: 'USER', ver: 0 })}`;
    const isolation = await request(app).get('/api/inventory/assets').set('Cookie', otherCookie);
    expect(isolation.status).toBe(200);
    expect(isolation.body.assets).toHaveLength(0);
  });

  it('manages library books, issue-return cycles, fines, and isolation', async () => {
    const owner = await prisma.user.create({
      data: {
        name: 'Library Owner',
        email: 'library-owner@example.com',
        passwordHash: await hashPassword('SecurePass123!'),
        role: 'USER',
        status: 'ACTIVE',
        emailVerified: true,
        settings: { create: {} },
      },
    });
    const organization = await prisma.organization.create({ data: { name: 'Library Workspace', ownerId: owner.id, members: { create: { userId: owner.id, role: 'OWNER' } } } });
    await prisma.madrassa.create({ data: { organizationId: organization.id, name: 'Library Madrassa' } });
    const otherOwner = await prisma.user.create({ data: { name: 'Library Other Owner', email: 'library-other-owner@example.com', passwordHash: await hashPassword('SecurePass123!'), role: 'USER', status: 'ACTIVE', emailVerified: true, settings: { create: {} } } });
    const otherOrg = await prisma.organization.create({ data: { name: 'Other Library Workspace', ownerId: otherOwner.id, members: { create: { userId: otherOwner.id, role: 'OWNER' } } } });
    await prisma.madrassa.create({ data: { organizationId: otherOrg.id, name: 'Other Library Madrassa' } });
    const cash = await prisma.account.create({ data: { organizationId: organization.id, accountCode: '1000', accountName: 'Cash', accountType: 'ASSET' } });
    const fineIncome = await prisma.account.create({ data: { organizationId: organization.id, accountCode: '4100', accountName: 'Library Fine Income', accountType: 'INCOME' } });
    const suffix = `${Date.now()}`;
    const student = await prisma.student.create({
      data: {
        madrassaId: (await prisma.madrassa.findFirstOrThrow({ where: { organizationId: organization.id } })).id,
        registrationNumber: `STU-2026-${suffix.slice(-4)}`,
        fullName: 'Library Student',
        status: 'ACTIVE',
      },
    });
    const employee = await prisma.employee.create({
      data: {
        organizationId: organization.id,
        employeeNumber: 'EMP-2026-0001',
        firstName: 'Library',
        lastName: 'Teacher',
        employmentType: 'FULL_TIME',
        joiningDate: new Date('2026-07-01'),
      },
    });

    const ownerCookie = `token=${createToken({ sub: owner.id, role: 'USER', ver: 0 })}`;
    const categoryRes = await request(app)
      .post('/api/library/categories')
      .set('Cookie', [ownerCookie, `csrf_token=${csrfToken}`])
      .set('X-CSRF-Token', csrfToken)
      .send({ name: 'Islamic Studies', description: 'Library section' });
    expect(categoryRes.status).toBe(201);

    const bookRes = await request(app)
      .post('/api/library/books')
      .set('Cookie', [ownerCookie, `csrf_token=${csrfToken}`])
      .set('X-CSRF-Token', csrfToken)
      .send({
        isbn: '978-1-23456-789-7',
        title: 'Fatawa Library',
        categoryId: categoryRes.body.category.id,
        language: 'Urdu',
        edition: '1st',
        publishYear: 2026,
        totalCopies: 1,
        availableCopies: 1,
      });
    expect(bookRes.status).toBe(201);
    expect(bookRes.body.book.bookCode).toMatch(/^LIB-/);

    const copyRes = await request(app)
      .post(`/api/library/books/${bookRes.body.book.id}/copies`)
      .set('Cookie', [ownerCookie, `csrf_token=${csrfToken}`])
      .set('X-CSRF-Token', csrfToken)
      .send({ condition: 'GOOD', location: 'Stacks A' });
    expect(copyRes.status).toBe(201);

    const membersRes = await request(app).get('/api/library/members').set('Cookie', ownerCookie);
    expect(membersRes.status).toBe(200);
    expect(membersRes.body.members).toHaveLength(2);

    const issueRes = await request(app)
      .post('/api/library/issues')
      .set('Cookie', [ownerCookie, `csrf_token=${csrfToken}`])
      .set('X-CSRF-Token', csrfToken)
      .send({ studentId: student.id, bookCopyId: copyRes.body.copy.id, issueDate: '2026-07-01' });
    expect(issueRes.status).toBe(201);

    const returnRes = await request(app)
      .post(`/api/library/issues/${issueRes.body.issue.id}/return`)
      .set('Cookie', [ownerCookie, `csrf_token=${csrfToken}`])
      .set('X-CSRF-Token', csrfToken)
      .send({ returnedTo: owner.id, cashAccountId: cash.id, fineIncomeAccountId: fineIncome.id });
    expect(returnRes.status).toBe(200);

    const booksReport = await request(app).get('/api/library/reports/books').set('Cookie', ownerCookie);
    expect(booksReport.status).toBe(200);
    expect(booksReport.body.books).toHaveLength(1);

    const issuesReport = await request(app).get('/api/library/reports/issues').set('Cookie', ownerCookie);
    expect(issuesReport.status).toBe(200);
    expect(issuesReport.body.issues).toHaveLength(1);

    const finesReport = await request(app).get('/api/library/reports/fines').set('Cookie', ownerCookie);
    expect(finesReport.status).toBe(200);
    expect(finesReport.body.fines).toHaveLength(1);

    const isolation = await request(app).get('/api/library/books').set('Cookie', `token=${createToken({ sub: otherOwner.id, role: 'USER', ver: 0 })}`);
    expect(isolation.status).toBe(200);
    expect(isolation.body.books).toHaveLength(0);
  });
});
