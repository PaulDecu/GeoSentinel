// screens/CreateRiskScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { risquesAPI } from '../services/api';
import { locationService } from '../services/locationService';
import { COLORS, RISK_TYPES, VALIDATION, MESSAGES } from '../utils/constants';

export default function CreateRiskScreen({ route, navigation }) {
  const { identifiant } = route.params;

  const [codePostal, setCodePostal] = useState('');
  const [adresse, setAdresse] = useState('');
  const [typeRisque, setTypeRisque] = useState('');
  const [commentaire, setCommentaire] = useState('');
  const [gpsPosition, setGpsPosition] = useState(null);
  const [loading, setLoading] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [error, setError] = useState('');

  // Récupérer automatiquement la position GPS au chargement
  useEffect(() => {
    getGPSPosition();
  }, []);

  const getGPSPosition = async () => {
    setGettingLocation(true);
    setError('');
    try {
      const position = await locationService.getCurrentPosition();
      setGpsPosition(position);
    } catch (error) {
     // setError(MESSAGES.errors.location);
     setError(MESSAGES?.errors?.location || "Erreur de localisation");     
      Alert.alert('Erreur', 'Impossible d\'obtenir votre position GPS. Vérifiez les permissions.');
    } finally {
      setGettingLocation(false);
    }
  };

  const validateForm = () => {
    if (!VALIDATION.codePostalRegex.test(codePostal)) {
      setError(MESSAGES.errors.invalidCodePostal);
      return false;
    }

    if (!gpsPosition) {
      setError('Position GPS non disponible');
      return false;
    }

    if (!adresse.trim()) {
      setError('L\'adresse est obligatoire');
      return false;
    }

    if (!typeRisque) {
      setError('Le type de risque est obligatoire');
      return false;
    }

    return true;
  };

  const handleCreate = async () => {
    setError('');

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      // Appel de l'API backend avec les routes existantes
      const response = await risquesAPI.create(
        identifiant,
        codePostal,
        gpsPosition.latitude,
        gpsPosition.longitude,
        adresse,
        typeRisque,
        commentaire
      );

      if (response.success) {
        Alert.alert(
          'Succès',
          MESSAGES.success.riskCreated,
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack(),
            },
          ]
        );
      }
    } catch (error) {
      //setError(error.response?.data?.message || MESSAGES.errors.network);
      setError(error.response?.data?.message || MESSAGES?.errors?.network || "Erreur réseau");
      Alert.alert('Erreur', error.response?.data?.message || MESSAGES.errors.network);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {/* Identifiant (lecture seule) */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Identifiant</Text>
          <Text style={styles.readOnlyText}>{identifiant}</Text>
        </View>

        {/* Code Postal */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Code Postal *</Text>
          <TextInput
            style={styles.input}
            value={codePostal}
            onChangeText={setCodePostal}
            placeholder="34000"
            keyboardType="numeric"
            maxLength={5}
          />
        </View>

        {/* Position GPS */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Position GPS *</Text>
          <View style={styles.gpsContainer}>
            {gettingLocation ? (
              <ActivityIndicator size="small" color={COLORS.primary} />
            ) : gpsPosition ? (
              <Text style={styles.gpsText}>
                📍 {gpsPosition.latitude.toFixed(6)}, {gpsPosition.longitude.toFixed(6)}
              </Text>
            ) : (
              <Text style={styles.errorText}>Position non disponible</Text>
            )}
            <TouchableOpacity
              style={styles.gpsButton}
              onPress={getGPSPosition}
              disabled={gettingLocation}
            >
              <Text style={styles.gpsButtonText}>
                {gettingLocation ? 'Recherche...' : '🔄 Actualiser'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Adresse */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Adresse *</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={adresse}
            onChangeText={setAdresse}
            placeholder="Ex: 27 quai Paul Cunq, Bâtiment A..."
            multiline
            numberOfLines={3}
          />
        </View>

        {/* Type de Risque */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Type de Risque *</Text>
          <View style={styles.riskTypesContainer}>
            {RISK_TYPES.map((risk) => (
              <TouchableOpacity
                key={risk.value}
                style={[
                  styles.riskTypeButton,
                  typeRisque === risk.value && {
                    backgroundColor: risk.color + '20',
                    borderColor: risk.color,
                    borderWidth: 2,
                  },
                ]}
                onPress={() => setTypeRisque(risk.value)}
              >
                <Text style={styles.riskTypeIcon}>{risk.icon}</Text>
                <Text
                  style={[
                    styles.riskTypeText,
                    typeRisque === risk.value && { color: risk.color, fontWeight: 'bold' },
                  ]}
                >
                  {risk.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Commentaire */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Commentaire</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={commentaire}
            onChangeText={setCommentaire}
            placeholder="Détails supplémentaires..."
            multiline
            numberOfLines={3}
          />
        </View>

        {/* Message d'erreur */}
        {error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>⚠️ {error}</Text>
          </View>
        ) : null}

        {/* Bouton Créer */}
        <TouchableOpacity
          style={[
            styles.createButton,
            (!gpsPosition || !codePostal || !adresse || !typeRisque || loading) &&
              styles.createButtonDisabled,
          ]}
          onPress={handleCreate}
          disabled={!gpsPosition || !codePostal || !adresse || !typeRisque || loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.createButtonText}>✅ Créer</Text>
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
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  readOnlyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    padding: 15,
    backgroundColor: COLORS.background,
    borderRadius: 10,
    letterSpacing: 2,
  },
  gpsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FEF3C7',
    padding: 15,
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.warning,
  },
  gpsText: {
    fontSize: 14,
    color: COLORS.text,
    flex: 1,
  },
  gpsButton: {
    backgroundColor: COLORS.secondary,
    padding: 8,
    borderRadius: 8,
    marginLeft: 10,
  },
  gpsButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  riskTypesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  riskTypeButton: {
    flex: 1,
    minWidth: '45%',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  riskTypeIcon: {
    fontSize: 24,
    marginRight: 10,
  },
  riskTypeText: {
    fontSize: 14,
    color: COLORS.text,
    flex: 1,
  },
  errorContainer: {
    backgroundColor: '#FEE2E2',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.danger,
  },
  errorText: {
    color: COLORS.danger,
    fontSize: 14,
  },
  createButton: {
    backgroundColor: COLORS.success,
    padding: 18,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  createButtonDisabled: {
    backgroundColor: COLORS.disabled,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});