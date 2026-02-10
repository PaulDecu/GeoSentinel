// screens/GeolocationScreen.js
// VERSION avec sélection du type de tournée
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  Linking,
  Platform,
  Button,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { locationService } from '../services/locationService';
import { risquesAPI } from '../services/api';
import { notificationService } from '../services/notificationService';
import { COLORS, LOCATION_CONFIG, RISK_TYPES } from '../utils/constants';

import * as IntentLauncher from 'expo-intent-launcher';

const MAP_RADIUS = 100;
console.log('🚨🚨🚨 GEOLOCATION SCREEN VERSION DEBUG 2024 🚨🚨🚨');
console.log('🚨🚨🚨 SI VOUS VOYEZ CE MESSAGE = FICHIER CHARGE 🚨🚨🚨');

export default function GeolocationScreen({ navigation }) {
  const [isTracking, setIsTracking] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingRisks, setLoadingRisks] = useState(false);
  const [currentPosition, setCurrentPosition] = useState(null);
  const [nearbyRisks, setNearbyRisks] = useState([]);
  const [permissions, setPermissions] = useState({
    foreground: 'undetermined',
    background: 'undetermined',
    canStartTracking: false,
  });
  const [refreshKey, setRefreshKey] = useState(0);
  const [tourneeType, setTourneeType] = useState(''); // Type de tournée

 

  useEffect(() => {
    console.log('🔄 Mount');
    initializeScreen();
    notificationService.initialize();
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      console.log('🔄 Focus');
      initializeScreen();
    });
    return unsubscribe;
  }, [navigation]);

  const initializeScreen = async () => {
    await refreshStatus();
    await loadTourneeType(); // Charger le type de tournée sauvegardé
  };

  const loadTourneeType = async () => {
    try {
      const savedType = await AsyncStorage.getItem('tourneeType');
      if (savedType) {
        setTourneeType(savedType);
        console.log('📖 Type de tournée chargé:', savedType);
      }
    } catch (error) {
      console.error('Erreur chargement tourneeType:', error);
    }
  };

  const refreshStatus = async () => {
    await checkPermissions();
    await checkTrackingStatus();
    await updateCurrentLocation();
  };

  const checkPermissions = async () => {
    try {
      const perms = await locationService.checkPermissions();
      setPermissions(perms);
    } catch (error) {
      console.error('Error checking permissions:', error);
    }
  };

  const checkTrackingStatus = async () => {
    try {
      const isActive = await locationService.isTrackingActive();
      setIsTracking(isActive);
    } catch (error) {
      console.error('Error checking tracking:', error);
    }
  };

  const updateCurrentLocation = async () => {
    try {
      const position = await locationService.getCurrentPosition();
      setCurrentPosition(position);
      
      if (position) {
        await fetchNearbyRisks(position.latitude, position.longitude);
      }
    } catch (error) {
      console.log('Cannot get position');
      setCurrentPosition(null);
    }
  };

  const fetchNearbyRisks = async (latitude, longitude) => {
    setLoadingRisks(true);
    try {
      const response = await risquesAPI.nearby(
        latitude,
        longitude,
        MAP_RADIUS / 1000
      );
      
      if (response.success) {
        setNearbyRisks(response.risques || []);
      }
    } catch (error) {
      console.error('Error fetching risks:', error);
    } finally {
      setLoadingRisks(false);
    }
  };

  const openSettings = () => {
    if (Platform.OS === 'ios') {
      Linking.openURL('app-settings:');
    } else {
      Linking.openSettings();
    }
  };

  const openBatteryOptimizationSettings = async () => {
    if (Platform.OS === 'android') {
      Alert.alert(
        "⚡ Configuration Samsung/Android CRITIQUE",
        "Samsung/Android tue l'app après quelques minutes. Vous DEVEZ :\n\n" +
        "📱 SAMSUNG (One UI) - OBLIGATOIRE:\n" +
        "1. Paramètres > Entretien batterie\n" +
        "2. Batterie > Limites d'utilisation en arrière-plan\n" +
        "3. Apps jamais mises en veille → Ajouter 'Gestion Risques'\n" +
        "4. Revenir > Applications > Gestion Risques\n" +
        "5. Batterie > Non restreinte\n" +
        "6. Autoriser activité en arrière-plan: ON\n\n" +
        "📱 ANDROID STANDARD:\n" +
        "1. Paramètres > Applications > Gestion Risques\n" +
        "2. Batterie > Non restreinte\n" +
        "3. Autoriser activité en arrière-plan: ON\n\n" +
        "⚠️ Sans ces réglages, l'app sera mise en veille après 10-15 minutes !",
        [
          { text: 'Annuler', style: 'cancel' },
          { 
            text: 'Ouvrir Paramètres',
            onPress: async () => {
              try {
                // Essayer d'ouvrir directement les paramètres d'optimisation batterie
                await IntentLauncher.startActivityAsync(
                  'android.settings.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS',
                  {
                    data: 'package:com.votreboite.gestionrisques',
                  }
                );
              } catch (e) {
                console.log("Tentative paramètres app...");
                try {
                  await IntentLauncher.startActivityAsync(
                    'android.settings.APPLICATION_DETAILS_SETTINGS',
                    {
                      data: 'package:com.votreboite.gestionrisques',
                    }
                  );
                } catch (e2) {
                  console.log("Fallback paramètres généraux");
                  await Linking.openSettings();
                }
              }
            }
          }
        ]
      );
    }
  };

  const handleRequestForegroundPermission = async () => {
    console.log('👆 Foreground');
    setLoading(true);
    
    try {
      await locationService.requestForegroundPermission();
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      await refreshStatus();
      await new Promise(resolve => setTimeout(resolve, 500));
      await refreshStatus();
      await new Promise(resolve => setTimeout(resolve, 500));
      await refreshStatus();
      
      setRefreshKey(prev => prev + 1);
      setLoading(false);
      
      Alert.alert(
        '✅ Permission accordée',
        'Vous pouvez maintenant demander la permission d\'arrière-plan.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      setLoading(false);
      console.error('Error:', error);
      
      Alert.alert(
        'Permission requise',
        'Veuillez autoriser l\'accès à votre localisation.',
        [
          { text: 'Annuler', style: 'cancel' },
          { text: 'Paramètres', onPress: openSettings }
        ]
      );
    }
  };

  const handleRequestBackgroundPermission = async () => {
    if (Platform.OS === 'android') {
      Alert.alert(
        '📍 Permission arrière-plan',
        'Android 11+ nécessite 2 étapes :\n\n' +
        '1️⃣ D\'abord, autorisez la localisation\n' +
        '2️⃣ Ensuite, dans les paramètres qui vont s\'ouvrir, sélectionnez "Autoriser tout le temps"\n\n' +
        'Appuyez sur "Continuer" pour commencer.',
        [
          { text: 'Annuler', style: 'cancel' },
          { 
            text: 'Continuer', 
            onPress: async () => {
              await attemptBackgroundPermission();
            }
          }
        ]
      );
    } else {
      await attemptBackgroundPermission();
    }
  };

  const attemptBackgroundPermission = async () => {
    setLoading(true);
    
    try {
      await locationService.requestBackgroundPermission();
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      await refreshStatus();
      await new Promise(resolve => setTimeout(resolve, 500));
      await refreshStatus();
      await new Promise(resolve => setTimeout(resolve, 500));
      const perms = await locationService.checkPermissions();
      
      setLoading(false);
      
      if (perms.background === 'granted') {
        Alert.alert(
          '✅ Permission accordée',
          'Vous pouvez maintenant démarrer la surveillance !',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert(
          '⚙️ Étape supplémentaire requise',
          'Sur Android 11+, vous devez maintenant :\n\n' +
          '1. Aller dans les Paramètres\n' +
          '2. Trouver "Gestion Risques"\n' +
          '3. Aller dans Autorisations > Position\n' +
          '4. Sélectionner "Autoriser tout le temps"\n\n' +
          'Voulez-vous ouvrir les paramètres maintenant ?',
          [
            { text: 'Plus tard', style: 'cancel' },
            { 
              text: 'Ouvrir les paramètres', 
              onPress: async () => {
                openSettings();
                setTimeout(() => {
                  Alert.alert(
                    '🔄 Vérification',
                    'Avez-vous sélectionné "Autoriser tout le temps" ?',
                    [
                      { text: 'Pas encore', style: 'cancel' },
                      { 
                        text: 'Oui, vérifier', 
                        onPress: async () => {
                          await refreshStatus();
                          setRefreshKey(prev => prev + 1);
                        }
                      }
                    ]
                  );
                }, 3000);
              }
            }
          ]
        );
      }
      
      setRefreshKey(prev => prev + 1);
    } catch (error) {
      setLoading(false);
      console.error('Error:', error);
      
      if (error.message === 'FOREGROUND_REQUIRED_FIRST') {
        Alert.alert(
          'Permission manquante',
          'Accordez d\'abord la permission de base.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert(
          'Permission arrière-plan',
          'Pour activer la surveillance en arrière-plan, vous devez sélectionner "Autoriser tout le temps" dans les paramètres.\n\nVoulez-vous ouvrir les paramètres ?',
          [
            { text: 'Annuler', style: 'cancel' },
            { text: 'Paramètres', onPress: openSettings }
          ]
        );
      }
    }
  };

  const handleStartTracking = async () => {
    // Validation du type de tournée
    if (!tourneeType) {
      Alert.alert(
        'Type de tournée requis',
        'Veuillez sélectionner un type de tournée avant de démarrer.',
        [{ text: 'OK' }]
      );
      return;
    }

    setLoading(true);
    try {
      console.log('🚀 Démarrage avec type de tournée:', tourneeType);
      await locationService.startBackgroundLocationTracking(tourneeType);
      setIsTracking(true);
      await refreshStatus();
      
      const config = getTourneeConfig(tourneeType);
      Alert.alert(
        '✅ Surveillance activée',
        `Tournée ${getTourneeLabel(tourneeType)}\nAlertes dans ${config.alertRadius}m.`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Error:', error);
      
      let message = 'Impossible de démarrer.';
      let buttons = [{ text: 'OK' }];

      if (error.message === 'FOREGROUND_PERMISSION_REQUIRED') {
        message = 'Permission de base manquante.';
        buttons = [
          { text: 'Annuler', style: 'cancel' },
          { text: 'Autoriser', onPress: handleRequestForegroundPermission }
        ];
      } else if (error.message === 'BACKGROUND_PERMISSION_REQUIRED') {
        message = 'Permission arrière-plan manquante. Vous devez sélectionner "Autoriser tout le temps" dans les paramètres.';
        buttons = [
          { text: 'Annuler', style: 'cancel' },
          { text: 'Paramètres', onPress: openSettings }
        ];
      }

      Alert.alert('Erreur', message, buttons);
    } finally {
      setLoading(false);
    }
  };

  const handleStopTracking = async () => {
    Alert.alert(
      '🛑 Arrêter',
      'Arrêter la surveillance ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Arrêter',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              await locationService.stopBackgroundLocationTracking();
              setIsTracking(false);
              setTourneeType(''); // Réinitialiser le type de tournée
              Alert.alert('✅ Arrêtée');
            } catch (error) {
              Alert.alert('Erreur');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const getTourneeLabel = (type) => {
    switch (type) {
      case 'pieds': return 'À pieds';
      case 'velo': return 'À vélo';
      case 'voiture': return 'En voiture';
      default: return '';
    }
  };

  const getTourneeConfig = (type) => {
    switch (type) {
      case 'pieds':
        return { alertRadius: 50, apiInterval: 5, timeInterval: 30, distanceInterval: 30 };
      case 'velo':
        return { alertRadius: 100, apiInterval: 3, timeInterval: 20, distanceInterval: 10 };
      case 'voiture':
        return { alertRadius: 200, apiInterval: 2, timeInterval: 10, distanceInterval: 10 };
      default:
        return { alertRadius: 100, apiInterval: 3, timeInterval: 10, distanceInterval: 10 };
    }
  };

  const getRiskIcon = (typeRisque) => {
    const riskType = RISK_TYPES.find(r => r.value === typeRisque);
    return riskType?.icon || '❗';
  };

  const getRiskColor = (typeRisque) => {
    const riskType = RISK_TYPES.find(r => r.value === typeRisque);
    return riskType?.color || COLORS.danger;
  };

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) *
      Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c * 1000);
  };

  const gpsOk = currentPosition !== null;
  
  // Détecter si on est dans Expo Go
  const isExpoGo = Constants.appOwnership === 'expo';

  return (
    <ScrollView style={styles.container} key={refreshKey}>
      <View style={styles.content}>
        
        {/* Statut */}
        <View style={[
          styles.statusCard,
          isTracking ? styles.statusCardActive : styles.statusCardInactive
        ]}>
          <Text style={styles.statusIcon}>
            {isTracking ? '🟢' : '🔴'}
          </Text>
          <Text style={styles.statusTitle}>
            {isTracking ? 'Surveillance Active' : 'Surveillance Inactive'}
          </Text>
          <Text style={styles.statusDescription}>
            {isTracking
              ? (tourneeType ? `Tournée ${getTourneeLabel(tourneeType)} en cours` : 'Surveillance en cours')
              : 'Configurez pour activer'
            }
          </Text>
        </View>

        {/* Position */}
        {currentPosition && (
          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>📍 Position actuelle</Text>
            <Text style={styles.infoText}>
              Lat: {currentPosition.latitude.toFixed(6)}
            </Text>
            <Text style={styles.infoText}>
              Lon: {currentPosition.longitude.toFixed(6)}
            </Text>
            <View style={styles.successBadge}>
              <Text style={styles.successText}>✅ GPS fonctionne</Text>
            </View>
            <TouchableOpacity
              style={styles.refreshButton}
              onPress={async () => {
                await updateCurrentLocation();
                await refreshStatus();
              }}
            >
              <Text style={styles.refreshButtonText}>🔄 Rafraîchir</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Configuration */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>🔐 Configuration</Text>
          
          {/* GPS */}
          <View style={styles.permRow}>
            <View style={styles.permInfo}>
              <Text style={styles.permLabel}>GPS</Text>
              <Text style={[
                styles.permStatus,
                { color: gpsOk ? COLORS.success : COLORS.danger }
              ]}>
                {gpsOk ? '✅ Fonctionne' : '❌ Pas de position'}
              </Text>
            </View>
            {!gpsOk && (
              <TouchableOpacity style={styles.permButton} onPress={openSettings}>
                <Text style={styles.permButtonText}>Activer</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Permission de base */}
          <View style={styles.permRow}>
            <View style={styles.permInfo}>
              <Text style={styles.permLabel}>Permission de base</Text>
              <Text style={[
                styles.permStatus,
                { color: permissions.foreground === 'granted' ? COLORS.success : COLORS.danger }
              ]}>
                {permissions.foreground === 'granted' ? '✅ Accordée' : '❌ Non accordée'}
              </Text>
              <Text style={{ fontSize: 10, color: '#999' }}>
                Status: {permissions.foreground}
              </Text>
            </View>
            {permissions.foreground !== 'granted' && (
              <TouchableOpacity 
                style={styles.permButton} 
                onPress={handleRequestForegroundPermission}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.permButtonText}>Autoriser</Text>
                )}
              </TouchableOpacity>
            )}
          </View>

          {/* Permission arrière-plan */}
          <View style={styles.permRow}>
            <View style={styles.permInfo}>
              <Text style={styles.permLabel}>Permission arrière-plan</Text>
              <Text style={[
                styles.permStatus,
                { color: permissions.background === 'granted' ? COLORS.success : COLORS.danger }
              ]}>
                {permissions.background === 'granted' ? '✅ Accordée' : '❌ Non accordée'}
              </Text>
              <Text style={{ fontSize: 10, color: '#999' }}>
                Status: {permissions.background}
              </Text>
            </View>
            {permissions.background !== 'granted' && (
              <TouchableOpacity 
                style={[
                  styles.permButton,
                  permissions.foreground !== 'granted' && styles.permButtonDisabled
                ]}
                onPress={handleRequestBackgroundPermission}
                disabled={loading || permissions.foreground !== 'granted'}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.permButtonText}>Autoriser</Text>
                )}
              </TouchableOpacity>
            )}
          </View>

          {/* Aide */}
          {permissions.foreground !== 'granted' && (
            <View style={styles.helpBox}>
              <Text style={styles.helpText}>
                💡 Accordez d'abord la permission de base
              </Text>
            </View>
          )}
          
          {permissions.foreground === 'granted' && permissions.background !== 'granted' && (
            <View style={styles.helpBox}>
              <Text style={styles.helpText}>
                💡 Sur Android 11+, après avoir cliqué sur "Autoriser", vous devrez aller dans les Paramètres pour sélectionner "Autoriser tout le temps"
              </Text>
            </View>
          )}

          <Button 
            title="🔊 Test Son" 
            onPress={async () => {
              await notificationService.sendTestNotification();
            }}
          />

          {/* Bouton de refresh manuel */}
          <TouchableOpacity
            style={[styles.refreshButton, { marginTop: 15 }]}
            onPress={async () => {
              await refreshStatus();
              setRefreshKey(prev => prev + 1);
            }}
          >
            <Text style={styles.refreshButtonText}>🔄 Forcer le rafraîchissement</Text>
          </TouchableOpacity>

          {/* Bouton optimisation batterie (Android uniquement, pas dans Expo Go) */}
          {Platform.OS === 'android' && !isExpoGo && (
            <TouchableOpacity
              style={[styles.refreshButton, { marginTop: 10, backgroundColor: '#F59E0B' }]}
              onPress={openBatteryOptimizationSettings}
            >
              <Text style={styles.refreshButtonText}>⚡ Optimisation Batterie</Text>
            </TouchableOpacity>
          )}
          
          {/* Message informatif pour Expo Go */}
          {Platform.OS === 'android' && isExpoGo && (
            <View style={[styles.helpBox, { marginTop: 10, backgroundColor: '#DBEAFE' }]}>
              <Text style={styles.helpText}>
                💡 L'optimisation batterie se configure manuellement dans les Paramètres Android (cette fonction nécessite un development build)
              </Text>
            </View>
          )}
        </View>

        {/* Risques */}
        <View style={styles.infoCard}>
          <View style={styles.headerRow}>
            <Text style={styles.infoTitle}>⚠️ Risques ({MAP_RADIUS}m)</Text>
            <TouchableOpacity
              onPress={() => currentPosition && fetchNearbyRisks(currentPosition.latitude, currentPosition.longitude)}
            >
              <Text style={styles.refreshIcon}>🔄</Text>
            </TouchableOpacity>
          </View>
          
          {loadingRisks ? (
            <ActivityIndicator />
          ) : nearbyRisks.length > 0 ? (
            <>
              <Text style={styles.riskCount}>
                {nearbyRisks.length} risque{nearbyRisks.length > 1 ? 's' : ''}
              </Text>
              {nearbyRisks.map((risque, index) => {
                const distance = currentPosition
                  ? calculateDistance(
                      currentPosition.latitude,
                      currentPosition.longitude,
                      risque.latitude,
                      risque.longitude
                    )
                  : 0;

                return (
                  <View
                    key={index}
                    style={[
                      styles.riskItem,
                      { borderLeftColor: getRiskColor(risque.type_risque) }
                    ]}
                  >
                    <View style={styles.riskHeader}>
                      <Text style={styles.riskIcon}>{getRiskIcon(risque.type_risque)}</Text>
                      <Text style={styles.riskType}>{risque.type_risque}</Text>
                    </View>
                    <Text style={styles.riskAddress}>{risque.adresse || 'GPS'}</Text>
                    <Text style={styles.riskDistance}>📍 {distance}m</Text>
                    {risque.commentaire && (
                      <Text style={styles.riskComment}>"{risque.commentaire}"</Text>
                    )}
                  </View>
                );
              })}
            </>
          ) : (
            <Text style={styles.noRisks}>✅ Aucun risque</Text>
          )}
        </View>

        {/* Sélection du type de tournée */}
        {!isTracking && (
          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>🚶 Type de tournée</Text>
            <Text style={styles.tourneeDescription}>
              Sélectionnez le mode de déplacement
            </Text>
            
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={tourneeType}
                onValueChange={(itemValue) => setTourneeType(itemValue)}
                style={styles.picker}
              >
                <Picker.Item label="-- Sélectionnez --" value="" />
                <Picker.Item label="🚶 À pieds" value="pieds" />
                <Picker.Item label="🚴 À vélo" value="velo" />
                <Picker.Item label="🚗 En voiture" value="voiture" />
              </Picker>
            </View>

            {tourneeType && (
              <View style={styles.tourneeInfoBox}>
                <Text style={styles.tourneeInfoTitle}>
                  Configuration "{getTourneeLabel(tourneeType)}"
                </Text>
                {tourneeType === 'pieds' && (
                  <>
                    <Text style={styles.tourneeInfoText}>• Rayon d'alerte : 50m</Text>
                    <Text style={styles.tourneeInfoText}>• Mise à jour GPS : 30s</Text>
                    <Text style={styles.tourneeInfoText}>• Rafraîchissement API : 5 min</Text>
                  </>
                )}
                {tourneeType === 'velo' && (
                  <>
                    <Text style={styles.tourneeInfoText}>• Rayon d'alerte : 100m</Text>
                    <Text style={styles.tourneeInfoText}>• Mise à jour GPS : 20s</Text>
                    <Text style={styles.tourneeInfoText}>• Rafraîchissement API : 3 min</Text>
                  </>
                )}
                {tourneeType === 'voiture' && (
                  <>
                    <Text style={styles.tourneeInfoText}>• Rayon d'alerte : 200m</Text>
                    <Text style={styles.tourneeInfoText}>• Mise à jour GPS : 10s</Text>
                    <Text style={styles.tourneeInfoText}>• Rafraîchissement API : 2 min</Text>
                  </>
                )}
              </View>
            )}
          </View>
        )}

        {/* Affichage du type actif */}
        {isTracking && tourneeType && (
          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>🚶 Tournée en cours</Text>
            <View style={styles.activeTourneeBox}>
              <Text style={styles.activeTourneeText}>
                {getTourneeLabel(tourneeType)}
              </Text>
            </View>
          </View>
        )}

        {/* Bouton principal */}
        <TouchableOpacity
          style={[
            styles.mainButton,
            isTracking ? styles.mainButtonStop : 
            (permissions.canStartTracking && tourneeType) ? styles.mainButtonStart : 
            styles.mainButtonDisabled
          ]}
          onPress={isTracking ? handleStopTracking : handleStartTracking}
          disabled={loading || (!permissions.canStartTracking && !isTracking) || (!tourneeType && !isTracking)}
        >
          {loading ? (
            <ActivityIndicator size="large" color="#fff" />
          ) : (
            <>
              <Text style={styles.mainButtonIcon}>
                {isTracking ? '⏹️' : '▶️'}
              </Text>
              <Text style={styles.mainButtonText}>
                {isTracking ? 'Arrêter' : 'Démarrer'}
              </Text>
              {!permissions.canStartTracking && !isTracking && (
                <Text style={styles.mainButtonSubtext}>
                  (Configurez d'abord les permissions)
                </Text>
              )}
              {permissions.canStartTracking && !tourneeType && !isTracking && (
                <Text style={styles.mainButtonSubtext}>
                  (Sélectionnez un type de tournée)
                </Text>
              )}
            </>
          )}
        </TouchableOpacity>

      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 20 },
  statusCard: { padding: 30, borderRadius: 20, marginBottom: 20, alignItems: 'center' },
  statusCardActive: { backgroundColor: '#D1FAE5' },
  statusCardInactive: { backgroundColor: '#FEE2E2' },
  statusIcon: { fontSize: 60, marginBottom: 15 },
  statusTitle: { fontSize: 24, fontWeight: 'bold', color: COLORS.text, marginBottom: 10 },
  statusDescription: { fontSize: 14, color: COLORS.textLight, textAlign: 'center' },
  infoCard: { backgroundColor: '#fff', padding: 20, borderRadius: 15, marginBottom: 15 },
  infoTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.text, marginBottom: 15 },
  infoText: { fontSize: 14, color: COLORS.text, marginBottom: 5 },
  successBadge: { backgroundColor: '#D1FAE5', padding: 10, borderRadius: 8, marginTop: 10, alignItems: 'center' },
  successText: { color: COLORS.success, fontWeight: 'bold' },
  refreshButton: { backgroundColor: COLORS.secondary, padding: 12, borderRadius: 8, marginTop: 10, alignItems: 'center' },
  refreshButtonText: { color: '#fff', fontWeight: 'bold' },
  permRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  permInfo: { flex: 1 },
  permLabel: { fontSize: 14, fontWeight: '500', color: COLORS.text, marginBottom: 4 },
  permStatus: { fontSize: 13, fontWeight: 'bold' },
  permButton: { backgroundColor: COLORS.primary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, minWidth: 80, alignItems: 'center' },
  permButtonDisabled: { backgroundColor: COLORS.disabled },
  permButtonText: { color: '#fff', fontSize: 13, fontWeight: 'bold' },
  helpBox: { backgroundColor: '#FEF3C7', padding: 12, borderRadius: 8, marginTop: 12 },
  helpText: { fontSize: 12, color: COLORS.text, lineHeight: 18 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  refreshIcon: { fontSize: 20 },
  riskCount: { fontSize: 14, fontWeight: 'bold', marginBottom: 10 },
  riskItem: { backgroundColor: COLORS.background, padding: 12, borderRadius: 10, marginBottom: 10, borderLeftWidth: 4 },
  riskHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 5 },
  riskIcon: { fontSize: 20, marginRight: 8 },
  riskType: { fontSize: 16, fontWeight: 'bold', textTransform: 'capitalize' },
  riskAddress: { fontSize: 14, marginBottom: 3 },
  riskDistance: { fontSize: 13, color: COLORS.textLight },
  riskComment: { fontSize: 12, fontStyle: 'italic', marginTop: 3, color: COLORS.textLight },
  noRisks: { fontSize: 14, color: COLORS.success, textAlign: 'center', padding: 15 },
  mainButton: { padding: 20, borderRadius: 15, alignItems: 'center', marginTop: 10, marginBottom: 30 },
  mainButtonStart: { backgroundColor: COLORS.success },
  mainButtonStop: { backgroundColor: COLORS.danger },
  mainButtonDisabled: { backgroundColor: COLORS.disabled },
  mainButtonIcon: { fontSize: 40, marginBottom: 10 },
  mainButtonText: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  mainButtonSubtext: { color: '#fff', fontSize: 12, marginTop: 5, opacity: 0.9 },
  
  // Styles pour la sélection de tournée
  tourneeDescription: { fontSize: 14, color: COLORS.textLight, marginBottom: 15 },
  pickerContainer: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, overflow: 'hidden', marginBottom: 15 },
  picker: { height: 50 },
  tourneeInfoBox: { backgroundColor: '#E0F2FE', padding: 15, borderRadius: 8, marginTop: 10 },
  tourneeInfoTitle: { fontSize: 15, fontWeight: 'bold', color: COLORS.text, marginBottom: 10 },
  tourneeInfoText: { fontSize: 13, color: COLORS.text, marginBottom: 5 },
  activeTourneeBox: { backgroundColor: '#D1FAE5', padding: 15, borderRadius: 8, alignItems: 'center' },
  activeTourneeText: { fontSize: 18, fontWeight: 'bold', color: COLORS.success },
});