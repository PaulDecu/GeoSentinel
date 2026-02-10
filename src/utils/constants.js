// utils/constants.js
import { Platform } from 'react-native';

export const API_BASE_URL = __DEV__ 
  ? Platform.OS === 'android'
    ? 'http://10.0.2.2:3001/api'
    : 'http://192.168.1.26:3001/api'
  : 'https://avis-client-app.onrender.com/api';

export const RISK_TYPES = [
  { value: 'chien méchant', label: 'Chien méchant', icon: '🐕', color: '#EF4444' },
  { value: 'point de deal', label: 'Point de deal', icon: '💊', color: '#8B5CF6' },
  { value: 'accès dangereux', label: 'Accès dangereux', icon: '⚠️', color: '#F59E0B' },
  { value: 'autre risque', label: 'Autre risque', icon: '❗', color: '#64748B' }
];

export const COLORS = {
  primary: '#EF4444',
  secondary: '#3B82F6',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#DC2626',
  background: '#F8FAFC',
  cardBackground: '#FFFFFF',
  text: '#1F2937',
  textLight: '#6B7280',
  border: '#E5E7EB',
  disabled: '#9CA3AF'
};

// Après les autres constantes
export const ITEMS_PER_PAGE = 10;
export const VALIDATION = {
  identifiantLength: 7,
  identifiantRegex: /^[A-Z]{4}\d{3}$/,
  codePostalRegex: /^\d{5}$/, // <-- Vérifie bien cette ligne
};

// src/utils/constants.js

export const MESSAGES = {
  errors: {
    location: "Impossible d'obtenir votre position GPS.",
    invalidCodePostal: "Le code postal doit contenir 5 chiffres.",
    network: "Erreur réseau. Veuillez réessayer.",
    // ...
  },
  success: {
    riskCreated: "Le risque a été créé avec succès.",
  }
};

export const LOCATION_CONFIG = {
  radiusRecherche: 3,
  alertRadius: 100,
  updateInterval: 180000,
  accuracy: 6,
  distanceInterval: 10,
  timeInterval: 10000
};
