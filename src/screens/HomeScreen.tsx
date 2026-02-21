// src/screens/HomeScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
    ActivityIndicator,
} from 'react-native';
//import { SafeAreaView } from 'react-native-safe-area-context';
import { SafeAreaView } from 'react-native';
import { useAuthStore } from '../stores/authStore';
import { apiClient } from '../services/api';
import { COLORS } from '../utils/constants';

interface Props {
  navigation: any;
}

export default function HomeScreen({ navigation }: Props) {
  // ✅ Appeler les hooks AVANT tout return conditionnel
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  
  // ✅ États pour le message dashboard
  const [dashboardMessage, setDashboardMessage] = useState<string | null>(null);
  const [loadingMessage, setLoadingMessage] = useState(true);

  // 🆕 NOUVEAUX ÉTATS : Vérification abonnement
  const [subscriptionValid, setSubscriptionValid] = useState<boolean>(true);
  const [subscriptionLoading, setSubscriptionLoading] = useState(true);
  const [daysRemaining, setDaysRemaining] = useState<number>(0);

  useEffect(() => {
    loadDashboardMessage();
    checkSubscriptionValidity();  // 🆕 Vérifier abonnement
  }, []);

  const loadDashboardMessage = async () => {
    try {
      const response = await apiClient.getDashboardMessage();
      setDashboardMessage(response.dashboardMessage);
    } catch (error) {
      console.error('Erreur chargement message dashboard:', error);
    } finally {
      setLoadingMessage(false);
    }
  };

  // 🆕 NOUVELLE FONCTION : Vérifier validité abonnement
  const checkSubscriptionValidity = async () => {
    setSubscriptionLoading(true);
    try {
      const status = await apiClient.checkSubscriptionStatus();
      setSubscriptionValid(status.isValid);
      setDaysRemaining(status.daysRemaining);
      
      console.log('📊 Abonnement:', status.isValid ? 'Valide' : 'Expiré');
      if (status.isValid) {
        console.log(`⏳ Jours restants: ${status.daysRemaining}`);
      }
    } catch (error) {
      console.error('❌ Erreur vérification abonnement:', error);
      setSubscriptionValid(false);
    } finally {
      setSubscriptionLoading(false);
    }
  };

  const menuItems = [
    {
      title: '📍 Géolocalisation',
      subtitle: 'Activer le suivi GPS et les alertes de proximité',
      icon: '🗺️',
      color: COLORS.primary,
      onPress: () => navigation.navigate('Geolocation'),
    },
    {
      title: '📋 Mes Risques',
      subtitle: 'Consulter, créer et gérer les risques',
      icon: '⚠️',
      color: COLORS.secondary,
      onPress: () => navigation.navigate('ListRisks'),
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Text style={styles.logoIcon}>🛡️</Text>
          </View>
          <Text style={styles.title}>GeoSentinel</Text>
          <Text style={styles.subtitle}>Bienvenue {user?.email}</Text>
        </View>

        {/* ✅ Message Dashboard Global */}
        {dashboardMessage && !loadingMessage && (
          <View style={styles.alertBanner}>
            <Text style={styles.alertIcon}>📢</Text>
            <View style={styles.alertContent}>
              <Text style={styles.alertTitle}>Message important</Text>
              <Text style={styles.alertMessage}>{dashboardMessage}</Text>
            </View>
          </View>
        )}

        {loadingMessage && (
          <View style={styles.loadingBanner}>
            <ActivityIndicator size="small" color={COLORS.primary} />
            <Text style={styles.loadingText}>Chargement...</Text>
          </View>
        )}

        {/* 🆕 BANNIÈRE ABONNEMENT EXPIRÉ */}
        {!subscriptionLoading && !subscriptionValid && (
          <View style={styles.expiredBanner}>
            <Text style={styles.expiredIcon}>🚫</Text>
            <View style={styles.expiredContent}>
              <Text style={styles.expiredTitle}>Abonnement terminé</Text>
              <Text style={styles.expiredMessage}>
                Veuillez contacter votre administrateur pour le renouvellement.
              </Text>
            </View>
          </View>
        )}

        {/* 🆕 ALERTE SI ABONNEMENT EXPIRE BIENTÔT (< 7 jours) */}
        {!subscriptionLoading && subscriptionValid && daysRemaining > 0 && daysRemaining <= 7 && (
          <View style={styles.warningBanner}>
            <Text style={styles.warningIcon}>⚠️</Text>
            <View style={styles.warningContent}>
              <Text style={styles.warningTitle}>Abonnement arrive à expiration</Text>
              <Text style={styles.warningMessage}>
                Plus que {daysRemaining} jour{daysRemaining > 1 ? 's' : ''} restant{daysRemaining > 1 ? 's' : ''}.
              </Text>
            </View>
          </View>
        )}

        {/* Menu principal */}
        <View style={styles.menu}>
          <Text style={styles.menuTitle}>Que souhaitez-vous faire ?</Text>
          
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.menuItem,
                { borderLeftColor: item.color, borderLeftWidth: 4 },
                !subscriptionValid && styles.menuItemDisabled,  // 🆕 Griser si expiré
              ]}
              onPress={subscriptionValid ? item.onPress : undefined}  // 🆕 Désactiver si expiré
              activeOpacity={subscriptionValid ? 0.7 : 1}
              disabled={!subscriptionValid}  // 🆕 Bouton désactivé
            >
              <View style={styles.menuItemIcon}>
                <Text style={styles.menuItemIconText}>{item.icon}</Text>
              </View>
              <View style={styles.menuItemContent}>
                <Text style={[
                  styles.menuItemTitle,
                  !subscriptionValid && styles.textDisabled,  // 🆕
                ]}>
                  {item.title}
                </Text>
                <Text style={[
                  styles.menuItemSubtitle,
                  !subscriptionValid && styles.textDisabled,  // 🆕
                ]}>
                  {item.subtitle}
                </Text>
              </View>
              <Text style={[
                styles.menuItemArrow,
                !subscriptionValid && styles.textDisabled,  // 🆕
              ]}>
                ›
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Info */}
        {subscriptionValid && (  // 🆕 Afficher uniquement si abonnement valide
          <View style={styles.infoCard}>
            <Text style={styles.infoIcon}>💡</Text>
            <Text style={styles.infoText}>
              <Text style={styles.infoBold}>Géolocalisation :</Text> Active le suivi en arrière-plan et reçois des alertes lorsque tu approches d'un risque.
              {'\n\n'}
              <Text style={styles.infoBold}>Mes Risques :</Text> Consulte la liste complète et crée de nouveaux signalements.
            </Text>
          </View>
        )}

        {/* Bouton déconnexion */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={logout}
        >
          <Text style={styles.logoutText}>🚪 Se déconnecter</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
    marginTop: 20,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: 'rgba(6, 182, 212, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  logoIcon: {
    fontSize: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textLight,
    textAlign: 'center',
  },
  // ✅ Styles pour le message dashboard
  alertBanner: {
    backgroundColor: '#FF9800',
    marginBottom: 20,
    borderRadius: 12,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
  },
  alertIcon: {
    fontSize: 28,
    marginRight: 12,
  },
  alertContent: {
    flex: 1,
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  alertMessage: {
    fontSize: 14,
    color: '#fff',
    lineHeight: 20,
    opacity: 0.95,
  },
  loadingBanner: {
    marginBottom: 20,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginLeft: 10,
    fontSize: 14,
    color: COLORS.textLight,
  },
  // 🆕 STYLES BANNIÈRE ABONNEMENT EXPIRÉ
  expiredBanner: {
    backgroundColor: '#EF4444',
    marginBottom: 20,
    borderRadius: 12,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
  },
  expiredIcon: {
    fontSize: 28,
    marginRight: 12,
  },
  expiredContent: {
    flex: 1,
  },
  expiredTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  expiredMessage: {
    fontSize: 14,
    color: '#fff',
    lineHeight: 20,
  },
  // 🆕 STYLES AVERTISSEMENT EXPIRATION PROCHE
  warningBanner: {
    backgroundColor: '#F59E0B',
    marginBottom: 20,
    borderRadius: 12,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  warningIcon: {
    fontSize: 28,
    marginRight: 12,
  },
  warningContent: {
    flex: 1,
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  warningMessage: {
    fontSize: 14,
    color: '#fff',
    lineHeight: 20,
  },
  menu: {
    marginBottom: 30,
  },
  menuTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 20,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.cardBackground,
    padding: 20,
    borderRadius: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  // 🆕 STYLE BOUTON DÉSACTIVÉ
  menuItemDisabled: {
    opacity: 0.5,
    backgroundColor: '#F3F4F6',
  },
  textDisabled: {
    color: '#9CA3AF',
  },
  menuItemIcon: {
    width: 50,
    height: 50,
    borderRadius: 12,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  menuItemIconText: {
    fontSize: 28,
  },
  menuItemContent: {
    flex: 1,
  },
  menuItemTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 4,
  },
  menuItemSubtitle: {
    fontSize: 12,
    color: COLORS.textLight,
    lineHeight: 16,
  },
  menuItemArrow: {
    fontSize: 32,
    color: COLORS.textLight,
    marginLeft: 10,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#fef3c7',
    padding: 15,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.warning,
    marginBottom: 20,
  },
  infoIcon: {
    fontSize: 24,
    marginRight: 10,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.text,
    lineHeight: 20,
  },
  infoBold: {
    fontWeight: 'bold',
  },
  logoutButton: {
    backgroundColor: COLORS.textLight,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  logoutText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
