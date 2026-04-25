import { z } from 'zod';

const futureDateTime = z.string()
  .datetime({ offset: true, message: 'Must be an ISO-8601 datetime with timezone' })
  .refine((s) => new Date(s).getTime() > Date.now(), {
    message: 'Must be in the future'
  })
  .transform((s) => new Date(s));

  export const manualSlotSchema = z.object({
  startTime: futureDateTime
});

export const bulkSlotSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'startTime must be HH:mm'),
  slots: z.number().int().min(1).max(16),
  slotDurationMinutes: z.literal(30, {
    errorMap: () => ({ message: 'slotDurationMinutes must be 30' })
  })
});

export const listSlotsQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  status: z.enum(['available', 'booked', 'cancelled']).optional()
});

export const updateSlotSchema = z.object({
  startTime: futureDateTime
});

export const idParamSchema = z.object({
  id: z.string().uuid('Invalid slot id')
});