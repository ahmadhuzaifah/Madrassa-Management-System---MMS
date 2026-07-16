import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth, requireRole, type AuthenticatedRequest } from '../middleware/auth.js';
import { AppError, asyncHandler } from '../lib/errors.js';
import { logActivity } from '../lib/activity.js';

const router = Router();

const fieldSchema = z.object({
  label: z.string().min(2),
  fieldType: z.enum(['TEXT', 'NUMBER', 'DATE', 'DROPDOWN', 'CHECKBOX', 'FILE', 'MULTIPLE_CHOICE']),
  fieldKey: z.string().min(2),
  isRequired: z.boolean().optional(),
  options: z.array(z.string()).optional(),
  sortOrder: z.number().int().optional(),
});

const formSchema = z.object({
  sessionId: z.string(),
  name: z.string().min(2),
  description: z.string().optional().nullable(),
  isPublic: z.boolean().optional(),
  status: z.enum(['DRAFT', 'SUBMITTED', 'PUBLISHED', 'ARCHIVED']).optional(),
  fields: z.array(fieldSchema).optional(),
});

const applicantSchema = z.object({
  organizationId: z.string().optional().nullable(),
  fullName: z.string().min(2),
  fatherName: z.string().optional().nullable(),
  dateOfBirth: z.string().optional().nullable(),
  gender: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  province: z.string().optional().nullable(),
  guardian: z.object({
    name: z.string().min(2),
    relationship: z.string().min(2),
    phone: z.string().optional().nullable(),
    email: z.string().email().optional().nullable(),
    address: z.string().optional().nullable(),
    occupation: z.string().optional().nullable(),
  }).optional(),
  branchId: z.string().optional().nullable(),
  departmentId: z.string().optional().nullable(),
  programId: z.string().optional().nullable(),
  classRoomId: z.string().optional().nullable(),
  sectionId: z.string().optional().nullable(),
  academicYearId: z.string().optional().nullable(),
  admissionFeeAmount: z.number().int().nonnegative().optional(),
  formId: z.string().optional().nullable(),
});

const interviewSchema = z.object({
  interviewDate: z.string(),
  interviewerName: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

const decisionSchema = z.object({
  decision: z.enum(['APPROVED', 'REJECTED', 'WAITLISTED', 'ADMITTED']),
  notes: z.string().optional().nullable(),
});

const statusSchema = z.object({
  status: z.enum(['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'INTERVIEW_SCHEDULED', 'APPROVED', 'REJECTED', 'WAITLISTED', 'ADMITTED']),
  remarks: z.string().optional().nullable(),
});

async function getWorkspace(userId: string) {
  const organization = await prisma.organization.findFirst({ where: { ownerId: userId } });
  if (!organization) throw new AppError(404, 'Workspace not found', 'NOT_FOUND');
  const madrassa = await prisma.madrassa.findFirst({ where: { organizationId: organization.id, isDeleted: false } });
  if (!madrassa) throw new AppError(404, 'Madrassa profile required', 'NOT_FOUND');
  return { organization, madrassa };
}

async function nextApplicationNumber(tx: any, organizationId: string, madrassaId: string) {
  const year = new Date().getFullYear();
  const session = await tx.admissionSession.upsert({
    where: { organizationId_name: { organizationId, name: String(year) } },
    update: { applicationCounter: { increment: 1 } },
    create: { organizationId, madrassaId, name: String(year), startsAt: new Date(`${year}-01-01T00:00:00.000Z`), applicationCounter: 1 },
  });
  return `ADM-${year}-${String(session.applicationCounter).padStart(4, '0')}`;
}

async function createApplicantActivity(applicantId: string, organizationId: string, action: string, metadata?: Record<string, unknown>) {
  await prisma.admissionActivityLog.create({
    data: { applicantId, organizationId, action, metadata: metadata ? JSON.stringify(metadata) : null },
  });
}

router.get('/programs', asyncHandler(async (_req, res) => {
  const programs = await prisma.program.findMany({ where: { isDeleted: false, status: 'ACTIVE' }, include: { department: true } });
  res.json({ programs });
}));

router.get('/status/:applicationNumber', asyncHandler(async (req, res) => {
  const application = await prisma.admissionApplication.findUnique({
    where: { applicationNumber: req.params.applicationNumber },
    include: { applicant: { include: { guardian: true, documents: true } }, interview: true, payment: true, decision: true, form: true },
  });
  if (!application) throw new AppError(404, 'Application not found', 'NOT_FOUND');
  res.json({ application });
}));

router.post('/apply', asyncHandler(async (req, res) => {
  const parsed = applicantSchema.safeParse(req.body);
  if (!parsed.success) throw new AppError(400, 'Invalid application payload', 'VALIDATION_ERROR', parsed.error.flatten());
  const madrassa = await prisma.madrassa.findFirst({ where: parsed.data.organizationId ? { organizationId: parsed.data.organizationId, isDeleted: false } : { isDeleted: false } });
  if (!madrassa) throw new AppError(404, 'Admission workspace not available', 'NOT_FOUND');
  const result = await prisma.$transaction(async (tx: any) => {
    const applicationNumber = await nextApplicationNumber(tx, madrassa.organizationId, madrassa.id);
    const applicant = await tx.applicant.create({
      data: {
        organizationId: madrassa.organizationId,
        madrassaId: madrassa.id,
        applicationNumber,
        fullName: parsed.data.fullName,
        fatherName: parsed.data.fatherName ?? null,
        dateOfBirth: parsed.data.dateOfBirth ? new Date(parsed.data.dateOfBirth) : null,
        gender: parsed.data.gender ?? null,
        email: parsed.data.email ?? null,
        phone: parsed.data.phone ?? null,
        address: parsed.data.address ?? null,
        city: parsed.data.city ?? null,
        province: parsed.data.province ?? null,
        source: 'PUBLIC',
        status: 'SUBMITTED',
        guardian: parsed.data.guardian ? { create: { name: parsed.data.guardian.name, relationship: parsed.data.guardian.relationship, phone: parsed.data.guardian.phone ?? null, email: parsed.data.guardian.email ?? null, address: parsed.data.guardian.address ?? null, occupation: parsed.data.guardian.occupation ?? null } } : undefined,
      },
      include: { guardian: true },
    });
    const session = await tx.admissionSession.findFirst({ where: { madrassaId: madrassa.id, isActive: true } });
    if (!session) throw new AppError(404, 'Admission session not configured', 'NOT_FOUND');
    const application = await tx.admissionApplication.create({
      data: {
        organizationId: madrassa.organizationId,
        sessionId: session.id,
        formId: parsed.data.formId ?? null,
        applicantId: applicant.id,
        branchId: parsed.data.branchId ?? null,
        departmentId: parsed.data.departmentId ?? null,
        programId: parsed.data.programId ?? null,
        classRoomId: parsed.data.classRoomId ?? null,
        sectionId: parsed.data.sectionId ?? null,
        academicYearId: parsed.data.academicYearId ?? null,
        applicationNumber,
        status: 'SUBMITTED',
        submittedAt: new Date(),
        admissionFeeAmount: parsed.data.admissionFeeAmount ?? 0,
        feePaymentStatus: parsed.data.admissionFeeAmount ? 'UNPAID' : 'NOT_APPLICABLE',
      },
    });
    return { applicant, application };
  });
  await createApplicantActivity(result.applicant.id, result.applicant.organizationId, 'application_submitted', { applicationNumber: result.application.applicationNumber });
  if (result.applicant.email) {
    await prisma.messageQueue.create({ data: { organizationId: result.applicant.organizationId, channel: 'EMAIL', recipientType: 'APPLICANT', recipientId: result.applicant.id, subject: 'Admission application received', content: `Your application ${result.application.applicationNumber} has been received.`, status: 'SENT', sentAt: new Date() } });
  }
  res.status(201).json(result);
}));

router.use(requireAuth, requireRole(['ADMIN']));

router.get('/forms', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { organization } = await getWorkspace(req.user!.id);
  const forms = await prisma.admissionForm.findMany({ where: { organizationId: organization.id }, include: { fields: true, session: true }, orderBy: { createdAt: 'desc' } });
  res.json({ forms });
}));

router.post('/forms', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const parsed = formSchema.safeParse(req.body);
  if (!parsed.success) throw new AppError(400, 'Invalid form payload', 'VALIDATION_ERROR', parsed.error.flatten());
  const { organization, madrassa } = await getWorkspace(req.user!.id);
  const form = await prisma.$transaction(async (tx: any) => {
    const created = await tx.admissionForm.create({
      data: {
        organizationId: organization.id,
        sessionId: parsed.data.sessionId,
        name: parsed.data.name,
        description: parsed.data.description ?? null,
        isPublic: parsed.data.isPublic ?? true,
        status: parsed.data.status ?? 'DRAFT',
      },
    });
    if (parsed.data.fields?.length) {
      await tx.admissionField.createMany({
        data: parsed.data.fields.map((field, index) => ({
          formId: created.id,
          label: field.label,
          fieldType: field.fieldType,
          fieldKey: field.fieldKey,
          isRequired: field.isRequired ?? false,
          options: field.options ? JSON.stringify(field.options) : null,
          sortOrder: field.sortOrder ?? index,
        })),
      });
    }
    return created;
  });
  await logActivity({ userId: req.user!.id, action: 'admission_form_created', entityType: 'admissionForm', entityId: form.id, metadata: { madrassaId: madrassa.id } });
  res.status(201).json({ form });
}));

router.patch('/forms/:id', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const parsed = formSchema.partial().safeParse(req.body);
  if (!parsed.success) throw new AppError(400, 'Invalid form payload', 'VALIDATION_ERROR', parsed.error.flatten());
  const { organization } = await getWorkspace(req.user!.id);
  const form = await prisma.admissionForm.findFirst({ where: { id: req.params.id, organizationId: organization.id } });
  if (!form) throw new AppError(404, 'Form not found', 'NOT_FOUND');
  const updated = await prisma.admissionForm.update({ where: { id: form.id }, data: { ...parsed.data, description: parsed.data.description ?? undefined } });
  res.json({ form: updated });
}));

router.delete('/forms/:id', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { organization } = await getWorkspace(req.user!.id);
  const form = await prisma.admissionForm.findFirst({ where: { id: req.params.id, organizationId: organization.id } });
  if (!form) throw new AppError(404, 'Form not found', 'NOT_FOUND');
  await prisma.admissionForm.delete({ where: { id: form.id } });
  res.json({ message: 'Form deleted' });
}));

router.get('/applications', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { organization } = await getWorkspace(req.user!.id);
  const parsed = z.object({
    status: z.string().optional(),
    search: z.string().optional(),
  }).safeParse(req.query);
  if (!parsed.success) throw new AppError(400, 'Invalid query parameters', 'VALIDATION_ERROR', parsed.error.flatten());
  const applications = await prisma.admissionApplication.findMany({
    where: {
      organizationId: organization.id,
      ...(parsed.data.status ? { status: parsed.data.status } : {}),
      ...(parsed.data.search ? {
        OR: [
          { applicationNumber: { contains: parsed.data.search } },
          { applicant: { fullName: { contains: parsed.data.search } } },
        ],
      } : {}),
    },
    include: { applicant: { include: { guardian: true, documents: true } }, interview: true, payment: true, decision: true, form: true },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ applications });
}));

router.get('/applications/:id', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { organization } = await getWorkspace(req.user!.id);
  const application = await prisma.admissionApplication.findFirst({ where: { id: req.params.id, organizationId: organization.id }, include: { applicant: { include: { guardian: true, documents: true, activities: true } }, interview: true, payment: true, decision: true, form: { include: { fields: true } } } });
  if (!application) throw new AppError(404, 'Application not found', 'NOT_FOUND');
  res.json({ application });
}));

router.patch('/applications/:id/status', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const parsed = statusSchema.safeParse(req.body);
  if (!parsed.success) throw new AppError(400, 'Invalid status payload', 'VALIDATION_ERROR', parsed.error.flatten());
  const { organization } = await getWorkspace(req.user!.id);
  const application = await prisma.admissionApplication.findFirst({ where: { id: req.params.id, organizationId: organization.id } });
  if (!application) throw new AppError(404, 'Application not found', 'NOT_FOUND');
  const updated = await prisma.admissionApplication.update({ where: { id: application.id }, data: { status: parsed.data.status, remarks: parsed.data.remarks ?? application.remarks, submittedAt: parsed.data.status === 'SUBMITTED' ? new Date() : application.submittedAt, reviewedAt: ['UNDER_REVIEW', 'INTERVIEW_SCHEDULED', 'APPROVED', 'REJECTED', 'WAITLISTED', 'ADMITTED'].includes(parsed.data.status) ? new Date() : application.reviewedAt } });
  await createApplicantActivity(application.applicantId, organization.id, `status_${parsed.data.status.toLowerCase()}`, { remarks: parsed.data.remarks ?? null });
  res.json({ application: updated });
}));

router.post('/applications/:id/interview', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const parsed = interviewSchema.safeParse(req.body);
  if (!parsed.success) throw new AppError(400, 'Invalid interview payload', 'VALIDATION_ERROR', parsed.error.flatten());
  const { organization } = await getWorkspace(req.user!.id);
  const application = await prisma.admissionApplication.findFirst({ where: { id: req.params.id, organizationId: organization.id } });
  if (!application) throw new AppError(404, 'Application not found', 'NOT_FOUND');
  const interview = await prisma.admissionInterview.upsert({
    where: { applicationId: application.id },
    update: { interviewDate: new Date(parsed.data.interviewDate), interviewerName: parsed.data.interviewerName ?? null, notes: parsed.data.notes ?? null, status: 'SCHEDULED' },
    create: { applicantId: application.applicantId, applicationId: application.id, interviewDate: new Date(parsed.data.interviewDate), interviewerName: parsed.data.interviewerName ?? null, notes: parsed.data.notes ?? null, status: 'SCHEDULED' },
  });
  await prisma.admissionApplication.update({ where: { id: application.id }, data: { status: 'INTERVIEW_SCHEDULED' } });
  await createApplicantActivity(application.applicantId, organization.id, 'interview_scheduled', { interviewDate: parsed.data.interviewDate });
  res.status(201).json({ interview });
}));

router.post('/applications/:id/documents', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const parsed = z.object({ documentName: z.string().min(2), fileUrl: z.string().url(), verificationStatus: z.string().optional() }).safeParse(req.body);
  if (!parsed.success) throw new AppError(400, 'Invalid document payload', 'VALIDATION_ERROR', parsed.error.flatten());
  const { organization } = await getWorkspace(req.user!.id);
  const application = await prisma.admissionApplication.findFirst({ where: { id: req.params.id, organizationId: organization.id }, include: { applicant: true } });
  if (!application) throw new AppError(404, 'Application not found', 'NOT_FOUND');
  const document = await prisma.applicantDocument.create({ data: { applicantId: application.applicantId, documentName: parsed.data.documentName, fileUrl: parsed.data.fileUrl, verificationStatus: parsed.data.verificationStatus ?? 'PENDING' } });
  await createApplicantActivity(application.applicantId, organization.id, 'document_uploaded', { documentName: parsed.data.documentName });
  res.status(201).json({ document });
}));

router.post('/applications/:id/approve', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { organization } = await getWorkspace(req.user!.id);
  const application = await prisma.admissionApplication.findFirst({ where: { id: req.params.id, organizationId: organization.id }, include: { applicant: true } });
  if (!application) throw new AppError(404, 'Application not found', 'NOT_FOUND');
  const updated = await prisma.$transaction(async (tx: any) => {
    const student = await tx.student.create({
      data: {
        madrassaId: application.applicant.madrassaId,
        registrationNumber: `STU-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`,
        admissionNumber: application.applicationNumber,
        fullName: application.applicant.fullName,
        fatherName: application.applicant.fatherName ?? null,
        dateOfBirth: application.applicant.dateOfBirth,
        gender: application.applicant.gender ?? null,
        phone: application.applicant.phone ?? null,
        email: application.applicant.email ?? null,
        address: application.applicant.address ?? null,
        city: application.applicant.city ?? null,
        province: application.applicant.province ?? null,
        branchId: application.branchId ?? null,
        departmentId: application.departmentId ?? null,
        programId: application.programId ?? null,
        classRoomId: application.classRoomId ?? null,
        sectionId: application.sectionId ?? null,
        academicYearId: application.academicYearId ?? null,
        status: 'ACTIVE',
        admissionDate: new Date(),
        guardian: application.applicant.guardian ? { create: { madrassaId: application.applicant.madrassaId, name: application.applicant.guardian.name, relationship: application.applicant.guardian.relationship, phone: application.applicant.guardian.phone ?? null, email: application.applicant.guardian.email ?? null, address: application.applicant.guardian.address ?? null, occupation: application.applicant.guardian.occupation ?? null } } : undefined,
      },
    });
    const feeStructure = await tx.feeStructure.findFirst({ where: { organizationId: organization.id, madrassaId: application.applicant.madrassaId, programId: application.programId ?? undefined, classRoomId: application.classRoomId ?? undefined, status: 'ACTIVE' } });
    if (feeStructure) {
      await tx.studentFeeAssignment.create({
        data: {
          studentId: student.id,
          feeStructureId: feeStructure.id,
          amount: feeStructure.amount,
          discountAmount: 0,
          finalAmount: feeStructure.amount,
          startDate: new Date(),
          status: 'ACTIVE',
        },
      });
    }
    const approval = await tx.admissionDecision.upsert({
      where: { applicationId: application.id },
      update: { decision: 'APPROVED', decidedBy: req.user!.id, decidedAt: new Date() },
      create: { applicantId: application.applicantId, applicationId: application.id, decision: 'APPROVED', decidedBy: req.user!.id, decidedAt: new Date() },
    });
    await tx.admissionApplication.update({ where: { id: application.id }, data: { status: 'ADMITTED', admissionStudentId: student.id, reviewedAt: new Date() } });
    return { student, approval };
  });
  await createApplicantActivity(application.applicantId, organization.id, 'application_approved', { applicationId: application.id });
  if (application.applicant.email) {
    await prisma.messageQueue.create({ data: { organizationId: organization.id, channel: 'EMAIL', recipientType: 'APPLICANT', recipientId: application.applicantId, subject: 'Admission approved', content: `Your admission ${application.applicationNumber} has been approved.`, status: 'SENT', sentAt: new Date() } });
  }
  res.status(201).json(updated);
}));

router.post('/applications/:id/reject', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const parsed = decisionSchema.pick({ decision: true, notes: true }).safeParse({ decision: 'REJECTED', notes: req.body?.notes });
  if (!parsed.success) throw new AppError(400, 'Invalid decision payload', 'VALIDATION_ERROR', parsed.error.flatten());
  const { organization } = await getWorkspace(req.user!.id);
  const application = await prisma.admissionApplication.findFirst({ where: { id: req.params.id, organizationId: organization.id } });
  if (!application) throw new AppError(404, 'Application not found', 'NOT_FOUND');
  const decision = await prisma.admissionDecision.upsert({
    where: { applicationId: application.id },
    update: { decision: 'REJECTED', decidedBy: req.user!.id, decidedAt: new Date(), notes: req.body?.notes ?? null },
    create: { applicantId: application.applicantId, applicationId: application.id, decision: 'REJECTED', decidedBy: req.user!.id, decidedAt: new Date(), notes: req.body?.notes ?? null },
  });
  await prisma.admissionApplication.update({ where: { id: application.id }, data: { status: 'REJECTED', reviewedAt: new Date() } });
  await createApplicantActivity(application.applicantId, organization.id, 'application_rejected', { notes: req.body?.notes ?? null });
  res.json({ decision });
}));

router.post('/applications/:id/convert', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { organization } = await getWorkspace(req.user!.id);
  const application = await prisma.admissionApplication.findFirst({ where: { id: req.params.id, organizationId: organization.id }, include: { applicant: { include: { guardian: true } } } });
  if (!application) throw new AppError(404, 'Application not found', 'NOT_FOUND');
  const converted = await prisma.$transaction(async (tx: any) => {
    const student = await tx.student.create({
      data: {
        madrassaId: application.applicant.madrassaId,
        registrationNumber: `STU-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`,
        admissionNumber: application.applicationNumber,
        fullName: application.applicant.fullName,
        fatherName: application.applicant.fatherName ?? null,
        dateOfBirth: application.applicant.dateOfBirth,
        gender: application.applicant.gender ?? null,
        phone: application.applicant.phone ?? null,
        email: application.applicant.email ?? null,
        address: application.applicant.address ?? null,
        city: application.applicant.city ?? null,
        province: application.applicant.province ?? null,
        branchId: application.branchId ?? null,
        departmentId: application.departmentId ?? null,
        programId: application.programId ?? null,
        classRoomId: application.classRoomId ?? null,
        sectionId: application.sectionId ?? null,
        academicYearId: application.academicYearId ?? null,
        status: 'ACTIVE',
        admissionDate: new Date(),
        guardian: application.applicant.guardian ? { create: { madrassaId: application.applicant.madrassaId, name: application.applicant.guardian.name, relationship: application.applicant.guardian.relationship, phone: application.applicant.guardian.phone ?? null, email: application.applicant.guardian.email ?? null, address: application.applicant.guardian.address ?? null, occupation: application.applicant.guardian.occupation ?? null } } : undefined,
      },
    });
    await tx.admissionApplication.update({ where: { id: application.id }, data: { status: 'ADMITTED', admissionStudentId: student.id, reviewedAt: new Date() } });
    return student;
  });
  await createApplicantActivity(application.applicantId, organization.id, 'application_converted', { studentId: converted.id });
  res.status(201).json({ student: converted });
}));

router.get('/reports/summary', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { organization } = await getWorkspace(req.user!.id);
  const applications = await prisma.admissionApplication.findMany({ where: { organizationId: organization.id } });
  const total = applications.length;
  const admitted = applications.filter((item: { status: string }) => item.status === 'ADMITTED').length;
  const rejected = applications.filter((item: { status: string }) => item.status === 'REJECTED').length;
  res.json({ summary: { total, admitted, rejected, conversionRate: total ? (admitted / total) * 100 : 0 } });
}));

router.get('/reports/conversion', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { organization } = await getWorkspace(req.user!.id);
  const rows = await prisma.admissionApplication.groupBy({
    by: ['status'],
    where: { organizationId: organization.id },
    _count: { id: true },
  });
  res.json({ conversion: rows });
}));

export default router;
