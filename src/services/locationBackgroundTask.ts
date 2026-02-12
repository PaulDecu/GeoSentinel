// src/services/locationBackgroundTask.ts
// Headless JS Task - S'exécute en arrière-plan avec configuration dynamique
import Geolocation from '@react-native-community/geolocation';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiClient } from './api';
import notifee, { AndroidImportance } from '@notifee/react-native';

interface Risk {
  id: string;
  title: string;
  category: string;
  severity: string;
  latitude: number;
  longitude: number;
  description?: string;
  distance?: number;
}

interface LocationConfig {
  radiusRecherche: number; // km
  alertRadius: number; // m
  updateInterval: number; // ms
}

interface CachedPosition {
  latitude: number;
  longitude: number;
}

type TourneeType = 'pieds' | 'velo' | 'voiture';

let cachedRisks: Risk[] = [];
let lastApiCall = 0;
let lastKnownPosition: CachedPosition | null = null;

// Valeurs par défaut (modifiées dynamiquement selon le type de tournée)
let LOCATION_CONFIG: LocationConfig = {
  radiusRecherche: 3, // km
  alertRadius: 100, // m
  updateInterval: 180000, // 3 min
};

const notifiedRisks = new Set<string>();
const notificationTimestamps = new Map<string, number>();
const NOTIFICATION_COOLDOWN = 5 * 60 * 1000; // 5 minutes

// Configuration selon le type de tournée
const configureTourneeParameters = (tourneeType: TourneeType): void => {
  switch (tourneeType) {
    case 'pieds':
      LOCATION_CONFIG.updateInterval = 5 * 60 * 1000; // 5 minutes
      LOCATION_CONFIG.alertRadius = 60; // 60 mètres
      console.log('[BG] 🚶 Configuration : À pieds (rayon: 60m, refresh: 5min)');
      break;
    
    case 'velo':
      LOCATION_CONFIG.updateInterval = 3 * 60 * 1000; // 3 minutes
      LOCATION_CONFIG.alertRadius = 100; // 100 mètres
      console.log('[BG] 🚴 Configuration : À vélo (rayon: 100m, refresh: 3min)');
      break;
    
    case 'voiture':
      LOCATION_CONFIG.updateInterval = 2 * 60 * 1000; // 2 minutes
      LOCATION_CONFIG.alertRadius = 250; // 250 mètres
      console.log('[BG] 🚗 Configuration : En voiture (rayon: 250m, refresh: 2min)');
      break;
    
    default:
      console.log('[BG] ⚙️ Configuration par défaut (rayon: 100m, refresh: 3min)');
  }
};

const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c * 1000; // en mètres
};

const refreshRiskCache = async (latitude: number, longitude: number): Promise<void> => {
  try {
    const now = new Date();
    const dateStr = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    console.log(`[BG] date : ${dateStr} appel getNearbyRisks`);
    
    // Appel API avec le nouveau client TypeScript
    const risks = await apiClient.getNearbyRisks(
      latitude,
      longitude,
      LOCATION_CONFIG.radiusRecherche * 1000 // Convertir km en mètres
    );
    
    cachedRisks = risks || [];
    lastApiCall = Date.now();
    lastKnownPosition = { latitude, longitude };
    console.log(`[BG] ✅ Cache: ${cachedRisks.length} risques`);
  } catch (error) {
    console.error('[BG] ❌ Erreur cache:', error);
  }
};

const shouldRefreshCache = (latitude: number, longitude: number): boolean => {
  if (cachedRisks.length === 0 || !lastKnownPosition) return true;
  if (Date.now() - lastApiCall > LOCATION_CONFIG.updateInterval) return true;
  
  const distance = calculateDistance(
    lastKnownPosition.latitude,
    lastKnownPosition.longitude,
    latitude,
    longitude
  );
  
  return distance > (LOCATION_CONFIG.radiusRecherche - 1) * 1000;
};

const checkRisksFromCache = async (
  latitude: number,
  longitude: number
): Promise<Risk[]> => {
  const nearbyRisks: Risk[] = [];
  const now = Date.now();
  
  // 1. Trouver tous les risques à proximité (rayon dynamique selon la tournée)
  cachedRisks.forEach(risk => {
    const distance = calculateDistance(
      latitude,
      longitude,
      risk.latitude,
      risk.longitude
    );
    
    if (distance <= LOCATION_CONFIG.alertRadius) {
      nearbyRisks.push({ ...risk, distance });
    }
  });
  
  // 2. Créer un Set des IDs de risques à proximité (pour nettoyage)
  const nearbyRiskIds = new Set(nearbyRisks.map(r => r.id));
  
  // 3. Envoyer les notifications (avec système de cache anti-spam)
  for (const risk of nearbyRisks) {
    const lastNotification = notificationTimestamps.get(risk.id) || 0;
    const timeSinceLastNotif = now - lastNotification;
    const canNotify = timeSinceLastNotif > NOTIFICATION_COOLDOWN;
    
    // Envoyer si :
    // - Jamais notifié OU
    // - Cooldown de 5 min écoulé
    if (canNotify || !notifiedRisks.has(risk.id)) {
      const minutesSince = Math.floor(timeSinceLastNotif / 1000 / 60);
      console.log(`[BG] 🚨 Notification risque ${risk.id}`);
      
      // Envoyer la notification avec @notifee
      try {
        await notifee.displayNotification({
          title: `⚠️ Risque : ${risk.category}`,
          body: `À ${Math.round(risk.distance || 0)}m - ${risk.title}`,
          android: {
            channelId: 'risk-alerts-final',
            importance: AndroidImportance.HIGH,
            vibrationPattern: [300, 500],
            sound: 'default',
            pressAction: {
              id: 'default',
            },
          },
        });
        
        // Mettre à jour le cache
        notifiedRisks.add(risk.id);
        notificationTimestamps.set(risk.id, now);
      } catch (error) {
        console.error('[BG] Erreur notification:', error);
      }
    } else {
      const remainingMinutes = Math.ceil((NOTIFICATION_COOLDOWN - timeSinceLastNotif) / 1000 / 60);
      console.log(`[BG] ⏳ Risque ${risk.id} - cooldown actif (encore ${remainingMinutes}min)`);
    }
  }
  
  // 4. Nettoyer le cache : retirer les risques qui ne sont plus à proximité
  const removedRisks: string[] = [];
  notifiedRisks.forEach(riskId => {
    if (!nearbyRiskIds.has(riskId)) {
      removedRisks.push(riskId);
      notifiedRisks.delete(riskId);
      notificationTimestamps.delete(riskId);
    }
  });
  
  if (removedRisks.length > 0) {
    console.log(`[BG] 🧹 Nettoyage cache: ${removedRisks.length} risque(s) retiré(s)`);
  }
  
  return nearbyRisks;
};

// La tâche en arrière-plan
export const locationBackgroundTask = async (taskData?: any): Promise<void> => {
  console.log('[BG] 🚀 Headless JS Task démarré');
  
  // Lire le type de tournée depuis AsyncStorage
  try {
    const tourneeType = await AsyncStorage.getItem('tourneeType');
    if (tourneeType) {
      configureTourneeParameters(tourneeType as TourneeType);
    }
  } catch (error) {
    console.error('[BG] Erreur lecture tourneeType:', error);
  }
  
  return new Promise((resolve) => {
    Geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          console.log(`[BG] 📍 Position: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
          
          if (shouldRefreshCache(latitude, longitude)) {
            await refreshRiskCache(latitude, longitude);
          }
          
          const nearbyRisks = await checkRisksFromCache(latitude, longitude);
          
          if (nearbyRisks.length > 0) {
            console.log(`[BG] ⚠️ ${nearbyRisks.length} risque(s) détecté(s) dans ${LOCATION_CONFIG.alertRadius}m`);
          } else {
            console.log(`[BG] ✅ Aucun risque dans ${LOCATION_CONFIG.alertRadius}m`);
          }
          
          resolve();
        } catch (error) {
          console.error('[BG] Erreur dans la tâche:', error);
          resolve();
        }
      },
      (error) => {
        console.error('[BG] Erreur GPS:', error);
        resolve();
      },
      {
        enableHighAccuracy: true,
        timeout: 20000,
        maximumAge: 10000,
      }
    );
  });
};

// Export par défaut pour l'enregistrement du Headless Task
export default locationBackgroundTask;