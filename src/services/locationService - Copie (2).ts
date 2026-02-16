// src/services/locationService.ts
import Geolocation from '@react-native-community/geolocation';
import { Platform, PermissionsAndroid, NativeModules } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiClient, SystemSetting, TourneeType } from './api';

const { LocationServiceBridge, PreferencesModule } = NativeModules;

interface LocationPosition {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
}

interface PermissionsStatus {
  foreground: 'granted' | 'denied' | 'undetermined';
  background: 'granted' | 'denied' | 'undetermined';
  isTracking: boolean;
  canStartTracking: boolean;
}

interface PermissionResult {
  status: 'granted' | 'denied';
}

let isNativeServiceRunning = false;

export const locationService = {
  getCurrentPosition: async (): Promise<LocationPosition | null> => {
    try {
      console.log('📍 Demande position GPS...');
      
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          console.log('⏱️ Timeout GPS');
          reject(new Error('TIMEOUT'));
        }, 20000);
        
        Geolocation.getCurrentPosition(
          (position) => {
            clearTimeout(timeout);
            console.log('✅ Position GPS obtenue:', position.coords.latitude.toFixed(4), position.coords.longitude.toFixed(4));
            resolve({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy,
              timestamp: position.timestamp,
            });
          },
          (error) => {
            clearTimeout(timeout);
            console.error('❌ Erreur GPS:', error.code, error.message);
            reject(error);
          },
          {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 10000,
          }
        );
      });
    } catch (error) {
      console.error('❌ Exception getCurrentPosition:', error);
      return null;
    }
  },

  checkPermissions: async (): Promise<PermissionsStatus> => {
    try {
      if (Platform.OS === 'android') {
        const foreground = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
        );
        
        const background = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION
        );
        
        return {
          foreground: foreground ? 'granted' : 'denied',
          background: background ? 'granted' : 'denied',
          isTracking: isNativeServiceRunning,
          canStartTracking: foreground && background,
        };
      }
      
      return {
        foreground: 'granted',
        background: 'granted',
        isTracking: isNativeServiceRunning,
        canStartTracking: true,
      };
    } catch (error) {
      console.error('❌ Erreur checkPermissions:', error);
      return {
        foreground: 'undetermined',
        background: 'undetermined',
        isTracking: false,
        canStartTracking: false,
      };
    }
  },

  requestForegroundPermission: async (): Promise<PermissionResult> => {
    try {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Permission de localisation',
            message: "L'application a besoin d'accéder à votre position",
            buttonNeutral: 'Plus tard',
            buttonNegative: 'Refuser',
            buttonPositive: 'Autoriser',
          }
        );
        
        return {
          status: granted === PermissionsAndroid.RESULTS.GRANTED ? 'granted' : 'denied'
        };
      }
      
      return { status: 'granted' };
    } catch (error) {
      console.error('❌ Erreur request foreground:', error);
      throw error;
    }
  },

  requestBackgroundPermission: async (): Promise<PermissionResult> => {
    try {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION,
          {
            title: 'Permission localisation en arrière-plan',
            message: "Permet de vous alerter des risques même quand l'app est fermée",
            buttonNeutral: 'Plus tard',
            buttonNegative: 'Refuser',
            buttonPositive: 'Autoriser',
          }
        );
        
        return {
          status: granted === PermissionsAndroid.RESULTS.GRANTED ? 'granted' : 'denied'
        };
      }
      
      return { status: 'granted' };
    } catch (error) {
      console.error('❌ Erreur request background:', error);
      throw error;
    }
  },

  startBackgroundLocationTracking: async (tourneeType: TourneeType  ): Promise<boolean> => {
    try {
      console.log('🚀 DÉMARRAGE SERVICE NATIF ANDROID');
      console.log('🛡️ Service en arrière-plan avec notification permanente');
      
      if (tourneeType) {
        console.log(`📡 Récupération paramètres API pour: ${tourneeType}`);
        
        // ✅ RÉCUPÉRER LES PARAMÈTRES DEPUIS L'API UNE SEULE FOIS
        const setting: SystemSetting | null = await apiClient.getSystemSettingByType(tourneeType);
        
        if (setting) {
          console.log(`✅ Paramètres récupérés depuis l'API:`);
          console.log(`   - Type: ${setting.label}`);
          console.log(`   - Test position: ${setting.positionTestDelaySeconds}s`);
          console.log(`   - Refresh API: ${setting.apiCallDelayMinutes}min`);
          console.log(`   - Zone recherche: ${setting.riskLoadZoneKm}km`);
          console.log(`   - Rayon alerte: ${setting.alertRadiusMeters}m`);
          
          // ✅ SAUVEGARDER TOUS LES PARAMÈTRES DANS ASYNCSTORAGE (une seule fois)
          await AsyncStorage.setItem('tourneeType', tourneeType);
          await AsyncStorage.setItem('positionTestDelaySeconds', String(setting.positionTestDelaySeconds));
          await AsyncStorage.setItem('apiCallDelayMinutes', String(setting.apiCallDelayMinutes));
          await AsyncStorage.setItem('riskLoadZoneKm', String(setting.riskLoadZoneKm));
          await AsyncStorage.setItem('alertRadiusMeters', String(setting.alertRadiusMeters));
          
          console.log('✅ Paramètres sauvegardés dans AsyncStorage');
          
          // Calculer l'intervalle pour le module natif
          const taskInterval = setting.positionTestDelaySeconds * 1000;
          
          // Utiliser le module natif pour configurer l'intervalle
          if (PreferencesModule) {
            await PreferencesModule.setTourneeType(tourneeType);
            await PreferencesModule.setTaskInterval(taskInterval);
            console.log(`✅ Configuration module natif: ${taskInterval}ms`);
          } else {
            console.warn('⚠️ PreferencesModule non disponible');
          }
          
        } else {
          // Fallback sur valeurs par défaut
          console.warn(`⚠️ Pas de paramètres API, utilisation valeurs par défaut`);
          
          // Valeurs par défaut selon le type
          let defaults = {
            positionTestDelaySeconds: 30,
            apiCallDelayMinutes: 5,
            riskLoadZoneKm: 5,
            alertRadiusMeters: 100,
          };
          
          switch (tourneeType) {
            case 'pieds':
              defaults = {
                positionTestDelaySeconds: 30,
                apiCallDelayMinutes: 10,
                riskLoadZoneKm: 5,
                alertRadiusMeters: 60,
              };
              break;
            case 'velo':
              defaults = {
                positionTestDelaySeconds: 20,
                apiCallDelayMinutes: 7,
                riskLoadZoneKm: 10,
                alertRadiusMeters: 100,
              };
              break;
            case 'voiture':
              defaults = {
                positionTestDelaySeconds: 10,
                apiCallDelayMinutes: 5,
                riskLoadZoneKm: 10,
                alertRadiusMeters: 250,
              };
              break;
          }
          
          await AsyncStorage.setItem('tourneeType', tourneeType);
          await AsyncStorage.setItem('positionTestDelaySeconds', String(defaults.positionTestDelaySeconds));
          await AsyncStorage.setItem('apiCallDelayMinutes', String(defaults.apiCallDelayMinutes));
          await AsyncStorage.setItem('riskLoadZoneKm', String(defaults.riskLoadZoneKm));
          await AsyncStorage.setItem('alertRadiusMeters', String(defaults.alertRadiusMeters));
          
          console.log('✅ Valeurs par défaut sauvegardées');
          
          const taskInterval = defaults.positionTestDelaySeconds * 1000;
          
          if (PreferencesModule) {
            await PreferencesModule.setTourneeType(tourneeType);
            await PreferencesModule.setTaskInterval(taskInterval);
          }
        }
      }
      
      const perms = await locationService.checkPermissions();
      if (!perms.canStartTracking) {
        throw new Error('PERMISSIONS_REQUIRED');
      }
      
      // Vérifier que le module natif est disponible
      if (!LocationServiceBridge) {
        console.error('❌ Module natif non disponible !');
        console.log('⚠️ Vérifiez que LocationServicePackage est ajouté dans MainApplication.kt');
        throw new Error('MODULE_NATIF_NON_DISPONIBLE');
      }
      
      console.log('✅ Module natif disponible');
      
      // Démarrer le service natif Android
      await LocationServiceBridge.startService();
      
      isNativeServiceRunning = true;
      
      console.log('✅ Service natif démarré - Survie illimitée en arrière-plan !');
      console.log('🛡️ Notification permanente "Gestion Risques Active" devrait être visible');
      
      return true;
    } catch (error) {
      console.error('❌ Erreur démarrage tracking:', error);
      throw error;
    }
  },

  stopBackgroundLocationTracking: async (): Promise<void> => {
    try {
      if (LocationServiceBridge && isNativeServiceRunning) {
        await LocationServiceBridge.stopService();
        isNativeServiceRunning = false;
        console.log('✅ Service natif arrêté');
      }
      
      // Nettoyer TOUS les paramètres sauvegardés
      await AsyncStorage.removeItem('tourneeType');
      await AsyncStorage.removeItem('positionTestDelaySeconds');
      await AsyncStorage.removeItem('apiCallDelayMinutes');
      await AsyncStorage.removeItem('riskLoadZoneKm');
      await AsyncStorage.removeItem('alertRadiusMeters');
      await AsyncStorage.removeItem('taskInterval');
      
      console.log('🧹 Configuration supprimée');
    } catch (error) {
      console.error('❌ Erreur arrêt:', error);
      throw error;
    }
  },

  isTrackingActive: async (): Promise<boolean> => {
    // Vérifier si le service a sauvegardé des données = il est actif
    try {
      const savedType = await AsyncStorage.getItem('tourneeType');
      const isActive = savedType !== null && savedType !== '';
      
      // Synchroniser la variable locale
      isNativeServiceRunning = isActive;
      
      console.log('🔍 isTrackingActive - tourneeType:', savedType, '→ isActive:', isActive);
      return isActive;
    } catch (error) {
      console.error('❌ Erreur isTrackingActive:', error);
      return false;
    }
  },
};

export default locationService;
