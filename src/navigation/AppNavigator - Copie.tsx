// src/navigation/AppNavigator.tsx
import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useAuthStore } from '../stores/authStore';
import { COLORS } from '../utils/constants';

// Screens
import LoginScreen from '../screens/LoginScreen';
import ListRisksScreen from '../screens/ListRisksScreen';
import CreateRiskScreen from '../screens/CreateRiskScreen';
import RiskDetailScreen from '../screens/RiskDetailScreen';

const Stack = createStackNavigator();

export default function AppNavigator() {
  const { user, isAuthenticated, isLoading, loadUser } = useAuthStore();

  useEffect(() => {
    loadUser();
  }, []);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {!isAuthenticated ? (
        // Stack d'authentification
        <Stack.Navigator
          screenOptions={{
            headerStyle: {
              backgroundColor: COLORS.primary,
            },
            headerTintColor: '#fff',
            headerTitleStyle: {
              fontWeight: 'bold',
            },
          }}
        >
          <Stack.Screen
            name="Login"
            component={LoginScreen}
            options={{
              headerShown: false,
            }}
          />
        </Stack.Navigator>
      ) : (
        // Stack principal (après connexion)
        <Stack.Navigator
          screenOptions={{
            headerStyle: {
              backgroundColor: COLORS.primary,
              elevation: 5,
              shadowOpacity: 0.3,
            },
            headerTintColor: '#fff',
            headerTitleStyle: {
              fontWeight: 'bold',
              fontSize: 18,
            },
            headerBackTitleVisible: false,
          }}
        >
          <Stack.Screen
            name="ListRisks"
            component={ListRisksScreen}
            options={{
              title: '📍 Mes Risques',
              headerRight: () => {
                const logout = useAuthStore((state) => state.logout);
                return (
                  <View style={styles.headerRight}>
                    <TouchableOpacity
                      onPress={() => logout()}
                      style={styles.logoutButton}
                    >
                      <Text style={styles.logoutText}>Déconnexion</Text>
                    </TouchableOpacity>
                  </View>
                );
              },
            }}
          />

          <Stack.Screen
            name="CreateRisk"
            component={CreateRiskScreen}
            options={{
              title: '➕ Nouveau Risque',
            }}
          />

          <Stack.Screen
            name="RiskDetail"
            component={RiskDetailScreen}
            options={{
              title: '🔍 Détail du Risque',
            }}
          />
        </Stack.Navigator>
      )}
    </NavigationContainer>
  );
}

// Import TouchableOpacity et Text pour le bouton de déconnexion
import { TouchableOpacity, Text } from 'react-native';

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  headerRight: {
    marginRight: 15,
  },
  logoutButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 8,
  },
  logoutText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
