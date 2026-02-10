// screens/HomeScreen.js
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { COLORS, VALIDATION, MESSAGES } from '../utils/constants';

export default function HomeScreen({ navigation }) {
  const [identifiant, setIdentifiant] = useState('');
  const [error, setError] = useState('');

  const handleContinue = () => {
    if (!identifiant || identifiant.length !== VALIDATION.identifiantLength) {
      setError(MESSAGES.errors.invalidIdentifiant);
      return;
    }

    setError('');
    navigation.navigate('Menu', { identifiant: identifiant.toUpperCase() });
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.icon}>⚠️</Text>
          <Text style={styles.title}>Gestion des Risques</Text>
          <Text style={styles.subtitle}>Sécurisez votre tournée</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>
            Identifiant * <Text style={styles.labelInfo}>(7 caractères)</Text>
          </Text>
          <TextInput
            style={[styles.input, error && styles.inputError]}
            value={identifiant}
            onChangeText={(text) => {
              setIdentifiant(text.toUpperCase());
              setError('');
            }}
            placeholder="PRES001"
            maxLength={7}
            autoCapitalize="characters"
            autoCorrect={false}
          />
          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <TouchableOpacity
            style={[
              styles.button,
              identifiant.length !== 7 && styles.buttonDisabled,
            ]}
            onPress={handleContinue}
            disabled={identifiant.length !== 7}
          >
            <Text style={styles.buttonText}>Continuer →</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.info}>
          <Text style={styles.infoText}>
            💡 Cette application permet de signaler et localiser les risques
            rencontrés lors de vos tournées
          </Text>
        </View>
      </View>
    </KeyboardAvoidingView>
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
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  icon: {
    fontSize: 80,
    marginBottom: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textLight,
  },
  form: {
    backgroundColor: COLORS.cardBackground,
    padding: 20,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 8,
  },
  labelInfo: {
    fontSize: 14,
    fontWeight: 'normal',
    color: COLORS.textLight,
  },
  input: {
    borderWidth: 2,
    borderColor: COLORS.border,
    borderRadius: 10,
    padding: 15,
    fontSize: 18,
    fontWeight: '600',
    backgroundColor: '#fff',
    textAlign: 'center',
    letterSpacing: 2,
  },
  inputError: {
    borderColor: COLORS.danger,
  },
  errorText: {
    color: COLORS.danger,
    fontSize: 14,
    marginTop: 5,
  },
  button: {
    backgroundColor: COLORS.primary,
    padding: 16,
    borderRadius: 10,
    marginTop: 20,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: COLORS.disabled,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  info: {
    marginTop: 30,
    padding: 15,
    backgroundColor: '#FEF3C7',
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.warning,
  },
  infoText: {
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 20,
  },
});