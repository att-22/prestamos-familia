import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import type { 
  User, AllowedEmail, AdminSettings,
  Purchase, PurchaseCreate, 
  FinancingOffer, FinancingOfferCreate,
  Comparison, ComparisonCreate, ComparisonResult, ComparisonPublic
} from '@/types/api';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para añadir token de autenticación
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem('access_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor para manejar errores 401
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    // Un 401 al entrar o registrarse es una contraseña incorrecta, no una sesión caducada
    const isAuthAttempt = /^\/auth\/(login|register)$/.test(error.config?.url ?? '');
    if (error.response?.status === 401 && !isAuthAttempt) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth
export interface AuthResponse {
  access_token: string;
  user: User;
}

export interface RegisterData {
  email: string;
  password: string;
  registration_code: string;
}

export const authApi = {
  login: (email: string, password: string) => api.post<AuthResponse>('/auth/login', { email, password }),
  register: (data: RegisterData) => api.post<AuthResponse>('/auth/register', data),
  devToken: (email: string) => api.post<AuthResponse>('/auth/dev-token', { email }),
  me: () => api.get<User>('/auth/me'),
};

// Admin
export const adminApi = {
  settings: () => api.get<AdminSettings>('/admin/settings'),
  listAllowedEmails: () => api.get<AllowedEmail[]>('/admin/allowed-emails'),
  addAllowedEmail: (entry: string) => api.post<AllowedEmail>('/admin/allowed-emails', { entry }),
  removeAllowedEmail: (id: string) => api.delete(`/admin/allowed-emails/${id}`),
};

// Purchases
export const purchasesApi = {
  list: (params?: { skip?: number; limit?: number }) => 
    api.get<Purchase[]>('/purchases', { params }),
  get: (id: string) => api.get<Purchase>(`/purchases/${id}`),
  create: (data: PurchaseCreate) => api.post<Purchase>('/purchases', data),
  update: (id: string, data: Partial<PurchaseCreate>) => api.patch<Purchase>(`/purchases/${id}`, data),
  delete: (id: string) => api.delete(`/purchases/${id}`),
};

// Financing Offers
export const financingOffersApi = {
  list: (params?: { purchase_id?: string; skip?: number; limit?: number }) => 
    api.get<FinancingOffer[]>('/financing-offers', { params }),
  get: (id: string) => api.get<FinancingOffer>(`/financing-offers/${id}`),
  create: (data: FinancingOfferCreate) => api.post<FinancingOffer>('/financing-offers', data),
  update: (id: string, data: Partial<FinancingOfferCreate>) => api.patch<FinancingOffer>(`/financing-offers/${id}`, data),
  delete: (id: string) => api.delete(`/financing-offers/${id}`),
};

// Comparisons
export const comparisonsApi = {
  calculate: (data: ComparisonCreate) => api.post<ComparisonResult>('/comparisons/calculate', data),
  create: (data: ComparisonCreate) => api.post<Comparison>('/comparisons', data),
  list: (params?: { skip?: number; limit?: number }) => 
    api.get<Comparison[]>('/comparisons', { params }),
  get: (id: string) => api.get<Comparison>(`/comparisons/${id}`),
  getPublic: (slug: string) => api.get<ComparisonPublic>(`/comparisons/public/${slug}`),
  delete: (id: string) => api.delete(`/comparisons/${id}`),
};

// Health
export const healthApi = {
  check: () => api.get('/healthz'),
};

export default api;
