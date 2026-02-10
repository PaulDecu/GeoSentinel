// screens/MenuScreen.js
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  BackHandler,
} from 'react-native';
import { COLORS } from '../utils/constants';

export default function MenuScreen({ route, navigation }) {
  const { identifiant } = route.params;

  const handleExit = () => {
    Alert.alert(
      'Quitter l\'application',
      'Voulez-vous vraiment quitter ?',
      [
        { text: 'Annuler', style: 'cancel' },
        { 
          text: 'Quitter', 
          style: 'destructive',
          onPress: () => BackHandler.exitApp()
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.welcomeText}>Bienvenue</Text>
        <Text style={styles.identifiantText}>{identifiant}</Text>
      </View>

      <View style={styles.menuContainer}>
        <TouchableOpacity 
          style={styles.menuItem}
          onPress={() => navigation.navigate('CreateRisk', { identifiant })}
        >
          <Text style={styles.menuIcon}>➕</Text>
          <Text style={styles.menuTitle}>Enregistrer un Risque</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.menuItem}
          onPress={() => navigation.navigate('ListRisks', { identifiant })}
        >
          <Text style={styles.menuIcon}>📋</Text>
          <Text style={styles.menuTitle}>Lister les Risques</Text>
        </TouchableOpacity>

        <TouchableOpacity 
           style={styles.menuItem}
            onPress={() => navigation.navigate('GeolocRisk', { identifiant })}
            >
          <Text style={styles.menuIcon}>📍</Text>
          <Text style={styles.menuTitle}>Géolocalisation Active</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={handleExit}>
          <Text style={styles.menuIcon}>🚪</Text>
          <Text style={styles.menuTitle}>Fermer l'Application</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    backgroundColor: COLORS.primary,
    padding: 20,
    paddingTop: 10,
    paddingBottom: 30,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  welcomeText: {
    fontSize: 16,
    color: '#fff',
    opacity: 0.9,
  },
  identifiantText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 5,
    letterSpacing: 2,
  },
  menuContainer: {
    flex: 1,
    padding: 20,
  },
  menuItem: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: 15,
    marginBottom: 15,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  menuIcon: {
    fontSize: 32,
    marginRight: 15,
  },
  menuTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    flex: 1,
  },
  menuSubtitle: {
    fontSize: 12,
    color: COLORS.textLight,
    fontStyle: 'italic',
  },
});