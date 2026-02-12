// src/screens/ListRisksScreen.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { apiClient, getErrorMessage } from '../services/api';
import { COLORS, RISK_CATEGORIES, RISK_SEVERITIES } from '../utils/constants';
import { Risk, RiskCategory, RiskSeverity } from '../types';

import { useAuthStore } from '../stores/authStore';

interface Props {
  navigation: any;
}

export default function ListRisksScreen({ navigation }: Props) {
  const [risks, setRisks] = useState<Risk[]>([]);
  const [filteredRisks, setFilteredRisks] = useState<Risk[]>([]);
  const [selectedRisks, setSelectedRisks] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  

  // Charger les risques au focus de l'écran
  useFocusEffect(
    useCallback(() => {
      loadRisks();
    }, [])
  );

  const loadRisks = async (isRefreshing = false) => {
    if (isRefreshing) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const data = await apiClient.getRisks();
      setRisks(data);
      applyFilters(data, categoryFilter, severityFilter);
    } catch (error) {
      Alert.alert('Erreur', getErrorMessage(error));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

   const user = useAuthStore((state) => state.user);

  const applyFilters = (
    risksList: Risk[],
    catFilter: string,
    sevFilter: string
  ) => {
    let filtered = risksList;

    if (catFilter !== 'all') {
      filtered = filtered.filter((r) => r.category === catFilter);
    }

    if (sevFilter !== 'all') {
      filtered = filtered.filter((r) => r.severity === sevFilter);
    }


    // NOUVEAU : Filtrage par Utilisateur
  // Si l'utilisateur est un simple "UTILISATEUR", il ne voit que ses créations
  if (user?.role === 'utilisateur') { 
    filtered = filtered.filter((r) => r.createdByUserId === user.id);
   }

    setFilteredRisks(filtered);
  };

  useEffect(() => {
    applyFilters(risks, categoryFilter, severityFilter);
  }, [categoryFilter, severityFilter, risks]);

  const toggleSelectRisk = (id: string) => {
    setSelectedRisks((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedRisks.size === filteredRisks.length && filteredRisks.length > 0) {
      setSelectedRisks(new Set());
    } else {
      setSelectedRisks(new Set(filteredRisks.map((r) => r.id)));
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedRisks.size === 0) {
      Alert.alert('Attention', 'Aucun risque sélectionné');
      return;
    }

    Alert.alert(
      'Confirmer la suppression',
      `Supprimer ${selectedRisks.size} risque(s) ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              const result = await apiClient.deleteMultipleRisks(
                Array.from(selectedRisks)
              );
              Alert.alert(
                'Succès',
                `${result.success.length} risque(s) supprimé(s)`
              );
              setSelectedRisks(new Set());
              await loadRisks();
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

  const handleRiskPress = (risk: Risk) => {
    navigation.navigate('RiskDetail', { risk });
  };

  const getCategoryIcon = (category: RiskCategory) => {
    const cat = RISK_CATEGORIES.find((c) => c.value === category);
    return cat ? cat.icon : '⚠️';
  };

  const getCategoryColor = (category: RiskCategory) => {
    const cat = RISK_CATEGORIES.find((c) => c.value === category);
    return cat ? cat.color : COLORS.textLight;
  };

  const getSeverityData = (severity: RiskSeverity) => {
    const sev = RISK_SEVERITIES.find((s) => s.value === severity);
    return (
      sev || {
        icon: '⚪',
        color: COLORS.textLight,
        bgColor: '#f1f5f9',
      }
    );
  };

  const renderRiskItem = ({ item }: { item: Risk }) => {
    const isSelected = selectedRisks.has(item.id);
    const categoryColor = getCategoryColor(item.category);
    const severityData = getSeverityData(item.severity);

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
          <View
            style={[
              styles.checkboxBox,
              isSelected && styles.checkboxBoxSelected,
            ]}
          >
            {isSelected && <Text style={styles.checkboxCheck}>✓</Text>}
          </View>
        </TouchableOpacity>

        <View style={styles.riskContent}>
          <View style={styles.riskHeader}>
            <View style={styles.badges}>
              <View
                style={[
                  styles.categoryBadge,
                  { backgroundColor: categoryColor + '20' },
                ]}
              >
                <Text style={styles.categoryIcon}>
                  {getCategoryIcon(item.category)}
                </Text>
                <Text style={[styles.categoryText, { color: categoryColor }]}>
                  {item.category}
                </Text>
              </View>

              <View
                style={[
                  styles.severityBadge,
                  { backgroundColor: severityData.bgColor },
                ]}
              >
                <Text style={styles.severityIcon}>{severityData.icon}</Text>
                <Text
                  style={[styles.severityText, { color: severityData.color }]}
                >
                  {item.severity}
                </Text>
              </View>
            </View>
          </View>

          <Text style={styles.riskTitle} numberOfLines={2}>
            {item.title}
          </Text>

          {item.description && (
            <Text style={styles.riskDescription} numberOfLines={2}>
              {item.description}
            </Text>
          )}

          <View style={styles.riskFooter}>
            <Text style={styles.riskGPS}>
              📍 {item.latitude.toFixed(4)}, {item.longitude.toFixed(4)}
            </Text>
            <Text style={styles.riskDate}>
              {new Date(item.createdAt).toLocaleDateString('fr-FR')}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderHeader = () => (
    <View>
      {/* Filtres */}
      <View style={styles.filters}>
        <View style={styles.filterRow}>
          <View style={styles.filterGroup}>
            <Text style={styles.filterLabel}>Catégorie</Text>
            <View style={styles.filterButtons}>
              <TouchableOpacity
                style={[
                  styles.filterButton,
                  categoryFilter === 'all' && styles.filterButtonActive,
                ]}
                onPress={() => setCategoryFilter('all')}
              >
                <Text
                  style={[
                    styles.filterButtonText,
                    categoryFilter === 'all' && styles.filterButtonTextActive,
                  ]}
                >
                  Toutes
                </Text>
              </TouchableOpacity>
              {RISK_CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat.value}
                  style={[
                    styles.filterButton,
                    categoryFilter === cat.value && styles.filterButtonActive,
                  ]}
                  onPress={() => setCategoryFilter(cat.value)}
                >
                  <Text style={styles.filterButtonText}>{cat.icon}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.filterGroup}>
            <Text style={styles.filterLabel}>Sévérité</Text>
            <View style={styles.filterButtons}>
              <TouchableOpacity
                style={[
                  styles.filterButton,
                  severityFilter === 'all' && styles.filterButtonActive,
                ]}
                onPress={() => setSeverityFilter('all')}
              >
                <Text
                  style={[
                    styles.filterButtonText,
                    severityFilter === 'all' && styles.filterButtonTextActive,
                  ]}
                >
                  Toutes
                </Text>
              </TouchableOpacity>
              {RISK_SEVERITIES.map((sev) => (
                <TouchableOpacity
                  key={sev.value}
                  style={[
                    styles.filterButton,
                    severityFilter === sev.value && styles.filterButtonActive,
                  ]}
                  onPress={() => setSeverityFilter(sev.value)}
                >
                  <Text style={styles.filterButtonText}>{sev.icon}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </View>

      {/* En-tête liste */}
      <View style={styles.listHeader}>
        <TouchableOpacity
          onPress={toggleSelectAll}
          style={styles.selectAllButton}
        >
          <View
            style={[
              styles.checkboxBox,
              selectedRisks.size === filteredRisks.length &&
                filteredRisks.length > 0 &&
                styles.checkboxBoxSelected,
            ]}
          >
            {selectedRisks.size === filteredRisks.length &&
              filteredRisks.length > 0 && (
                <Text style={styles.checkboxCheck}>✓</Text>
              )}
          </View>
          <Text style={styles.selectAllText}>Tout sélectionner</Text>
        </TouchableOpacity>

        <Text style={styles.countText}>{filteredRisks.length} risque(s)</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Chargement...</Text>
        </View>
      ) : (
        <>
          <FlatList
            data={filteredRisks}
            keyExtractor={(item) => item.id}
            renderItem={renderRiskItem}
            ListHeaderComponent={renderHeader}
            contentContainerStyle={styles.list}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => loadRisks(true)}
                colors={[COLORS.primary]}
              />
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyIcon}>📭</Text>
                <Text style={styles.emptyText}>Aucun risque à afficher</Text>
              </View>
            }
          />

          {/* Boutons d'action */}
          <View style={styles.actions}>
            {selectedRisks.size > 0 && (
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={handleDeleteSelected}
              >
                <Text style={styles.deleteButtonText}>
                  🗑️ Supprimer ({selectedRisks.size})
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.createButton}
              onPress={() => navigation.navigate('CreateRisk')}
            >
              <Text style={styles.createButtonText}>+ Nouveau risque</Text>
            </TouchableOpacity>
          </View>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: COLORS.textLight,
    fontSize: 14,
  },
  filters: {
    backgroundColor: '#fff',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  filterRow: {
    gap: 15,
  },
  filterGroup: {
    marginBottom: 10,
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textLight,
    marginBottom: 8,
  },
  filterButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterButtonText: {
    fontSize: 12,
    color: COLORS.text,
    fontWeight: '600',
  },
  filterButtonTextActive: {
    color: '#fff',
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
    fontWeight: '600',
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
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  riskItemSelected: {
    backgroundColor: '#eff6ff',
    borderColor: COLORS.primary,
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
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxBoxSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
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
    marginBottom: 10,
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 5,
  },
  categoryIcon: {
    fontSize: 14,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  severityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 5,
  },
  severityIcon: {
    fontSize: 12,
  },
  severityText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  riskTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 5,
  },
  riskDescription: {
    fontSize: 14,
    color: COLORS.textLight,
    marginBottom: 8,
  },
  riskFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  riskGPS: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  riskDate: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 40,
  },
  emptyIcon: {
    fontSize: 60,
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.textLight,
  },
  actions: {
    padding: 15,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: 10,
  },
  deleteButton: {
    backgroundColor: COLORS.danger,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  createButton: {
    backgroundColor: COLORS.primary,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
