import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth.js';
import { AppError, asyncHandler } from '../lib/errors.js';
import { logActivity } from '../lib/activity.js';

const router = Router();

const madrassaProfileSchema = z.object({
  name: z.string().min(2),
  logoUrl: z.string().url().nullable().optional(),
  registrationNo: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  website: z.string().url().optional().nullable(),
  principalName: z.string().optional().nullable(),
  establishmentYear: z.number().int().min(1800).max(new Date().getFullYear()).optional().nullable(),
  description: z.string().optional().nullable(),
});

const branchSchema = z.object({
  name: z.string().min(2),
  address: z.string().optional().nullable(),
  contactInfo: z.string().optional().nullable(),
  managerName: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

const academicYearSchema = z.object({
  name: z.string().min(2),
  startDate: z.string(),
  endDate: z.string(),
  status: z.enum(['ACTIVE', 'ARCHIVED']).optional(),
});

const departmentSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

const programSchema = z.object({
  name: z.string().min(2),
  departmentId: z.string(),
  duration: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
});

const classSchema = z.object({
  name: z.string().min(1),
  programId: z.string(),
  academicYearId: z.string(),
  branchId: z.string().optional().nullable(),
  teacherName: z.string().optional().nullable(),
  capacity: z.number().int().positive().optional().nullable(),
  isActive: z.boolean().optional(),
});

const sectionSchema = z.object({
  name: z.string().min(1),
  classRoomId: z.string(),
  room: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

const subjectSchema = z.object({
  name: z.string().min(2),
  code: z.string().optional().nullable(),
  programId: z.string(),
  classRoomId: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

const timetableSchema = z.object({
  day: z.string().min(3),
  timeSlot: z.string().min(3),
  subjectId: z.string(),
  teacherName: z.string().optional().nullable(),
  classRoomId: z.string(),
  branchId: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

async function getMadrassa(userId: string) {
  const organization = await prisma.organization.findFirst({ where: { ownerId: userId } });
  if (!organization) throw new AppError(404, 'Workspace not found', 'NOT_FOUND');
  const madrassa = await prisma.madrassa.findFirst({ where: { organizationId: organization.id, isDeleted: false } });
  return { organization, madrassa };
}

router.use(requireAuth);

router.get('/profile', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { organization, madrassa } = await getMadrassa(req.user!.id);
  res.json({ madrassa, organization });
}));

router.put('/profile', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const parsed = madrassaProfileSchema.safeParse(req.body);
  if (!parsed.success) throw new AppError(400, 'Invalid madrassa payload', 'VALIDATION_ERROR', parsed.error.flatten());
  const { organization, madrassa } = await getMadrassa(req.user!.id);
  const saved = madrassa
    ? await prisma.madrassa.update({ where: { id: madrassa.id }, data: { ...parsed.data, organizationId: organization.id } })
    : await prisma.madrassa.create({ data: { ...parsed.data, organizationId: organization.id } });
  await logActivity({ userId: req.user!.id, action: 'madrassa_profile_updated', entityType: 'madrassa', entityId: saved.id });
  res.json({ madrassa: saved });
}));

router.get('/branches', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { organization, madrassa } = await getMadrassa(req.user!.id);
  if (!madrassa) return res.json({ branches: [] });
  const branches = await prisma.branch.findMany({ where: { madrassaId: madrassa.id, isDeleted: false }, orderBy: { createdAt: 'desc' } });
  res.json({ branches, organization });
}));

router.post('/branches', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const parsed = branchSchema.safeParse(req.body);
  if (!parsed.success) throw new AppError(400, 'Invalid branch payload', 'VALIDATION_ERROR', parsed.error.flatten());
  const { organization, madrassa } = await getMadrassa(req.user!.id);
  if (!madrassa) throw new AppError(404, 'Madrassa profile required', 'NOT_FOUND');
  const branch = await prisma.branch.create({ data: { ...parsed.data, madrassaId: madrassa.id } });
  await logActivity({ userId: req.user!.id, action: 'branch_created', entityType: 'branch', entityId: branch.id });
  res.status(201).json({ branch });
}));

router.patch('/branches/:id', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const parsed = branchSchema.partial().safeParse(req.body);
  if (!parsed.success) throw new AppError(400, 'Invalid branch payload', 'VALIDATION_ERROR', parsed.error.flatten());
  const branch = await prisma.branch.findUnique({ where: { id: req.params.id }, include: { madrassa: { include: { organization: true } } } });
  if (!branch || branch.isDeleted) throw new AppError(404, 'Branch not found', 'NOT_FOUND');
  const updated = await prisma.branch.update({ where: { id: branch.id }, data: parsed.data });
  await logActivity({ userId: req.user!.id, action: 'branch_updated', entityType: 'branch', entityId: updated.id });
  res.json({ branch: updated });
}));

router.delete('/branches/:id', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const branch = await prisma.branch.findUnique({ where: { id: req.params.id }, include: { madrassa: { include: { organization: true } } } });
  if (!branch || branch.isDeleted) throw new AppError(404, 'Branch not found', 'NOT_FOUND');
  await prisma.branch.update({ where: { id: branch.id }, data: { isDeleted: true, isActive: false } });
  res.json({ message: 'Branch deleted' });
}));

router.get('/academic-years', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { madrassa } = await getMadrassa(req.user!.id);
  if (!madrassa) return res.json({ academicYears: [] });
  const academicYears = await prisma.academicYear.findMany({ where: { madrassaId: madrassa.id, isDeleted: false }, orderBy: { startDate: 'desc' } });
  res.json({ academicYears });
}));

router.post('/academic-years', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const parsed = academicYearSchema.safeParse(req.body);
  if (!parsed.success) throw new AppError(400, 'Invalid academic year payload', 'VALIDATION_ERROR', parsed.error.flatten());
  const { organization, madrassa } = await getMadrassa(req.user!.id);
  if (!madrassa) throw new AppError(404, 'Madrassa profile required', 'NOT_FOUND');
  const academicYear = await prisma.academicYear.create({ data: { madrassaId: madrassa.id, name: parsed.data.name, startDate: new Date(parsed.data.startDate), endDate: new Date(parsed.data.endDate), status: parsed.data.status ?? 'ACTIVE' } });
  await logActivity({ userId: req.user!.id, action: 'academic_year_created', entityType: 'academicYear', entityId: academicYear.id });
  res.status(201).json({ academicYear });
}));

router.patch('/academic-years/:id', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const parsed = academicYearSchema.partial().safeParse(req.body);
  if (!parsed.success) throw new AppError(400, 'Invalid academic year payload', 'VALIDATION_ERROR', parsed.error.flatten());
  const academicYear = await prisma.academicYear.findUnique({ where: { id: req.params.id }, include: { madrassa: { include: { organization: true } } } });
  if (!academicYear || academicYear.isDeleted) throw new AppError(404, 'Academic year not found', 'NOT_FOUND');
  const updated = await prisma.academicYear.update({
    where: { id: academicYear.id },
    data: {
      ...(parsed.data.name ? { name: parsed.data.name } : {}),
      ...(parsed.data.startDate ? { startDate: new Date(parsed.data.startDate) } : {}),
      ...(parsed.data.endDate ? { endDate: new Date(parsed.data.endDate) } : {}),
      ...(parsed.data.status ? { status: parsed.data.status } : {}),
    },
  });
  if (parsed.data.status === 'ACTIVE') {
    await prisma.academicYear.updateMany({ where: { madrassaId: academicYear.madrassaId, id: { not: updated.id } }, data: { status: 'ARCHIVED' } });
  }
  res.json({ academicYear: updated });
}));

router.delete('/academic-years/:id', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const academicYear = await prisma.academicYear.findUnique({ where: { id: req.params.id }, include: { madrassa: { include: { organization: true } } } });
  if (!academicYear || academicYear.isDeleted) throw new AppError(404, 'Academic year not found', 'NOT_FOUND');
  await prisma.academicYear.update({ where: { id: academicYear.id }, data: { isDeleted: true, status: 'ARCHIVED' } });
  res.json({ message: 'Academic year archived' });
}));

router.get('/departments', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { madrassa } = await getMadrassa(req.user!.id);
  if (!madrassa) return res.json({ departments: [] });
  const departments = await prisma.department.findMany({ where: { madrassaId: madrassa.id, isDeleted: false }, orderBy: { name: 'asc' } });
  res.json({ departments });
}));

router.post('/departments', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const parsed = departmentSchema.safeParse(req.body);
  if (!parsed.success) throw new AppError(400, 'Invalid department payload', 'VALIDATION_ERROR', parsed.error.flatten());
  const { organization, madrassa } = await getMadrassa(req.user!.id);
  if (!madrassa) throw new AppError(404, 'Madrassa profile required', 'NOT_FOUND');
  const department = await prisma.department.create({ data: { ...parsed.data, madrassaId: madrassa.id } });
  res.status(201).json({ department });
}));

router.patch('/departments/:id', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const parsed = departmentSchema.partial().safeParse(req.body);
  if (!parsed.success) throw new AppError(400, 'Invalid department payload', 'VALIDATION_ERROR', parsed.error.flatten());
  const department = await prisma.department.findUnique({ where: { id: req.params.id }, include: { madrassa: { include: { organization: true } } } });
  if (!department || department.isDeleted) throw new AppError(404, 'Department not found', 'NOT_FOUND');
  const updated = await prisma.department.update({ where: { id: department.id }, data: parsed.data });
  res.json({ department: updated });
}));

router.delete('/departments/:id', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const department = await prisma.department.findUnique({ where: { id: req.params.id }, include: { madrassa: { include: { organization: true } } } });
  if (!department || department.isDeleted) throw new AppError(404, 'Department not found', 'NOT_FOUND');
  await prisma.department.update({ where: { id: department.id }, data: { isDeleted: true, isActive: false } });
  res.json({ message: 'Department deleted' });
}));

router.get('/programs', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { madrassa } = await getMadrassa(req.user!.id);
  if (!madrassa) return res.json({ programs: [] });
  const programs = await prisma.program.findMany({ where: { madrassaId: madrassa.id, isDeleted: false }, orderBy: { name: 'asc' } });
  res.json({ programs });
}));

router.post('/programs', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const parsed = programSchema.safeParse(req.body);
  if (!parsed.success) throw new AppError(400, 'Invalid program payload', 'VALIDATION_ERROR', parsed.error.flatten());
  const { organization, madrassa } = await getMadrassa(req.user!.id);
  if (!madrassa) throw new AppError(404, 'Madrassa profile required', 'NOT_FOUND');
  const program = await prisma.program.create({ data: { madrassaId: madrassa.id, departmentId: parsed.data.departmentId, name: parsed.data.name, duration: parsed.data.duration, description: parsed.data.description, status: parsed.data.status ?? 'ACTIVE' } });
  res.status(201).json({ program });
}));

router.patch('/programs/:id', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const parsed = programSchema.partial().safeParse(req.body);
  if (!parsed.success) throw new AppError(400, 'Invalid program payload', 'VALIDATION_ERROR', parsed.error.flatten());
  const program = await prisma.program.findUnique({ where: { id: req.params.id }, include: { madrassa: { include: { organization: true } } } });
  if (!program || program.isDeleted) throw new AppError(404, 'Program not found', 'NOT_FOUND');
  const updated = await prisma.program.update({ where: { id: program.id }, data: parsed.data });
  res.json({ program: updated });
}));

router.delete('/programs/:id', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const program = await prisma.program.findUnique({ where: { id: req.params.id }, include: { madrassa: { include: { organization: true } } } });
  if (!program || program.isDeleted) throw new AppError(404, 'Program not found', 'NOT_FOUND');
  await prisma.program.update({ where: { id: program.id }, data: { isDeleted: true, status: 'INACTIVE' } });
  res.json({ message: 'Program deleted' });
}));

router.get('/classes', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { madrassa } = await getMadrassa(req.user!.id);
  if (!madrassa) return res.json({ classes: [] });
  const classes = await prisma.classRoom.findMany({ where: { madrassaId: madrassa.id, isDeleted: false }, orderBy: { createdAt: 'desc' } });
  res.json({ classes });
}));

router.post('/classes', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const parsed = classSchema.safeParse(req.body);
  if (!parsed.success) throw new AppError(400, 'Invalid class payload', 'VALIDATION_ERROR', parsed.error.flatten());
  const { organization, madrassa } = await getMadrassa(req.user!.id);
  if (!madrassa) throw new AppError(404, 'Madrassa profile required', 'NOT_FOUND');
  const classRoom = await prisma.classRoom.create({ data: { madrassaId: madrassa.id, name: parsed.data.name, programId: parsed.data.programId, academicYearId: parsed.data.academicYearId, branchId: parsed.data.branchId ?? null, teacherName: parsed.data.teacherName, capacity: parsed.data.capacity, isActive: parsed.data.isActive ?? true } });
  res.status(201).json({ classRoom });
}));

router.get('/sections', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { madrassa } = await getMadrassa(req.user!.id);
  if (!madrassa) return res.json({ sections: [] });
  const sections = await prisma.section.findMany({ where: { madrassaId: madrassa.id, isDeleted: false }, orderBy: { createdAt: 'desc' } });
  res.json({ sections });
}));

router.post('/sections', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const parsed = sectionSchema.safeParse(req.body);
  if (!parsed.success) throw new AppError(400, 'Invalid section payload', 'VALIDATION_ERROR', parsed.error.flatten());
  const { organization, madrassa } = await getMadrassa(req.user!.id);
  if (!madrassa) throw new AppError(404, 'Madrassa profile required', 'NOT_FOUND');
  const section = await prisma.section.create({ data: { madrassaId: madrassa.id, name: parsed.data.name, classRoomId: parsed.data.classRoomId, room: parsed.data.room, isActive: parsed.data.isActive ?? true } });
  res.status(201).json({ section });
}));

router.get('/subjects', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { madrassa } = await getMadrassa(req.user!.id);
  if (!madrassa) return res.json({ subjects: [] });
  const subjects = await prisma.subject.findMany({ where: { madrassaId: madrassa.id, isDeleted: false }, orderBy: { name: 'asc' } });
  res.json({ subjects });
}));

router.post('/subjects', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const parsed = subjectSchema.safeParse(req.body);
  if (!parsed.success) throw new AppError(400, 'Invalid subject payload', 'VALIDATION_ERROR', parsed.error.flatten());
  const { organization, madrassa } = await getMadrassa(req.user!.id);
  if (!madrassa) throw new AppError(404, 'Madrassa profile required', 'NOT_FOUND');
  const subject = await prisma.subject.create({ data: { madrassaId: madrassa.id, name: parsed.data.name, code: parsed.data.code, programId: parsed.data.programId, classRoomId: parsed.data.classRoomId, isActive: parsed.data.isActive ?? true } });
  res.status(201).json({ subject });
}));

router.get('/timetable', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { madrassa } = await getMadrassa(req.user!.id);
  if (!madrassa) return res.json({ timetables: [] });
  const timetables = await prisma.timetable.findMany({ where: { madrassaId: madrassa.id, isDeleted: false }, orderBy: [{ day: 'asc' }, { timeSlot: 'asc' }] });
  res.json({ timetables });
}));

router.post('/timetable', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const parsed = timetableSchema.safeParse(req.body);
  if (!parsed.success) throw new AppError(400, 'Invalid timetable payload', 'VALIDATION_ERROR', parsed.error.flatten());
  const { organization, madrassa } = await getMadrassa(req.user!.id);
  if (!madrassa) throw new AppError(404, 'Madrassa profile required', 'NOT_FOUND');
  const timetable = await prisma.timetable.create({ data: { madrassaId: madrassa.id, branchId: parsed.data.branchId ?? null, classRoomId: parsed.data.classRoomId, subjectId: parsed.data.subjectId, teacherName: parsed.data.teacherName, day: parsed.data.day, timeSlot: parsed.data.timeSlot, isActive: parsed.data.isActive ?? true } });
  res.status(201).json({ timetable });
}));

export default router;
