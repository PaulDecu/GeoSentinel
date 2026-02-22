// src/services/locationBackgroundTask.ts
// Headless JS Task - S'exécute en arrière-plan avec configuration depuis AsyncStorage
import Geolocation from '@react-native-community/geolocation';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeModules } from 'react-native';
import { apiClient, TourneeType } from './api';
import notifee, { AndroidImportance } from '@notifee/react-native';
import axios from 'axios';
import { ACTIVE_API_URL_KEY } from './serverConfig';

const { PreferencesModule } = NativeModules;

// ── Résolution de l'URL active pour le contexte Headless JS ──────────────────
// Dans un contexte Headless JS (service de fond), serverConfig.ts n'a pas
// de mémoire vive persistante. On lit donc directement depuis AsyncStorage
// l'URL que le LoginScreen a persistée lors de la connexion.
const getApiUrl = async (): Promise<string> => {
  const stored = await AsyncStorage.getItem(ACTIVE_API_URL_KEY);
  if (stored) return stored;
  // Fallback ultime (ne devrait jamais arriver si l'utilisateur s'est connecté)
  console.warn('[BG] ⚠️ Aucune URL serveur en storage, utilisation URL par défaut');
  return 'http://10.0.2.2:3000/api';
};

// ✅ Lit le token depuis SharedPreferences ou AsyncStorage
const getTokenFromPrefs = async (key: 'accessToken' | 'refreshToken'): Promise<string | null> => {
  try {
    if (PreferencesModule) {
      const allKeys = await AsyncStorage.getAllKeys();
      if (allKeys.includes(key)) {
        return await AsyncStorage.getItem(key);
      }
    }
    return null;
  } catch {
    return null;
  }
};

// ✅ Rafraîchit le token JWT depuis SharedPreferences
const refreshTokenIfNeeded = async (): Promise<boolean> => {
  try {
    console.log('[BG] PreferencesModule disponible:', !!PreferencesModule);
    console.log('[BG] getRefreshToken disponible:', !!PreferencesModule?.getRefreshToken);

    let refreshToken: string | null = null;

    if (PreferencesModule?.getRefreshToken) {
      refreshToken = await PreferencesModule.getRefreshToken();
      console.log('[BG] refreshToken depuis SharedPreferences:', !!refreshToken);
    }

    // Fallback sur AsyncStorage
    if (!refreshToken) {
      refreshToken = await AsyncStorage.getItem('refreshToken');
    }

    const allKeys = await AsyncStorage.getAllKeys();
    console.log('[BG] Clés AsyncStorage disponibles:', allKeys);

    if (!refreshToken) {
      console.error('[BG] ❌ Pas de refreshToken — impossible de renouveler la session');
      return false;
    }

    console.log('[BG] 🔄 Tentative de refresh du token JWT...');

    // Lire l'URL active depuis AsyncStorage (persistée au login)
    const apiUrl = await getApiUrl();

    const response = await axios.post(
      `${apiUrl}/auth/refresh`,
      { refreshToken },
      { timeout: 10000 }
    );

    const { accessToken, refreshToken: newRefreshToken } = response.data;

    await AsyncStorage.setItem('accessToken', accessToken);
    if (newRefreshToken) {
      await AsyncStorage.setItem('refreshToken', newRefreshToken);
    }

    if (PreferencesModule?.setTokens) {
      await PreferencesModule.setTokens(accessToken, newRefreshToken || refreshToken);
    } else if (PreferencesModule?.setAccessToken) {
      await PreferencesModule.setAccessToken(accessToken);
    }

    console.log('[BG] ✅ Token JWT renouvelé avec succès');
    return true;
  } catch (error: any) {
    console.error('[BG] ❌ Échec refresh token:', error.message);
    return false;
  }
};

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
  alertRadius: number;     // m
  updateInterval: number;  // ms
}

interface CachedPosition {
  latitude: number;
  longitude: number;
}

interface GeorisquesResponse {
  data: Array<{
    libelle_commune: string;
    code_insee: string;
  }>;
}

let cachedRisks: Risk[] = [];
let lastApiCall = 0;
let lastKnownPosition: CachedPosition | null = null;

// Valeurs par défaut
let LOCATION_CONFIG: LocationConfig = {
  radiusRecherche: 3,   // km
  alertRadius: 100,     // m
  updateInterval: 180000, // 3 min
};

const notifiedRisks = new Set<string>();
const notificationTimestamps = new Map<string, number>();
const NOTIFICATION_COOLDOWN = 5 * 60 * 1000; // 5 minutes

const EXPECTED_TASK_INTERVAL = 45000;
const SLOWDOWN_NOTIFICATION_COOLDOWN = 5 * 60 * 1000;
let lastSlowdownNotification = 0;

const MAX_TRACKING_DURATION = 12 * 60 * 1000;
const WARNING_BEFORE_END = 6 * 60 * 1000;
let hasSentWarning = false;

const checkMaxDuration = async (): Promise<boolean> => {
  try {
    const startTimeStr = await AsyncStorage.getItem('trackingStartTime');
    if (!startTimeStr) return false;

    const startTime = parseInt(startTimeStr);
    const elapsed = Date.now() - startTime;

    if (elapsed >= (MAX_TRACKING_DURATION - WARNING_BEFORE_END) && !hasSentWarning) {
      await notifee.displayNotification({
        title: '⏳ Fin de session proche',
        body: "Votre session de tracking s'arrêtera automatiquement dans 15 minutes.",
        android: { channelId: 'risk-alerts-final', importance: AndroidImportance.HIGH },
      });
      hasSentWarning = true;
      console.log('[BG] ⚠️ Alerte de fin de session envoyée');
    }

    if (elapsed >= MAX_TRACKING_DURATION) {
      console.log('[BG] 🛑 Limite des 4h atteinte.');

      await notifee.displayNotification({
        title: '🏁 Session terminée',
        body: 'Le délai de 4h est expiré. Veuillez relancer le tracking manuellement.',
        android: { channelId: 'risk-alerts-final', importance: AndroidImportance.HIGH },
      });

      if (NativeModules.LocationServiceBridge) {
        await NativeModules.LocationServiceBridge.stopService();
      }
      await AsyncStorage.multiRemove(['tourneeType', 'trackingStartTime', 'lastTaskRun']);
      if (NativeModules.LocationServiceBridge) {
        await NativeModules.LocationServiceBridge.stopService();
      }
      return true;
    }

    return false;
  } catch (error) {
    return false;
  }
};

export const resetNotificationCooldowns = () => {
  notifiedRisks.clear();
  notificationTimestamps.clear();
  lastSlowdownNotification = 0;
  hasSentWarning = false;
  console.log('[BG] 🧹 Tous les cooldowns ont été réinitialisés');
};

const loadConfigFromStorage = async (): Promise<void> => {
  try {
    console.log('[BG] 📖 Lecture configuration depuis AsyncStorage');

    const tourneeType = await AsyncStorage.getItem('tourneeType');
    const apiCallDelayMinutes = await AsyncStorage.getItem('apiCallDelayMinutes');
    const alertRadiusMeters = await AsyncStorage.getItem('alertRadiusMeters');
    const riskLoadZoneKm = await AsyncStorage.getItem('riskLoadZoneKm');

    if (apiCallDelayMinutes && alertRadiusMeters && riskLoadZoneKm) {
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

const checkTaskSlowdown = async (): Promise<void> => {
  try {
    const now = Date.now();
    const lastTaskRunStr = await AsyncStorage.getItem('lastTaskRun');

    if (lastTaskRunStr) {
      const lastTaskRun = parseInt(lastTaskRunStr);
      const timeSinceLastRun = now - lastTaskRun;

      console.log(`[BG] ⏱️ Temps depuis dernière activation: ${Math.round(timeSinceLastRun / 1000)}s`);

      if (timeSinceLastRun > EXPECTED_TASK_INTERVAL) {
        const delayInSeconds = Math.round(timeSinceLastRun / 1000);
        console.warn(`[BG] ⚠️ RALENTISSEMENT DÉTECTÉ: ${delayInSeconds}s`);

        const timeSinceLastSlowdownNotif = now - lastSlowdownNotification;

        if (timeSinceLastSlowdownNotif > SLOWDOWN_NOTIFICATION_COOLDOWN) {
          await notifee.displayNotification({
            title: '⚠️ Service ralenti',
            body: `Le service de surveillance a été ralenti par le système (${delayInSeconds}s). Pour garantir une surveillance optimale, veuillez arrêter puis relancer le tracking.`,
            android: {
              channelId: 'risk-alerts-final',
              importance: AndroidImportance.HIGH,
              vibrationPattern: [500, 500, 500, 500],
              sound: 'default',
              pressAction: { id: 'default' },
              ongoing: false,
              autoCancel: true,
            },
          });
          lastSlowdownNotification = now;
          console.log('[BG] ✅ Notification ralentissement envoyée');
        }
      } else {
        console.log(`[BG] ✅ Intervalle normal (${Math.round(timeSinceLastRun / 1000)}s)`);
      }
    } else {
      console.log('[BG] 📍 Première exécution de la tâche');
    }

    await AsyncStorage.setItem('lastTaskRun', String(Date.now()));
  } catch (error) {
    console.error('[BG] ❌ Erreur vérification ralentissement:', error);
  }
};

const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 1000;
};

const checkCommuneChange = async (latitude: number, longitude: number): Promise<void> => {
  try {
    const notifyCommune = await AsyncStorage.getItem('notifyCommuneChange');
    if (notifyCommune !== 'true') {
      console.log('[BG] 🏘️ Surveillance commune désactivée');
      return;
    }

    console.log('[BG] 🏘️ Vérification changement de commune...');
    const apiUrl = `https://georisques.gouv.fr/api/v1/gaspar/risques?latlon=${longitude},${latitude}&rayon=20`;
    const response = await axios.get<GeorisquesResponse>(apiUrl, {
      timeout: 10000,
      headers: { 'Accept': 'application/json' },
    });

    if (response.data?.data?.length > 0) {
      const currentCommune = response.data.data[0].libelle_commune;
      console.log(`[BG] 🏘️ Commune actuelle: ${currentCommune}`);

      const lastCommune = await AsyncStorage.getItem('lastKnownCommune');

      if (lastCommune && lastCommune !== currentCommune) {
        console.log(`[BG] 🚨 CHANGEMENT DE COMMUNE: ${lastCommune} → ${currentCommune}`);
        await notifee.displayNotification({
          title: '🏘️ Changement de commune',
          body: `Vous êtes maintenant à ${currentCommune}. Veuillez accéder à l'application pour vérifier les risques.`,
          android: {
            channelId: 'risk-alerts-final',
            importance: AndroidImportance.HIGH,
            vibrationPattern: [500, 500, 500, 500],
            sound: 'default',
            pressAction: { id: 'default' },
          },
        });
        console.log('[BG] ✅ Notification changement commune envoyée');
      } else if (!lastCommune) {
        console.log(`[BG] 🏘️ Première détection: ${currentCommune}`);
      } else {
        console.log(`[BG] ✅ Toujours dans la même commune: ${currentCommune}`);
      }

      await AsyncStorage.setItem('lastKnownCommune', currentCommune);
    } else {
      console.warn("[BG] ⚠️ Aucune donnée commune retournée par l'API");
    }
  } catch (error: any) {
    if (error.code === 'ECONNABORTED') {
      console.error('[BG] ⏱️ Timeout API Géorisques');
    } else if (error.response) {
      console.error(`[BG] ❌ Erreur API Géorisques (${error.response.status}):`, error.response.data);
    } else {
      console.error('[BG] ❌ Erreur vérification commune:', error.message);
    }
  }
};

const refreshRiskCache = async (latitude: number, longitude: number): Promise<void> => {
  try {
    const now = new Date();
    const dateStr = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    console.log(`[BG] date : ${dateStr} - Tentative refresh cache`);

    const token = await AsyncStorage.getItem('accessToken');
    if (!token) {
      console.warn('[BG] ⚠️ Pas de token — tentative de refresh avant appel API');
      const refreshed = await refreshTokenIfNeeded();
      if (!refreshed) {
        console.error('[BG] ❌ Impossible de renouveler la session — utilisation du cache');
        return;
      }
    }

    console.log('[BG] ✅ Token présent, appel getNearbyRisks');

    try {
      const risks = await apiClient.getNearbyRisks(
        latitude,
        longitude,
        LOCATION_CONFIG.radiusRecherche * 1000
      );
      cachedRisks = risks || [];
      lastApiCall = Date.now();
      lastKnownPosition = { latitude, longitude };
      console.log(`[BG] ✅ Cache rafraîchi: ${cachedRisks.length} risques`);
    } catch (error: any) {
      if (error.response?.status === 401) {
        console.warn('[BG] ⚠️ Token expiré (401) — tentative de refresh...');
        const refreshed = await refreshTokenIfNeeded();
        if (refreshed) {
          console.log('[BG] 🔁 Nouvelle tentative après refresh token...');
          try {
            const risks = await apiClient.getNearbyRisks(
              latitude,
              longitude,
              LOCATION_CONFIG.radiusRecherche * 1000
            );
            cachedRisks = risks || [];
            lastApiCall = Date.now();
            lastKnownPosition = { latitude, longitude };
            console.log(`[BG] ✅ Cache rafraîchi après refresh: ${cachedRisks.length} risques`);
          } catch (retryError: any) {
            console.error('[BG] ❌ Échec après refresh token:', retryError.message);
          }
        } else {
          console.error('[BG] ❌ Refresh token échoué — session expirée, cache conservé');
        }
      } else {
        console.error('[BG] ❌ Erreur API:', error.message);
      }
    }

    await checkCommuneChange(latitude, longitude);
  } catch (error: any) {
    console.error('[BG] ❌ Erreur inattendue refreshRiskCache:', error.message);
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

const checkRisksFromCache = async (latitude: number, longitude: number): Promise<Risk[]> => {
  const nearbyRisks: Risk[] = [];
  const now = Date.now();

  cachedRisks.forEach((risk) => {
    const distance = calculateDistance(latitude, longitude, risk.latitude, risk.longitude);
    if (distance <= LOCATION_CONFIG.alertRadius) {
      nearbyRisks.push({ ...risk, distance });
    }
  });

  const nearbyRiskIds = new Set(nearbyRisks.map((r) => r.id));

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
            pressAction: { id: 'default' },
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

  const removedRisks: string[] = [];
  notifiedRisks.forEach((riskId) => {
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

export const locationBackgroundTask = async (taskData?: any): Promise<void> => {
  console.log('[BG] 🚀 Headless JS Task démarré');

  const isExpired = await checkMaxDuration();
  if (isExpired) return;

  await checkTaskSlowdown();
  await loadConfigFromStorage();

  return new Promise((resolve) => {
    Geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          console.log(`[BG] 📍 Position: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);

          if (shouldRefreshCache(latitude, longitude)) {
            console.log('[BG] 🔄 Refresh du cache nécessaire');
            await refreshRiskCache(latitude, longitude);
          } else {
            console.log(`[BG] ✅ Cache valide (${cachedRisks.length} risques)`);
          }

          const nearbyRisks = await checkRisksFromCache(latitude, longitude);

          if (nearbyRisks.length > 0) {
            console.log(`[BG] ⚠️ ${nearbyRisks.length} risque(s) dans ${LOCATION_CONFIG.alertRadius}m`);
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
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 10000 }
    );
  });
};

export default locationBackgroundTask;
