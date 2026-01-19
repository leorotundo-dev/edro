import React, { useEffect, useMemo, useState } from 'react';
import { SafeAreaView, View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3333';

type User = {
  id: string;
  name: string;
  email: string;
  plan?: string | null;
  role?: string | null;
};

type StatsSummary = {
  totalTopics: number;
  topicsWithDueReview: number;
  accuracy: string;
  maxStreak: number;
};

type Screen = 'onboarding' | 'login' | 'dashboard';

type ApiResponse<T> = {
  success: boolean;
  data: T;
};

function PrimaryButton(props: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  const { title, onPress, disabled } = props;
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      style={[styles.button, disabled ? styles.buttonDisabled : null]}
    >
      <Text style={styles.buttonText}>{title}</Text>
    </TouchableOpacity>
  );
}

function OnboardingScreen(props: { onContinue: () => void }) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Edro</Text>
        <Text style={styles.subtitle}>Seu estudo guiado por IA, no ritmo certo.</Text>
        <Text style={styles.paragraph}>Organize revisoes, simulados e drops em uma trilha diaria simples.</Text>
        <PrimaryButton title="Comecar" onPress={props.onContinue} />
      </View>
    </SafeAreaView>
  );
}

function LoginScreen(props: {
  onLogin: (token: string, user: User) => void;
  onBack: () => void;
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = email.trim().length > 3 && password.trim().length >= 6 && !loading;

  const handleLogin = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload?.error || 'Falha no login');
      }
      props.onLogin(payload.token, payload.user);
    } catch (err: any) {
      setError(err?.message || 'Erro ao entrar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Entrar</Text>
        <Text style={styles.subtitle}>Use seu email e senha do Edro.</Text>
        <TextInput
          style={styles.input}
          placeholder="Email"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          style={styles.input}
          placeholder="Senha"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        {loading ? (
          <ActivityIndicator color="#2563eb" />
        ) : (
          <PrimaryButton title="Entrar" onPress={handleLogin} disabled={!canSubmit} />
        )}
        <TouchableOpacity onPress={props.onBack} style={styles.linkButton}>
          <Text style={styles.linkText}>Voltar</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function DashboardScreen(props: { token: string; user: User; onLogout: () => void }) {
  const [summary, setSummary] = useState<StatsSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const name = useMemo(() => props.user?.name || 'Aluno', [props.user]);

  const loadStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`${API_URL}/api/plan/stats`, {
        headers: { Authorization: `Bearer ${props.token}` },
      });
      const payload: ApiResponse<{ summary: StatsSummary }> = await res.json();
      if (!res.ok) {
        throw new Error((payload as any)?.error || 'Falha ao carregar stats');
      }
      setSummary(payload.data.summary);
    } catch (err: any) {
      setError(err?.message || 'Erro ao carregar stats');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Ola, {name}</Text>
        <Text style={styles.subtitle}>Resumo rapido do dia</Text>
        {loading ? <ActivityIndicator color="#2563eb" /> : null}
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        {summary ? (
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Topicos</Text>
              <Text style={styles.statValue}>{summary.totalTopics}</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Revisoes</Text>
              <Text style={styles.statValue}>{summary.topicsWithDueReview}</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Acerto</Text>
              <Text style={styles.statValue}>{summary.accuracy}</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Streak</Text>
              <Text style={styles.statValue}>{summary.maxStreak}</Text>
            </View>
          </View>
        ) : null}
        <PrimaryButton title="Atualizar" onPress={loadStats} disabled={loading} />
        <TouchableOpacity onPress={props.onLogout} style={styles.linkButton}>
          <Text style={styles.linkText}>Sair</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

export default function App() {
  const [screen, setScreen] = useState<Screen>('onboarding');
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);

  const handleLogin = (nextToken: string, nextUser: User) => {
    setToken(nextToken);
    setUser(nextUser);
    setScreen('dashboard');
  };

  const handleLogout = () => {
    setToken(null);
    setUser(null);
    setScreen('login');
  };

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar style="dark" />
      {screen === 'onboarding' ? (
        <OnboardingScreen onContinue={() => setScreen('login')} />
      ) : null}
      {screen === 'login' ? (
        <LoginScreen onLogin={handleLogin} onBack={() => setScreen('onboarding')} />
      ) : null}
      {screen === 'dashboard' && token && user ? (
        <DashboardScreen token={token} user={user} onLogout={handleLogout} />
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#0f172a',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 2,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#475569',
    marginBottom: 16,
  },
  paragraph: {
    fontSize: 14,
    color: '#475569',
    marginBottom: 24,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    marginBottom: 12,
    backgroundColor: '#f8fafc',
  },
  button: {
    backgroundColor: '#2563eb',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 16,
  },
  linkButton: {
    marginTop: 12,
    alignItems: 'center',
  },
  linkText: {
    color: '#2563eb',
    fontWeight: '600',
  },
  errorText: {
    color: '#dc2626',
    marginBottom: 8,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginVertical: 16,
  },
  statCard: {
    width: '47%',
    backgroundColor: '#f1f5f9',
    padding: 12,
    borderRadius: 12,
  },
  statLabel: {
    fontSize: 12,
    color: '#475569',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
});
