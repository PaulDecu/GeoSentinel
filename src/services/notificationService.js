// services/notificationService.js
// VERSION React Native CLI avec @notifee/react-native
import notifee, { AndroidImportance, AndroidVisibility } from '@notifee/react-native';
import { Platform } from 'react-native';

const CHANNEL_ID = 'risk-alerts-final';

export const notificationService = {
  // ✅ Nettoyer les anciens canaux
  cleanupOldChannels: async () => {
    if (Platform.OS === 'android') {
      console.log('🧹 Nettoyage des anciens canaux...');
      
      const oldChannels = [
        'risk-alerts',
        'risk-alerts-v2',
        'risk-alerts-v3',
        'risk-alerts-v4',
        'risk-alerts-lockscreen',
        'default',
      ];

      for (const channelId of oldChannels) {
        try {
          await notifee.deleteChannel(channelId);
          console.log(`  ✅ Canal supprimé: ${channelId}`);
        } catch (e) {
          console.log(`  ⚠️ Canal n'existe pas: ${channelId}`);
        }
      }
      
      console.log('✅ Nettoyage terminé');
    }
  },

  // ✅ Initialiser le service
  initialize: async () => {
    try {
      console.log('🔔 Initialisation du service de notifications...');
      
      // ✅ 1. Nettoyer les anciens canaux
      await notificationService.cleanupOldChannels();
      
      // ✅ 2. Demander les permissions
      const settings = await notifee.requestPermission();
      
      if (settings.authorizationStatus < 1) {
        console.log('❌ Permission de notification refusée');
        return false;
      }

      console.log('✅ Permissions notifications accordées');

      // ✅ 3. Créer le canal Android
      if (Platform.OS === 'android') {
        console.log('📱 Configuration canal Android...');
        
        await notifee.createChannel({
          id: CHANNEL_ID,
          name: '🚨 Alertes de Risques',
          description: 'Notifications pour les risques à proximité',
          importance: AndroidImportance.HIGH,
          vibration: true,
          vibrationPattern: [300, 500],
          sound: 'default',
          lights: true,
          lightColor: '#FF0000',
          badge: true,
          visibility: AndroidVisibility.PUBLIC,
        });

        console.log(`✅ Canal créé: ${CHANNEL_ID}`);
      }

      console.log('✅ Service de notifications initialisé avec succès');
      return true;
    } catch (error) {
      console.error('❌ Erreur initialisation notifications:', error);
      return false;
    }
  },

  // ✅ Envoyer une alerte de risque
  sendRiskAlert: async (risque, distance) => {
    try {
      console.log(`🚨 Envoi alerte: ${risque.type_risque} à ${distance}m`);

      const riskTypeLabel = getRiskTypeLabel(risque.type_risque);
      
      await notifee.displayNotification({
        title: `⚠️ ${riskTypeLabel} à proximité !`,
        body: `📍 ${risque.adresse || 'Localisation inconnue'}\n📏 Distance: ${distance}m`,
        data: { 
          risqueId: String(risque.id),
          typeRisque: risque.type_risque,
          distance: String(distance),
          adresse: risque.adresse || '',
        },
        android: {
          channelId: CHANNEL_ID,
          importance: AndroidImportance.HIGH,
          pressAction: {
            id: 'default',
          },
          sound: 'default',
          vibrationPattern: [300, 500],
          lightUpScreen: true,
          category: 'alarm',
          showTimestamp: true,
          color: '#FF0000',
          smallIcon: 'ic_notification', // Assurez-vous d'avoir cette icône
        },
        ios: {
          sound: 'default',
          criticalVolume: 1.0,
          foregroundPresentationOptions: {
            alert: true,
            badge: true,
            sound: true,
          },
        },
      });

      console.log(' Alerte envoyée avec son');
      return true;
    } catch (error) {
      console.error(' Erreur envoi alerte:', error);
      return false;
    }
  },

  // Envoyer une notification simple
  sendNotification: async (title, body, data = {}) => {
    try {
      await notifee.displayNotification({
        title,
        body,
        data,
        android: {
          channelId: CHANNEL_ID,
          sound: 'default',
          pressAction: {
            id: 'default',
          },
        },
        ios: {
          sound: 'default',
        },
      });
      return true;
    } catch (error) {
      console.error('Erreur envoi notification:', error);
      return false;
    }
  },

  // Vérifier les permissions
  checkPermissions: async () => {
    try {
      const settings = await notifee.getNotificationSettings();
      const granted = settings.authorizationStatus >= 1;
      console.log('🔍 Permissions notifications:', granted);
      return granted;
    } catch (error) {
      console.error('Erreur vérification permissions:', error);
      return false;
    }
  },

  // Demander les permissions
  requestPermissions: async () => {
    try {
      const settings = await notifee.requestPermission();
      return settings.authorizationStatus >= 1;
    } catch (error) {
      console.error('Erreur demande permissions:', error);
      return false;
    }
  },

  // Annuler toutes les notifications
  cancelAllNotifications: async () => {
    try {
      await notifee.cancelAllNotifications();
      console.log('✅ Toutes les notifications annulées');
    } catch (error) {
      console.error('Erreur annulation notifications:', error);
    }
  },

  // ✅ Tester une notification
  sendTestNotification: async () => {
    try {
      console.log('🧪 Envoi notification de test avec SON...');
      
      await notifee.displayNotification({
        title: '🔊 Test de Son',
        body: 'Si tu entends cette notification, le son fonctionne !',
        data: { test: 'true' },
        android: {
          channelId: CHANNEL_ID,
          importance: AndroidImportance.HIGH,
          sound: 'default',
          vibrationPattern: [300, 500],
          pressAction: {
            id: 'default',
          },
        },
        ios: {
          sound: 'default',
        },
      });
      
      console.log('✅ Notification de test envoyée');
      return true;
    } catch (error) {
      console.error('❌ Erreur test notification:', error);
      return false;
    }
  },

  // Lister les canaux (debug)
  listChannels: async () => {
    if (Platform.OS === 'android') {
      try {
        const channels = await notifee.getChannels();
        console.log('📱 Canaux existants:');
        channels.forEach(channel => {
          console.log(`  - ${channel.id}: ${channel.name}`);
        });
        return channels;
      } catch (error) {
        console.error('Erreur listing canaux:', error);
        return [];
      }
    }
    return [];
  },

  // Recréer le canal
  recreateChannel: async () => {
    if (Platform.OS === 'android') {
      console.log('🔄 Recréation complète du canal...');
      
      // Supprimer
      try {
        await notifee.deleteChannel(CHANNEL_ID);
      } catch (e) {
        // Ignoré
      }
      
      // Recréer
      await notifee.createChannel({
        id: CHANNEL_ID,
        name: '🚨 Alertes de Risques',
        description: 'Notifications pour les risques à proximité',
        importance: AndroidImportance.HIGH,
        vibration: true,
        vibrationPattern: [300, 500],
        sound: 'default',
        lights: true,
        lightColor: '#FF0000',
        badge: true,
        visibility: AndroidVisibility.PUBLIC,
      });
      
      console.log('✅ Canal recréé');
      return true;
    }
    return false;
  },
};

// Helper pour les labels
const getRiskTypeLabel = (typeRisque) => {
  const riskTypes = {
    'chien méchant': '🐕 Chien méchant',
    'point de deal': '💊 Point de deal',
    'accès dangereux': '⚠️ Accès dangereux',
    'autre risque': '⚫ Autre risque',
  };
  return riskTypes[typeRisque] || `⚠️ ${typeRisque}`;
};

export default notificationService;
export const sendRiskAlert = notificationService.sendRiskAlert;