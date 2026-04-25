import bcrypt from 'bcrypt';
import crypto from 'crypto';


import config from '../config/index.js';
import * as userModel from '../models/user.model.js';
import * as sessionModel from '../models/session.model.js';
import { ConflictError, UnauthorizedError } from '../utils/errors.js';

const BCRYPT_ROUNDS = 10;
const TOKEN_BYTES = 32;

const hashToken = (rawToken) =>
  crypto.createHash('sha256').update(rawToken).digest('hex');

const generateToken = () =>
  crypto.randomBytes(TOKEN_BYTES).toString('hex');

export const register = async ({ name, email, password, role }) => {
  const existing = await userModel.findByEmail(email);
  if (existing) {
    throw new ConflictError('An account with this email already exists');
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  try {
    const user = await userModel.create({ name, email, passwordHash, role });
    return user;
  } catch (err) {
    if (err.code === '23505') {
      throw new ConflictError('An account with this email already exists');
    }
    throw err;
  }
};

export const login = async ({ email, password }) => {
  const user = await userModel.findByEmail(email);

 
  const credentialError = new UnauthorizedError('Invalid email or password');

  if (!user) {
    await bcrypt.compare(password, '$2b$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvali');
    throw credentialError;
  }

  const passwordOk = await bcrypt.compare(password, user.password_hash);
  if (!passwordOk) {
    throw credentialError;
  }

  const rawToken = generateToken();
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + config.cookie.ttlDays * 24 * 60 * 60 * 1000);

  await sessionModel.create({
    userId: user.id,
    tokenHash,
    expiresAt
  });
  return {
    rawToken,
    expiresAt,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    }
  };
};

export const logout = async (rawToken) => {
  if (!rawToken) return;
  const tokenHash = hashToken(rawToken);
  await sessionModel.deactivateByTokenHash(tokenHash);
};

export const verifySession = async (rawToken) => {
  if (!rawToken) return null;
  const tokenHash = hashToken(rawToken);
  const session = await sessionModel.findActiveByTokenHash(tokenHash);
  return session;  
};

export const getSessionFromRawToken = verifySession;