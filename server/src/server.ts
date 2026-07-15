import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { prisma } from './lib/prisma.js';
import { getRuntimeConfig } from './lib/config.js';
import { errorHandler, notFoundHandler } from './lib/errors.js';
import { issueCsrfToken, requireCsrfToken } from './middleware/csrf.js';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import planRoutes from './routes/plans.js';
import subscriptionRoutes from './routes/subscriptions.js';
import settingsRoutes from './routes/settings.js';
import organizationRoutes from './routes/organization.js';
import adminRoutes from './routes/admin.js';
import madrassaRoutes from './routes/madrassa.js';
import studentRoutes from './routes/students.js';
import attendanceRoutes from './routes/attendance.js';
import feeRoutes from './routes/fees.js';
import examRoutes from './routes/exams.js';
import notificationRoutes from './routes/notifications.js';
import logsRoutes from './routes/logs.js';
import fileRoutes from './routes/files.js';
import reportRoutes from './routes/reports.js';

const config = getRuntimeConfig();

export const app = express();

app.disable('x-powered-by');
app.use(helmet({ crossOriginResourcePolicy: { policy: 'same-origin' }, referrerPolicy: { policy: 'no-referrer' } }));
app.use(cors({
  origin(origin, callback) {
    if (!origin || config.clientOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Origin is not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
}));
app.use(cookieParser());
app.use(express.json({ limit: '5mb' }));
app.use((req, res, next) => {
  const startedAt = Date.now();
  res.on('finish', () => console.info(JSON.stringify({ level: 'info', method: req.method, path: req.path, status: res.statusCode, durationMs: Date.now() - startedAt })));
  next();
});
app.use('/api', rateLimit({ windowMs: 15 * 60 * 1000, max: 100, standardHeaders: 'draft-7', legacyHeaders: false }));
app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, max: 15, standardHeaders: 'draft-7', legacyHeaders: false }));

app.get('/health', (_req, res) => res.json({ status: 'ok' }));
app.get('/api/auth/csrf-token', issueCsrfToken);
app.use('/api', requireCsrfToken);
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/plans', planRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/organization', organizationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/madrassa', madrassaRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/fees', feeRoutes);
app.use('/api/exams', examRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/logs', logsRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/reports', reportRoutes);
app.use(notFoundHandler);
app.use(errorHandler);

export const startServer = async () => {
  await prisma.$connect();
  app.listen(config.port, () => {
    console.log(`Northstar SaaS API listening on http://localhost:${config.port}`);
  });
};
