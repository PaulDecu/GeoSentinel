// navigation/AppNavigator.js
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

// Import des écrans
import HomeScreen from '../screens/HomeScreen';
import MenuScreen from '../screens/MenuScreen';
import CreateRiskScreen from '../screens/CreateRiskScreen';
import ListRisksScreen from '../screens/ListRisksScreen';
import RiskDetailScreen from '../screens/RiskDetailScreen';
import TestScreen from '../screens/TestScreen';

const Stack = createStackNavigator();

const AppNavigator = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Home"
        screenOptions={{
          headerStyle: {
            backgroundColor: '#EF4444',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      >
        {/* Écran d'accueil */}
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{ 
            title: '🛡️ Gestion Risques',
            headerLeft: () => null, // Empêche le retour
          }}
        />

        {/* Menu principal */}
        <Stack.Screen
          name="Menu"
          component={MenuScreen}
          options={{ 
            title: '📋 Menu Principal',
            headerLeft: () => null, // Empêche le retour au Home
          }}
        />

        {/* Créer un risque */}
        <Stack.Screen
          name="CreateRisk"
          component={CreateRiskScreen}
          options={{ title: '➕ Nouveau Risque' }}
        />

        {/* Liste des risques */}
        <Stack.Screen
          name="ListRisks"
          component={ListRisksScreen}
          options={{ title: '📋 Liste des Risques' }}
        />

        {/* Détail d'un risque */}
        <Stack.Screen
          name="RiskDetail"
          component={RiskDetailScreen}
          options={{ title: '🔍 Détail du Risque' }}
        />

        {/* Géolocalisation active (votre TestScreen actuel) */}
        <Stack.Screen
          name="GeolocRisk"
          component={TestScreen}
          options={{ title: '📍 Géolocalisation Active' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;