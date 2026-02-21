/**
 * @format
 */

import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

import { locationBackgroundTask } from './src/services/locationBackgroundTask';

// Enregistrer l'app principale
AppRegistry.registerComponent(appName, () => App);

// Enregistrer la tâche en arrière-plan (Headless JS Task)
AppRegistry.registerHeadlessTask('LocationTracking', () => locationBackgroundTask);