// screens/ListRisksScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { risquesAPI } from '../services/api';
import { COLORS, RISK_TYPES, ITEMS_PER_PAGE, VALIDATION } from '../utils/constants';

export default function ListRisksScreen({ route, navigation }) {
  const { identifiant } = route.params;

  const [codePostal, setCodePostal] = useState('');
  const [risques, setRisques] = useState([]);
  const [selectedRisks, setSelectedRisks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [error, setError] = useState('');

  const getRiskIcon = (typeRisque) => {
    const risk = RISK_TYPES.find(r => r.value === typeRisque);
    return risk ? risk.icon : '❗';
  };

  const getRiskColor = (typeRisque) => {
    const risk = RISK_TYPES.find(r => r.value === typeRisque);
    return risk ? risk.color : COLORS.textLight;
  };

  const loadRisks = async () => {
    if (!VALIDATION.codePostalRegex.test(codePostal)) {
      setError('Le code postal doit contenir 5 chiffres');
      return;
    }

    setError('');
    setLoading(true);
    setSelectedRisks([]);

    try {
      const response = await risquesAPI.list(identifiant, codePostal);

      if (response.success) {
        setRisques(response.risques);
        setCurrentPage(1);
        if (response.risques.length === 0) {
          setError('Aucun risque trouvé pour ce code postal');
        }
      }
    } catch (error) {
      setError(error.response?.data?.message || 'Erreur lors du chargement');
      setRisques([]);
    } finally {
      setLoading(false);
    }
  };

  const toggleSelectRisk = (id) => {
    setSelectedRisks(prev => {
      if (prev.includes(id)) {
        return prev.filter(riskId => riskId !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  const toggleSelectAll = () => {
    const currentPageRisks = getCurrentPageRisks();
    const allSelected = currentPageRisks.every(r => selectedRisks.includes(r.id));

    if (allSelected) {
      // Désélectionner tous les risques de la page
      setSelectedRisks(prev => 
        prev.filter(id => !currentPageRisks.find(r => r.id === id))
      );
    } else {
      // Sélectionner tous les risques de la page
      const pageIds = currentPageRisks.map(r => r.id);
      setSelectedRisks(prev => [...new Set([...prev, ...pageIds])]);
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedRisks.length === 0) {
      Alert.alert('Attention', 'Aucun risque sélectionné');
      return;
    }

    Alert.alert(
      'Confirmer la suppression',
      `Supprimer ${selectedRisks.length} risque(s) ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              const response = await risquesAPI.deleteMultiple(selectedRisks, identifiant);

              if (response.success) {
                Alert.alert('Succès', `${response.deleted} risque(s) supprimé(s)`);
                setSelectedRisks([]);
                await loadRisks();
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

  const handleRiskPress = (risk) => {
    navigation.navigate('RiskDetail', { identifiant, risk });
  };

  const getCurrentPageRisks = () => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return risques.slice(startIndex, endIndex);
  };

  const totalPages = Math.ceil(risques.length / ITEMS_PER_PAGE);
  const currentPageRisks = getCurrentPageRisks();
  const allPageSelected = currentPageRisks.length > 0 && 
    currentPageRisks.every(r => selectedRisks.includes(r.id));

  const renderRiskItem = ({ item }) => {
    const isSelected = selectedRisks.includes(item.id);
    const riskColor = getRiskColor(item.type_risque);

    return (
      <TouchableOpacity
        style={[styles.riskItem, isSelected && styles.riskItemSelected]}
        onPress={() => handleRiskPress(item)}
        activeOpacity={0.7}
      >
        <TouchableOpacity
          style={styles.checkbox}
          onPress={(e) => {
            e.stopPropagation();
            toggleSelectRisk(item.id);
          }}
        >
          <View style={[styles.checkboxBox, isSelected && styles.checkboxBoxSelected]}>
            {isSelected && <Text style={styles.checkboxCheck}>✓</Text>}
          </View>
        </TouchableOpacity>

        <View style={styles.riskContent}>
          <View style={styles.riskHeader}>
            <View style={[styles.riskBadge, { backgroundColor: riskColor + '20' }]}>
              <Text style={styles.riskIcon}>{getRiskIcon(item.type_risque)}</Text>
              <Text style={[styles.riskType, { color: riskColor }]}>
                {item.type_risque}
              </Text>
            </View>
          </View>

          <Text style={styles.riskAddress} numberOfLines={2}>
            📍 {item.adresse}
          </Text>

          <Text style={styles.riskGPS}>
            GPS: {parseFloat(item.latitude).toFixed(4)}, {parseFloat(item.longitude).toFixed(4)}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Formulaire de recherche */}
      <View style={styles.searchContainer}>
        <Text style={styles.label}>Code Postal *</Text>
        <View style={styles.searchRow}>
          <TextInput
            style={styles.input}
            value={codePostal}
            onChangeText={setCodePostal}
            placeholder="34000"
            keyboardType="numeric"
            maxLength={5}
          />
          <TouchableOpacity
            style={[styles.searchButton, loading && styles.searchButtonDisabled]}
            onPress={loadRisks}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.searchButtonText}>🔍 Rechercher</Text>
            )}
          </TouchableOpacity>
        </View>
        {error && <Text style={styles.errorText}>{error}</Text>}
      </View>

      {/* Liste des risques */}
      {risques.length > 0 && (
        <>
          {/* En-tête avec sélection */}
          <View style={styles.listHeader}>
            <TouchableOpacity onPress={toggleSelectAll} style={styles.selectAllButton}>
              <View style={[styles.checkboxBox, allPageSelected && styles.checkboxBoxSelected]}>
                {allPageSelected && <Text style={styles.checkboxCheck}>✓</Text>}
              </View>
              <Text style={styles.selectAllText}>Tout sélectionner</Text>
            </TouchableOpacity>

            <Text style={styles.countText}>
              {risques.length} risque(s)
            </Text>
          </View>

          {/* Liste */}
          <FlatList
            data={currentPageRisks}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderRiskItem}
            contentContainerStyle={styles.list}
          />

          {/* Pagination */}
          {totalPages > 1 && (
            <View style={styles.pagination}>
              <TouchableOpacity
                style={[styles.paginationButton, currentPage === 1 && styles.paginationButtonDisabled]}
                onPress={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <Text style={styles.paginationButtonText}>← Précédent</Text>
              </TouchableOpacity>

              <Text style={styles.paginationText}>
                Page {currentPage} / {totalPages}
              </Text>

              <TouchableOpacity
                style={[styles.paginationButton, currentPage === totalPages && styles.paginationButtonDisabled]}
                onPress={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                <Text style={styles.paginationButtonText}>Suivant →</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Bouton Supprimer */}
          {selectedRisks.length > 0 && (
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={handleDeleteSelected}
            >
              <Text style={styles.deleteButtonText}>
                🗑️ Supprimer ({selectedRisks.length})
              </Text>
            </TouchableOpacity>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  searchContainer: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 8,
  },
  searchRow: {
    flexDirection: 'row',
    gap: 10,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  searchButton: {
    backgroundColor: COLORS.secondary,
    padding: 15,
    borderRadius: 10,
    justifyContent: 'center',
    minWidth: 120,
  },
  searchButtonDisabled: {
    backgroundColor: COLORS.disabled,
  },
  searchButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  errorText: {
    color: COLORS.danger,
    fontSize: 14,
    marginTop: 8,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  selectAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  selectAllText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  countText: {
    fontSize: 14,
    color: COLORS.textLight,
  },
  list: {
    padding: 10,
  },
  riskItem: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  riskItemSelected: {
    backgroundColor: '#EFF6FF',
    borderColor: COLORS.secondary,
  },
  checkbox: {
    marginRight: 15,
    justifyContent: 'center',
  },
  checkboxBox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderRadius: 5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxBoxSelected: {
    backgroundColor: COLORS.secondary,
    borderColor: COLORS.secondary,
  },
  checkboxCheck: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  riskContent: {
    flex: 1,
  },
  riskHeader: {
    marginBottom: 8,
  },
  riskBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 5,
  },
  riskIcon: {
    fontSize: 16,
  },
  riskType: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  riskAddress: {
    fontSize: 14,
    color: COLORS.text,
    marginBottom: 5,
  },
  riskGPS: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  paginationButton: {
    padding: 10,
    backgroundColor: COLORS.secondary,
    borderRadius: 8,
    minWidth: 100,
  },
  paginationButtonDisabled: {
    backgroundColor: COLORS.disabled,
  },
  paginationButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  paginationText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  deleteButton: {
    backgroundColor: COLORS.danger,
    padding: 18,
    margin: 20,
    borderRadius: 10,
    alignItems: 'center',
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});