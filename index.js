/**
 * @format
 */

import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';
import notifee, { EventType } from '@notifee/react-native';
import { locationBackgroundTask } from './src/services/locationBackgroundTask';

// Enregistrer l'app principale
AppRegistry.registerComponent(appName, () => App);

// Enregistrer la tâche en arrière-plan (Headless JS Task)
AppRegistry.registerHeadlessTask('LocationTracking', () => locationBackgroundTask);

// ✅ Handler obligatoire pour les événements notifee en background
// Sans cela, notifee affiche un warning et les actions sur notifications ne fonctionnent pas
notifee.onBackgroundEvent(async ({ type, detail }) => {
  const { notification, pressAction } = detail;

  if (type === EventType.PRESS) {
    // Utilisateur a appuyé sur la notification
    console.log('[Notifee] Notification appuyée en background:', notification?.id);
    // Annuler la notification après appui
    if (notification?.id) {
      await notifee.cancelNotification(notification.id);
    }
  }

  if (type === EventType.ACTION_PRESS) {
    console.log('[Notifee] Action appuyée:', pressAction?.id);
  }
});