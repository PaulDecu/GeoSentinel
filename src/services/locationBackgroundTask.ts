// src/services/locationBackgroundTask.ts
// Headless JS Task - S'exécute en arrière-plan avec configuration depuis AsyncStorage
import Geolocation from '@react-native-community/geolocation';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiClient, TourneeType } from './api';
import notifee, { AndroidImportance } from '@notifee/react-native';
import axios from 'axios';

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

// 🆕 INTERFACE POUR LA RÉPONSE API GEORISQUES
interface GeorisquesResponse {
  data: Array<{
    libelle_commune: string;
    code_insee: string;
    // ... autres champs
  }>;
}

let cachedRisks: Risk[] = [];
let lastApiCall = 0;
let lastKnownPosition: CachedPosition | null = null;

// Valeurs par défaut
let LOCATION_CONFIG: LocationConfig = {
  radiusRecherche: 3, // km
  alertRadius: 100, // m
  updateInterval: 180000, // 3 min
};

const notifiedRisks = new Set<string>();
const notificationTimestamps = new Map<string, number>();
const NOTIFICATION_COOLDOWN = 5 * 60 * 1000; // 5 minutes

// 🆕 DÉTECTION RALENTISSEMENT
const EXPECTED_TASK_INTERVAL = 45000; // 45 secondes (intervalle attendu max)
const SLOWDOWN_NOTIFICATION_COOLDOWN = 5 * 60 * 1000; // 5 minutes entre notifications de ralentissement
let lastSlowdownNotification = 0;

// ✅ Lire les paramètres depuis AsyncStorage
const loadConfigFromStorage = async (): Promise<void> => {
  try {
    console.log('[BG] 📖 Lecture configuration depuis AsyncStorage');
    
    const tourneeType = await AsyncStorage.getItem('tourneeType');
    const apiCallDelayMinutes = await AsyncStorage.getItem('apiCallDelayMinutes');
    const alertRadiusMeters = await AsyncStorage.getItem('alertRadiusMeters');
    const riskLoadZoneKm = await AsyncStorage.getItem('riskLoadZoneKm');
    
    if (apiCallDelayMinutes && alertRadiusMeters && riskLoadZoneKm) {
      // Utiliser les paramètres sauvegardés
      LOCATION_CONFIG.updateInterval = parseInt(apiCallDelayMinutes) * 60 * 1000;
      LOCATION_CONFIG.alertRadius = parseInt(alertRadiusMeters);
      LOCATION_CONFIG.radiusRecherche = parseInt(riskLoadZoneKm);
      
      console.log(`[BG] ✅ Configuration chargée:`);
      console.log(`[BG]    - Type: ${tourneeType}`);
      console.log(`[BG]    - Rayon alerte: ${LOCATION_CONFIG.alertRadius}m`);
      console.log(`[BG]    - Refresh API: ${parseInt(apiCallDelayMinutes)}min`);
      console.log(`[BG]    - Zone recherche: ${LOCATION_CONFIG.radiusRecherche}km`);
    } else {
      console.warn('[BG] ⚠️ Paramètres manquants, valeurs par défaut');
    }
  } catch (error) {
    console.error('[BG] ❌ Erreur lecture configuration:', error);
  }
};

// 🆕 NOUVELLE FONCTION : Vérifier le ralentissement de la tâche
const checkTaskSlowdown = async (): Promise<void> => {
  try {
    const now = Date.now();
    const lastTaskRunStr = await AsyncStorage.getItem('lastTaskRun');
    
    if (lastTaskRunStr) {
      const lastTaskRun = parseInt(lastTaskRunStr);
      const timeSinceLastRun = now - lastTaskRun;
      
      console.log(`[BG] ⏱️ Temps écoulé depuis dernière activation: ${Math.round(timeSinceLastRun / 1000)}s`);
      
      // Si le délai dépasse 30 secondes
      if (timeSinceLastRun > EXPECTED_TASK_INTERVAL) {
        const delayInSeconds = Math.round(timeSinceLastRun / 1000);
        console.warn(`[BG] ⚠️ RALENTISSEMENT DÉTECTÉ: ${delayInSeconds}s (attendu: 30s max)`);
        
        // Vérifier le cooldown des notifications de ralentissement
        const timeSinceLastSlowdownNotif = now - lastSlowdownNotification;
        
        if (timeSinceLastSlowdownNotif > SLOWDOWN_NOTIFICATION_COOLDOWN) {
          console.log('[BG] 🚨 Envoi notification ralentissement');
          
          // Envoyer notification à l'utilisateur
          await notifee.displayNotification({
            title: '⚠️ Service ralenti',
            body: `Le service de surveillance a été ralenti par le système (${delayInSeconds}s). Pour garantir une surveillance optimale, veuillez arrêter puis relancer le tracking.`,
            android: {
              channelId: 'risk-alerts-final',
              importance: AndroidImportance.HIGH,
              vibrationPattern: [500, 500, 500, 500],
              sound: 'default',
              pressAction: {
                id: 'default',
              },
              // Notification persistante pour attirer l'attention
              ongoing: false,
              autoCancel: true,
            },
          });
          
          lastSlowdownNotification = now;
          console.log('[BG] ✅ Notification ralentissement envoyée');
        } else {
          const remainingMinutes = Math.ceil((SLOWDOWN_NOTIFICATION_COOLDOWN - timeSinceLastSlowdownNotif) / 1000 / 60);
          console.log(`[BG] ⏳ Notification ralentissement - cooldown actif (${remainingMinutes}min restantes)`);
        }
      } else {
        console.log(`[BG] ✅ Intervalle normal (${Math.round(timeSinceLastRun / 1000)}s)`);
      }
    } else {
      console.log('[BG] 📍 Première exécution de la tâche');
    }
    
    // Sauvegarder le timestamp de cette exécution
    await AsyncStorage.setItem('lastTaskRun', String(now));
    
  } catch (error) {
    console.error('[BG] ❌ Erreur vérification ralentissement:', error);
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

// 🆕 NOUVELLE FONCTION : Vérifier le changement de commune
const checkCommuneChange = async (latitude: number, longitude: number): Promise<void> => {
  try {
    // Vérifier si la surveillance de commune est activée
    const notifyCommune = await AsyncStorage.getItem('notifyCommuneChange');
    
    if (notifyCommune !== 'true') {
      console.log('[BG] 🏘️ Surveillance commune désactivée');
      return;
    }
    
    console.log('[BG] 🏘️ Vérification changement de commune...');
    
    // Appel API Géorisques pour récupérer la commune
    const apiUrl = `https://georisques.gouv.fr/api/v1/gaspar/risques?latlon=${longitude},${latitude}&rayon=20`;
    console.log(`[BG] 📡 Appel API Géorisques: ${apiUrl}`);
    
    const response = await axios.get<GeorisquesResponse>(apiUrl, {
      timeout: 10000,
      headers: {
        'Accept': 'application/json',
      }
    });
    
    if (response.data && response.data.data && response.data.data.length > 0) {
      const currentCommune = response.data.data[0].libelle_commune;
      console.log(`[BG] 🏘️ Commune actuelle: ${currentCommune}`);
      
      // Récupérer la dernière commune connue
      const lastCommune = await AsyncStorage.getItem('lastKnownCommune');
      
      if (lastCommune && lastCommune !== currentCommune) {
        // ✅ CHANGEMENT DE COMMUNE DÉTECTÉ !
        console.log(`[BG] 🚨 CHANGEMENT DE COMMUNE: ${lastCommune} → ${currentCommune}`);
        
        // Envoyer notification
        await notifee.displayNotification({
          title: '🏘️ Changement de commune',
          body: `Vous êtes maintenant à ${currentCommune}. Veuillez accéder à l'application pour vérifier les risques.`,
          android: {
            channelId: 'risk-alerts-final',
            importance: AndroidImportance.HIGH,
            vibrationPattern: [500, 500, 500],
            sound: 'default',
            pressAction: {
              id: 'default',
            },
          },
        });
        
        console.log('[BG] ✅ Notification changement commune envoyée');
      } else if (!lastCommune) {
        console.log(`[BG] 🏘️ Première détection: ${currentCommune}`);
      } else {
        console.log(`[BG] ✅ Toujours dans la même commune: ${currentCommune}`);
      }
      
      // Sauvegarder la commune actuelle
      await AsyncStorage.setItem('lastKnownCommune', currentCommune);
      
    } else {
      console.warn('[BG] ⚠️ Aucune donnée commune retournée par l\'API');
    }
    
  } catch (error: any) {
    if (error.code === 'ECONNABORTED') {
      console.error('[BG] ⏱️ Timeout API Géorisques');
    } else if (error.response) {
      console.error(`[BG] ❌ Erreur API Géorisques (${error.response.status}):`, error.response.data);
    } else {
      console.error('[BG] ❌ Erreur vérification commune:', error.message);
    }
    // Ne pas bloquer le reste du processus en cas d'erreur
  }
};

const refreshRiskCache = async (latitude: number, longitude: number): Promise<void> => {
  try {
    const now = new Date();
    const dateStr = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    console.log(`[BG] date : ${dateStr} - Tentative refresh cache`);
    
    // ✅ Vérifier que le token est présent
    const token = await AsyncStorage.getItem('accessToken');
    if (!token) {
      console.error('[BG] ❌ Pas de token disponible - Impossible d\'appeler l\'API');
      console.log('[BG] ⚠️ Utilisation du cache existant');
      return;
    }
    
    console.log(`[BG] ✅ Token présent, appel getNearbyRisks`);
    
    // Appel API avec le client TypeScript
    const risks = await apiClient.getNearbyRisks(
      latitude,
      longitude,
      LOCATION_CONFIG.radiusRecherche * 1000 // Convertir km en mètres
    );
    
    cachedRisks = risks || [];
    lastApiCall = Date.now();
    lastKnownPosition = { latitude, longitude };
    console.log(`[BG] ✅ Cache rafraîchi: ${cachedRisks.length} risques`);

    // 🆕 VÉRIFIER CHANGEMENT DE COMMUNE
    await checkCommuneChange(latitude, longitude);

    
  } catch (error: any) {
    if (error.response?.status === 401) {
      console.error('[BG] ❌ Erreur 401 Unauthorized - Token expiré ou invalide');
      console.log('[BG] ⚠️ Utilisation du cache existant (risques déjà chargés)');
    } else {
      console.error('[BG] ❌ Erreur cache:', error.message);
    }
    
    // Ne pas throw l'erreur, continuer avec le cache existant
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
  
  // 1. Trouver tous les risques à proximité
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
  
  // 2. Créer un Set des IDs de risques à proximité
  const nearbyRiskIds = new Set(nearbyRisks.map(r => r.id));
  
  // 3. Envoyer les notifications
  for (const risk of nearbyRisks) {
    const lastNotification = notificationTimestamps.get(risk.id) || 0;
    const timeSinceLastNotif = now - lastNotification;
    const canNotify = timeSinceLastNotif > NOTIFICATION_COOLDOWN;
    
    if (canNotify || !notifiedRisks.has(risk.id)) {
      console.log(`[BG] 🚨 Notification risque ${risk.id}`);
      
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
        
        notifiedRisks.add(risk.id);
        notificationTimestamps.set(risk.id, now);
      } catch (error) {
        console.error('[BG] Erreur notification:', error);
      }
    } else {
      const remainingMinutes = Math.ceil((NOTIFICATION_COOLDOWN - timeSinceLastNotif) / 1000 / 60);
      console.log(`[BG] ⏳ Risque ${risk.id} - cooldown actif (${remainingMinutes}min)`);
    }
  }
  
  // 4. Nettoyer le cache
  const removedRisks: string[] = [];
  notifiedRisks.forEach(riskId => {
    if (!nearbyRiskIds.has(riskId)) {
      removedRisks.push(riskId);
      notifiedRisks.delete(riskId);
      notificationTimestamps.delete(riskId);
    }
  });
  
  if (removedRisks.length > 0) {
    console.log(`[BG] 🧹 Nettoyage: ${removedRisks.length} risque(s) retiré(s)`);
  }
  
  return nearbyRisks;
};

// La tâche en arrière-plan
export const locationBackgroundTask = async (taskData?: any): Promise<void> => {
  console.log('[BG] 🚀 Headless JS Task démarré');
  
  // 🆕 VÉRIFIER LE RALENTISSEMENT EN PREMIER
  await checkTaskSlowdown();
  
  // Charger la config depuis AsyncStorage
  await loadConfigFromStorage();
  
  return new Promise((resolve) => {
    Geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          console.log(`[BG] 📍 Position: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
          
          // Vérifier si le cache doit être rafraîchi
          if (shouldRefreshCache(latitude, longitude)) {
            console.log('[BG] 🔄 Refresh du cache nécessaire');
            await refreshRiskCache(latitude, longitude);
          } else {
            console.log(`[BG] ✅ Cache valide (${cachedRisks.length} risques)`);
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

export default locationBackgroundTask;
