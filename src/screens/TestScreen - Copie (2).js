// screens/TestScreen.js
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
import { risquesAPI } from '../services/api';
import { COLORS, RISK_TYPES } from '../utils/constants';

export default function TestScreen() {
  const [isTracking, setIsTracking] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentPosition, setCurrentPosition] = useState(null);
  const [nearbyRisks, setNearbyRisks] = useState([]);
  const [loadingRisks, setLoadingRisks] = useState(false);
  const [permissions, setPermissions] = useState({
    foreground: 'undetermined',
    background: 'undetermined',
    canStartTracking: false,
  });
  const [tourneeType, setTourneeType] = useState('');

  useEffect(() => {
    initializeScreen();
  }, []);

  

console.log('🚨🚨🚨 GEOLOCATION SCREEN VERSION DEBUG 2024 🚨🚨🚨');
console.log('🚨🚨🚨 SI VOUS VOYEZ CE MESSAGE = FICHIER CHARGE 🚨🚨🚨');

  const initializeScreen = async () => {
    await notificationService.initialize();
    await checkPermissions();
    await updateCurrentLocation();
  };

  const checkPermissions = async () => {
    try {
      const perms = await locationService.checkPermissions();
      setPermissions(perms);
      setIsTracking(perms.isTracking);
    } catch (error) {
      console.error('Error checking permissions:', error);
    }
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
    return R * c * 1000; // en mètres
  };

  const loadNearbyRisks = async (latitude, longitude) => {
    try {
      setLoadingRisks(true);
      const response = await risquesAPI.nearby_V2(latitude, longitude, 3); // 3km de rayon
      
      if (response.success && response.risques) {
        // Calculer la distance et filtrer ceux dans les 100m
        const risksWithDistance = response.risques
          .map(risque => ({
            ...risque,
            distance: calculateDistance(latitude, longitude, risque.latitude, risque.longitude)
          }))
          .filter(risque => risque.distance <= 100) // <= 100 mètres
          .sort((a, b) => a.distance - b.distance); // Trier par distance
        
        setNearbyRisks(risksWithDistance);
        console.log(`📍 ${risksWithDistance.length} risques détectés dans 100m`);
      }
    } catch (error) {
      console.error('Erreur chargement risques:', error);
    } finally {
      setLoadingRisks(false);
    }
  };

  const updateCurrentLocation = async () => {
    try {
      const position = await locationService.getCurrentPosition();
      setCurrentPosition(position);
      
      // Charger les risques à proximité
      if (position) {
        await loadNearbyRisks(position.latitude, position.longitude);
      }
    } catch (error) {
      console.log('Cannot get position');
      setCurrentPosition(null);
      setNearbyRisks([]);
    }
  };

  const getRiskIcon = (typeRisque) => {
    const risk = RISK_TYPES.find(r => r.value === typeRisque);
    return risk ? risk.icon : '⚠️';
  };

  const getRiskColor = (typeRisque) => {
    const risk = RISK_TYPES.find(r => r.value === typeRisque);
    return risk ? risk.color : COLORS.danger;
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
        `Mode: ${getTourneeLabel(tourneeType)}\n\n🛡️ Service natif Android\nSurvie illimitée en arrière-plan`
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
      setNearbyRisks([]);
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
          {isTracking && (
            <Text style={styles.activeText}>
              🛡️ Service natif Android - Notification permanente
            </Text>
          )}
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
              disabled={loadingRisks}
            >
              {loadingRisks ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.buttonText}>🔄 Rafraîchir</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* SECTION RISQUES À PROXIMITÉ */}
        {currentPosition && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>⚠️ Risques à proximité (100m)</Text>
              {loadingRisks && <ActivityIndicator size="small" color={COLORS.secondary} />}
            </View>
            
            {nearbyRisks.length === 0 ? (
              <View style={styles.noRisksContainer}>
                <Text style={styles.noRisksIcon}>✅</Text>
                <Text style={styles.noRisksText}>Aucun risque détecté</Text>
              </View>
            ) : (
              <View style={styles.risksContainer}>
                {nearbyRisks.map((risque, index) => {
                  const riskColor = getRiskColor(risque.type_risque);
                  return (
                    <View 
                      key={risque.id} 
                      style={[
                        styles.riskItem,
                        { borderLeftColor: riskColor, borderLeftWidth: 4 }
                      ]}
                    >
                      <View style={styles.riskHeader}>
                        <View style={[styles.riskBadge, { backgroundColor: riskColor + '20' }]}>
                          <Text style={styles.riskIcon}>{getRiskIcon(risque.type_risque)}</Text>
                          <Text style={[styles.riskType, { color: riskColor }]}>
                            {risque.type_risque}
                          </Text>
                        </View>
                        <View style={styles.distanceBadge}>
                          <Text style={styles.distanceText}>
                            {Math.round(risque.distance)}m
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.riskAddress} numberOfLines={2}>
                        📍 {risque.adresse}
                      </Text>
                      {risque.commentaire && (
                        <Text style={styles.riskComment} numberOfLines={2}>
                          💬 {risque.commentaire}
                        </Text>
                      )}
                    </View>
                  );
                })}
              </View>
            )}
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
  activeText: { fontSize: 12, color: COLORS.success, marginTop: 5, textAlign: 'center', fontWeight: '600' },
  card: { backgroundColor: '#fff', padding: 20, borderRadius: 15, marginBottom: 15 },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.text, marginBottom: 15 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  text: { fontSize: 14, color: COLORS.text, marginBottom: 5 },
  button: { backgroundColor: COLORS.secondary, padding: 12, borderRadius: 8, marginTop: 10, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: 'bold' },
  
  // Section risques
  risksContainer: { gap: 10 },
  noRisksContainer: { 
    alignItems: 'center', 
    padding: 30,
    backgroundColor: COLORS.background,
    borderRadius: 10,
  },
  noRisksIcon: { fontSize: 48, marginBottom: 10 },
  noRisksText: { fontSize: 16, color: COLORS.textLight, fontWeight: '600' },
  riskItem: {
    backgroundColor: COLORS.background,
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  riskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  riskBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 5,
  },
  riskIcon: { fontSize: 20 },
  riskType: { fontSize: 14, fontWeight: 'bold' },
  distanceBadge: {
    backgroundColor: COLORS.warning + '20',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  distanceText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.warning,
  },
  riskAddress: {
    fontSize: 14,
    color: COLORS.text,
    marginBottom: 5,
  },
  riskComment: {
    fontSize: 12,
    color: COLORS.textLight,
    fontStyle: 'italic',
  },
  
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