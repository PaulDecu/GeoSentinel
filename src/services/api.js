// services/api.js
import axios from 'axios';
import { API_BASE_URL } from '../utils/constants';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

export const risquesAPI = {
  create: async (identifiant, codePostal, latitude, longitude, adresse, typeRisque, commentaire) => {
    try {
      const response = await api.post('/risques/create', {
        identifiant,
        code_postal: codePostal,
        latitude,
        longitude,
        adresse,
        type_risque: typeRisque,
        commentaire
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  list: async (identifiant, codePostal) => {
    try {
      const response = await api.get(`${API_BASE_URL}/risques/list`, {
        params: { 
          identifiant: identifiant.toUpperCase(), 
          code_postal: codePostal 
        }
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getById: async (id, identifiant) => {
    try {
      const response = await api.get(`/risques/${id}`, {
        params: { identifiant: identifiant.toUpperCase() }
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  update: async (id, identifiant, adresse, typeRisque, commentaire) => {
    try {
      const response = await api.put(`/risques/${id}`, {
        identifiant: identifiant.toUpperCase(),
        adresse,
        type_risque: typeRisque,
        commentaire
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  deleteMultiple: async (ids, identifiant) => {
    try {
      const response = await api.delete('/risques/delete-multiple', {
        data: { 
          ids, 
          identifiant: identifiant.toUpperCase() 
        }
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  delete: async (id, identifiant) => {
    try {
      const response = await api.delete(`/risques/${id}`, {
        data: { identifiant: identifiant.toUpperCase() }
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  nearby: async (latitude, longitude, radius = 0.05) => {
    try {
      const response = await api.get('/risques/nearby', {
        params: { latitude, longitude, radius }
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  nearby_V2: async (latitude, longitude, radius) => {
    try {
      const response = await api.get('/risques/nearby_V2', {
        params: { latitude, longitude, radius }
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },
};

export default api;