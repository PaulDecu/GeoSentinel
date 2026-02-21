// src/screens/GeolocationScreen.tsx
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
import AsyncStorage from '@react-native-async-storage/async-storage';
import  locationService  from '../services/locationService';
import  notificationService  from '../services/notificationService';
import  { apiClient }  from '../services/api';
import { COLORS } from '../utils/constants';

type TourneeType = 'pieds' | 'velo' | 'voiture' | '';

interface PermissionsStatus {
  foreground: 'granted' | 'denied' | 'undetermined';
  background: 'granted' | 'denied' | 'undetermined';
  isTracking: boolean;
  canStartTracking: boolean;
}

interface LocationPosition {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
}

interface RiskWithDistance {
  id: string;
  title: string;
  category: string;
  severity: string;
  latitude: number;
  longitude: number;
  distance: number;
  description?: string;
}

export default function GeolocationScreen() {
  const [isTracking, setIsTracking] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentPosition, setCurrentPosition] = useState<LocationPosition | null>(null);
  const [nearbyRisks, setNearbyRisks] = useState<RiskWithDistance[]>([]);
  const [loadingRisks, setLoadingRisks] = useState(false);
  const [permissions, setPermissions] = useState<PermissionsStatus>({
    foreground: 'undetermined',
    background: 'undetermined',
    isTracking: false,
    canStartTracking: false,
  });
  const [tourneeType, setTourneeType] = useState<TourneeType>('');
  // ... autres états
  //const [PublicnearbyRisks, setNearbyPublicRisks] = useState<RiskWithDistance[]>([]);
  const [PublicgeoRisks, setPublicGeoRisks] = useState<any[]>([]); // 👈 AJOUT
  //const [PublicloadingRisks, setLoadingPublicRisks] = useState(false);
  const [PublicloadingGeoRisks, setLoadingPublicGeoRisks] = useState(false); // 👈 AJOUT
  const [communeName, setCommuneName] = useState<string>('');
  const [notifyCommuneChange, setNotifyCommuneChange] = useState<boolean>(false);
// ...

  useEffect(() => {
    initializeScreen();
  }, []);

  const initializeScreen = async () => {
    await notificationService.initialize();
    await checkPermissions();
    await loadTourneeType();
    await updateCurrentLocation();
  };

  const loadTourneeType = async () => {
    try {
      console.log('🔍 loadTourneeType - DÉBUT');
      const savedType = await AsyncStorage.getItem('tourneeType');
      console.log('🔍 loadTourneeType - Valeur lue:', savedType);
      if (savedType) {
        setTourneeType(savedType as TourneeType);
        console.log('✅ Type de tournée chargé:', savedType);
      } else {
        console.log('⚠️ Aucun type sauvegardé');
      }
    } catch (error) {
      console.error('❌ Erreur chargement tourneeType:', error);
    }
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

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
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

  const loadNearbyRisks = async (latitude: number, longitude: number) => {
    try {
      setLoadingRisks(true);
      const risks = await apiClient.getNearbyRisks(latitude, longitude, 3000); // 3km de rayon
      
      if (risks) {
        // Calculer la distance et filtrer ceux dans les 500m
        const risksWithDistance: RiskWithDistance[] = risks
          .map(risk => ({
            ...risk,
            distance: calculateDistance(latitude, longitude, risk.latitude, risk.longitude)
          }))
          .filter(risk => risk.distance <= 500)
          .sort((a, b) => a.distance - b.distance);

        setNearbyRisks(risksWithDistance);
        console.log(risksWithDistance);
      }
    } catch (error) {
      console.error('Error loading risks:', error);
    } finally {
      setLoadingRisks(false);
    }
  };

    const fetchGeoRisques = async (latitude: number, longitude: number) => {
    try {
       setLoadingPublicGeoRisks(true);
       // Appel API Géorisques v1 (rayon 200m comme demandé)
       //  lister les types de risques recensés sur un territoire :  "https://georisques.gouv.fr/api/v1/gaspar/risques?latlon=6.8694,45.9237&rayon=2000" 
       // Atlas des zones inondables : https://georisques.gouv.fr/api/v1/gaspar/azi?latlon=45.9237,6.8694&rayon=2000"
       // catastrophes naturelles : https://georisques.gouv.fr/api/v1/gaspar/catnat?latlon=45.9237,6.8694&rayon=2000"
       // cavités : https://georisques.gouv.fr/api/v1/cavites?latlon=45.9237,6.8694&rayon=2000"
       // informations communales sur les risques ùmajeurs : https://georisques.gouv.fr/api/v1/gaspar/dicrim?latlon=45.9237,6.8694&rayon=2000"
       // installations classees : https://georisques.gouv.fr/api/v1/installations_classees?latlon=45.9237,6.8694&rayon=2000"
       // mouvements de terrain : https://georisques.gouv.fr/api/v1/mvt?latlon=45.9237,6.8694&rayon=2000"
       // lister les types de risques recensés sur un territoire : 
       //latitude=45.9237;
       //longitude=6.8694;
       console.log('appel api georisques :');
       const response = await fetch(
              `https://georisques.gouv.fr/api/v1/gaspar/risques?latlon=${longitude},${latitude}&rayon=20`             
        );
        const data = await response.json();
        // 🛠️ TRANSFORMATION : On prépare les données pour le composant
        if (data.data && data.data.length > 0) {
            // 📍 Extraction du nom de la commune
            setCommuneName(data.data[0].libelle_commune);
            const formattedRisks = data.data[0].risques_detail.map((item: any) => ({
            id: `geo-${item.num_risque}`, // On crée l'ID ici
            title: item.libelle_risque_long,
            category: 'naturel', // Catégorie par défaut pour vos icônes
            description: "Source : Géorisques"
          }));
          setPublicGeoRisks(formattedRisks);
        } else {
          setPublicGeoRisks([]);
        }
      } catch (error) {
         console.error('Erreur Géorisques:', error);
      } finally {
        setLoadingPublicGeoRisks(false);
     }
    };

  const updateCurrentLocation = async () => {
    try {
      const position = await locationService.getCurrentPosition();
      if (position) {
        setCurrentPosition(position);
       // Appels parallèles pour charger les deux sources
      await Promise.all([
        loadNearbyRisks(position.latitude, position.longitude),
        fetchGeoRisques(position.latitude, position.longitude) // 👈 AJOUT
      ]);
      }
    } catch (error) {
      console.log('Cannot get position');
      setCurrentPosition(null);
      setNearbyRisks([]);
      setPublicGeoRisks([]); // 👈 AJOUT
    }
  };




  const getCategoryIcon = (category: string): string => {
    const icons: Record<string, string> = {
      'naturel': '🌪️',
      'technologique': '⚙️',
      'sanitaire': '🏥',
      'social': '👥',
    };
    return icons[category] || '⚠️';
  };

  const getCategoryColor = (category: string): string => {
    const colors: Record<string, string> = {
      'naturel': '#10B981',
      'technologique': '#F59E0B',
      'sanitaire': '#EF4444',
      'social': '#8B5CF6',
    };
    return colors[category] || COLORS.danger;
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
    Alert.alert(
      'Type de tournée requis',
      'Veuillez sélectionner un type de tournée avant de démarrer.'
    );
    return;
  }

  try {
    setLoading(true);

    Alert.alert(
      '🏘️ Surveillance des communes',
      'Voulez-vous être prévenu lors du changement de commune afin de vérifier les risques de la nouvelle commune ?',
      [
        {
          text: 'Non',
          onPress: async () => {
            console.log('👎 Surveillance commune désactivée');
            await startTrackingWithOption(false);
          },
          style: 'cancel',
        },
        {
          text: 'Oui',
          onPress: async () => {
            console.log('👍 Surveillance commune activée');
            await startTrackingWithOption(true);
          },
        },
      ],
      { cancelable: false }
    );
  } catch (error) {
    console.error('Erreur démarrage:', error);
    setLoading(false);
    Alert.alert('Erreur', 'Impossible de démarrer la surveillance');
  }
};

const startTrackingWithOption = async (enableCommuneNotification: boolean) => {
  try {
    setNotifyCommuneChange(enableCommuneNotification);

    await locationService.startBackgroundLocationTracking(
      tourneeType,
      enableCommuneNotification
    );

    await checkPermissions();
    
    Alert.alert(
      'Service démarré',
      enableCommuneNotification
        ? 'Surveillance active avec notification de changement de commune'
        : 'Surveillance active sans notification de changement de commune'
    );
  } catch (error: any) {
    console.error('Erreur:', error);
    if (error.message === 'PERMISSIONS_REQUIRED') {
      Alert.alert(
        'Permissions requises',
        'Veuillez autoriser la localisation en arrière-plan'
      );
    } else {
      Alert.alert('Erreur', 'Impossible de démarrer le service');
    }
  } finally {
    setLoading(false);
  }
};


const handleStopTracking = async () => {
  try {
    setLoading(true);

    await locationService.stopBackgroundLocationTracking();
    await checkPermissions();
    
    setNotifyCommuneChange(false);

    Alert.alert('Service arrêté', 'La surveillance des risques est désactivée');
  } catch (error) {
    console.error('Erreur arrêt:', error);
    Alert.alert('Erreur', 'Impossible d\'arrêter le service');
  } finally {
    setLoading(false);
  }
};

  const getTourneeLabel = (type: TourneeType): string => {
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
        
        {/* Status Card */}
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

        {/* Affichage du type de tournée actif */}
        {isTracking && tourneeType && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>🚶 Tournée en cours</Text>
            <View style={styles.activeTourneeBox}>
              <Text style={styles.activeTourneeText}>
                {getTourneeLabel(tourneeType)}
              </Text>
            </View>
          </View>
        )}

        {/* Position actuelle */}
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

        {/* Risques à proximité */}
        {currentPosition && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>⚠️ Risques à proximité (500m)</Text>
              {loadingRisks && <ActivityIndicator size="small" color={COLORS.primary} />}
            </View>
            
            {nearbyRisks.length === 0 ? (
              <View style={styles.noRisksContainer}>
                <Text style={styles.noRisksIcon}>✅</Text>
                <Text style={styles.noRisksText}>Aucun risque détecté</Text>
              </View>
            ) : (
              <View style={styles.risksContainer}>
                {nearbyRisks.map((risk) => {
                  const categoryColor = getCategoryColor(risk.category);
                  return (
                    <View 
                      key={risk.id} 
                      style={styles.riskItem}
                    >
                      <View style={styles.riskHeader}>
                        <View style={[styles.riskBadge, { backgroundColor: categoryColor + '20' }]}>
                          <Text style={styles.riskIcon}>{getCategoryIcon(risk.category)}</Text>
                          <Text style={[styles.riskType, { color: categoryColor }]}>
                            {risk.category}
                          </Text>
                        </View>
                        <View style={styles.distanceBadge}>
                          <Text style={styles.distanceText}>
                            📏 {Math.round(risk.distance)}m
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.riskTitle}>{risk.title}</Text>
                      {risk.description && (
                        <Text style={styles.riskDescription}>{risk.description}</Text>
                      )}
                    </View>
                  );
                })}
              </View>
            )}







{/* AJOUT : SECTION RISQUES PUBLICS (GEORISQUES) */}
{currentPosition && (
  <View style={styles.card}>
    <View style={styles.cardHeader}>
      <Text style={styles.cardTitle}>🌐 Risques Publics ({communeName ? communeName : 'Niveau commune'})</Text>
      {PublicloadingGeoRisks && <ActivityIndicator size="small" color={COLORS.primary} />}
    </View>
    
{/* Section Risques Publics (Géorisques) */}
{PublicgeoRisks.length > 0 && (
  <View style={styles.risksContainer}>
    
    
    {PublicgeoRisks.map((risk) => {
      // On réutilise vos fonctions existantes pour les icônes et couleurs
      const categoryColor = getCategoryColor(risk.category);
      
      return (
        <View 
          key={risk.id} 
          style={[styles.riskItem, { borderLeftWidth: 4, borderLeftColor: '#3B82F6' }]}
        >
          <View style={styles.riskHeader}>
            <View style={[styles.riskBadge, { backgroundColor: categoryColor + '20' }]}>
              <Text style={styles.riskIcon}>{getCategoryIcon(risk.category)}</Text>
              <Text style={[styles.riskType, { color: categoryColor }]}>
                {risk.category}
              </Text>
            </View>
            
            <View style={[styles.distanceBadge, { backgroundColor: '#DBEAFE' }]}>
              <Text style={[styles.distanceText, { color: '#1E40AF' }]}>
                🌍 Public
              </Text>
            </View>
          </View>

          <Text style={styles.riskTitle}>{risk.title}</Text>
          
          <Text style={styles.riskDescription}>
            Identifiant risque : {risk.id.replace('geo-', '')}
          </Text>
        </View>
      );
    })}
  </View>
)}




    
  </View>
)}




          </View>
        )}

        {/* Permissions */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>🔑 Permissions</Text>
          
          <View style={styles.permRow}>
            <Text style={styles.permLabel}>Localisation</Text>
            <Text style={[
              styles.permStatus,
              { color: permissions.foreground === 'granted' ? COLORS.success : COLORS.danger }
            ]}>
              {permissions.foreground === 'granted' ? '✅' : '❌'} {permissions.foreground}
            </Text>
          </View>

          {permissions.foreground !== 'granted' && (
            <TouchableOpacity
              style={[styles.button, { marginTop: 10 }]}
              onPress={handleRequestForegroundPermission}
              disabled={loading}
            >
              <Text style={styles.buttonText}>Demander permission</Text>
            </TouchableOpacity>
          )}
          
          <View style={styles.permRow}>
            <Text style={styles.permLabel}>Arrière-plan</Text>
            <Text style={[
              styles.permStatus,
              { color: permissions.background === 'granted' ? COLORS.success : COLORS.danger }
            ]}>
              {permissions.background === 'granted' ? '✅' : '❌'} {permissions.background}
            </Text>
          </View>

          {permissions.background !== 'granted' && permissions.foreground === 'granted' && (
            <TouchableOpacity
              style={[styles.button, { marginTop: 10 }]}
              onPress={handleRequestBackgroundPermission}
              disabled={loading}
            >
              <Text style={styles.buttonText}>Demander arrière-plan</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Sélection type de tournée */}
        {!isTracking && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>🚶 Type de tournée</Text>
            
            <TouchableOpacity
              style={[styles.tourneeButton, tourneeType === 'pieds' && styles.tourneeButtonSelected]}
              onPress={() => setTourneeType('pieds')}
            >
              <Text style={styles.tourneeButtonText}>🚶 À pieds</Text>
             
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tourneeButton, tourneeType === 'velo' && styles.tourneeButtonSelected]}
              onPress={() => setTourneeType('velo')}
            >
              <Text style={styles.tourneeButtonText} center>🚴 À vélo</Text>
             
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tourneeButton, tourneeType === 'voiture' && styles.tourneeButtonSelected]}
              onPress={() => setTourneeType('voiture')}
            >
              <Text style={styles.tourneeButtonText}>🚗 En voiture</Text>
             
            </TouchableOpacity>
          </View>
        )}

        {/* Tests */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>🧪 Tests</Text>
          
          <TouchableOpacity
            style={[styles.button, { backgroundColor: COLORS.warning }]}
            onPress={() => notificationService.sendTestNotification()}
          >
            <Text style={styles.buttonText}>🔊 Test Notification</Text>
          </TouchableOpacity>
        </View>

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
                {isTracking ? 'Arrêter le tracking' : 'Démarrer le tracking'}
              </Text>
            </>
          )}
        </TouchableOpacity>

      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: 20,
  },
  statusCard: {
    padding: 30,
    borderRadius: 20,
    marginBottom: 20,
    alignItems: 'center',
  },
  statusCardActive: {
    backgroundColor: '#D1FAE5',
  },
  statusCardInactive: {
    backgroundColor: '#FEE2E2',
  },
  statusIcon: {
    fontSize: 60,
    marginBottom: 15,
  },
  statusTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 10,
  },
  activeText: {
    fontSize: 14,
    color: COLORS.success,
    textAlign: 'center',
    marginTop: 5,
  },
  card: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 15,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  text: {
    fontSize: 14,
    color: COLORS.text,
    marginBottom: 5,
  },
  button: {
    backgroundColor: COLORS.secondary,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  permRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  permLabel: {
    fontSize: 14,
    color: COLORS.text,
  },
  permStatus: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  tourneeButton: {
    backgroundColor: COLORS.background,
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: '#e0e0e0',
  },
  tourneeButtonSelected: {
    borderColor: COLORS.success,
    backgroundColor: '#D1FAE5',
  },
  tourneeButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 5,
  },
  tourneeButtonSubtext: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  mainButton: {
    padding: 20,
    borderRadius: 15,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 30,
  },
  mainButtonStart: {
    backgroundColor: COLORS.success,
  },
  mainButtonStop: {
    backgroundColor: COLORS.danger,
  },
  mainButtonDisabled: {
    backgroundColor: COLORS.disabled,
  },
  mainButtonIcon: {
    fontSize: 40,
    marginBottom: 10,
  },
  mainButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  noRisksContainer: {
    alignItems: 'center',
    padding: 20,
  },
  noRisksIcon: {
    fontSize: 50,
    marginBottom: 10,
  },
  noRisksText: {
    fontSize: 16,
    color: COLORS.success,
  },
  risksContainer: {
    marginTop: 10,
  },
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
    padding: 8,
    borderRadius: 8,
  },
  riskIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  riskType: {
    fontSize: 14,
    fontWeight: 'bold',
    textTransform: 'capitalize',
  },
  distanceBadge: {
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  distanceText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.secondary,
  },
  riskTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 5,
  },
  riskDescription: {
    fontSize: 12,
    color: COLORS.textLight,
    fontStyle: 'italic',
  },
  activeTourneeBox: {
    backgroundColor: '#D1FAE5',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  activeTourneeText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.success,
  },
});