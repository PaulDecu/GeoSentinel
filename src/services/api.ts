// src/services/api.ts
import axios, { AxiosInstance, AxiosError } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LoginResponse, Risk, User, ApiError } from '../types';

const API_URL = 'http://10.0.2.2:3000/api'; // Android emulator
// const API_URL = 'http://localhost:3000/api'; // iOS simulator
// const API_URL = 'https://votre-api.com/api'; // Production

class ApiClient {
  private client: AxiosInstance;
  private isRefreshing = false;
  private failedQueue: Array<{
    resolve: (value?: any) => void;
    reject: (reason?: any) => void;
  }> = [];

  constructor() {
    this.client = axios.create({
      baseURL: API_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor - Ajouter le token
    this.client.interceptors.request.use(
      async (config) => {
        const token = await AsyncStorage.getItem('accessToken');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor - Gérer le refresh token
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest: any = error.config;

        // Ne pas tenter de refresh sur les routes auth
        const isAuthEndpoint = originalRequest.url?.includes('/auth/');

        if (
          error.response?.status === 401 &&
          !originalRequest._retry &&
          !isAuthEndpoint
        ) {
          if (this.isRefreshing) {
            // Ajouter à la file d'attente
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
            // Pas de refresh token, déconnecter
            await this.clearTokens();
            return Promise.reject(error);
          }

          try {
            // Tenter de rafraîchir le token
            const response = await axios.post(`${API_URL}/auth/refresh`, {
              refreshToken,
            });

            const { accessToken, refreshToken: newRefreshToken } = response.data;

            // Sauvegarder les nouveaux tokens
            await AsyncStorage.setItem('accessToken', accessToken);
            if (newRefreshToken) {
              await AsyncStorage.setItem('refreshToken', newRefreshToken);
            }

            // Mettre à jour le header
            originalRequest.headers.Authorization = `Bearer ${accessToken}`;

            // Traiter les requêtes en attente
            this.processQueue(null, accessToken);

            // Réessayer la requête originale
            return this.client(originalRequest);
          } catch (refreshError) {
            // Échec du refresh, déconnecter
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
      if (error) {
        prom.reject(error);
      } else {
        prom.resolve(token);
      }
    });
    this.failedQueue = [];
  }

  private async clearTokens() {
    await AsyncStorage.removeItem('accessToken');
    await AsyncStorage.removeItem('refreshToken');
    await AsyncStorage.removeItem('user');
  }

  // ========== AUTH ==========

  async login(email: string, password: string): Promise<LoginResponse> {
    const response = await this.client.post<LoginResponse>('/auth/login', {
      email,
      password,
    });
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
    category: string;
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
      category?: string;
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

  // ✅ CORRECTION: Utiliser les bons noms de paramètres attendus par le backend
  async getNearbyRisks(
    latitude: number,
    longitude: number,
    radiusMeters: number = 500
  ): Promise<Risk[]> {
    // Convertir mètres en kilomètres pour l'API
    const radiusKm = radiusMeters / 1000;
    
    console.log(`📡 API call getNearbyRisks: lat=${latitude}, lng=${longitude}, radius_km=${radiusKm}`);
    
    const response = await this.client.get<Risk[]>('/risks/nearby', {
      params: { 
        lat: latitude,      // ✅ Backend attend "lat" (pas "latitude")
        lng: longitude,     // ✅ Backend attend "lng" (pas "longitude")
        radius_km: radiusKm // ✅ Backend attend "radius_km" en km (pas "radius" en mètres)
      },
    });
    
    console.log(`✅ Received ${response.data.length} risks`);
    return response.data;
  }
}

export const apiClient = new ApiClient();

// Helper pour extraire les messages d'erreur
export const getErrorMessage = (error: any): string => {
  if (error.response?.data?.message) {
    if (Array.isArray(error.response.data.message)) {
      return error.response.data.message.join(', ');
    }
    return error.response.data.message;
  }
  return error.message || 'Une erreur est survenue';
};