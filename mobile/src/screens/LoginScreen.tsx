import axios from 'axios';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '../context/AuthContext';

function getErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err) && err.response?.data) {
    const data = err.response.data as Record<string, unknown>;
    const errors = data.errors;
    if (errors && typeof errors === 'object') {
      const phone = (errors as Record<string, string[]>).phone;
      if (Array.isArray(phone) && typeof phone[0] === 'string') {
        return phone[0];
      }
      const password = (errors as Record<string, string[]>).password;
      if (Array.isArray(password) && typeof password[0] === 'string') {
        return password[0];
      }
    }
    if (typeof data.message === 'string') {
      return data.message;
    }
  }
  if (err instanceof Error) {
    return err.message;
  }
  return 'Something went wrong. Try again.';
}

export function LoginScreen(): React.JSX.Element {
  const { signIn } = useAuth();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit() {
    setError(null);
    const p = phone.trim();
    if (!p || !password) {
      setError('Enter phone and password.');
      return;
    }
    setSubmitting(true);
    try {
      await signIn(p, password);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
          <View style={styles.hero}>
            <Text style={styles.brand}>Janani Hardware</Text>
            <Text style={styles.tagline}>Sign in to continue</Text>
          </View>

          <View style={styles.card}>
            <View style={styles.field}>
              <Text style={styles.label}>Phone</Text>
              <TextInput
                style={styles.input}
                placeholder="Your mobile number"
                placeholderTextColor="#94a3b8"
                keyboardType="phone-pad"
                autoCapitalize="none"
                autoCorrect={false}
                value={phone}
                onChangeText={setPhone}
                editable={!submitting}
              />
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter password"
                placeholderTextColor="#94a3b8"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
                editable={!submitting}
              />
            </View>
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <TouchableOpacity
              style={[styles.button, submitting && styles.buttonDisabled]}
              onPress={() => {
                onSubmit().catch(() => {});
              }}
              disabled={submitting}
              activeOpacity={0.85}>
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonLabel}>Sign in</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#eef2f7',
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  hero: {
    marginBottom: 28,
    alignItems: 'center',
  },
  brand: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
    color: '#0f172a',
    textAlign: 'center',
  },
  tagline: {
    marginTop: 8,
    fontSize: 15,
    color: '#64748b',
    fontWeight: '500',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#e2e8f0',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.06,
    shadowRadius: 24,
    elevation: 4,
  },
  field: {
    marginBottom: 18,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 8,
    letterSpacing: 0.2,
  },
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 14 : 12,
    fontSize: 16,
    color: '#0f172a',
  },
  error: {
    color: '#dc2626',
    marginBottom: 14,
    fontSize: 14,
    lineHeight: 20,
  },
  button: {
    backgroundColor: '#1e40af',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 4,
    shadowColor: '#1e40af',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  buttonDisabled: {
    opacity: 0.75,
  },
  buttonLabel: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});
