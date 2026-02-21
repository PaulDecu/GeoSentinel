// src/screens/CreateRiskScreen.tsx
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
import { apiClient, getErrorMessage } from '../services/api';
import { locationService } from '../services/locationService';
import { COLORS, RISK_SEVERITIES, VALIDATION, MESSAGES } from '../utils/constants';
import { RiskCategory, RiskSeverity } from '../types';

interface Props {
  navigation: any;
}

export default function CreateRiskScreen({ navigation }: Props) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [severity, setSeverity] = useState<RiskSeverity | ''>('');
  const [categories, setCategories] = useState<RiskCategory[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [gpsPosition, setGpsPosition] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getGPSPosition();
    loadCategories();
  }, []);

  const loadCategories = async () => {
    setLoadingCategories(true);
    try {
      const data = await apiClient.getRiskCategories();
      setCategories(data);
    } catch (e) {
      console.error('Erreur chargement catégories:', e);
    } finally {
      setLoadingCategories(false);
    }
  };

  const getGPSPosition = async () => {
    setGettingLocation(true);
    setError('');
    try {
      const position = await locationService.getCurrentPosition();
      setGpsPosition(position);
    } catch (error) {
      setError(MESSAGES.errors.location);
      Alert.alert('Erreur', "Impossible d'obtenir votre position GPS. Vérifiez les permissions.");
    } finally {
      setGettingLocation(false);
    }
  };

  const validateForm = () => {
    if (!title.trim() || title.length < VALIDATION.titleMinLength) {
      setError(`Le titre doit contenir au moins ${VALIDATION.titleMinLength} caractères`);
      return false;
    }
    if (title.length > VALIDATION.titleMaxLength) {
      setError(`Le titre ne doit pas dépasser ${VALIDATION.titleMaxLength} caractères`);
      return false;
    }
    if (!gpsPosition) {
      setError('Position GPS non disponible');
      return false;
    }
    if (!selectedCategoryId) {
      setError('La catégorie est obligatoire');
      return false;
    }
    if (!severity) {
      setError('La sévérité est obligatoire');
      return false;
    }
    return true;
  };

  const handleCreate = async () => {
    setError('');
    if (!validateForm()) return;
    setLoading(true);
    try {
      await apiClient.createRisk({
        title: title.trim(),
        description: description.trim() || undefined,
        categoryId: selectedCategoryId,
        severity: severity as RiskSeverity,
        latitude: gpsPosition!.latitude,
        longitude: gpsPosition!.longitude,
      });
      Alert.alert('Succès', MESSAGES.success.riskCreated, [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      const message = getErrorMessage(error);
      setError(message);
      Alert.alert('Erreur', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {/* Titre */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Titre *</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="Ex: Chien dangereux, Trou dans la chaussée..."
            maxLength={VALIDATION.titleMaxLength}
          />
          <Text style={styles.charCount}>{title.length}/{VALIDATION.titleMaxLength}</Text>
        </View>

        {/* Position GPS */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Le risque sera créé pour votre position GPS actuelle</Text>
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
            <TouchableOpacity style={styles.gpsButton} onPress={getGPSPosition} disabled={gettingLocation}>
              <Text style={styles.gpsButtonText}>{gettingLocation ? 'Recherche...' : '🔄 Actualiser'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Catégorie — chargée dynamiquement */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Catégorie *</Text>
          {loadingCategories ? (
            <ActivityIndicator size="small" color={COLORS.primary} />
          ) : (
            <View style={styles.optionsContainer}>
              {categories.map((cat) => {
                const selected = selectedCategoryId === cat.id;
                return (
                  <TouchableOpacity
                    key={cat.id}
                    style={[
                      styles.optionButton,
                      selected && {
                        backgroundColor: cat.color + '20',
                        borderColor: cat.color,
                        borderWidth: 2,
                      },
                    ]}
                    onPress={() => setSelectedCategoryId(cat.id)}
                  >
                    {cat.icon ? <Text style={styles.optionIcon}>{cat.icon}</Text> : null}
                    <View style={styles.optionContent}>
                      <Text style={[styles.optionText, selected && { color: cat.color, fontWeight: 'bold' }]}>
                        {cat.label}
                      </Text>
                    </View>
                    {selected && (
                      <View style={[styles.colorDot, { backgroundColor: cat.color }]} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        {/* Sévérité */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Sévérité *</Text>
          <View style={styles.severityContainer}>
            {RISK_SEVERITIES.map((sev) => (
              <TouchableOpacity
                key={sev.value}
                style={[
                  styles.severityButton,
                  severity === sev.value && {
                    backgroundColor: sev.bgColor,
                    borderColor: sev.color,
                    borderWidth: 2,
                  },
                ]}
                onPress={() => setSeverity(sev.value)}
              >
                <Text style={styles.severityIcon}>{sev.icon}</Text>
                <Text style={[styles.severityText, severity === sev.value && { color: sev.color, fontWeight: 'bold' }]}>
                  {sev.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Description */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            placeholder="Détails supplémentaires..."
            multiline
            numberOfLines={4}
            maxLength={VALIDATION.descriptionMaxLength}
          />
          <Text style={styles.charCount}>{description.length}/{VALIDATION.descriptionMaxLength}</Text>
        </View>

        {error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>⚠️ {error}</Text>
          </View>
        ) : null}

        <TouchableOpacity
          style={[
            styles.createButton,
            (!gpsPosition || !title || !selectedCategoryId || !severity || loading) && styles.createButtonDisabled,
          ]}
          onPress={handleCreate}
          disabled={!gpsPosition || !title || !selectedCategoryId || !severity || loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.createButtonText}>✅ Créer le risque</Text>
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
    marginBottom: 25,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 10,
  },
  input: {
    borderWidth: 2,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 15,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 5,
    textAlign: 'right',
  },
  gpsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fef3c7',
    padding: 15,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.warning,
  },
  gpsText: {
    fontSize: 14,
    color: COLORS.text,
    flex: 1,
    fontWeight: '600',
  },
  gpsButton: {
    backgroundColor: COLORS.secondary,
    padding: 10,
    borderRadius: 10,
    marginLeft: 10,
  },
  gpsButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  optionsContainer: {
    gap: 12,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  optionIcon: {
    fontSize: 32,
    marginRight: 15,
  },
  optionContent: {
    flex: 1,
  },
  optionText: {
    fontSize: 16,
    color: COLORS.text,
    fontWeight: '600',
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  severityContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  severityButton: {
    flex: 1,
    minWidth: '45%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.border,
    gap: 8,
  },
  severityIcon: {
    fontSize: 20,
  },
  severityText: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '600',
  },
  errorContainer: {
    backgroundColor: '#fee2e2',
    padding: 15,
    borderRadius: 12,
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
    borderRadius: 12,
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
  colorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginLeft: 8,
  },
});