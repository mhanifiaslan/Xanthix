export interface AdminUser {
  id: string;
  name: string;
  email: string;
  plan: 'Deneme' | 'Standart' | 'Pro' | 'Kurumsal';
  credits: number;
  totalSpent: number;
  projectCount: number;
  joinedAt: string;
  lastLogin: string;
  status: 'aktif' | 'pasif' | 'banlı';
  avatarUrl: string;
}

export interface Payment {
  id: string;
  userId: string;
  userName: string;
  amount: number;
  credits: number;
  package: string;
  method: string;
  status: 'basarili' | 'basarisiz' | 'iade';
  date: string;
  reference: string;
}

export interface AdminMetrics {
  todayActiveUsers: number;
  yesterdayRevenue: number;
  yesterdayAiCost: number;
  marginRate: number;
  totalUsers: number;
  totalRevenue: number;
}

export interface SupportTicket {
  id: string;
  userId: string;
  userName: string;
  subject: string;
  status: 'beklemede' | 'yanitlandi' | 'cozuldu';
  priority: 'dusuk' | 'orta' | 'yuksek';
  createdAt: string;
}

export interface PricingPackage {
  id: string;
  name: string;
  credits: number;
  price: number;
  bonus: number;
  isPopular: boolean;
  isActive: boolean;
}
