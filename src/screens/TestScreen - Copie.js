// Juste après les imports, ajoutez :
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { locationService } from '../services/locationService';
import { notificationService } from '../services/notificationService';
import { COLORS } from '../utils/constants';

export default function TestScreen() {
  const [isTracking, setIsTracking] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentPosition, setCurrentPosition] = useState(null);
  const [permissions, setPermissions] = useState({
    foreground: 'undetermined',
    background: 'undetermined',
    canStartTracking: false,
  });
  const [tourneeType, setTourneeType] = useState('');

  useEffect(() => {
    initializeScreen();
  }, []);

const initializeScreen = async () => {
  try {
    console.log('🔧 1. Initialisation notifications...');
    await notificationService.initialize();
    
    console.log('🔧 2. Vérification permissions...');
    await checkPermissions();
    
    console.log('🔧 3. Obtention position GPS...');
    updateCurrentLocation().catch(e => console.log('⚠️ Position non disponible:', e.message));
    
    console.log('✅ Initialisation terminée');
  } catch (error) {
    console.error('❌ Erreur initialisation:', error);
  }
};

const checkPermissions = async () => {
  try {
    console.log('🔍 Appel locationService.checkPermissions...');
    const perms = await locationService.checkPermissions();
    console.log('🔍 Permissions reçues:', perms);
    setPermissions(perms);
    setIsTracking(perms.isTracking);
  } catch (error) {
    console.error('❌ Error checking permissions:', error);
  }
};

const updateCurrentLocation = async () => {
  try {
    console.log('📍 Appel getCurrentPosition...');
    const position = await locationService.getCurrentPosition();
    
    if (position) {
      console.log('📍 Position reçue:', position);
      setCurrentPosition(position);
    } else {
      console.log('⚠️ Position null reçue');
      setCurrentPosition(null);
    }
  } catch (error) {
    console.log('⚠️ Erreur position:', error?.message || error);
    setCurrentPosition(null);
  }
};

  const handleRequestForegroundPermission = async () => {
    setLoading(true);
    try {
      await locationService.requestForegroundPermission();
      await checkPermissions();
      Alert.alert('✅ Permission accordée', 'Permission de localisation obtenue');
    } catch (error) {
      Alert.alert('❌ Erreur', 'Impossible d\'obtenir la permission');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestBackgroundPermission = async () => {
    setLoading(true);
    try {
      await locationService.requestBackgroundPermission();
      await checkPermissions();
      Alert.alert('✅ Permission accordée', 'Permission arrière-plan obtenue');
    } catch (error) {
      Alert.alert('❌ Erreur', 'Impossible d\'obtenir la permission');
    } finally {
      setLoading(false);
    }
  };

  const handleStartTracking = async () => {
    if (!tourneeType) {
      Alert.alert('Type de tournée requis', 'Sélectionnez un type de tournée');
      return;
    }

    setLoading(true);
    try {
      await locationService.startBackgroundLocationTracking(tourneeType);
      setIsTracking(true);
      Alert.alert(
        '✅ Tracking activé',
        `Mode: ${getTourneeLabel(tourneeType)}\n\n⚠️ Version temporaire\nNe survit pas en arrière-plan`
      );
    } catch (error) {
      Alert.alert('❌ Erreur', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStopTracking = async () => {
    setLoading(true);
    try {
      await locationService.stopBackgroundLocationTracking();
      setIsTracking(false);
      Alert.alert('✅ Tracking arrêté');
    } catch (error) {
      Alert.alert('❌ Erreur');
    } finally {
      setLoading(false);
    }
  };

  const getTourneeLabel = (type) => {
    switch (type) {
      case 'pieds': return 'À pieds';
      case 'velo': return 'À vélo';
      case 'voiture': return 'En voiture';
      default: return '';
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        
        <View style={[
          styles.statusCard,
          isTracking ? styles.statusCardActive : styles.statusCardInactive
        ]}>
          <Text style={styles.statusIcon}>
            {isTracking ? '🟢' : '🔴'}
          </Text>
          <Text style={styles.statusTitle}>
            {isTracking ? 'Tracking Actif' : 'Tracking Inactif'}
          </Text>
          <Text style={styles.warningText}>
            ⚠️ Version temporaire - Ne survit pas en arrière-plan
          </Text>
        </View>

        {currentPosition && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>📍 Position actuelle</Text>
            <Text style={styles.text}>
              Lat: {currentPosition.latitude.toFixed(6)}
            </Text>
            <Text style={styles.text}>
              Lon: {currentPosition.longitude.toFixed(6)}
            </Text>
            <TouchableOpacity
              style={styles.button}
              onPress={updateCurrentLocation}
            >
              <Text style={styles.buttonText}>🔄 Rafraîchir</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>🔐 Permissions</Text>
          
          <View style={styles.permRow}>
            <Text style={styles.permLabel}>Foreground:</Text>
            <Text style={[
              styles.permStatus,
              { color: permissions.foreground === 'granted' ? COLORS.success : COLORS.danger }
            ]}>
              {permissions.foreground === 'granted' ? '✅' : '❌'} {permissions.foreground}
            </Text>
          </View>
          
          {permissions.foreground !== 'granted' && (
            <TouchableOpacity
              style={styles.button}
              onPress={handleRequestForegroundPermission}
              disabled={loading}
            >
              <Text style={styles.buttonText}>Autoriser Foreground</Text>
            </TouchableOpacity>
          )}

          <View style={styles.permRow}>
            <Text style={styles.permLabel}>Background:</Text>
            <Text style={[
              styles.permStatus,
              { color: permissions.background === 'granted' ? COLORS.success : COLORS.danger }
            ]}>
              {permissions.background === 'granted' ? '✅' : '❌'} {permissions.background}
            </Text>
          </View>

          {permissions.background !== 'granted' && permissions.foreground === 'granted' && (
            <TouchableOpacity
              style={styles.button}
              onPress={handleRequestBackgroundPermission}
              disabled={loading}
            >
              <Text style={styles.buttonText}>Autoriser Background</Text>
            </TouchableOpacity>
          )}
        </View>

        {!isTracking && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>🚶 Type de tournée</Text>
            
            <TouchableOpacity
              style={[styles.tourneeButton, tourneeType === 'pieds' && styles.tourneeButtonSelected]}
              onPress={() => setTourneeType('pieds')}
            >
              <Text style={styles.tourneeButtonText}>🚶 À pieds</Text>
              <Text style={styles.tourneeButtonSubtext}>Rayon: 50m • 5 min</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tourneeButton, tourneeType === 'velo' && styles.tourneeButtonSelected]}
              onPress={() => setTourneeType('velo')}
            >
              <Text style={styles.tourneeButtonText}>🚴 À vélo</Text>
              <Text style={styles.tourneeButtonSubtext}>Rayon: 100m • 3 min</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tourneeButton, tourneeType === 'voiture' && styles.tourneeButtonSelected]}
              onPress={() => setTourneeType('voiture')}
            >
              <Text style={styles.tourneeButtonText}>🚗 En voiture</Text>
              <Text style={styles.tourneeButtonSubtext}>Rayon: 200m • 2 min</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>🧪 Tests</Text>
          
          <TouchableOpacity
            style={[styles.button, { backgroundColor: COLORS.warning }]}
            onPress={() => notificationService.sendTestNotification()}
          >
            <Text style={styles.buttonText}>🔊 Test Notification</Text>
          </TouchableOpacity>
        </View>

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
  warningText: { fontSize: 12, color: COLORS.warning, marginTop: 10, textAlign: 'center' },
  card: { backgroundColor: '#fff', padding: 20, borderRadius: 15, marginBottom: 15 },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.text, marginBottom: 15 },
  text: { fontSize: 14, color: COLORS.text, marginBottom: 5 },
  button: { backgroundColor: COLORS.secondary, padding: 12, borderRadius: 8, marginTop: 10, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: 'bold' },
  permRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 },
  permLabel: { fontSize: 14, fontWeight: '500' },
  permStatus: { fontSize: 14, fontWeight: 'bold' },
  tourneeButton: { backgroundColor: COLORS.background, padding: 15, borderRadius: 10, marginBottom: 10, borderWidth: 2, borderColor: COLORS.border },
  tourneeButtonSelected: { backgroundColor: '#E0F2FE', borderColor: COLORS.secondary },
  tourneeButtonText: { fontSize: 16, fontWeight: 'bold', marginBottom: 5 },
  tourneeButtonSubtext: { fontSize: 12, color: COLORS.textLight },
  mainButton: { padding: 20, borderRadius: 15, alignItems: 'center', marginTop: 10, marginBottom: 30 },
  mainButtonStart: { backgroundColor: COLORS.success },
  mainButtonStop: { backgroundColor: COLORS.danger },
  mainButtonDisabled: { backgroundColor: COLORS.disabled },
  mainButtonIcon: { fontSize: 40, marginBottom: 10 },
  mainButtonText: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
});