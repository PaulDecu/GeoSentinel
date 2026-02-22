// src/services/serverConfig.ts
//
// Singleton de résolution du serveur actif.
// Au login, on teste les 2 URLs dans l'ordre :
//   1. API_URL_PRIMARY  → si /health répond en < TIMEOUT ms  →  on l'utilise
//   2. API_URL_FALLBACK → sinon, même test
//   3. Si aucune ne répond → erreur affichée à l'utilisateur
//
// L'URL active est persistée dans AsyncStorage sous la clé 'activeApiUrl'
// pour que le service de fond (locationBackgroundTask) puisse la lire
// sans refaire le test.

import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL_PRIMARY, API_URL_FALLBACK } from '@env';

// Juste après les imports, ajoutez :
console.log('=== SERVERCONFIG INIT ===');
console.log('PRIMARY_URL:', API_URL_PRIMARY);
console.log('FALLBACK_URL:',API_URL_FALLBACK);

// ─── Clé AsyncStorage ─────────────────────────────────────────────────────────
export const ACTIVE_API_URL_KEY = 'activeApiUrl';

// ─── Timeout du test de connectivité (ms) ────────────────────────────────────
const PROBE_TIMEOUT_MS = 4000;

// ─── URLs issues du .env ──────────────────────────────────────────────────────
// Expo lit les variables via babel-plugin-transform-inline-environment-variables
// ou react-native-dotenv. Variables préfixées EXPO_PUBLIC_ sont exposées côté client.
const PRIMARY_URL: string = API_URL_PRIMARY ?? '';
const FALLBACK_URL: string = API_URL_FALLBACK ?? '';

// ─── État interne du singleton ────────────────────────────────────────────────
let _activeUrl: string | null = null;

/**
 * Teste si un serveur répond correctement.
 * Appelle GET /health et vérifie que le statut HTTP est 200.
 */
async function probeServer(baseUrl: string): Promise<boolean> {
  try {
    const url = `${baseUrl}/health`;
    console.log(`🔍 Test connexion → ${url}`);
    const response = await axios.get(url, {
      timeout: PROBE_TIMEOUT_MS,
      // On ne veut pas que l'intercepteur Axios de l'ApiClient s'en mêle
      // (pas de token JWT ici, /health est public)
    });
    const ok = response.status === 200 && response.data?.status === 'ok';
    console.log(`${ok ? '✅' : '❌'} ${baseUrl} → ${ok ? 'OK' : 'KO'}`);
    return ok;
  } catch (error: any) {
    const reason = error.code === 'ECONNABORTED' ? 'timeout' : error.message;
    console.warn(`❌ ${baseUrl} → ${reason}`);
    return false;
  }
}

/**
 * Résout l'URL active :
 *  - Si déjà résolue en mémoire → retourne directement (pas de re-probe)
 *  - Sinon, teste PRIMARY puis FALLBACK
 *  - Persiste le résultat dans AsyncStorage
 *
 * Appelé depuis LoginScreen AVANT la tentative de login.
 * Appelé depuis ApiClient en lazy-init si l'URL n'est pas encore connue.
 *
 * @returns l'URL de base active (sans /health)
 * @throws Error si aucun serveur ne répond
 */
export async function resolveActiveUrl(): Promise<string> {
  // Déjà résolue dans cette session (mémoire vive)
  if (_activeUrl) return _activeUrl;

  // Tester le serveur principal
  if (PRIMARY_URL && await probeServer(PRIMARY_URL)) {
    _activeUrl = PRIMARY_URL;
    await AsyncStorage.setItem(ACTIVE_API_URL_KEY, _activeUrl);
    return _activeUrl;
  }

  // Tester le serveur de secours
  if (FALLBACK_URL && FALLBACK_URL !== PRIMARY_URL && await probeServer(FALLBACK_URL)) {
    _activeUrl = FALLBACK_URL;
    await AsyncStorage.setItem(ACTIVE_API_URL_KEY, _activeUrl);
    console.warn('⚠️ Serveur de secours utilisé');
    return _activeUrl;
  }

  // Aucun serveur disponible
  throw new Error(
    'Impossible de contacter le serveur.\n\nVérifiez votre connexion réseau ou contactez votre administrateur.'
  );
}

/**
 * Retourne l'URL active en mémoire.
 * Si non résolue, lit depuis AsyncStorage (usage service de fond).
 * Ne refait pas de probe réseau.
 */
export async function getActiveUrl(): Promise<string> {
  if (_activeUrl) return _activeUrl;

  // Lecture depuis AsyncStorage (service de fond ou redémarrage app)
  const stored = await AsyncStorage.getItem(ACTIVE_API_URL_KEY);
  if (stored) {
    _activeUrl = stored;
    return _activeUrl;
  }

  // Cas extrême : rien en mémoire ni en storage → on déclenche la résolution
  return resolveActiveUrl();
}

/**
 * Réinitialise le cache mémoire.
 * Appelé à la déconnexion pour forcer un nouveau probe au prochain login.
 */
export function resetActiveUrl(): void {
  _activeUrl = null;
  // On ne supprime PAS AsyncStorage ici : le service de fond pourrait encore en avoir besoin.
}

/**
 * Retourne true si le serveur de secours est actuellement utilisé.
 * Utile pour afficher un badge d'avertissement dans l'UI.
 */
export function isUsingFallback(): boolean {
  return _activeUrl === FALLBACK_URL && !!FALLBACK_URL;
}
