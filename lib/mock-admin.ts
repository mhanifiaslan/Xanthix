import { AdminUser, Payment, AdminMetrics, SupportTicket, PricingPackage } from '@/types/admin';

export const adminMetrics: AdminMetrics = {
  todayActiveUsers: 142,
  yesterdayRevenue: 8450,
  yesterdayAiCost: 1230,
  marginRate: 85.4,
  totalUsers: 1847,
  totalRevenue: 284600,
};

export const mockUsers: AdminUser[] = [
  {
    id: 'u1', name: 'M. Hanifi ASLAN', email: 'hanifi@projectmenager.com',
    plan: 'Standart', credits: 450, totalSpent: 1200, projectCount: 8,
    joinedAt: '2024-01-15', lastLogin: '2 saat once', status: 'aktif',
    avatarUrl: 'https://i.pravatar.cc/150?u=a042581f4e29026704d',
  },
  {
    id: 'u2', name: 'Ayse Kaya', email: 'ayse@edu.gov.tr',
    plan: 'Pro', credits: 1200, totalSpent: 3400, projectCount: 15,
    joinedAt: '2024-02-03', lastLogin: '1 gun once', status: 'aktif',
    avatarUrl: 'https://i.pravatar.cc/150?u=b',
  },
  {
    id: 'u3', name: 'Mehmet Demir', email: 'mehmet.demir@stk.org',
    plan: 'Standart', credits: 80, totalSpent: 680, projectCount: 4,
    joinedAt: '2024-03-20', lastLogin: '3 gun once', status: 'aktif',
    avatarUrl: 'https://i.pravatar.cc/150?u=c',
  },
  {
    id: 'u4', name: 'Fatma Sahin', email: 'fatma@kalkinma.org',
    plan: 'Kurumsal', credits: 5000, totalSpent: 12000, projectCount: 32,
    joinedAt: '2023-11-01', lastLogin: '5 dakika once', status: 'aktif',
    avatarUrl: 'https://i.pravatar.cc/150?u=d',
  },
  {
    id: 'u5', name: 'Burak Yilmaz', email: 'burak@universite.edu.tr',
    plan: 'Deneme', credits: 30, totalSpent: 0, projectCount: 1,
    joinedAt: '2024-04-18', lastLogin: '1 saat once', status: 'aktif',
    avatarUrl: 'https://i.pravatar.cc/150?u=e',
  },
  {
    id: 'u6', name: 'Zeynep Arslan', email: 'zeynep@arslan.com',
    plan: 'Standart', credits: 0, totalSpent: 450, projectCount: 6,
    joinedAt: '2024-01-30', lastLogin: '2 hafta once', status: 'pasif',
    avatarUrl: 'https://i.pravatar.cc/150?u=f',
  },
  {
    id: 'u7', name: 'Ali Veli', email: 'spam@bot.net',
    plan: 'Deneme', credits: 0, totalSpent: 0, projectCount: 0,
    joinedAt: '2024-04-10', lastLogin: '10 gun once', status: 'banlı',
    avatarUrl: 'https://i.pravatar.cc/150?u=g',
  },
  {
    id: 'u8', name: 'Neslihan Polat', email: 'n.polat@milli.edu',
    plan: 'Pro', credits: 800, totalSpent: 2100, projectCount: 11,
    joinedAt: '2024-02-14', lastLogin: '3 saat once', status: 'aktif',
    avatarUrl: 'https://i.pravatar.cc/150?u=h',
  },
];

export const mockPayments: Payment[] = [
  { id: 'pay1', userId: 'u4', userName: 'Fatma Sahin', amount: 2999, credits: 5000, package: 'Kurumsal', method: 'Kredi Karti', status: 'basarili', date: '2024-04-19', reference: 'TXN-001234' },
  { id: 'pay2', userId: 'u2', userName: 'Ayse Kaya', amount: 999, credits: 1500, package: 'Pro', method: 'Kredi Karti', status: 'basarili', date: '2024-04-18', reference: 'TXN-001233' },
  { id: 'pay3', userId: 'u1', userName: 'M. Hanifi ASLAN', amount: 499, credits: 600, package: 'Standart', method: 'Kredi Karti', status: 'basarili', date: '2024-04-17', reference: 'TXN-001232' },
  { id: 'pay4', userId: 'u8', userName: 'Neslihan Polat', amount: 999, credits: 1500, package: 'Pro', method: 'Havale', status: 'basarili', date: '2024-04-16', reference: 'TXN-001231' },
  { id: 'pay5', userId: 'u3', userName: 'Mehmet Demir', amount: 499, credits: 600, package: 'Standart', method: 'Kredi Karti', status: 'basarisiz', date: '2024-04-15', reference: 'TXN-001230' },
  { id: 'pay6', userId: 'u6', userName: 'Zeynep Arslan', amount: 499, credits: 600, package: 'Standart', method: 'Kredi Karti', status: 'iade', date: '2024-04-14', reference: 'TXN-001229' },
  { id: 'pay7', userId: 'u4', userName: 'Fatma Sahin', amount: 2999, credits: 5000, package: 'Kurumsal', method: 'Kredi Karti', status: 'basarili', date: '2024-03-19', reference: 'TXN-001100' },
  { id: 'pay8', userId: 'u2', userName: 'Ayse Kaya', amount: 999, credits: 1500, package: 'Pro', method: 'Kredi Karti', status: 'basarili', date: '2024-03-18', reference: 'TXN-001099' },
];

export const mockTickets: SupportTicket[] = [
  { id: 't1', userId: 'u3', userName: 'Mehmet Demir', subject: 'Odeme alinmadi kredi yuklenmedi', status: 'beklemede', priority: 'yuksek', createdAt: '2 saat once' },
  { id: 't2', userId: 'u1', userName: 'M. Hanifi ASLAN', subject: 'AI yanit kalitesi dusuk', status: 'yanitlandi', priority: 'orta', createdAt: '1 gun once' },
  { id: 't3', userId: 'u5', userName: 'Burak Yilmaz', subject: 'Kayit nasil yapilir?', status: 'cozuldu', priority: 'dusuk', createdAt: '3 gun once' },
  { id: 't4', userId: 'u8', userName: 'Neslihan Polat', subject: 'PDF indirme calısmiyor', status: 'beklemede', priority: 'orta', createdAt: '5 saat once' },
];

export const pricingPackages: PricingPackage[] = [
  { id: 'pkg1', name: 'Deneme', credits: 50, price: 0, bonus: 0, isPopular: false, isActive: true },
  { id: 'pkg2', name: 'Standart', credits: 500, price: 499, bonus: 20, isPopular: false, isActive: true },
  { id: 'pkg3', name: 'Pro', credits: 1500, price: 999, bonus: 50, isPopular: true, isActive: true },
  { id: 'pkg4', name: 'Kurumsal', credits: 5000, price: 2999, bonus: 100, isPopular: false, isActive: true },
];

export const revenueChartData = [
  { month: 'Kas', revenue: 12400 },
  { month: 'Ara', revenue: 18200 },
  { month: 'Oca', revenue: 22100 },
  { month: 'Sub', revenue: 19800 },
  { month: 'Mar', revenue: 31400 },
  { month: 'Nis', revenue: 28600 },
];

export const userGrowthData = [
  { month: 'Kas', users: 340 },
  { month: 'Ara', users: 520 },
  { month: 'Oca', users: 780 },
  { month: 'Sub', users: 1100 },
  { month: 'Mar', users: 1520 },
  { month: 'Nis', users: 1847 },
];
