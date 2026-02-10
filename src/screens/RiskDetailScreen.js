// screens/RiskDetailScreen.js
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
import { risquesAPI } from '../services/api';
import { COLORS, RISK_TYPES, MESSAGES } from '../utils/constants';

export default function RiskDetailScreen({ route, navigation }) {
  const { identifiant, risk } = route.params;

  const [editMode, setEditMode] = useState(false);
  const [adresse, setAdresse] = useState(risk.adresse);
  const [typeRisque, setTypeRisque] = useState(risk.type_risque);
  const [commentaire, setCommentaire] = useState(risk.commentaire || '');
  const [loading, setLoading] = useState(false);

  const getRiskIcon = (typeRisque) => {
    const riskType = RISK_TYPES.find(r => r.value === typeRisque);
    return riskType ? riskType.icon : '❗';
  };

  const getRiskColor = (typeRisque) => {
    const riskType = RISK_TYPES.find(r => r.value === typeRisque);
    return riskType ? riskType.color : COLORS.textLight;
  };

  const handleUpdate = async () => {
    if (!adresse.trim()) {
      Alert.alert('Erreur', 'L\'adresse est obligatoire');
      return;
    }

    if (!typeRisque) {
      Alert.alert('Erreur', 'Le type de risque est obligatoire');
      return;
    }

    setLoading(true);

    try {
      const response = await risquesAPI.update(
        risk.id,
        identifiant,
        adresse,
        typeRisque,
        commentaire
      );

      if (response.success) {
        Alert.alert('Succès', MESSAGES.success.riskUpdated, [
          {
            text: 'OK',
            onPress: () => {
              setEditMode(false);
              navigation.goBack();
            },
          },
        ]);
      }
    } catch (error) {
      Alert.alert('Erreur', error.response?.data?.message || 'Erreur lors de la modification');
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
              const response = await risquesAPI.delete(risk.id, identifiant);

              if (response.success) {
                Alert.alert('Succès', MESSAGES.success.riskDeleted, [
                  {
                    text: 'OK',
                    onPress: () => navigation.goBack(),
                  },
                ]);
              }
            } catch (error) {
              Alert.alert('Erreur', error.response?.data?.message || 'Erreur lors de la suppression');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleCancel = () => {
    setAdresse(risk.adresse);
    setTypeRisque(risk.type_risque);
    setCommentaire(risk.commentaire || '');
    setEditMode(false);
  };

  const riskColor = getRiskColor(editMode ? typeRisque : risk.type_risque);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {/* En-tête avec badge */}
        <View style={[styles.header, { backgroundColor: riskColor + '20' }]}>
          <View style={styles.badge}>
            <Text style={styles.badgeIcon}>
              {getRiskIcon(editMode ? typeRisque : risk.type_risque)}
            </Text>
            <Text style={[styles.badgeText, { color: riskColor }]}>
              {editMode ? typeRisque : risk.type_risque}
            </Text>
          </View>
        </View>

        {/* Informations */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informations</Text>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Code Postal</Text>
            <Text style={styles.infoValue}>{risk.code_postal}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Position GPS</Text>
            <Text style={styles.infoValue}>
              {parseFloat(risk.latitude).toFixed(6)}, {parseFloat(risk.longitude).toFixed(6)}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Date de création</Text>
            <Text style={styles.infoValue}>
              {new Date(risk.created_at).toLocaleDateString('fr-FR')} à{' '}
              {new Date(risk.created_at).toLocaleTimeString('fr-FR')}
            </Text>
          </View>
        </View>

        {/* Adresse */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Adresse *</Text>
          {editMode ? (
            <TextInput
              style={[styles.input, styles.textArea]}
              value={adresse}
              onChangeText={setAdresse}
              multiline
              numberOfLines={3}
            />
          ) : (
            <Text style={styles.valueText}>{risk.adresse}</Text>
          )}
        </View>

        {/* Type de risque (en mode édition) */}
        {editMode && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Type de Risque *</Text>
            <View style={styles.riskTypesContainer}>
              {RISK_TYPES.map((riskType) => (
                <TouchableOpacity
                  key={riskType.value}
                  style={[
                    styles.riskTypeButton,
                    typeRisque === riskType.value && {
                      backgroundColor: riskType.color + '20',
                      borderColor: riskType.color,
                      borderWidth: 2,
                    },
                  ]}
                  onPress={() => setTypeRisque(riskType.value)}
                >
                  <Text style={styles.riskTypeIcon}>{riskType.icon}</Text>
                  <Text
                    style={[
                      styles.riskTypeText,
                      typeRisque === riskType.value && {
                        color: riskType.color,
                        fontWeight: 'bold',
                      },
                    ]}
                  >
                    {riskType.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Commentaire */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Commentaire</Text>
          {editMode ? (
            <TextInput
              style={[styles.input, styles.textArea]}
              value={commentaire}
              onChangeText={setCommentaire}
              multiline
              numberOfLines={3}
              placeholder="Aucun commentaire"
            />
          ) : (
            <Text style={styles.valueText}>
              {risk.commentaire || 'Aucun commentaire'}
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
    alignItems: 'center',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  badgeIcon: {
    fontSize: 40,
  },
  badgeText: {
    fontSize: 24,
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
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    backgroundColor: COLORS.background,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
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
    backgroundColor: COLORS.background,
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
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  button: {
    flex: 1,
    padding: 16,
    borderRadius: 10,
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