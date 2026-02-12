// src/screens/RiskDetailScreen.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { apiClient, getErrorMessage } from '../services/api';
import {
  COLORS,
  RISK_CATEGORIES,
  RISK_SEVERITIES,
  VALIDATION,
  MESSAGES,
} from '../utils/constants';
import { Risk, RiskCategory, RiskSeverity } from '../types';

interface Props {
  route: {
    params: {
      risk: Risk;
    };
  };
  navigation: any;
}

export default function RiskDetailScreen({ route, navigation }: Props) {
  const { risk } = route.params;

  const [editMode, setEditMode] = useState(false);
  const [title, setTitle] = useState(risk.title);
  const [description, setDescription] = useState(risk.description || '');
  const [category, setCategory] = useState<RiskCategory>(risk.category);
  const [severity, setSeverity] = useState<RiskSeverity>(risk.severity);
  const [loading, setLoading] = useState(false);

  const getCategoryData = (cat: RiskCategory) => {
    return RISK_CATEGORIES.find((c) => c.value === cat)!;
  };

  const getSeverityData = (sev: RiskSeverity) => {
    return RISK_SEVERITIES.find((s) => s.value === sev)!;
  };

  const handleUpdate = async () => {
    if (!title.trim() || title.length < VALIDATION.titleMinLength) {
      Alert.alert(
        'Erreur',
        `Le titre doit contenir au moins ${VALIDATION.titleMinLength} caractères`
      );
      return;
    }

    setLoading(true);

    try {
      await apiClient.updateRisk(risk.id, {
        title: title.trim(),
        description: description.trim() || undefined,
        category,
        severity,
      });

      Alert.alert('Succès', MESSAGES.success.riskUpdated, [
        {
          text: 'OK',
          onPress: () => {
            setEditMode(false);
            navigation.goBack();
          },
        },
      ]);
    } catch (error) {
      Alert.alert('Erreur', getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Confirmer la suppression',
      'Êtes-vous sûr de vouloir supprimer ce risque ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              await apiClient.deleteRisk(risk.id);
              Alert.alert('Succès', MESSAGES.success.riskDeleted, [
                {
                  text: 'OK',
                  onPress: () => navigation.goBack(),
                },
              ]);
            } catch (error) {
              Alert.alert('Erreur', getErrorMessage(error));
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleCancel = () => {
    setTitle(risk.title);
    setDescription(risk.description || '');
    setCategory(risk.category);
    setSeverity(risk.severity);
    setEditMode(false);
  };

  const currentCategoryData = getCategoryData(category);
  const currentSeverityData = getSeverityData(severity);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {/* En-tête avec badges */}
        <View
          style={[
            styles.header,
            { backgroundColor: currentCategoryData.color + '20' },
          ]}
        >
          <View style={styles.badges}>
            <View
              style={[
                styles.categoryBadge,
                { backgroundColor: currentCategoryData.color + '30' },
              ]}
            >
              <Text style={styles.badgeIcon}>
                {currentCategoryData.icon}
              </Text>
              <Text
                style={[
                  styles.badgeText,
                  { color: currentCategoryData.color },
                ]}
              >
                {currentCategoryData.label}
              </Text>
            </View>

            <View
              style={[
                styles.severityBadge,
                { backgroundColor: currentSeverityData.bgColor },
              ]}
            >
              <Text style={styles.badgeIcon}>
                {currentSeverityData.icon}
              </Text>
              <Text
                style={[
                  styles.badgeText,
                  { color: currentSeverityData.color },
                ]}
              >
                {currentSeverityData.label}
              </Text>
            </View>
          </View>
        </View>

        {/* Informations */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📍 Localisation</Text>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Latitude</Text>
            <Text style={styles.infoValue}>
              {risk.latitude.toFixed(6)}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Longitude</Text>
            <Text style={styles.infoValue}>
              {risk.longitude.toFixed(6)}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Date de création</Text>
            <Text style={styles.infoValue}>
              {new Date(risk.createdAt).toLocaleDateString('fr-FR')} à{' '}
              {new Date(risk.createdAt).toLocaleTimeString('fr-FR')}
            </Text>
          </View>

          {risk.creatorEmail && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Créé par</Text>
              <Text style={styles.infoValue}>{risk.creatorEmail}</Text>
            </View>
          )}
        </View>

        {/* Titre */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📝 Titre *</Text>
          {editMode ? (
            <>
              <TextInput
                style={styles.input}
                value={title}
                onChangeText={setTitle}
                maxLength={VALIDATION.titleMaxLength}
              />
              <Text style={styles.charCount}>
                {title.length}/{VALIDATION.titleMaxLength}
              </Text>
            </>
          ) : (
            <Text style={styles.valueText}>{risk.title}</Text>
          )}
        </View>

        {/* Catégorie (en mode édition) */}
        {editMode && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🏷️ Catégorie *</Text>
            <View style={styles.optionsContainer}>
              {RISK_CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat.value}
                  style={[
                    styles.optionButton,
                    category === cat.value && {
                      backgroundColor: cat.color + '20',
                      borderColor: cat.color,
                      borderWidth: 2,
                    },
                  ]}
                  onPress={() => setCategory(cat.value)}
                >
                  <Text style={styles.optionIcon}>{cat.icon}</Text>
                  <Text
                    style={[
                      styles.optionText,
                      category === cat.value && {
                        color: cat.color,
                        fontWeight: 'bold',
                      },
                    ]}
                  >
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Sévérité (en mode édition) */}
        {editMode && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>⚠️ Sévérité *</Text>
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
                  <Text
                    style={[
                      styles.severityText,
                      severity === sev.value && {
                        color: sev.color,
                        fontWeight: 'bold',
                      },
                    ]}
                  >
                    {sev.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💬 Description</Text>
          {editMode ? (
            <>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={4}
                placeholder="Aucune description"
                maxLength={VALIDATION.descriptionMaxLength}
              />
              <Text style={styles.charCount}>
                {description.length}/{VALIDATION.descriptionMaxLength}
              </Text>
            </>
          ) : (
            <Text style={styles.valueText}>
              {risk.description || 'Aucune description'}
            </Text>
          )}
        </View>

        {/* Boutons d'action */}
        <View style={styles.actions}>
          {!editMode ? (
            <>
              <TouchableOpacity
                style={[styles.button, styles.buttonEdit]}
                onPress={() => setEditMode(true)}
                disabled={loading}
              >
                <Text style={styles.buttonText}>✏️ Modifier</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.buttonDelete]}
                onPress={handleDelete}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>🗑️ Supprimer</Text>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity
                style={[styles.button, styles.buttonSave]}
                onPress={handleUpdate}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>💾 Sauvegarder</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.buttonCancel]}
                onPress={handleCancel}
                disabled={loading}
              >
                <Text style={styles.buttonText}>✕ Annuler</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
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
  header: {
    padding: 20,
    borderRadius: 15,
    marginBottom: 20,
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'center',
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 8,
  },
  severityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 8,
  },
  badgeIcon: {
    fontSize: 24,
  },
  badgeText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  section: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 15,
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 15,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  infoLabel: {
    fontSize: 14,
    color: COLORS.textLight,
    flex: 1,
  },
  infoValue: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  valueText: {
    fontSize: 16,
    color: COLORS.text,
    lineHeight: 24,
  },
  input: {
    borderWidth: 2,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 15,
    fontSize: 16,
    backgroundColor: COLORS.background,
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
  optionsContainer: {
    gap: 10,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: COLORS.background,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  optionIcon: {
    fontSize: 24,
    marginRight: 15,
  },
  optionText: {
    fontSize: 16,
    color: COLORS.text,
    flex: 1,
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
    backgroundColor: COLORS.background,
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
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  button: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonEdit: {
    backgroundColor: COLORS.warning,
  },
  buttonDelete: {
    backgroundColor: COLORS.danger,
  },
  buttonSave: {
    backgroundColor: COLORS.success,
  },
  buttonCancel: {
    backgroundColor: COLORS.textLight,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
