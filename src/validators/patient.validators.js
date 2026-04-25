import {z} from 'zod';

export const openSlotsQuerySchema = z.object({
    date:z.string().regex(/^\d{4}-\d{2-\d{2}$/, 'Date must be YYYY-MM-DD').optional(),
    doctorId: z.string().uuid('Invalid doctorId').optional
});


export const bookAppointmentSchema = z.object({
  slotId: z.string().uuid('Invalid slotId')
});

export const idParamSchema = z.object({
  id: z.string().uuid('Invalid appointment id')
});