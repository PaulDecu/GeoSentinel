import Geolocation from '@react-native-community/geolocation';
import { risquesAPI } from './api';
import notifee from '@notifee/react-native';

let cachedRisks = [];
let lastApiCall = 0;
let lastKnownPosition = null;

const LOCATION_CONFIG = {
  radiusRecherche: 3,
  alertRadius: 100,
  updateInterval: 180000,
};

const notifiedRisks = new Set();
const notificationTimestamps = new Map();
const NOTIFICATION_COOLDOWN = 5 * 60 * 1000;

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
const maintenant = new Date();
const formatte = maintenant.toLocaleString('fr-FR', {
  month: 'numeric',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit'
});

console.log(`[BG] date : ${formatte} appel nearby_v2`);
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
  console.log(`calcul délai appel api: ${Date.now() - lastApiCall} secondes `);
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
  
  const nearbyRiskIds = new Set(nearbyRisks.map(r => r.id));
  
  for (const risque of nearbyRisks) {
    const lastNotification = notificationTimestamps.get(risque.id) || 0;
    const timeSinceLastNotif = now - lastNotification;
    const canNotify = timeSinceLastNotif > NOTIFICATION_COOLDOWN;
    
    if (canNotify || !notifiedRisks.has(risque.id)) {
      console.log(`[BG] 🚨 Notification risque ${risque.id}`);
      
      try {
        await notifee.displayNotification({
          title: `⚠️ Risque : ${risque.type_risque}`,
          body: `À ${Math.round(risque.distance)}m - ${risque.adresse}`,
          android: {
            channelId: 'risk-alerts-final',
            importance: 4,
            vibrationPattern: [300, 500],
            sound: 'default',
            pressAction: {
              id: 'default',
            },
          },
        });
        
        notifiedRisks.add(risque.id);
        notificationTimestamps.set(risque.id, now);
      } catch (error) {
        console.error('[BG] Erreur notification:', error);
      }
    }
  }
  
  notifiedRisks.forEach(riskId => {
    if (!nearbyRiskIds.has(riskId)) {
      notifiedRisks.delete(riskId);
      notificationTimestamps.delete(riskId);
    }
  });
  
  return nearbyRisks;
};

export const locationBackgroundTask = async (taskData) => {
  console.log('[BG] 🚀 Headless JS Task démarré');
  
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
            console.log(`[BG] ⚠️ ${nearbyRisks.length} risque(s) détecté(s)`);
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