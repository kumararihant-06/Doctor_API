import config from '../config/index.js';
import * as authService from '../services/auth.service.js';

const cookieOptions = (expiresAt) => ({
  httpOnly: config.cookie.httpOnly,
  secure: config.cookie.secure,
  sameSite: config.cookie.sameSite,
  expires: expiresAt
});

export const register = async (req, res) => {
  const user = await authService.register(req.body);
  res.status(201).json({
    message: 'User registered successfully',
    user
  });
};

export const login = async (req, res) => {
  const { rawToken, expiresAt, user } = await authService.login(req.body);

  res.cookie(config.cookie.name, rawToken, cookieOptions(expiresAt));

  res.status(200).json({
    message: 'Login successful',
    user
  });
};

export const logout = async (req, res) => {
  const rawToken = req.cookies[config.cookie.name];
  await authService.logout(rawToken);

  // Clear the cookie. Options must match what we set, except for expires.
  res.clearCookie(config.cookie.name, {
    httpOnly: config.cookie.httpOnly,
    secure: config.cookie.secure,
    sameSite: config.cookie.sameSite
  });

  res.status(200).json({ message: 'Logged out' });
};

export const verify = async (req, res) => {
  const rawToken = req.cookies[config.cookie.name];
  const session = await authService.verifySession(rawToken);

  if (!session) {
    return res.status(200).json({ authenticated: false });
  }

  res.status(200).json({
    authenticated: true,
    user: session.user
  });
};