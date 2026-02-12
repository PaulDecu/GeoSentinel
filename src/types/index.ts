// src/types/index.ts

export enum UserRole {
  SUPERADMIN = 'superadmin',
  ADMIN = 'admin',
  GESTIONNAIRE = 'gestionnaire',
  UTILISATEUR = 'utilisateur',
}

export enum RiskCategory {
  NATUREL = 'naturel',
  TECHNOLOGIQUE = 'technologique',
  SANITAIRE = 'sanitaire',
  SOCIAL = 'social',
}

export enum RiskSeverity {
  FAIBLE = 'faible',
  MODERE = 'modéré',
  ELEVE = 'élevé',
  CRITIQUE = 'critique',
}

export interface User {
  id: string;
  email: string;
  role: UserRole;
  tenantId?: string;
  tenant?: Tenant;
  createdAt: string;
  updatedAt: string;
  lastLogin?: string;
}

export interface Tenant {
  id: string;
  publicId: string;
  companyName: string;
  contactEmail: string;
  contactPhone?: string;
  offerId: string;
  offer?: Offer;
  subscriptionStart: string;
  subscriptionEnd: string;
  createdAt: string;
  updatedAt: string;
}

export interface Offer {
  id: string;
  name: string;
  maxUsers: number;
  price: number;
  endOfSale?: string;
}

export interface Risk {
  id: string;
  title: string;
  description?: string;
  category: RiskCategory;
  severity: RiskSeverity;
  latitude: number;
  longitude: number;
  tenantId: string;
  creatorId: string;
  creatorEmail?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface ApiError {
  message: string;
  statusCode: number;
  error?: string;
}
