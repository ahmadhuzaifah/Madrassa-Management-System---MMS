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
});
