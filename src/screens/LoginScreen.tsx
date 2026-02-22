// src/screens/LoginScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Linking,
  Alert,
} from 'react-native';
import { useAuthStore } from '../stores/authStore';
import { COLORS, VALIDATION, MESSAGES, URLS } from '../utils/constants';
import { apiClient, getErrorMessage } from '../services/api';
import { isUsingFallback } from '../services/serverConfig';

type ServerStatus = 'idle' | 'probing' | 'ok' | 'fallback' | 'unreachable';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [serverStatus, setServerStatus] = useState<ServerStatus>('idle');

  const login = useAuthStore((state) => state.login);

  // ── Probe du serveur au montage de l'écran ────────────────────────────────
  // On le fait en arrière-plan pour que l'utilisateur puisse déjà saisir ses
  // identifiants. La probe est silencieuse sauf en cas d'échec total.
  useEffect(() => {
    probeServer();
  }, []);

  const probeServer = async (): Promise<boolean> => {
    setServerStatus('probing');
    setError('');

    try {
      const { isFallback } = await apiClient.resolveServer();
      setServerStatus(isFallback ? 'fallback' : 'ok');
      return true;
    } catch {
      setServerStatus('unreachable');
      setError(
        'Impossible de contacter le serveur.\nVérifiez votre connexion réseau ou contactez votre administrateur.'
      );
      return false;
    }
  };

  const validateForm = (): boolean => {
    if (!email || !VALIDATION.emailRegex.test(email)) {
      setError(MESSAGES.errors.invalidEmail);
      return false;
    }
    if (!password || password.length < VALIDATION.passwordMinLength) {
      setError(MESSAGES.errors.invalidPassword);
      return false;
    }
    return true;
  };

  const handleLogin = async () => {
    setError('');

    if (!validateForm()) return;

    // Si le serveur n'est pas encore résolu (probe en cours ou non démarré),
    // on tente d'abord la probe
    if (serverStatus === 'probing' || serverStatus === 'idle') {
      setLoading(true);
      const ok = await probeServer();
      if (!ok) {
        setLoading(false);
        return;
      }
    }

    // Serveur inaccessible → on relance la probe avant d'abandonner
    if (serverStatus === 'unreachable') {
      setLoading(true);
      const ok = await probeServer();
      if (!ok) {
        setLoading(false);
        Alert.alert(
          'Serveur inaccessible',
          'Impossible de contacter le serveur principal ou le serveur de secours.\n\nVérifiez votre connexion réseau.',
          [{ text: 'Réessayer', onPress: () => probeServer() }, { text: 'OK' }]
        );
        return;
      }
    }

    setLoading(true);

    try {
      await login(email.toLowerCase().trim(), password);
      // La navigation se fait automatiquement via AppNavigator
    } catch (err) {
      const message = getErrorMessage(err);
      setError(message);
      Alert.alert('Erreur de connexion', message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = () => {
    Linking.openURL(URLS.forgotPassword).catch(() => {
      Alert.alert(
        'Information',
        'Contactez votre administrateur pour réinitialiser votre mot de passe.'
      );
    });
  };

  // ── Indicateur de statut serveur ──────────────────────────────────────────
  const renderServerStatus = () => {
    switch (serverStatus) {
      case 'probing':
        return (
          <View style={styles.serverStatus}>
            <ActivityIndicator size="small" color={COLORS.primary} style={{ marginRight: 8 }} />
            <Text style={styles.serverStatusText}>Connexion au serveur en cours…</Text>
          </View>
        );
      case 'ok':
        return (
          <View style={[styles.serverStatus, styles.serverStatusOk]}>
            <Text style={styles.serverStatusTextOk}>✅ Serveur principal connecté</Text>
          </View>
        );
      case 'fallback':
        return (
          <View style={[styles.serverStatus, styles.serverStatusWarning]}>
            <Text style={styles.serverStatusTextWarning}>
              ⚠️ Serveur principal indisponible — connexion via le serveur de secours
            </Text>
          </View>
        );
      case 'unreachable':
        return (
          <View style={[styles.serverStatus, styles.serverStatusError]}>
            <Text style={styles.serverStatusTextError}>
              🔴 Serveur inaccessible
            </Text>
            <TouchableOpacity onPress={probeServer} style={styles.retryButton}>
              <Text style={styles.retryText}>Réessayer</Text>
            </TouchableOpacity>
          </View>
        );
      default:
        return null;
    }
  };

  const isServerUnreachable = serverStatus === 'unreachable';

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Text style={styles.logoIcon}>🛡️</Text>
          </View>
          <Text style={styles.title}>GeoSentinel</Text>
          <Text style={styles.subtitle}>Gestion des Risques Géolocalisés</Text>
        </View>

        {/* Statut serveur */}
        {renderServerStatus()}

        {/* Formulaire */}
        <View style={styles.form}>
          <Text style={styles.formTitle}>Connexion</Text>

          {/* Email */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email *</Text>
            <TextInput
              style={[styles.input, (error || isServerUnreachable) && styles.inputError]}
              value={email}
              onChangeText={(text) => { setEmail(text); setError(''); }}
              placeholder="votre.email@exemple.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading && !isServerUnreachable}
            />
          </View>

          {/* Mot de passe */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Mot de passe *</Text>
            <TextInput
              style={[styles.input, (error || isServerUnreachable) && styles.inputError]}
              value={password}
              onChangeText={(text) => { setPassword(text); setError(''); }}
              placeholder="••••••••"
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading && !isServerUnreachable}
            />
          </View>

          {/* Message d'erreur */}
          {error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>⚠️ {error}</Text>
            </View>
          ) : null}

          {/* Mot de passe oublié */}
          <TouchableOpacity
            style={styles.forgotPassword}
            onPress={handleForgotPassword}
            disabled={loading}
          >
            <Text style={styles.forgotPasswordText}>Mot de passe oublié ?</Text>
          </TouchableOpacity>

          {/* Bouton Connexion */}
          <TouchableOpacity
            style={[
              styles.button,
              (!email || !password || loading || isServerUnreachable) && styles.buttonDisabled,
            ]}
            onPress={handleLogin}
            disabled={!email || !password || loading || isServerUnreachable}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Se connecter →</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Info */}
        <View style={styles.info}>
          <Text style={styles.infoText}>
            💡 Utilisez votre adresse email professionnelle et le mot de passe
            fourni par votre administrateur
          </Text>
        </View>

        {/* Version */}
        <Text style={styles.version}>Version 2.0.0</Text>
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
    marginBottom: 20,
  },
  logoContainer: {
    width: 100,
    height: 100,
    borderRadius: 20,
    backgroundColor: 'rgba(6, 182, 212, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  logoIcon: { fontSize: 50 },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textLight,
    textAlign: 'center',
  },

  // ── Statut serveur ─────────────────────────────────────────────────────────
  serverStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    borderRadius: 10,
    marginBottom: 12,
    backgroundColor: '#f1f5f9',
  },
  serverStatusOk: { backgroundColor: '#f0fdf4' },
  serverStatusWarning: { backgroundColor: '#fffbeb', flexDirection: 'column' },
  serverStatusError: { backgroundColor: '#fef2f2', flexDirection: 'column', alignItems: 'center', gap: 8 },
  serverStatusText: { color: COLORS.textLight, fontSize: 13 },
  serverStatusTextOk: { color: '#166534', fontSize: 13, fontWeight: '600' },
  serverStatusTextWarning: { color: '#92400e', fontSize: 13, fontWeight: '600', textAlign: 'center' },
  serverStatusTextError: { color: '#991b1b', fontSize: 13, fontWeight: '700' },
  retryButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 8,
  },
  retryText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  // ── Formulaire ─────────────────────────────────────────────────────────────
  form: {
    backgroundColor: COLORS.cardBackground,
    padding: 25,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 20,
  },
  inputGroup: { marginBottom: 20 },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  input: {
    borderWidth: 2,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 15,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  inputError: { borderColor: COLORS.danger },
  errorContainer: {
    backgroundColor: '#fee2e2',
    padding: 12,
    borderRadius: 10,
    marginBottom: 15,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.danger,
  },
  errorText: { color: COLORS.danger, fontSize: 14 },
  forgotPassword: { alignItems: 'center', marginBottom: 20 },
  forgotPasswordText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  button: {
    backgroundColor: COLORS.primary,
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonDisabled: { backgroundColor: COLORS.disabled },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  info: {
    marginTop: 20,
    padding: 15,
    backgroundColor: '#fef3c7',
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.warning,
  },
  infoText: { fontSize: 13, color: COLORS.text, lineHeight: 20 },
  version: {
    textAlign: 'center',
    color: COLORS.textLight,
    fontSize: 12,
    marginTop: 20,
  },
});
