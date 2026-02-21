// src/utils/constants.ts
import { RiskSeverity } from '../types/index.ts';

export const COLORS = {
  // Couleurs principales
  primary: '#0891b2',
  secondary: '#3b82f6',
  success: '#22c55e',
  warning: '#f59e0b',
  danger: '#ef4444',
  critical: '#a855f7',
  // Texte
  text: '#0f172a',
  textLight: '#64748b',
  // Fond
  background: '#f8fafc',
  cardBackground: '#ffffff',
  // Bordures
  border: '#e2e8f0',
  disabled: '#cbd5e1',
};

// ✅ RISK_CATEGORIES supprimé — chargé dynamiquement depuis l'API par tenant
// Utilisez le hook useRiskCategories() ou apiClient.getRiskCategories()

// Sévérités de risques
export const RISK_SEVERITIES = [
  {
    value: RiskSeverity.FAIBLE,
    label: 'Faible',
    icon: '🟡',
    color: COLORS.success,
    bgColor: '#dcfce7',  // green-100
  },
  {
    value: RiskSeverity.MODERE,
    label: 'Modéré',
    icon: '🟠',
    color: COLORS.warning,
    bgColor: '#fef3c7',  // yellow-100
  },
  {
    value: RiskSeverity.ELEVE,
    label: 'Élevé',
    icon: '🔴',
    color: COLORS.danger,
    bgColor: '#fee2e2',  // red-100
  },
  {
    value: RiskSeverity.CRITIQUE,
    label: 'Critique',
    icon: '⚫',
    color: COLORS.critical,
    bgColor: '#f3e8ff',  // purple-100
  },
];

// Validation
export const VALIDATION = {
  emailRegex: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  passwordMinLength: 8,
  titleMinLength: 3,
  titleMaxLength: 100,
  descriptionMaxLength: 500,
};

// Messages
export const MESSAGES = {
  errors: {
    invalidEmail: 'Email invalide',
    invalidPassword: `Le mot de passe doit contenir au moins ${VALIDATION.passwordMinLength} caractères`,
    location: 'Impossible d\'obtenir votre position GPS',
    network: 'Erreur réseau. Vérifiez votre connexion.',
    unauthorized: 'Session expirée. Veuillez vous reconnecter.',
    unknown: 'Une erreur est survenue',
  },
  success: {
    login: 'Connexion réussie !',
    riskCreated: 'Risque créé avec succès',
    riskUpdated: 'Risque mis à jour',
    riskDeleted: 'Risque supprimé',
    risksDeleted: 'Risques supprimés',
  },
  info: {
    noRisks: 'Aucun risque à afficher',
    loading: 'Chargement...',
    gpsInfo: 'Cliquez sur le bouton pour actualiser votre position GPS',
  },
};

// Configuration
export const CONFIG = {
  itemsPerPage: 10,
  notificationRadius: 500, // mètres
  mapDefaultZoom: 13,
  mapDefaultCenter: {
    latitude: 48.8566,
    longitude: 2.3522,
  },
  apiTimeout: 30000, // ms
};

// URLs
export const URLS = {
  forgotPassword: 'https://votre-site.com/forgot-password',
  privacy: 'https://votre-site.com/privacy',
  terms: 'https://votre-site.com/terms',
};