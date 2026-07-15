import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth.js';
import { AppError, asyncHandler } from '../lib/errors.js';
import { logActivity } from '../lib/activity.js';

const router = Router();
const assetCondition = z.enum(['NEW', 'GOOD', 'NEEDS_REPAIR', 'DAMAGED']);
const assetStatus = z.enum(['AVAILABLE', 'ASSIGNED', 'UNDER_MAINTENANCE', 'DISPOSED']);
const stockTypes = z.enum(['PURCHASE', 'ISSUE', 'RETURN', 'ADJUSTMENT']);

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

router.use(requireAuth);

const categorySchema = z.object({ name: z.string().min(2), description: z.string().optional().nullable() });
const assetSchema = z.object({
  categoryId: z.string(),
  name: z.string().min(2),
  description: z.string().optional().nullable(),
  purchaseDate: z.string(),
  purchasePrice: z.number().nonnegative(),
  currentValue: z.number().nonnegative(),
  condition: assetCondition,
  location: z.string().optional().nullable(),
  assignedTo: z.string().optional().nullable(),
  status: assetStatus.optional(),
});
const itemSchema = z.object({
  categoryId: z.string(),
  name: z.string().min(2),
  sku: z.string().min(2),
  quantity: z.number().int().nonnegative(),
  minimumStock: z.number().int().nonnegative(),
  unit: z.string().min(1),
  description: z.string().optional().nullable(),
});
const supplierSchema = z.object({ name: z.string().min(2), phone: z.string().optional().nullable(), email: z.string().email().optional().nullable(), address: z.string().optional().nullable() });
const purchaseSchema = z.object({
  supplierId: z.string(),
  invoiceNumber: z.string().min(2),
  purchaseDate: z.string(),
  totalAmount: z.number().nonnegative(),
  paymentStatus: z.string().optional(),
  items: z.array(z.object({ inventoryItemId: z.string(), quantity: z.number().int().positive(), unitPrice: z.number().nonnegative() })).min(1),
  debitAccountId: z.string().optional().nullable(),
  creditAccountId: z.string().optional().nullable(),
});
const maintenanceSchema = z.object({ assetId: z.string(), issue: z.string().min(2), cost: z.number().nonnegative(), date: z.string().optional(), status: z.string().optional(), remarks: z.string().optional().nullable() });

router.get('/categories', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { organization } = await getWorkspace(req.user!.id);
  const assetCategories = await prisma.assetCategory.findMany({ where: { organizationId: organization.id }, orderBy: { name: 'asc' } });
  const inventoryCategories = await prisma.inventoryCategory.findMany({ where: { organizationId: organization.id }, orderBy: { name: 'asc' } });
  res.json({ categories: assetCategories, inventoryCategories });
}));

router.post('/categories', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const parsed = categorySchema.safeParse(req.body);
  if (!parsed.success) throw new AppError(400, 'Invalid category payload', 'VALIDATION_ERROR', parsed.error.flatten());
  const { organization } = await getWorkspace(req.user!.id);
  const [assetCategory, inventoryCategory] = await prisma.$transaction([
    prisma.assetCategory.create({ data: { organizationId: organization.id, ...parsed.data } }),
    prisma.inventoryCategory.create({ data: { organizationId: organization.id, ...parsed.data } }),
  ]);
  res.status(201).json({ category: assetCategory, inventoryCategory });
}));

router.patch('/categories/:id', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const parsed = categorySchema.partial().safeParse(req.body);
  if (!parsed.success) throw new AppError(400, 'Invalid category payload', 'VALIDATION_ERROR', parsed.error.flatten());
  await getWorkspace(req.user!.id);
  const category = await prisma.assetCategory.update({ where: { id: req.params.id }, data: parsed.data });
  res.json({ category });
}));

router.delete('/categories/:id', asyncHandler(async (req: AuthenticatedRequest, res) => {
  await getWorkspace(req.user!.id);
  await prisma.assetCategory.delete({ where: { id: req.params.id } });
  res.json({ message: 'Category deleted' });
}));

router.get('/assets', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { organization } = await getWorkspace(req.user!.id);
  const assets = await prisma.asset.findMany({ where: { organizationId: organization.id }, include: { category: true, maintenance: true }, orderBy: { createdAt: 'desc' } });
  res.json({ assets });
}));

router.post('/assets', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const parsed = assetSchema.safeParse(req.body);
  if (!parsed.success) throw new AppError(400, 'Invalid asset payload', 'VALIDATION_ERROR', parsed.error.flatten());
  const { organization } = await getWorkspace(req.user!.id);
  const count = await prisma.asset.count({ where: { organizationId: organization.id } });
  const assetCode = `AST-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;
  const asset = await prisma.asset.create({
    data: {
      organizationId: organization.id,
      assetCode,
      categoryId: parsed.data.categoryId,
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      purchaseDate: new Date(parsed.data.purchaseDate),
      purchasePrice: parsed.data.purchasePrice,
      currentValue: parsed.data.currentValue,
      condition: parsed.data.condition,
      location: parsed.data.location ?? null,
      assignedTo: parsed.data.assignedTo ?? null,
      status: parsed.data.status ?? 'AVAILABLE',
    },
  });
  await logActivity({ userId: req.user!.id, action: 'inventory_asset_created', entityType: 'asset', entityId: asset.id });
  res.status(201).json({ asset });
}));

router.get('/assets/:id', asyncHandler(async (req: AuthenticatedRequest, res) => {
  await getWorkspace(req.user!.id);
  const asset = await prisma.asset.findUnique({ where: { id: req.params.id }, include: { category: true, maintenance: true } });
  if (!asset) throw new AppError(404, 'Asset not found', 'NOT_FOUND');
  res.json({ asset });
}));

router.patch('/assets/:id', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const parsed = assetSchema.partial().safeParse(req.body);
  if (!parsed.success) throw new AppError(400, 'Invalid asset payload', 'VALIDATION_ERROR', parsed.error.flatten());
  await getWorkspace(req.user!.id);
  const asset = await prisma.asset.update({ where: { id: req.params.id }, data: { ...parsed.data, purchaseDate: parsed.data.purchaseDate ? new Date(parsed.data.purchaseDate) : undefined } });
  await logActivity({ userId: req.user!.id, action: 'inventory_asset_updated', entityType: 'asset', entityId: asset.id });
  res.json({ asset });
}));

router.delete('/assets/:id', asyncHandler(async (req: AuthenticatedRequest, res) => {
  await getWorkspace(req.user!.id);
  const id = getParamId(req.params.id);
  await prisma.asset.delete({ where: { id } });
  await logActivity({ userId: req.user!.id, action: 'inventory_asset_deleted', entityType: 'asset', entityId: id });
  res.json({ message: 'Asset deleted' });
}));

router.get('/items', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { organization } = await getWorkspace(req.user!.id);
  const items = await prisma.inventoryItem.findMany({ where: { organizationId: organization.id }, include: { category: true, movements: true }, orderBy: { name: 'asc' } });
  res.json({ items });
}));

router.post('/items', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const parsed = itemSchema.safeParse(req.body);
  if (!parsed.success) throw new AppError(400, 'Invalid inventory item payload', 'VALIDATION_ERROR', parsed.error.flatten());
  const { organization } = await getWorkspace(req.user!.id);
  const item = await prisma.inventoryItem.create({ data: { organizationId: organization.id, ...parsed.data } });
  res.status(201).json({ item });
}));

router.post('/items/:id/stock', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const parsed = z.object({ type: stockTypes, quantity: z.number().int().positive(), reference: z.string().optional().nullable() }).safeParse(req.body);
  if (!parsed.success) throw new AppError(400, 'Invalid stock payload', 'VALIDATION_ERROR', parsed.error.flatten());
  await getWorkspace(req.user!.id);
  const item = await prisma.inventoryItem.findUnique({ where: { id: req.params.id } });
  if (!item) throw new AppError(404, 'Inventory item not found', 'NOT_FOUND');
  const nextQuantity = parsed.data.type === 'ISSUE' ? Math.max(item.quantity - parsed.data.quantity, 0) : item.quantity + parsed.data.quantity;
  const updated = await prisma.inventoryItem.update({ where: { id: item.id }, data: { quantity: nextQuantity } });
  const movement = await prisma.stockMovement.create({ data: { inventoryItemId: item.id, type: parsed.data.type, quantity: parsed.data.quantity, reference: parsed.data.reference ?? null, createdBy: req.user!.id } });
  res.status(201).json({ item: updated, movement });
}));

router.get('/suppliers', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { organization } = await getWorkspace(req.user!.id);
  const suppliers = await prisma.supplier.findMany({ where: { organizationId: organization.id }, orderBy: { name: 'asc' } });
  res.json({ suppliers });
}));

router.post('/suppliers', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const parsed = supplierSchema.safeParse(req.body);
  if (!parsed.success) throw new AppError(400, 'Invalid supplier payload', 'VALIDATION_ERROR', parsed.error.flatten());
  const { organization } = await getWorkspace(req.user!.id);
  const supplier = await prisma.supplier.create({ data: { organizationId: organization.id, ...parsed.data } });
  res.status(201).json({ supplier });
}));

router.get('/purchases', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { organization } = await getWorkspace(req.user!.id);
  const purchases = await prisma.purchase.findMany({ where: { organizationId: organization.id }, include: { supplier: true, items: { include: { item: true } } }, orderBy: { purchaseDate: 'desc' } });
  res.json({ purchases });
}));

router.post('/purchases', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const parsed = purchaseSchema.safeParse(req.body);
  if (!parsed.success) throw new AppError(400, 'Invalid purchase payload', 'VALIDATION_ERROR', parsed.error.flatten());
  const { organization } = await getWorkspace(req.user!.id);
  const supplier = await prisma.supplier.findFirst({ where: { id: parsed.data.supplierId, organizationId: organization.id } });
  if (!supplier) throw new AppError(404, 'Supplier not found', 'NOT_FOUND');
  const purchase = await prisma.purchase.create({
    data: {
      organizationId: organization.id,
      supplierId: supplier.id,
      invoiceNumber: parsed.data.invoiceNumber,
      purchaseDate: new Date(parsed.data.purchaseDate),
      totalAmount: parsed.data.totalAmount,
      paymentStatus: parsed.data.paymentStatus ?? 'PENDING',
      items: { create: parsed.data.items.map((item) => ({ inventoryItemId: item.inventoryItemId, quantity: item.quantity, unitPrice: item.unitPrice })) },
    },
    include: { supplier: true, items: { include: { item: true } } },
  });
  await logActivity({ userId: req.user!.id, action: 'inventory_purchase_recorded', entityType: 'purchase', entityId: purchase.id });
  if (parsed.data.debitAccountId && parsed.data.creditAccountId) {
    const voucherNumber = `INV-${Date.now()}`;
    await prisma.transaction.create({
      data: {
        organizationId: organization.id,
        voucherNumber,
        transactionDate: new Date(parsed.data.purchaseDate),
        description: `Inventory purchase ${parsed.data.invoiceNumber}`,
        totalAmount: parsed.data.totalAmount,
        createdBy: req.user!.id,
        lines: {
          create: [
            { accountId: parsed.data.debitAccountId, debit: parsed.data.totalAmount, credit: 0, remarks: 'Inventory purchase' },
            { accountId: parsed.data.creditAccountId, debit: 0, credit: parsed.data.totalAmount, remarks: 'Cash/bank payment' },
          ],
        },
      },
    });
  }
  res.status(201).json({ purchase });
}));

router.get('/maintenance', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { organization } = await getWorkspace(req.user!.id);
  const maintenance = await prisma.maintenanceRecord.findMany({ where: { organizationId: organization.id }, include: { asset: true }, orderBy: { date: 'desc' } });
  res.json({ maintenance });
}));

router.post('/maintenance', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const parsed = maintenanceSchema.safeParse(req.body);
  if (!parsed.success) throw new AppError(400, 'Invalid maintenance payload', 'VALIDATION_ERROR', parsed.error.flatten());
  const { organization } = await getWorkspace(req.user!.id);
  const asset = await prisma.asset.findFirst({ where: { id: parsed.data.assetId, organizationId: organization.id } });
  if (!asset) throw new AppError(404, 'Asset not found', 'NOT_FOUND');
  const maintenance = await prisma.maintenanceRecord.create({ data: { organizationId: organization.id, assetId: asset.id, issue: parsed.data.issue, cost: parsed.data.cost, date: parsed.data.date ? new Date(parsed.data.date) : new Date(), status: parsed.data.status ?? 'OPEN', remarks: parsed.data.remarks ?? null } });
  const category = await prisma.expenseCategory.upsert({ where: { organizationId_name: { organizationId: organization.id, name: 'Maintenance' } }, create: { organizationId: organization.id, name: 'Maintenance' }, update: {} });
  await prisma.expense.create({
    data: {
      organizationId: organization.id,
      categoryId: category.id,
      amount: parsed.data.cost,
      paymentMethod: 'CASH',
      paidTo: 'Maintenance Vendor',
      invoiceNumber: `MT-${maintenance.id.slice(0, 8)}`,
      expenseDate: parsed.data.date ? new Date(parsed.data.date) : new Date(),
      remarks: parsed.data.remarks ?? parsed.data.issue,
    },
  });
  await logActivity({ userId: req.user!.id, action: 'inventory_maintenance_recorded', entityType: 'maintenance', entityId: maintenance.id });
  res.status(201).json({ maintenance });
}));

router.get('/reports/assets', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { organization } = await getWorkspace(req.user!.id);
  const assets = await prisma.asset.findMany({ where: { organizationId: organization.id }, include: { category: true, maintenance: true } });
  res.json({ assets });
}));

router.get('/reports/stock', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { organization } = await getWorkspace(req.user!.id);
  const items = await prisma.inventoryItem.findMany({ where: { organizationId: organization.id }, include: { movements: true, category: true } });
  res.json({ items });
}));

router.get('/reports/purchases', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { organization } = await getWorkspace(req.user!.id);
  const purchases = await prisma.purchase.findMany({ where: { organizationId: organization.id }, include: { supplier: true, items: true } });
  res.json({ purchases });
}));

export default router;
