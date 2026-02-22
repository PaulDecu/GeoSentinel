// src/services/api.ts
import axios, { AxiosInstance, AxiosError } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LoginResponse, Risk, RiskCategory, User } from '../types';
import { getActiveUrl, resolveActiveUrl, resetActiveUrl, isUsingFallback } from './serverConfig';

// Types pour system settings
export interface SystemSetting {
  id: string;
  tourneeType: TourneeType;
  label: string;
  apiCallDelayMinutes: number;
  positionTestDelaySeconds: number;
  riskLoadZoneKm: number;
  alertRadiusMeters: number;
  dashboardMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

export type TourneeType = 'pieds' | 'velo' | 'voiture';

class ApiClient {
  private client: AxiosInstance;
  private isRefreshing = false;
  private failedQueue: Array<{
    resolve: (value?: any) => void;
    reject: (reason?: any) => void;
  }> = [];

  // ── L'instance Axios est créée sans baseURL fixe.
  // Le baseURL est injecté dynamiquement dans l'intercepteur de requête
  // une fois que serverConfig a résolu l'URL active.
  constructor() {
    this.client = axios.create({
      timeout: 30000,
      headers: { 'Content-Type': 'application/json' },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // ── Request interceptor : injecte baseURL + token JWT ─────────────────────
    this.client.interceptors.request.use(
      async (config) => {
        // Résolution lazy de l'URL active (lit depuis mémoire ou AsyncStorage)
        const baseUrl = await getActiveUrl();
        config.baseURL = baseUrl;

        const token = await AsyncStorage.getItem('accessToken');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // ── Response interceptor : gestion refresh token ──────────────────────────
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest: any = error.config;
        const isAuthEndpoint = originalRequest.url?.includes('/auth/');

        if (
          error.response?.status === 401 &&
          !originalRequest._retry &&
          !isAuthEndpoint
        ) {
          if (this.isRefreshing) {
            return new Promise((resolve, reject) => {
              this.failedQueue.push({ resolve, reject });
            })
              .then((token) => {
                originalRequest.headers.Authorization = `Bearer ${token}`;
                return this.client(originalRequest);
              })
              .catch((err) => Promise.reject(err));
          }

          originalRequest._retry = true;
          this.isRefreshing = true;

          const refreshToken = await AsyncStorage.getItem('refreshToken');

          if (!refreshToken) {
            await this.clearTokens();
            return Promise.reject(error);
          }

          try {
            const baseUrl = await getActiveUrl();
            const response = await axios.post(`${baseUrl}/auth/refresh`, { refreshToken });
            const { accessToken, refreshToken: newRefreshToken } = response.data;

            await AsyncStorage.setItem('accessToken', accessToken);
            if (newRefreshToken) {
              await AsyncStorage.setItem('refreshToken', newRefreshToken);
            }

            originalRequest.headers.Authorization = `Bearer ${accessToken}`;
            this.processQueue(null, accessToken);
            return this.client(originalRequest);
          } catch (refreshError) {
            this.processQueue(refreshError, null);
            await this.clearTokens();
            return Promise.reject(refreshError);
          } finally {
            this.isRefreshing = false;
          }
        }

        return Promise.reject(error);
      }
    );
  }

  private processQueue(error: any, token: string | null = null) {
    this.failedQueue.forEach((prom) => {
      if (error) prom.reject(error);
      else prom.resolve(token);
    });
    this.failedQueue = [];
  }

  private async clearTokens() {
    await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'user']);
    resetActiveUrl(); // Force un nouveau probe au prochain login
  }

  // ─── Méthode exposée pour que LoginScreen déclenche la résolution avant login
  // (évite que le premier appel API subisse le délai du probe)
  async resolveServer(): Promise<{ url: string; isFallback: boolean }> {
    const url = await resolveActiveUrl();
    return { url, isFallback: isUsingFallback() };
  }

  // ========== AUTH ==========

  async login(email: string, password: string): Promise<LoginResponse> {
    const response = await this.client.post<LoginResponse>('/auth/login', { email, password });
    return response.data;
  }

  async logout(): Promise<void> {
    try {
      await this.client.post('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      await this.clearTokens();
    }
  }

  async getCurrentUser(): Promise<User> {
    const response = await this.client.get<User>('/auth/me');
    return response.data;
  }

  // ========== RISKS ==========

  async getRisks(): Promise<Risk[]> {
    const response = await this.client.get<Risk[]>('/risks');
    return response.data;
  }

  async getRiskById(id: string): Promise<Risk> {
    const response = await this.client.get<Risk>(`/risks/${id}`);
    return response.data;
  }

  async createRisk(data: {
    title: string;
    description?: string;
    categoryId: string;
    severity: string;
    latitude: number;
    longitude: number;
  }): Promise<Risk> {
    const response = await this.client.post<Risk>('/risks', data);
    return response.data;
  }

  async updateRisk(
    id: string,
    data: {
      title?: string;
      description?: string;
      categoryId?: string;
      severity?: string;
      latitude?: number;
      longitude?: number;
    }
  ): Promise<Risk> {
    const response = await this.client.put<Risk>(`/risks/${id}`, data);
    return response.data;
  }

  async deleteRisk(id: string): Promise<void> {
    await this.client.delete(`/risks/${id}`);
  }

  async deleteMultipleRisks(ids: string[]): Promise<{ success: string[]; failed: string[] }> {
    const response = await this.client.post<{ success: string[]; failed: string[] }>(
      '/risks/bulk-delete',
      { ids }
    );
    return response.data;
  }

  async getNearbyRisks(
    latitude: number,
    longitude: number,
    radiusMeters: number = 500
  ): Promise<Risk[]> {
    const radiusKm = radiusMeters / 1000;
    console.log(`📡 API getNearbyRisks: lat=${latitude}, lng=${longitude}, radius_km=${radiusKm}`);
    const response = await this.client.get<Risk[]>('/risks/nearby', {
      params: { lat: latitude, lng: longitude, radius_km: radiusKm },
    });
    console.log(`✅ Received ${response.data.length} risks`);
    return response.data;
  }

  // ========== SYSTEM SETTINGS ==========

  async getSystemSettings(): Promise<SystemSetting[]> {
    const response = await this.client.get<SystemSetting[]>('/system-settings/public/all');
    return response.data;
  }

  async getSystemSettingByType(tourneeType: TourneeType): Promise<SystemSetting | null> {
    try {
      const settings = await this.getSystemSettings();
      return settings.find((s) => s.tourneeType === tourneeType) ?? null;
    } catch (error) {
      console.error('❌ Error getting system setting:', error);
      return null;
    }
  }

  async getDashboardMessage(): Promise<{ dashboardMessage: string | null }> {
    try {
      const response = await this.client.get<{ dashboardMessage: string | null }>(
        '/system-settings/public/dashboard-message'
      );
      return response.data;
    } catch (error) {
      console.error('❌ Error getting dashboard message:', error);
      return { dashboardMessage: null };
    }
  }

  // ========== RISK CATEGORIES ==========

  async getRiskCategories(): Promise<RiskCategory[]> {
    try {
      const response = await this.client.get<RiskCategory[]>('/tenants/risk-categories');
      return response.data;
    } catch (error) {
      console.error('❌ Error getting risk categories:', error);
      return [];
    }
  }

  // ========== SUBSCRIPTION ==========

  async checkSubscriptionStatus(): Promise<{
    isValid: boolean;
    subscriptionEnd: string | null;
    daysRemaining: number;
  }> {
    try {
      const response = await this.client.get('/tenants/subscription-status');
      return response.data;
    } catch (error) {
      console.error('❌ Error checking subscription:', error);
      return { isValid: false, subscriptionEnd: null, daysRemaining: 0 };
    }
  }
}

export const apiClient = new ApiClient();

export const getErrorMessage = (error: any): string => {
  if (error.response?.data?.message) {
    if (Array.isArray(error.response.data.message)) {
      return error.response.data.message.join(', ');
    }
    return error.response.data.message;
  }
  return error.message || 'Une erreur est survenue';
};
