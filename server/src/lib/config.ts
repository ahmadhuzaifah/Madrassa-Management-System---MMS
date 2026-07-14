import { config as loadEnvironment } from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

loadEnvironment({ path: path.resolve(__dirname, '../../.env') });

const required = (name: string) => {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
};

export type RuntimeConfig = {
  clientOrigins: string[];
  databaseUrl: string;
  jwtSecret: string;
  jwtExpiresIn: string;
  uploadDirectory: string;
  uploadMaxBytes: number;
  nodeEnv: string;
  port: number;
};

export const getRuntimeConfig = (): RuntimeConfig => {
  const uploadMaxBytes = Number(process.env.UPLOAD_MAX_BYTES ?? 10 * 1024 * 1024);
  if (!Number.isSafeInteger(uploadMaxBytes) || uploadMaxBytes < 1) {
    throw new Error('UPLOAD_MAX_BYTES must be a positive integer');
  }

  return {
    clientOrigins: required('CLIENT_URL').split(',').map((origin) => origin.trim()).filter(Boolean),
    databaseUrl: required('DATABASE_URL'),
    jwtSecret: required('JWT_SECRET'),
    jwtExpiresIn: process.env.JWT_EXPIRES_IN?.trim() || '7d',
    uploadDirectory: process.env.UPLOAD_DIR?.trim() || './uploads',
    uploadMaxBytes,
    nodeEnv: process.env.NODE_ENV?.trim() || 'development',
    port: Number(process.env.PORT ?? 4000),
  };
};
