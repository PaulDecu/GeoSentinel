// src/stores/authStore.ts
import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeModules } from 'react-native';
const { PreferencesModule } = NativeModules;
import { User } from '../types';
import { apiClient } from '../services/api';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  
  // Actions
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loadUser: () => Promise<void>;
  setUser: (user: User | null) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  login: async (email: string, password: string) => {
    try {
      const response = await apiClient.login(email, password);
      
      // Sauvegarder les tokens
      await AsyncStorage.setItem('accessToken', response.accessToken);
      
      // ✅ Sauvegarder le refreshToken seulement s'il existe
      if (response.refreshToken) {
        await AsyncStorage.setItem('refreshToken', response.refreshToken);
      }
      
      await AsyncStorage.setItem('user', JSON.stringify(response.user));

      // ✅ Sauvegarder aussi dans SharedPreferences pour le background task
      // (le Headless JS tourne dans un contexte isolé sans accès à AsyncStorage)
      if (PreferencesModule && response.refreshToken) {
        try {
          await PreferencesModule.setTokens(response.accessToken, response.refreshToken);
          console.log('[Auth] ✅ Tokens sauvegardés dans SharedPreferences');
        } catch (e) {
          console.warn('[Auth] ⚠️ Impossible de sauvegarder dans SharedPreferences:', e);
        }
      }

      set({
        user: response.user,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error) {
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });
      throw error;
    }
  },

  logout: async () => {
    try {
      await apiClient.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'user']);

      // ✅ Ne PAS effacer le refreshToken des SharedPreferences si le service background
      // est actif (tourneeType présent = service en cours)
      // Le background task en a besoin pour renouveler le JWT même après déconnexion de l'app
      const trackingActive = await AsyncStorage.getItem('tourneeType');
      if (PreferencesModule) {
        try {
          if (trackingActive) {
            // Service actif — effacer seulement l'accessToken, garder le refreshToken
            await PreferencesModule.setAccessToken('');
            console.log('[Auth] Service background actif — refreshToken conservé dans SharedPreferences');
          } else {
            // Service inactif — tout effacer
            await PreferencesModule.clearTokens();
          }
        } catch (e) {}
      }

      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  },

  loadUser: async () => {
    set({ isLoading: true });
    
    try {
      const [accessToken, userJson] = await AsyncStorage.multiGet([
        'accessToken',
        'user',
      ]);

      if (accessToken[1] && userJson[1]) {
        const user = JSON.parse(userJson[1]);
        
        // Vérifier que le token est toujours valide
        try {
          const currentUser = await apiClient.getCurrentUser();
          set({
            user: currentUser,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error) {
          // Token invalide, déconnecter
          await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'user']);
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
          });
        }
      } else {
        set({
          user: null,
          isAuthenticated: false,
          isLoading: false,
        });
      }
    } catch (error) {
      console.error('Load user error:', error);
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  },

  setUser: (user: User | null) => {
    set({
      user,
      isAuthenticated: !!user,
    });
  },
}));