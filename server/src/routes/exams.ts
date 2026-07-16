import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth.js';
import { AppError, asyncHandler } from '../lib/errors.js';
import { logActivity } from '../lib/activity.js';
import { notifyStudentGuardians } from '../lib/communication-notifications.js';

const router = Router();
const examTypes = z.enum(['MONTHLY', 'QUARTERLY', 'HALF_YEARLY', 'ANNUAL', 'FINAL']);

async function getWorkspace(userId: string) {
  const organization = await prisma.organization.findFirst({ where: { ownerId: userId } });
  if (!organization) throw new AppError(404, 'Workspace not found', 'NOT_FOUND');
  const madrassa = await prisma.madrassa.findFirst({ where: { organizationId: organization.id, isDeleted: false } });
  if (!madrassa) throw new AppError(404, 'Madrassa profile required', 'NOT_FOUND');
  return { organization, madrassa };
}

const gradeFor = (percentage: number, gradeScales: Array<{ minPercentage: number; maxPercentage: number; grade: string }>) => gradeScales.find((scale) => percentage >= scale.minPercentage && percentage <= scale.maxPercentage)?.grade ?? 'F';

router.use(requireAuth);

router.get('/', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { madrassa } = await getWorkspace(req.user!.id);
  const exams = await prisma.exam.findMany({ where: { madrassaId: madrassa.id }, orderBy: { createdAt: 'desc' } });
  res.json({ exams });
}));

router.post('/', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const parsed = z.object({ name: z.string().min(2), examType: examTypes, branchId: z.string().optional().nullable(), academicYearId: z.string().optional().nullable(), startDate: z.string(), endDate: z.string(), status: z.string().optional() }).safeParse(req.body);
  if (!parsed.success) throw new AppError(400, 'Invalid exam payload', 'VALIDATION_ERROR', parsed.error.flatten());
  const { organization, madrassa } = await getWorkspace(req.user!.id);
  const exam = await prisma.exam.create({ data: { organizationId: organization.id, madrassaId: madrassa.id, name: parsed.data.name, examType: parsed.data.examType, branchId: parsed.data.branchId ?? null, academicYearId: parsed.data.academicYearId ?? null, startDate: new Date(parsed.data.startDate), endDate: new Date(parsed.data.endDate), status: parsed.data.status ?? 'DRAFT' } });
  await logActivity({ userId: req.user!.id, action: 'exam_created', entityType: 'exam', entityId: exam.id });
  res.status(201).json({ exam });
}));

router.patch('/:id', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const parsed = z.object({ name: z.string().min(2).optional(), examType: examTypes.optional(), branchId: z.string().optional().nullable(), academicYearId: z.string().optional().nullable(), startDate: z.string().optional(), endDate: z.string().optional(), status: z.string().optional() }).safeParse(req.body);
  if (!parsed.success) throw new AppError(400, 'Invalid exam payload', 'VALIDATION_ERROR', parsed.error.flatten());
  const { madrassa } = await getWorkspace(req.user!.id);
  const exam = await prisma.exam.findFirst({ where: { id: req.params.id, madrassaId: madrassa.id } });
  if (!exam) throw new AppError(404, 'Exam not found', 'NOT_FOUND');
  const updated = await prisma.exam.update({ where: { id: exam.id }, data: { ...(parsed.data.name ? { name: parsed.data.name } : {}), ...(parsed.data.examType ? { examType: parsed.data.examType } : {}), ...(parsed.data.branchId !== undefined ? { branchId: parsed.data.branchId } : {}), ...(parsed.data.academicYearId !== undefined ? { academicYearId: parsed.data.academicYearId } : {}), ...(parsed.data.startDate ? { startDate: new Date(parsed.data.startDate) } : {}), ...(parsed.data.endDate ? { endDate: new Date(parsed.data.endDate) } : {}), ...(parsed.data.status ? { status: parsed.data.status } : {}) } });
  res.json({ exam: updated });
}));

router.delete('/:id', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { madrassa } = await getWorkspace(req.user!.id);
  const exam = await prisma.exam.findFirst({ where: { id: req.params.id, madrassaId: madrassa.id } });
  if (!exam) throw new AppError(404, 'Exam not found', 'NOT_FOUND');
  await prisma.exam.delete({ where: { id: exam.id } });
  res.json({ message: 'Exam deleted' });
}));

router.get('/:id/subjects', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { madrassa } = await getWorkspace(req.user!.id);
  const exam = await prisma.exam.findFirst({ where: { id: req.params.id, madrassaId: madrassa.id } });
  if (!exam) throw new AppError(404, 'Exam not found', 'NOT_FOUND');
  const subjects = await prisma.examSubject.findMany({ where: { examId: exam.id } });
  res.json({ subjects });
}));

router.post('/:id/subjects', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const parsed = z.object({ subjectId: z.string(), totalMarks: z.number().int().positive(), passingMarks: z.number().int().nonnegative() }).safeParse(req.body);
  if (!parsed.success) throw new AppError(400, 'Invalid subject payload', 'VALIDATION_ERROR', parsed.error.flatten());
  const { madrassa } = await getWorkspace(req.user!.id);
  const exam = await prisma.exam.findFirst({ where: { id: req.params.id, madrassaId: madrassa.id } });
  if (!exam) throw new AppError(404, 'Exam not found', 'NOT_FOUND');
  const subject = await prisma.examSubject.create({ data: { examId: exam.id, ...parsed.data } });
  res.status(201).json({ subject });
}));

router.get('/:id/results', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { madrassa } = await getWorkspace(req.user!.id);
  const exam = await prisma.exam.findFirst({ where: { id: req.params.id, madrassaId: madrassa.id } });
  if (!exam) throw new AppError(404, 'Exam not found', 'NOT_FOUND');
  const results = await prisma.studentExamResult.findMany({ where: { examId: exam.id }, include: { student: true } });
  res.json({ results });
}));

router.post('/:id/results', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const parsed = z.object({ classRoomId: z.string().optional().nullable(), results: z.array(z.object({ studentId: z.string(), subjectId: z.string(), obtainedMarks: z.number().int().nonnegative(), remarks: z.string().optional().nullable() })).min(1) }).safeParse(req.body);
  if (!parsed.success) throw new AppError(400, 'Invalid marks payload', 'VALIDATION_ERROR', parsed.error.flatten());
  const { madrassa } = await getWorkspace(req.user!.id);
  const exam = await prisma.exam.findFirst({ where: { id: req.params.id, madrassaId: madrassa.id }, include: { subjects: true } });
  if (!exam) throw new AppError(404, 'Exam not found', 'NOT_FOUND');
  const gradeScales = await prisma.gradeScale.findMany({ where: { organizationId: madrassa.organizationId } });
  const created = [];
  for (const item of parsed.data.results) {
  const examSubject = exam.subjects.find((subject: { subjectId: string; totalMarks: number }) => subject.subjectId === item.subjectId);
    if (!examSubject) throw new AppError(400, 'Subject not part of exam', 'VALIDATION_ERROR');
    if (item.obtainedMarks > examSubject.totalMarks) throw new AppError(400, 'Obtained marks cannot exceed total marks', 'VALIDATION_ERROR');
    const percentage = examSubject.totalMarks ? (item.obtainedMarks / examSubject.totalMarks) * 100 : 0;
    const grade = gradeFor(percentage, gradeScales);
    created.push(await prisma.studentExamResult.upsert({
      where: { examId_studentId_subjectId: { examId: exam.id, studentId: item.studentId, subjectId: item.subjectId } },
      create: { examId: exam.id, studentId: item.studentId, subjectId: item.subjectId, obtainedMarks: item.obtainedMarks, grade, remarks: item.remarks ?? null },
      update: { obtainedMarks: item.obtainedMarks, grade, remarks: item.remarks ?? null },
    }));
  }
  const students = await prisma.studentExamResult.findMany({ where: { examId: exam.id }, select: { studentId: true, subjectId: true, obtainedMarks: true, grade: true } });
  const totals = new Map<string, { obtained: number; total: number; subjectCount: number }>();
  for (const row of students) {
    const examSubject = exam.subjects.find((subject: { subjectId: string; totalMarks: number }) => subject.subjectId === row.subjectId);
    const current = totals.get(row.studentId) ?? { obtained: 0, total: 0, subjectCount: 0 };
    current.obtained += row.obtainedMarks;
    current.total += examSubject?.totalMarks ?? 0;
    current.subjectCount += 1;
    totals.set(row.studentId, current);
  }
  const ranking = [...totals.entries()].sort((a, b) => (b[1].obtained / Math.max(b[1].total, 1)) - (a[1].obtained / Math.max(a[1].total, 1)));
  await Promise.all(ranking.map(([studentId, summary], index) => prisma.resultCard.upsert({
    where: { studentId_examId: { studentId, examId: exam.id } },
    create: { studentId, examId: exam.id, totalMarks: summary.total, obtainedMarks: summary.obtained, percentage: summary.total ? (summary.obtained / summary.total) * 100 : 0, grade: gradeFor(summary.total ? (summary.obtained / summary.total) * 100 : 0, gradeScales), position: index + 1 },
    update: { totalMarks: summary.total, obtainedMarks: summary.obtained, percentage: summary.total ? (summary.obtained / summary.total) * 100 : 0, grade: gradeFor(summary.total ? (summary.obtained / summary.total) * 100 : 0, gradeScales), position: index + 1 },
  })));
  await logActivity({ userId: req.user!.id, action: 'exam_results_updated', entityType: 'exam', entityId: exam.id });
  await Promise.all(created.map((result: { studentId: string }) => notifyStudentGuardians({
    organizationId: madrassa.organizationId,
    studentId: result.studentId,
    title: 'Exam results published',
    content: `Results were published for ${exam.name}.`,
    channel: 'IN_APP',
  })));
  res.status(201).json({ results: created });
})); 

router.get('/student/:id', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { madrassa } = await getWorkspace(req.user!.id);
  const student = await prisma.student.findFirst({ where: { id: req.params.id, madrassaId: madrassa.id, isDeleted: false } });
  if (!student) throw new AppError(404, 'Student not found', 'NOT_FOUND');
  const results = await prisma.studentExamResult.findMany({ where: { studentId: student.id }, include: { exam: true } });
  const cards = await prisma.resultCard.findMany({ where: { studentId: student.id }, include: { exam: true } });
  res.json({ student, results, cards });
}));

router.get('/result-card/:studentId/:examId', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { madrassa } = await getWorkspace(req.user!.id);
  const student = await prisma.student.findFirst({ where: { id: req.params.studentId, madrassaId: madrassa.id, isDeleted: false } });
  if (!student) throw new AppError(404, 'Student not found', 'NOT_FOUND');
  const exam = await prisma.exam.findFirst({ where: { id: req.params.examId, madrassaId: madrassa.id }, include: { subjects: true } });
  if (!exam) throw new AppError(404, 'Exam not found', 'NOT_FOUND');
  const card = await prisma.resultCard.findUnique({ where: { studentId_examId: { studentId: student.id, examId: exam.id } } });
  const results = await prisma.studentExamResult.findMany({ where: { studentId: student.id, examId: exam.id } });
  res.json({ student, exam, card, results });
}));

router.get('/reports/class', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { madrassa } = await getWorkspace(req.user!.id);
  const parsed = z.object({ examId: z.string() }).safeParse(req.query);
  if (!parsed.success) throw new AppError(400, 'Invalid query parameters', 'VALIDATION_ERROR', parsed.error.flatten());
  const exam = await prisma.exam.findFirst({ where: { id: parsed.data.examId, madrassaId: madrassa.id } });
  if (!exam) throw new AppError(404, 'Exam not found', 'NOT_FOUND');
  const cards = await prisma.resultCard.findMany({ where: { examId: exam.id }, include: { student: true } });
  res.json({ cards });
}));

router.get('/reports/subject', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { madrassa } = await getWorkspace(req.user!.id);
  const parsed = z.object({ examId: z.string(), subjectId: z.string() }).safeParse(req.query);
  if (!parsed.success) throw new AppError(400, 'Invalid query parameters', 'VALIDATION_ERROR', parsed.error.flatten());
  const exam = await prisma.exam.findFirst({ where: { id: parsed.data.examId, madrassaId: madrassa.id } });
  if (!exam) throw new AppError(404, 'Exam not found', 'NOT_FOUND');
  const results = await prisma.studentExamResult.findMany({ where: { examId: exam.id, subjectId: parsed.data.subjectId }, include: { student: true } });
  res.json({ results });
}));

export default router;
