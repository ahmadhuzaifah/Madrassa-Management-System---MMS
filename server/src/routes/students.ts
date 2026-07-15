import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth.js';
import { AppError, asyncHandler } from '../lib/errors.js';
import { logActivity } from '../lib/activity.js';

const router = Router();

const studentSchema = z.object({
  fullName: z.string().min(2),
  fatherName: z.string().optional().nullable(),
  grandfatherName: z.string().optional().nullable(),
  dateOfBirth: z.string().optional().nullable(),
  gender: z.string().optional().nullable(),
  photo: z.string().url().optional().nullable(),
  phone: z.string().optional().nullable(),
  guardianPhone: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  province: z.string().optional().nullable(),
  branchId: z.string().optional().nullable(),
  departmentId: z.string().optional().nullable(),
  programId: z.string().optional().nullable(),
  classRoomId: z.string().optional().nullable(),
  sectionId: z.string().optional().nullable(),
  academicYearId: z.string().optional().nullable(),
  status: z.enum(['ACTIVE', 'GRADUATED', 'LEFT', 'SUSPENDED']).optional(),
  admissionDate: z.string().optional(),
  guardian: z.object({
    name: z.string().min(2),
    relationship: z.string().min(2),
    phone: z.string().optional().nullable(),
    email: z.string().email().optional().nullable(),
    address: z.string().optional().nullable(),
    occupation: z.string().optional().nullable(),
  }).optional(),
});

const transferSchema = z.object({
  previousBranchId: z.string().optional().nullable(),
  newBranchId: z.string().optional().nullable(),
  previousClassRoomId: z.string().optional().nullable(),
  newClassRoomId: z.string().optional().nullable(),
  reason: z.string().optional().nullable(),
});

async function getWorkspace(userId: string) {
  const organization = await prisma.organization.findFirst({ where: { ownerId: userId } });
  if (!organization) throw new AppError(404, 'Workspace not found', 'NOT_FOUND');
  const madrassa = await prisma.madrassa.findFirst({ where: { organizationId: organization.id, isDeleted: false } });
  if (!madrassa) throw new AppError(404, 'Madrassa profile required', 'NOT_FOUND');
  return { organization, madrassa };
}

async function generateRegistrationNumber(client: any, madrassaId: string) {
  const year = new Date().getFullYear();
  const row = await client.studentSequence.upsert({
    where: { madrassaId_year: { madrassaId, year } },
    update: { sequence: { increment: 1 } },
    create: { madrassaId, year, sequence: 1 },
  });
  return `STU-${year}-${String(row.sequence).padStart(4, '0')}`;
}

router.use(requireAuth);

router.get('/', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { madrassa } = await getWorkspace(req.user!.id);
  const parsed = z.object({
    search: z.string().optional(),
    status: z.string().optional(),
    branchId: z.string().optional(),
    departmentId: z.string().optional(),
    programId: z.string().optional(),
    classRoomId: z.string().optional(),
    sectionId: z.string().optional(),
    academicYearId: z.string().optional(),
    page: z.string().optional(),
    size: z.string().optional(),
  }).safeParse(req.query);
  if (!parsed.success) throw new AppError(400, 'Invalid query parameters', 'VALIDATION_ERROR', parsed.error.flatten());
  const page = Math.max(Number(parsed.data.page ?? 1), 1);
  const size = Math.min(Math.max(Number(parsed.data.size ?? 10), 1), 50);
  const where: any = { madrassaId: madrassa.id, isDeleted: false };
  if (parsed.data.search) where.OR = [{ fullName: { contains: parsed.data.search } }, { registrationNumber: { contains: parsed.data.search } }];
  ['status', 'branchId', 'departmentId', 'programId', 'classRoomId', 'sectionId', 'academicYearId'].forEach((field) => {
    const value = parsed.data[field as keyof typeof parsed.data];
    if (value) where[field] = value;
  });
  const [students, total] = await Promise.all([
    prisma.student.findMany({ where, skip: (page - 1) * size, take: size, orderBy: { createdAt: 'desc' }, include: { guardian: true, documents: true, transfers: true } }),
    prisma.student.count({ where }),
  ]);
  res.json({ students, pagination: { page, size, total, pages: Math.ceil(total / size) } });
}));

router.post('/admission', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const parsed = studentSchema.safeParse(req.body);
  if (!parsed.success) throw new AppError(400, 'Invalid admission payload', 'VALIDATION_ERROR', parsed.error.flatten());
  const { madrassa } = await getWorkspace(req.user!.id);
  const result = await prisma.$transaction(async (tx: any) => {
    const registrationNumber = await generateRegistrationNumber(tx, madrassa.id);
    const guardian = parsed.data.guardian ? await tx.guardian.create({
      data: {
        madrassaId: madrassa.id,
        ...parsed.data.guardian,
        phone: parsed.data.guardian.phone ?? null,
        email: parsed.data.guardian.email ?? null,
        address: parsed.data.guardian.address ?? null,
        occupation: parsed.data.guardian.occupation ?? null,
      },
    }) : null;
    const student = await tx.student.create({
      data: {
        madrassaId: madrassa.id,
        guardianId: guardian?.id,
        registrationNumber,
        admissionNumber: parsed.data.admissionDate ? `ADM-${new Date(parsed.data.admissionDate).getFullYear()}-${String(Date.now()).slice(-4)}` : `ADM-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`,
        fullName: parsed.data.fullName,
        fatherName: parsed.data.fatherName ?? null,
        grandfatherName: parsed.data.grandfatherName ?? null,
        dateOfBirth: parsed.data.dateOfBirth ? new Date(parsed.data.dateOfBirth) : null,
        gender: parsed.data.gender ?? null,
        photo: parsed.data.photo ?? null,
        phone: parsed.data.phone ?? null,
        guardianPhone: parsed.data.guardianPhone ?? null,
        email: parsed.data.email ?? null,
        address: parsed.data.address ?? null,
        city: parsed.data.city ?? null,
        province: parsed.data.province ?? null,
        branchId: parsed.data.branchId ?? null,
        departmentId: parsed.data.departmentId ?? null,
        programId: parsed.data.programId ?? null,
        classRoomId: parsed.data.classRoomId ?? null,
        sectionId: parsed.data.sectionId ?? null,
        academicYearId: parsed.data.academicYearId ?? null,
        status: parsed.data.status ?? 'ACTIVE',
        admissionDate: parsed.data.admissionDate ? new Date(parsed.data.admissionDate) : new Date(),
      },
    });
    return { student, guardian };
  });
  await logActivity({ userId: req.user!.id, action: 'student_admitted', entityType: 'student', entityId: result.student.id });
  res.status(201).json(result);
}));

router.post('/', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const parsed = studentSchema.safeParse(req.body);
  if (!parsed.success) throw new AppError(400, 'Invalid student payload', 'VALIDATION_ERROR', parsed.error.flatten());
  const { madrassa } = await getWorkspace(req.user!.id);
  const registrationNumber = await generateRegistrationNumber(prisma, madrassa.id);
  const student = await prisma.student.create({
    data: {
      madrassaId: madrassa.id,
      registrationNumber,
      fullName: parsed.data.fullName,
      fatherName: parsed.data.fatherName ?? null,
      grandfatherName: parsed.data.grandfatherName ?? null,
      dateOfBirth: parsed.data.dateOfBirth ? new Date(parsed.data.dateOfBirth) : null,
      gender: parsed.data.gender ?? null,
      photo: parsed.data.photo ?? null,
      phone: parsed.data.phone ?? null,
      guardianPhone: parsed.data.guardianPhone ?? null,
      email: parsed.data.email ?? null,
      address: parsed.data.address ?? null,
      city: parsed.data.city ?? null,
      province: parsed.data.province ?? null,
      branchId: parsed.data.branchId ?? null,
      departmentId: parsed.data.departmentId ?? null,
      programId: parsed.data.programId ?? null,
      classRoomId: parsed.data.classRoomId ?? null,
      sectionId: parsed.data.sectionId ?? null,
      academicYearId: parsed.data.academicYearId ?? null,
      status: parsed.data.status ?? 'ACTIVE',
      admissionDate: parsed.data.admissionDate ? new Date(parsed.data.admissionDate) : new Date(),
      guardian: parsed.data.guardian ? { create: { madrassaId: madrassa.id, ...parsed.data.guardian, phone: parsed.data.guardian.phone ?? null, email: parsed.data.guardian.email ?? null, address: parsed.data.guardian.address ?? null, occupation: parsed.data.guardian.occupation ?? null } } : undefined,
    },
    include: { guardian: true },
  });
  res.status(201).json({ student });
}));

router.get('/:id', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { madrassa } = await getWorkspace(req.user!.id);
  const student = await prisma.student.findFirst({ where: { id: req.params.id, madrassaId: madrassa.id, isDeleted: false }, include: { guardian: true, documents: true, transfers: true } });
  if (!student) throw new AppError(404, 'Student not found', 'NOT_FOUND');
  res.json({ student });
}));

router.patch('/:id', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const parsed = studentSchema.partial().safeParse(req.body);
  if (!parsed.success) throw new AppError(400, 'Invalid student payload', 'VALIDATION_ERROR', parsed.error.flatten());
  const { madrassa } = await getWorkspace(req.user!.id);
  const existing = await prisma.student.findFirst({ where: { id: req.params.id, madrassaId: madrassa.id, isDeleted: false } });
  if (!existing) throw new AppError(404, 'Student not found', 'NOT_FOUND');
  const student = await prisma.student.update({ where: { id: existing.id }, data: {
    ...(parsed.data.fullName ? { fullName: parsed.data.fullName } : {}),
    ...(parsed.data.fatherName !== undefined ? { fatherName: parsed.data.fatherName ?? null } : {}),
    ...(parsed.data.grandfatherName !== undefined ? { grandfatherName: parsed.data.grandfatherName ?? null } : {}),
    ...(parsed.data.dateOfBirth !== undefined ? { dateOfBirth: parsed.data.dateOfBirth ? new Date(parsed.data.dateOfBirth) : null } : {}),
    ...(parsed.data.gender !== undefined ? { gender: parsed.data.gender ?? null } : {}),
    ...(parsed.data.photo !== undefined ? { photo: parsed.data.photo ?? null } : {}),
    ...(parsed.data.phone !== undefined ? { phone: parsed.data.phone ?? null } : {}),
    ...(parsed.data.guardianPhone !== undefined ? { guardianPhone: parsed.data.guardianPhone ?? null } : {}),
    ...(parsed.data.email !== undefined ? { email: parsed.data.email ?? null } : {}),
    ...(parsed.data.address !== undefined ? { address: parsed.data.address ?? null } : {}),
    ...(parsed.data.city !== undefined ? { city: parsed.data.city ?? null } : {}),
    ...(parsed.data.province !== undefined ? { province: parsed.data.province ?? null } : {}),
    ...(parsed.data.branchId !== undefined ? { branchId: parsed.data.branchId ?? null } : {}),
    ...(parsed.data.departmentId !== undefined ? { departmentId: parsed.data.departmentId ?? null } : {}),
    ...(parsed.data.programId !== undefined ? { programId: parsed.data.programId ?? null } : {}),
    ...(parsed.data.classRoomId !== undefined ? { classRoomId: parsed.data.classRoomId ?? null } : {}),
    ...(parsed.data.sectionId !== undefined ? { sectionId: parsed.data.sectionId ?? null } : {}),
    ...(parsed.data.academicYearId !== undefined ? { academicYearId: parsed.data.academicYearId ?? null } : {}),
    ...(parsed.data.status ? { status: parsed.data.status } : {}),
  }});
  res.json({ student });
}));

router.delete('/:id', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { madrassa } = await getWorkspace(req.user!.id);
  const student = await prisma.student.findFirst({ where: { id: req.params.id, madrassaId: madrassa.id, isDeleted: false } });
  if (!student) throw new AppError(404, 'Student not found', 'NOT_FOUND');
  await prisma.student.update({ where: { id: student.id }, data: { isDeleted: true, status: 'LEFT' } });
  res.json({ message: 'Student deleted' });
}));

router.get('/:id/documents', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { madrassa } = await getWorkspace(req.user!.id);
  const student = await prisma.student.findFirst({ where: { id: req.params.id, madrassaId: madrassa.id, isDeleted: false } });
  if (!student) throw new AppError(404, 'Student not found', 'NOT_FOUND');
  const documents = await prisma.studentDocument.findMany({ where: { studentId: student.id }, orderBy: { uploadedAt: 'desc' } });
  res.json({ documents });
}));

router.post('/:id/documents', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const parsed = z.object({ documentName: z.string().min(2), fileUrl: z.string().url() }).safeParse(req.body);
  if (!parsed.success) throw new AppError(400, 'Invalid document payload', 'VALIDATION_ERROR', parsed.error.flatten());
  const { madrassa } = await getWorkspace(req.user!.id);
  const student = await prisma.student.findFirst({ where: { id: req.params.id, madrassaId: madrassa.id, isDeleted: false } });
  if (!student) throw new AppError(404, 'Student not found', 'NOT_FOUND');
  const document = await prisma.studentDocument.create({ data: { studentId: student.id, documentName: parsed.data.documentName, fileUrl: parsed.data.fileUrl } });
  res.status(201).json({ document });
}));

router.get('/:id/transfers', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { madrassa } = await getWorkspace(req.user!.id);
  const student = await prisma.student.findFirst({ where: { id: req.params.id, madrassaId: madrassa.id, isDeleted: false } });
  if (!student) throw new AppError(404, 'Student not found', 'NOT_FOUND');
  const transfers = await prisma.studentTransfer.findMany({ where: { studentId: student.id }, orderBy: { transferDate: 'desc' } });
  res.json({ transfers });
}));

router.post('/:id/transfer', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const parsed = transferSchema.safeParse(req.body);
  if (!parsed.success) throw new AppError(400, 'Invalid transfer payload', 'VALIDATION_ERROR', parsed.error.flatten());
  const { madrassa } = await getWorkspace(req.user!.id);
  const student = await prisma.student.findFirst({ where: { id: req.params.id, madrassaId: madrassa.id, isDeleted: false } });
  if (!student) throw new AppError(404, 'Student not found', 'NOT_FOUND');
  const transfer = await prisma.$transaction(async (tx: any) => {
    const created = await tx.studentTransfer.create({
      data: {
        studentId: student.id,
        previousBranchId: parsed.data.previousBranchId ?? student.branchId,
        newBranchId: parsed.data.newBranchId ?? student.branchId,
        previousClassRoomId: parsed.data.previousClassRoomId ?? student.classRoomId,
        newClassRoomId: parsed.data.newClassRoomId ?? student.classRoomId,
        reason: parsed.data.reason ?? null,
      },
    });
    await tx.student.update({
      where: { id: student.id },
      data: {
        branchId: parsed.data.newBranchId ?? student.branchId,
        classRoomId: parsed.data.newClassRoomId ?? student.classRoomId,
      },
    });
    return created;
  });
  await logActivity({ userId: req.user!.id, action: 'student_transferred', entityType: 'student', entityId: student.id });
  res.status(201).json({ transfer });
}));

export default router;
