import { z } from "zod";

export const guestContactSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(160),
  phone: z.string().trim().max(40).optional(),
});

export const quoteInputSchema = z.object({
  title: z.string().trim().min(1).max(120),
  categoryId: z.string().min(1).max(100),
  serviceId: z.string().min(1).max(100),
  professionalId: z.string().max(100).optional(),
  location: z.string().trim().min(1).max(160),
  description: z.string().trim().min(1).max(3000),
  budget: z.number().nonnegative().nullable(),
  date: z.string().max(10),
});
