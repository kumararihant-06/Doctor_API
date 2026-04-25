import { z } from 'zod';

export const registerSchema = z.object({
  name: z.string()
    .trim()
    .min(2, 'Name must be at least 2 characters')
    .max(120, 'Name must be at most 120 characters'),

  email: z.string()
    .trim()
    .toLowerCase()
    .email('Invalid email format')
    .max(255),

  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(72, 'Password must be at most 72 characters'),  // bcrypt limit

  role: z.enum(['doctor', 'patient'], {
    errorMap: () => ({ message: "Role must be 'doctor' or 'patient'" })
  })
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Invalid email format'),
  password: z.string().min(1, 'Password is required')
});
