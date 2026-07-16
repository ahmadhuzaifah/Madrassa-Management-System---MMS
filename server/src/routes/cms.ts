import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth.js';
import { AppError, asyncHandler } from '../lib/errors.js';

const router = Router();

const websiteSchema = z.object({ name: z.string().min(2), slug: z.string().min(2), status: z.string().optional() });
const pageSchema = z.object({ websiteId: z.string(), title: z.string().min(2), slug: z.string().min(2), content: z.string().optional().nullable(), visibility: z.string().optional(), status: z.string().optional(), seoTitle: z.string().optional().nullable(), seoDescription: z.string().optional().nullable() });
const menuSchema = z.object({ websiteId: z.string(), name: z.string().min(2), location: z.string().min(2) });
const mediaSchema = z.object({ websiteId: z.string(), fileName: z.string().min(2), url: z.string().url(), mimeType: z.string().min(2), tags: z.string().optional().nullable(), folder: z.string().optional().nullable() });
const settingSchema = z.object({ websiteId: z.string(), logoUrl: z.string().url().optional().nullable(), faviconUrl: z.string().url().optional().nullable(), primaryColor: z.string().optional().nullable(), secondaryColor: z.string().optional().nullable(), typography: z.string().optional().nullable(), contactInfo: z.string().optional().nullable(), email: z.string().email().optional().nullable(), phone: z.string().optional().nullable(), whatsapp: z.string().optional().nullable(), address: z.string().optional().nullable(), googleMaps: z.string().optional().nullable(), socialLinks: z.string().optional().nullable(), footerSettings: z.string().optional().nullable(), copyright: z.string().optional().nullable(), customScripts: z.string().optional().nullable(), customCss: z.string().optional().nullable(), customJs: z.string().optional().nullable(), maintenanceMode: z.boolean().optional(), comingSoonMode: z.boolean().optional() });

async function getWorkspace(userId: string) {
  const organization = await prisma.organization.findFirst({ where: { ownerId: userId } });
  if (!organization) throw new AppError(404, 'Workspace not found', 'NOT_FOUND');
  return organization;
}

router.get('/public/:slug', asyncHandler(async (req, res) => {
  const page = await prisma.websitePage.findFirst({ where: { slug: req.params.slug, status: 'PUBLISHED' }, include: { sections: { where: { isVisible: true }, include: { blocks: { where: { isVisible: true } } } } } });
  if (!page) throw new AppError(404, 'Page not found', 'NOT_FOUND');
  res.json({ page });
}));

router.get('/public', asyncHandler(async (_req, res) => {
  const pages = await prisma.websitePage.findMany({ where: { status: 'PUBLISHED' }, orderBy: { createdAt: 'desc' } });
  res.json({ pages });
}));

router.use(requireAuth);

router.get('/websites', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const organization = await getWorkspace(req.user!.id);
  const websites = await prisma.website.findMany({ where: { organizationId: organization.id }, include: { setting: true, theme: true, pages: true, menus: true, seo: true } });
  res.json({ websites });
}));

router.post('/websites', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const parsed = websiteSchema.safeParse(req.body);
  if (!parsed.success) throw new AppError(400, 'Invalid website payload', 'VALIDATION_ERROR', parsed.error.flatten());
  const organization = await getWorkspace(req.user!.id);
  const website = await prisma.website.create({ data: { organizationId: organization.id, ...parsed.data } });
  await prisma.websiteSetting.create({ data: { websiteId: website.id } }).catch(() => undefined);
  res.status(201).json({ website });
}));

router.patch('/websites/:id', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const parsed = websiteSchema.partial().safeParse(req.body);
  if (!parsed.success) throw new AppError(400, 'Invalid website payload', 'VALIDATION_ERROR', parsed.error.flatten());
  const website = await prisma.website.update({ where: { id: req.params.id }, data: parsed.data });
  res.json({ website });
}));

router.delete('/websites/:id', asyncHandler(async (req: AuthenticatedRequest, res) => {
  await prisma.website.delete({ where: { id: req.params.id } });
  res.json({ message: 'Website deleted' });
}));

router.get('/pages', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const pages = await prisma.websitePage.findMany({ include: { sections: { include: { blocks: true } } }, orderBy: { createdAt: 'desc' } });
  res.json({ pages });
}));

router.post('/pages', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const parsed = pageSchema.safeParse(req.body);
  if (!parsed.success) throw new AppError(400, 'Invalid page payload', 'VALIDATION_ERROR', parsed.error.flatten());
  const page = await prisma.websitePage.create({ data: parsed.data });
  res.status(201).json({ page });
}));

router.patch('/pages/:id', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const parsed = pageSchema.partial().safeParse(req.body);
  if (!parsed.success) throw new AppError(400, 'Invalid page payload', 'VALIDATION_ERROR', parsed.error.flatten());
  const page = await prisma.websitePage.update({ where: { id: req.params.id }, data: parsed.data });
  res.json({ page });
}));

router.delete('/pages/:id', asyncHandler(async (req: AuthenticatedRequest, res) => {
  await prisma.websitePage.delete({ where: { id: req.params.id } });
  res.json({ message: 'Page deleted' });
}));

router.get('/menus', asyncHandler(async (_req, res) => {
  const menus = await prisma.websiteMenu.findMany({ include: { items: true } });
  res.json({ menus });
}));

router.post('/menus', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const parsed = menuSchema.safeParse(req.body);
  if (!parsed.success) throw new AppError(400, 'Invalid menu payload', 'VALIDATION_ERROR', parsed.error.flatten());
  const menu = await prisma.websiteMenu.create({ data: parsed.data });
  res.status(201).json({ menu });
}));

router.patch('/menus/:id', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const parsed = menuSchema.partial().safeParse(req.body);
  if (!parsed.success) throw new AppError(400, 'Invalid menu payload', 'VALIDATION_ERROR', parsed.error.flatten());
  const menu = await prisma.websiteMenu.update({ where: { id: req.params.id }, data: parsed.data });
  res.json({ menu });
}));

router.delete('/menus/:id', asyncHandler(async (req: AuthenticatedRequest, res) => {
  await prisma.websiteMenu.delete({ where: { id: req.params.id } });
  res.json({ message: 'Menu deleted' });
}));

router.get('/media', asyncHandler(async (_req, res) => {
  const media = await prisma.websiteMedia.findMany({ orderBy: { createdAt: 'desc' } });
  res.json({ media });
}));

router.post('/media', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const parsed = mediaSchema.safeParse(req.body);
  if (!parsed.success) throw new AppError(400, 'Invalid media payload', 'VALIDATION_ERROR', parsed.error.flatten());
  const media = await prisma.websiteMedia.create({ data: parsed.data });
  res.status(201).json({ media });
}));

router.delete('/media/:id', asyncHandler(async (req: AuthenticatedRequest, res) => {
  await prisma.websiteMedia.delete({ where: { id: req.params.id } });
  res.json({ message: 'Media deleted' });
}));

router.get('/settings/:websiteId', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const setting = await prisma.websiteSetting.findUnique({ where: { websiteId: req.params.websiteId } });
  res.json({ setting });
}));

router.put('/settings/:websiteId', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const parsed = settingSchema.omit({ websiteId: true }).safeParse(req.body);
  if (!parsed.success) throw new AppError(400, 'Invalid settings payload', 'VALIDATION_ERROR', parsed.error.flatten());
  const setting = await prisma.websiteSetting.upsert({ where: { websiteId: req.params.websiteId }, update: parsed.data, create: { websiteId: req.params.websiteId, ...parsed.data } });
  res.json({ setting });
}));

router.get('/seo/:websiteId', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const seo = await prisma.websiteSeo.findUnique({ where: { websiteId: req.params.websiteId } });
  res.json({ seo });
}));

router.put('/seo/:websiteId', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const seo = await prisma.websiteSeo.upsert({ where: { websiteId: req.params.websiteId }, update: req.body, create: { websiteId: req.params.websiteId, ...req.body } });
  res.json({ seo });
}));

router.post('/contact', asyncHandler(async (req, res) => {
  const parsed = z.object({ websiteId: z.string(), name: z.string().min(2), email: z.string().email(), phone: z.string().optional().nullable(), subject: z.string().optional().nullable(), message: z.string().min(2) }).safeParse(req.body);
  if (!parsed.success) throw new AppError(400, 'Invalid contact payload', 'VALIDATION_ERROR', parsed.error.flatten());
  const message = await prisma.websiteContactMessage.create({ data: parsed.data });
  res.status(201).json({ message });
}));

router.get('/contact', asyncHandler(async (_req, res) => {
  const messages = await prisma.websiteContactMessage.findMany({ orderBy: { createdAt: 'desc' } });
  res.json({ messages });
}));

export default router;
