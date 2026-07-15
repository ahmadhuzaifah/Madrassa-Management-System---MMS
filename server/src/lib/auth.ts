import bcrypt from 'bcryptjs';
import jwt, { type Secret, type SignOptions } from 'jsonwebtoken';
import crypto from 'crypto';
import { getRuntimeConfig } from './config.js';

export const hashPassword = async (password: string) => bcrypt.hash(password, 12);

export const comparePasswords = async (password: string, hash: string) => bcrypt.compare(password, hash);

export const createToken = (payload: object) => {
  const config = getRuntimeConfig();
  const secret = config.jwtSecret as Secret;
  const expiresIn = config.jwtExpiresIn as SignOptions['expiresIn'];
  return jwt.sign(payload, secret, { expiresIn });
};

export const verifyToken = (token: string) => {
  const secret = getRuntimeConfig().jwtSecret as Secret;
  return jwt.verify(token, secret) as { sub: string; role: string; ver?: number };
};

export const createRandomToken = () => crypto.randomBytes(24).toString('hex');
