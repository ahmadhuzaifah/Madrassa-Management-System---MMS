import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import multer from 'multer';
import { v4 as uuid } from 'uuid';
import { prisma } from '../lib/prisma';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth';
import { getRuntimeConfig } from '../lib/config';
import { AppError, asyncHandler } from '../lib/errors';

const router = Router();
const config = getRuntimeConfig();
const uploadDir = config.uploadDirectory;
const allowedMimeTypes = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'text/plain', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']);
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => cb(null, `${Date.now()}-${uuid()}-${file.originalname}`),
});

const upload = multer({
  storage,
  limits: { fileSize: config.uploadMaxBytes, files: 1 },
  fileFilter: (_req, file, callback) => callback(null, allowedMimeTypes.has(file.mimetype)),
});

router.post('/', requireAuth, upload.single('file'), asyncHandler(async (req: AuthenticatedRequest, res) => {
  if (!req.file) throw new AppError(400, 'Upload a supported file type', 'INVALID_FILE_TYPE');

  const record = await prisma.fileUpload.create({
    data: {
      userId: req.user!.id,
      originalName: req.file.originalname,
      storedName: req.file.filename,
      mimeType: req.file.mimetype,
      sizeBytes: req.file.size,
      path: path.join(uploadDir, req.file.filename),
    },
  });

  res.status(201).json({ file: record });
}));

router.get('/', requireAuth, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const files = await prisma.fileUpload.findMany({
    where: { userId: req.user!.id },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ files });
}));

router.delete('/:id', requireAuth, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  if (!id) throw new AppError(400, 'File id is required', 'VALIDATION_ERROR');

  const file = await prisma.fileUpload.findUnique({ where: { id } });
  if (!file) throw new AppError(404, 'File not found', 'NOT_FOUND');
  if (file.userId !== req.user!.id && req.user!.role !== 'ADMIN') {
    throw new AppError(403, 'Forbidden', 'FORBIDDEN');
  }

  await prisma.fileUpload.delete({ where: { id } });
  if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
  res.json({ message: 'File deleted' });
}));

router.get('/:id/download', requireAuth, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const file = await prisma.fileUpload.findUnique({ where: { id } });
  if (!file) throw new AppError(404, 'File not found', 'NOT_FOUND');
  if (file.userId !== req.user!.id && req.user!.role !== 'ADMIN') {
    throw new AppError(403, 'Forbidden', 'FORBIDDEN');
  }
  if (!fs.existsSync(file.path)) throw new AppError(404, 'Stored file missing', 'NOT_FOUND');
  res.download(file.path, file.originalName);
}));

export default router;
