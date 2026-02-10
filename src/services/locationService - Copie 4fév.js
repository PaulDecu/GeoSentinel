// services/locationService.js
// VERSION FINALE avec service Android natif
import Geolocation from '@react-native-community/geolocation';
import { Platform, PermissionsAndroid, NativeModules } from 'react-native';
import { LOCATION_CONFIG } from '../utils/constants';

const { LocationServiceBridge } = NativeModules;

let isNativeServiceRunning = false;

export const locationService = {
  getCurrentPosition: async () => {
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

  checkPermissions: async () => {
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

  requestForegroundPermission: async () => {
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

  requestBackgroundPermission: async () => {
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

  startBackgroundLocationTracking: async (tourneeType) => {
    try {
      console.log('🚀 DÉMARRAGE SERVICE NATIF ANDROID');
      console.log('🛡️ Service en arrière-plan avec notification permanente');
      
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

  stopBackgroundLocationTracking: async () => {
    try {
      if (LocationServiceBridge && isNativeServiceRunning) {
        await LocationServiceBridge.stopService();
        isNativeServiceRunning = false;
        console.log('✅ Service natif arrêté');
      }
    } catch (error) {
      console.error('❌ Erreur arrêt:', error);
      throw error;
    }
  },

  isTrackingActive: async () => {
    return isNativeServiceRunning;
  },
};

export default locationService;