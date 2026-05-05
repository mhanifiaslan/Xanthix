import { z } from 'zod';

export const adminUserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  plan: z.enum(['Deneme', 'Standart', 'Pro', 'Kurumsal']),
  credits: z.number().int().nonnegative(),
  totalSpent: z.number().nonnegative(),
  projectCount: z.number().int().nonnegative(),
  joinedAt: z.string(),
  lastLogin: z.string(),
  status: z.enum(['aktif', 'pasif', 'banlı']),
  avatarUrl: z.string().url().optional().or(z.literal('')),
});
export type AdminUser = z.infer<typeof adminUserSchema>;

export const adminPaymentSchema = z.object({
  id: z.string(),
  userId: z.string(),
  userName: z.string(),
  amount: z.number().nonnegative(),
  credits: z.number().int().nonnegative(),
  package: z.string(),
  method: z.string(),
  status: z.enum(['basarili', 'basarisiz', 'iade']),
  date: z.string(),
  reference: z.string(),
});
export type Payment = z.infer<typeof adminPaymentSchema>;

export const adminMetricsSchema = z.object({
  todayActiveUsers: z.number().int().nonnegative(),
  yesterdayRevenue: z.number().nonnegative(),
  yesterdayAiCost: z.number().nonnegative(),
  marginRate: z.number(),
  totalUsers: z.number().int().nonnegative(),
  totalRevenue: z.number().nonnegative(),
});
export type AdminMetrics = z.infer<typeof adminMetricsSchema>;

export const supportTicketSchema = z.object({
  id: z.string(),
  userId: z.string(),
  userName: z.string(),
  subject: z.string(),
  status: z.enum(['beklemede', 'yanitlandi', 'cozuldu']),
  priority: z.enum(['dusuk', 'orta', 'yuksek']),
  createdAt: z.string(),
});
export type SupportTicket = z.infer<typeof supportTicketSchema>;

export const pricingPackageSchema = z.object({
  id: z.string(),
  name: z.string(),
  credits: z.number().int().nonnegative(),
  price: z.number().nonnegative(),
  bonus: z.number().int().nonnegative(),
  isPopular: z.boolean(),
  isActive: z.boolean(),
});
export type PricingPackage = z.infer<typeof pricingPackageSchema>;
