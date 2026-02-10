// services/locationBackgroundTask.js
// Headless JS Task - S'exécute en arrière-plan avec configuration dynamique selon la tournée
import Geolocation from '@react-native-community/geolocation';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { risquesAPI } from './api';
import notifee from '@notifee/react-native';

let cachedRisks = [];
let lastApiCall = 0;
let lastKnownPosition = null;

// Valeurs par défaut (modifiées dynamiquement selon le type de tournée)
let LOCATION_CONFIG = {
  radiusRecherche: 3, // km
  alertRadius: 100, // m
  updateInterval: 180000, // 3 min
};

const notifiedRisks = new Set();
const notificationTimestamps = new Map();
const NOTIFICATION_COOLDOWN = 5 * 60 * 1000; // 5 minutes

// Configuration selon le type de tournée
const configureTourneeParameters = (tourneeType) => {
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

const calculateDistance = (lat1, lon1, lat2, lon2) => {
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
  return R * c * 1000;
};

const refreshRiskCache = async (latitude, longitude) => {
  try {
    const now = new Date();
    const dateStr = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    console.log(`[BG] date : ${dateStr} appel nearby_v2`);
    
    const response = await risquesAPI.nearby_V2(
      latitude,
      longitude,
      LOCATION_CONFIG.radiusRecherche
    );
    
    cachedRisks = response.risques || [];
    lastApiCall = Date.now();
    lastKnownPosition = { latitude, longitude };
    console.log(`[BG] ✅ Cache: ${cachedRisks.length} risques`);
  } catch (error) {
    console.error('[BG] ❌ Erreur cache:', error);
  }
};

const shouldRefreshCache = (latitude, longitude) => {
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

const checkRisksFromCache = async (latitude, longitude) => {
  const nearbyRisks = [];
  const now = Date.now();
  
  // 1. Trouver tous les risques à proximité (rayon dynamique selon la tournée)
  cachedRisks.forEach(risque => {
    const distance = calculateDistance(
      latitude,
      longitude,
      risque.latitude,
      risque.longitude
    );
    
    if (distance <= LOCATION_CONFIG.alertRadius) {
      nearbyRisks.push({ ...risque, distance });
    }
  });
  
  // 2. Créer un Set des IDs de risques à proximité (pour nettoyage)
  const nearbyRiskIds = new Set(nearbyRisks.map(r => r.id));
  
  // 3. Envoyer les notifications (avec système de cache anti-spam)
  for (const risque of nearbyRisks) {
    const lastNotification = notificationTimestamps.get(risque.id) || 0;
    const timeSinceLastNotif = now - lastNotification;
    const canNotify = timeSinceLastNotif > NOTIFICATION_COOLDOWN;
    
    // Envoyer si :
    // - Jamais notifié OU
    // - Cooldown de 5 min écoulé
    if (canNotify || !notifiedRisks.has(risque.id)) {
      const minutesSince = Math.floor(timeSinceLastNotif / 1000 / 60);
      console.log(`[BG] 🚨 Notification risque ${risque.id}`);
      
      // Envoyer la notification avec @notifee
      try {
        await notifee.displayNotification({
          title: `⚠️ Risque : ${risque.type_risque}`,
          body: `À ${Math.round(risque.distance)}m - ${risque.adresse}`,
          android: {
            channelId: 'risk-alerts-final',
            importance: 4, // HIGH
            vibrationPattern: [300, 500],
            sound: 'default',
            pressAction: {
              id: 'default',
            },
          },
        });
        
        // Mettre à jour le cache
        notifiedRisks.add(risque.id);
        notificationTimestamps.set(risque.id, now);
      } catch (error) {
        console.error('[BG] Erreur notification:', error);
      }
    } else {
      const remainingMinutes = Math.ceil((NOTIFICATION_COOLDOWN - timeSinceLastNotif) / 1000 / 60);
      console.log(`[BG] ⏳ Risque ${risque.id} - cooldown actif (encore ${remainingMinutes}min)`);
    }
  }
  
  // 4. Nettoyer le cache : retirer les risques qui ne sont plus à proximité
  const removedRisks = [];
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
export const locationBackgroundTask = async (taskData) => {
  console.log('[BG] 🚀 Headless JS Task démarré');
  
  // Lire le type de tournée depuis AsyncStorage
  try {
    const tourneeType = await AsyncStorage.getItem('tourneeType');
    if (tourneeType) {
      configureTourneeParameters(tourneeType);
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