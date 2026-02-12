// src/utils/constants.ts
import { RiskCategory, RiskSeverity } from '../types/index.ts';

export const COLORS = {
  // Couleurs principales
  primary: '#0891b2',      // Cyan (primary-600)
  secondary: '#3b82f6',    // Blue
  success: '#22c55e',      // Green
  warning: '#f59e0b',      // Orange
  danger: '#ef4444',       // Red
  critical: '#a855f7',     // Violet
  
  // Texte
  text: '#0f172a',         // Slate-900
  textLight: '#64748b',    // Slate-500
  
  // Fond
  background: '#f8fafc',   // Slate-50
  cardBackground: '#ffffff',
  
  // Bordures
  border: '#e2e8f0',       // Slate-200
  disabled: '#cbd5e1',     // Slate-300
};

// Catégories de risques avec icônes
export const RISK_CATEGORIES = [
  {
    value: RiskCategory.NATUREL,
    label: 'Naturel',
    icon: '🌊',
    color: COLORS.primary,
    description: 'Inondation, séisme, tempête...',
  },
  {
    value: RiskCategory.TECHNOLOGIQUE,
    label: 'Technologique',
    icon: '⚙️',
    color: COLORS.warning,
    description: 'Industriel, transport, infrastructure...',
  },
  {
    value: RiskCategory.SANITAIRE,
    label: 'Sanitaire',
    icon: '🏥',
    color: COLORS.danger,
    description: 'Épidémie, contamination...',
  },
  {
    value: RiskCategory.SOCIAL,
    label: 'Social',
    icon: '👥',
    color: COLORS.secondary,
    description: 'Manifestation, émeute...',
  },
];

// Sévérités de risques
export const RISK_SEVERITIES = [
  {
    value: RiskSeverity.FAIBLE,
    label: 'Faible',
    icon: '🟢',
    color: COLORS.success,
    bgColor: '#dcfce7',  // green-100
  },
  {
    value: RiskSeverity.MODERE,
    label: 'Modéré',
    icon: '🟡',
    color: COLORS.warning,
    bgColor: '#fef3c7',  // yellow-100
  },
  {
    value: RiskSeverity.ELEVE,
    label: 'Élevé',
    icon: '🟠',
    color: COLORS.danger,
    bgColor: '#fee2e2',  // red-100
  },
  {
    value: RiskSeverity.CRITIQUE,
    label: 'Critique',
    icon: '🔴',
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
