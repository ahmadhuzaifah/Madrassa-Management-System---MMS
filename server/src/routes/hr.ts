import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth.js';
import { AppError, asyncHandler } from '../lib/errors.js';
import { logActivity } from '../lib/activity.js';

const router = Router();
const employeeStatuses = z.enum(['ACTIVE', 'INACTIVE', 'TERMINATED', 'ON_LEAVE']);
const attendanceStatuses = z.enum(['PRESENT', 'ABSENT', 'LEAVE', 'LATE', 'HALF_DAY']);
const leaveTypes = z.enum(['Casual', 'Sick', 'Annual', 'Unpaid']);
const paymentMethods = z.enum(['CASH', 'BANK', 'ONLINE']);

async function getWorkspace(userId: string) {
  const organization = await prisma.organization.findFirst({ where: { ownerId: userId } });
  if (!organization) throw new AppError(404, 'Workspace not found', 'NOT_FOUND');
  const madrassa = await prisma.madrassa.findFirst({ where: { organizationId: organization.id, isDeleted: false } });
  if (!madrassa) throw new AppError(404, 'Madrassa profile required', 'NOT_FOUND');
  return { organization, madrassa };
}

function getParamId(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

async function canManageHr(user: AuthenticatedRequest['user'], organizationId: string) {
  if (!user) return false;
  if (user.role === 'ADMIN') return true;
  const org = await prisma.organization.findFirst({ where: { id: organizationId, ownerId: user.id } });
  return Boolean(org);
}

async function requireHrManager(req: AuthenticatedRequest) {
  const { organization } = await getWorkspace(req.user!.id);
  if (!(await canManageHr(req.user, organization.id))) throw new AppError(403, 'Forbidden', 'FORBIDDEN');
  return organization;
}

const departmentSchema = z.object({ name: z.string().min(2), description: z.string().optional().nullable() });
const designationSchema = z.object({ departmentId: z.string(), title: z.string().min(2), description: z.string().optional().nullable() });
const employeeSchema = z.object({
  firstName: z.string().min(2),
  lastName: z.string().min(2),
  fatherName: z.string().optional().nullable(),
  gender: z.string().optional().nullable(),
  dob: z.string().optional().nullable(),
  cnic: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  address: z.string().optional().nullable(),
  photo: z.string().optional().nullable(),
  departmentId: z.string().optional().nullable(),
  designationId: z.string().optional().nullable(),
  employmentType: z.string().min(2),
  joiningDate: z.string(),
  contractEndDate: z.string().optional().nullable(),
  status: employeeStatuses.optional(),
  qualification: z.string().optional().nullable(),
  experience: z.string().optional().nullable(),
  emergencyContact: z.string().optional().nullable(),
  bankName: z.string().optional().nullable(),
  accountNumber: z.string().optional().nullable(),
  basicSalary: z.number().nonnegative().default(0),
});

const attendanceSchema = z.object({ employeeId: z.string(), attendanceDate: z.string(), checkIn: z.string().optional().nullable(), checkOut: z.string().optional().nullable(), status: attendanceStatuses, remarks: z.string().optional().nullable() });
const leaveSchema = z.object({ employeeId: z.string(), leaveType: leaveTypes, startDate: z.string(), endDate: z.string(), reason: z.string().min(2), status: z.string().optional(), approvedBy: z.string().optional().nullable() });
const payrollSchema = z.object({ employeeId: z.string(), month: z.number().int().min(1).max(12), year: z.number().int().min(2000), allowances: z.number().nonnegative().default(0), deductions: z.number().nonnegative().default(0), overtime: z.number().nonnegative().default(0), bonus: z.number().nonnegative().default(0), paymentMethod: paymentMethods.optional(), paymentDate: z.string().optional().nullable() });

router.use(requireAuth);

router.get('/departments', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { organization } = await getWorkspace(req.user!.id);
  const departments = await prisma.hrDepartment.findMany({ where: { organizationId: organization.id }, orderBy: { name: 'asc' } });
  res.json({ departments });
}));

router.post('/departments', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const parsed = departmentSchema.safeParse(req.body);
  if (!parsed.success) throw new AppError(400, 'Invalid department payload', 'VALIDATION_ERROR', parsed.error.flatten());
  const organization = await requireHrManager(req);
  const department = await prisma.hrDepartment.create({ data: { organizationId: organization.id, ...parsed.data } });
  await logActivity({ userId: req.user!.id, action: 'hr_department_created', entityType: 'hrDepartment', entityId: department.id });
  res.status(201).json({ department });
}));

router.patch('/departments/:id', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const parsed = departmentSchema.partial().safeParse(req.body);
  if (!parsed.success) throw new AppError(400, 'Invalid department payload', 'VALIDATION_ERROR', parsed.error.flatten());
  await requireHrManager(req);
  const department = await prisma.hrDepartment.update({ where: { id: req.params.id }, data: parsed.data });
  await logActivity({ userId: req.user!.id, action: 'hr_department_updated', entityType: 'hrDepartment', entityId: department.id });
  res.json({ department });
}));

router.delete('/departments/:id', asyncHandler(async (req: AuthenticatedRequest, res) => {
  await requireHrManager(req);
  const id = getParamId(req.params.id);
  await prisma.hrDepartment.delete({ where: { id } });
  await logActivity({ userId: req.user!.id, action: 'hr_department_deleted', entityType: 'hrDepartment', entityId: id });
  res.json({ message: 'Department deleted' });
}));

router.get('/designations', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { organization } = await getWorkspace(req.user!.id);
  const designations = await prisma.hrDesignation.findMany({ where: { organizationId: organization.id }, include: { department: true }, orderBy: { title: 'asc' } });
  res.json({ designations });
}));

router.post('/designations', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const parsed = designationSchema.safeParse(req.body);
  if (!parsed.success) throw new AppError(400, 'Invalid designation payload', 'VALIDATION_ERROR', parsed.error.flatten());
  const organization = await requireHrManager(req);
  const designation = await prisma.hrDesignation.create({ data: { organizationId: organization.id, ...parsed.data } });
  await logActivity({ userId: req.user!.id, action: 'hr_designation_created', entityType: 'hrDesignation', entityId: designation.id });
  res.status(201).json({ designation });
}));

router.patch('/designations/:id', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const parsed = designationSchema.partial().safeParse(req.body);
  if (!parsed.success) throw new AppError(400, 'Invalid designation payload', 'VALIDATION_ERROR', parsed.error.flatten());
  await requireHrManager(req);
  const designation = await prisma.hrDesignation.update({ where: { id: req.params.id }, data: parsed.data });
  await logActivity({ userId: req.user!.id, action: 'hr_designation_updated', entityType: 'hrDesignation', entityId: designation.id });
  res.json({ designation });
}));

router.delete('/designations/:id', asyncHandler(async (req: AuthenticatedRequest, res) => {
  await requireHrManager(req);
  const id = getParamId(req.params.id);
  await prisma.hrDesignation.delete({ where: { id } });
  await logActivity({ userId: req.user!.id, action: 'hr_designation_deleted', entityType: 'hrDesignation', entityId: id });
  res.json({ message: 'Designation deleted' });
}));

router.get('/employees', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { organization } = await getWorkspace(req.user!.id);
  const employees = await prisma.employee.findMany({ where: { organizationId: organization.id }, include: { department: true, designation: true }, orderBy: { createdAt: 'desc' } });
  res.json({ employees });
}));

router.post('/employees', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const parsed = employeeSchema.safeParse(req.body);
  if (!parsed.success) throw new AppError(400, 'Invalid employee payload', 'VALIDATION_ERROR', parsed.error.flatten());
  const organization = await requireHrManager(req);
  const count = await prisma.employee.count({ where: { organizationId: organization.id } });
  const employeeNumber = `EMP-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;
  const employee = await prisma.employee.create({
    data: {
      organizationId: organization.id,
      employeeNumber,
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
      fatherName: parsed.data.fatherName ?? null,
      gender: parsed.data.gender ?? null,
      dob: parsed.data.dob ? new Date(parsed.data.dob) : null,
      cnic: parsed.data.cnic ?? null,
      phone: parsed.data.phone ?? null,
      email: parsed.data.email ?? null,
      address: parsed.data.address ?? null,
      photo: parsed.data.photo ?? null,
      departmentId: parsed.data.departmentId ?? null,
      designationId: parsed.data.designationId ?? null,
      employmentType: parsed.data.employmentType,
      joiningDate: new Date(parsed.data.joiningDate),
      contractEndDate: parsed.data.contractEndDate ? new Date(parsed.data.contractEndDate) : null,
      status: parsed.data.status ?? 'ACTIVE',
      qualification: parsed.data.qualification ?? null,
      experience: parsed.data.experience ?? null,
      emergencyContact: parsed.data.emergencyContact ?? null,
      bankName: parsed.data.bankName ?? null,
      accountNumber: parsed.data.accountNumber ?? null,
      basicSalary: parsed.data.basicSalary,
    },
    include: { department: true, designation: true },
  });
  await logActivity({ userId: req.user!.id, action: 'hr_employee_created', entityType: 'employee', entityId: employee.id });
  res.status(201).json({ employee });
}));

router.get('/employees/:id', asyncHandler(async (req: AuthenticatedRequest, res) => {
  await getWorkspace(req.user!.id);
  const employee = await prisma.employee.findUnique({ where: { id: req.params.id }, include: { department: true, designation: true, attendance: true, leaveRequests: true, payrolls: true, documents: true } });
  if (!employee) throw new AppError(404, 'Employee not found', 'NOT_FOUND');
  res.json({ employee });
}));

router.patch('/employees/:id', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const parsed = employeeSchema.partial().safeParse(req.body);
  if (!parsed.success) throw new AppError(400, 'Invalid employee payload', 'VALIDATION_ERROR', parsed.error.flatten());
  await requireHrManager(req);
  const employee = await prisma.employee.update({ where: { id: req.params.id }, data: { ...parsed.data, dob: parsed.data.dob ? new Date(parsed.data.dob) : undefined, joiningDate: parsed.data.joiningDate ? new Date(parsed.data.joiningDate) : undefined, contractEndDate: parsed.data.contractEndDate ? new Date(parsed.data.contractEndDate) : undefined } });
  await logActivity({ userId: req.user!.id, action: 'hr_employee_updated', entityType: 'employee', entityId: employee.id });
  res.json({ employee });
}));

router.delete('/employees/:id', asyncHandler(async (req: AuthenticatedRequest, res) => {
  await requireHrManager(req);
  const id = getParamId(req.params.id);
  await prisma.employee.delete({ where: { id } });
  await logActivity({ userId: req.user!.id, action: 'hr_employee_deleted', entityType: 'employee', entityId: id });
  res.json({ message: 'Employee deleted' });
}));

router.get('/attendance', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { organization } = await getWorkspace(req.user!.id);
  const attendance = await prisma.employeeAttendance.findMany({ where: { employee: { organizationId: organization.id } }, include: { employee: true }, orderBy: { attendanceDate: 'desc' } });
  res.json({ attendance });
}));

router.post('/attendance', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const parsed = attendanceSchema.safeParse(req.body);
  if (!parsed.success) throw new AppError(400, 'Invalid attendance payload', 'VALIDATION_ERROR', parsed.error.flatten());
  await requireHrManager(req);
  const attendance = await prisma.employeeAttendance.create({ data: { employeeId: parsed.data.employeeId, attendanceDate: new Date(parsed.data.attendanceDate), checkIn: parsed.data.checkIn ?? null, checkOut: parsed.data.checkOut ?? null, status: parsed.data.status, remarks: parsed.data.remarks ?? null } });
  res.status(201).json({ attendance });
}));

router.patch('/attendance/:id', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const parsed = attendanceSchema.partial().safeParse(req.body);
  if (!parsed.success) throw new AppError(400, 'Invalid attendance payload', 'VALIDATION_ERROR', parsed.error.flatten());
  await requireHrManager(req);
  const attendance = await prisma.employeeAttendance.update({ where: { id: req.params.id }, data: { ...parsed.data, attendanceDate: parsed.data.attendanceDate ? new Date(parsed.data.attendanceDate) : undefined } });
  res.json({ attendance });
}));

router.get('/attendance/reports', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { organization } = await getWorkspace(req.user!.id);
  const attendance = await prisma.employeeAttendance.findMany({ where: { employee: { organizationId: organization.id } }, include: { employee: true } });
  res.json({ attendance });
}));

router.get('/leaves', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { organization } = await getWorkspace(req.user!.id);
  const leaves = await prisma.hrLeaveRequest.findMany({ where: { organizationId: organization.id }, include: { employee: true }, orderBy: { createdAt: 'desc' } });
  res.json({ leaves });
}));

router.post('/leaves', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const parsed = leaveSchema.safeParse(req.body);
  if (!parsed.success) throw new AppError(400, 'Invalid leave payload', 'VALIDATION_ERROR', parsed.error.flatten());
  await requireHrManager(req);
  const leave = await prisma.hrLeaveRequest.create({ data: { organizationId: (await getWorkspace(req.user!.id)).organization.id, employeeId: parsed.data.employeeId, leaveType: parsed.data.leaveType, startDate: new Date(parsed.data.startDate), endDate: new Date(parsed.data.endDate), reason: parsed.data.reason, status: parsed.data.status ?? 'PENDING', approvedBy: parsed.data.approvedBy ?? null } });
  res.status(201).json({ leave });
}));

router.patch('/leaves/:id', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const parsed = leaveSchema.partial().safeParse(req.body);
  if (!parsed.success) throw new AppError(400, 'Invalid leave payload', 'VALIDATION_ERROR', parsed.error.flatten());
  await requireHrManager(req);
  const leave = await prisma.hrLeaveRequest.update({ where: { id: req.params.id }, data: { ...parsed.data, startDate: parsed.data.startDate ? new Date(parsed.data.startDate) : undefined, endDate: parsed.data.endDate ? new Date(parsed.data.endDate) : undefined } });
  res.json({ leave });
}));

router.get('/payroll', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { organization } = await getWorkspace(req.user!.id);
  const payroll = await prisma.payroll.findMany({ where: { organizationId: organization.id }, include: { employee: true, salarySlip: true }, orderBy: [{ year: 'desc' }, { month: 'desc' }] });
  res.json({ payroll });
}));

router.post('/payroll/generate', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const parsed = payrollSchema.safeParse(req.body);
  if (!parsed.success) throw new AppError(400, 'Invalid payroll payload', 'VALIDATION_ERROR', parsed.error.flatten());
  const organization = await requireHrManager(req);
  const employee = await prisma.employee.findFirst({ where: { id: parsed.data.employeeId, organizationId: organization.id } });
  if (!employee) throw new AppError(404, 'Employee not found', 'NOT_FOUND');
  const netSalary = employee.basicSalary + parsed.data.allowances + parsed.data.overtime + parsed.data.bonus - parsed.data.deductions;
  const payroll = await prisma.payroll.upsert({
    where: { employeeId_month_year: { employeeId: employee.id, month: parsed.data.month, year: parsed.data.year } },
    update: { basicSalary: employee.basicSalary, allowances: parsed.data.allowances, deductions: parsed.data.deductions, overtime: parsed.data.overtime, bonus: parsed.data.bonus, netSalary },
    create: { organizationId: organization.id, employeeId: employee.id, month: parsed.data.month, year: parsed.data.year, basicSalary: employee.basicSalary, allowances: parsed.data.allowances, deductions: parsed.data.deductions, overtime: parsed.data.overtime, bonus: parsed.data.bonus, netSalary },
  });
  res.status(201).json({ payroll });
}));

router.post('/payroll/pay', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const parsed = z.object({ payrollId: z.string(), paymentMethod: paymentMethods, paymentDate: z.string().optional().nullable(), cashAccountId: z.string(), salaryExpenseAccountId: z.string() }).safeParse(req.body);
  if (!parsed.success) throw new AppError(400, 'Invalid payroll payment payload', 'VALIDATION_ERROR', parsed.error.flatten());
  const organization = await requireHrManager(req);
  const payroll = await prisma.payroll.findFirst({ where: { id: parsed.data.payrollId, organizationId: organization.id }, include: { employee: true } });
  if (!payroll) throw new AppError(404, 'Payroll not found', 'NOT_FOUND');
  const voucherNumber = `SAL-${Date.now()}`;
  await prisma.$transaction([
    prisma.payroll.update({ where: { id: payroll.id }, data: { paymentStatus: 'PAID', paymentMethod: parsed.data.paymentMethod, paymentDate: parsed.data.paymentDate ? new Date(parsed.data.paymentDate) : new Date() } }),
    prisma.transaction.create({
      data: {
        organizationId: organization.id,
        voucherNumber,
        transactionDate: parsed.data.paymentDate ? new Date(parsed.data.paymentDate) : new Date(),
        description: `Salary payment for ${payroll.employee.firstName} ${payroll.employee.lastName}`,
        totalAmount: payroll.netSalary,
        createdBy: req.user!.id,
        lines: {
          create: [
            { accountId: parsed.data.salaryExpenseAccountId, debit: payroll.netSalary, credit: 0, remarks: 'Salary expense' },
            { accountId: parsed.data.cashAccountId, debit: 0, credit: payroll.netSalary, remarks: 'Salary payment' },
          ],
        },
      },
    }),
  ]);
  const slip = await prisma.salarySlip.upsert({
    where: { payrollId: payroll.id },
    update: {},
    create: { payrollId: payroll.id, slipNumber: `SLIP-${Date.now()}` },
  });
  await logActivity({ userId: req.user!.id, action: 'hr_salary_paid', entityType: 'payroll', entityId: payroll.id });
  res.json({ payroll, salarySlip: slip });
}));

router.get('/payroll/:id', asyncHandler(async (req: AuthenticatedRequest, res) => {
  await getWorkspace(req.user!.id);
  const payroll = await prisma.payroll.findUnique({ where: { id: req.params.id }, include: { employee: true, salarySlip: true } });
  if (!payroll) throw new AppError(404, 'Payroll not found', 'NOT_FOUND');
  res.json({ payroll });
}));

export default router;
