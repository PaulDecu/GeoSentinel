// src/screens/HomeScreen.tsx
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { useAuthStore } from '../stores/authStore';
import { COLORS } from '../utils/constants';

interface Props {
  navigation: any;
}

export default function HomeScreen({ navigation }: Props) {
  // ✅ Appeler les hooks AVANT tout return conditionnel
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

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

        {/* Menu principal */}
        <View style={styles.menu}>
          <Text style={styles.menuTitle}>Que souhaitez-vous faire ?</Text>
          
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.menuItem,
                { borderLeftColor: item.color, borderLeftWidth: 4 }
              ]}
              onPress={item.onPress}
              activeOpacity={0.7}
            >
              <View style={styles.menuItemIcon}>
                <Text style={styles.menuItemIconText}>{item.icon}</Text>
              </View>
              <View style={styles.menuItemContent}>
                <Text style={styles.menuItemTitle}>{item.title}</Text>
                <Text style={styles.menuItemSubtitle}>{item.subtitle}</Text>
              </View>
              <Text style={styles.menuItemArrow}>›</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Info */}
        <View style={styles.infoCard}>
          <Text style={styles.infoIcon}>💡</Text>
          <Text style={styles.infoText}>
            <Text style={styles.infoBold}>Géolocalisation :</Text> Active le suivi en arrière-plan et reçois des alertes lorsque tu approches d'un risque.
            {'\n\n'}
            <Text style={styles.infoBold}>Mes Risques :</Text> Consulte la liste complète et crée de nouveaux signalements.
          </Text>
        </View>

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
    marginBottom: 40,
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