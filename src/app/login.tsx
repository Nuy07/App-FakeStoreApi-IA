import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useAuth } from './_layout';
import { AuthService } from '../services/AuthService';

export default function LoginScreen() {
  // Obtiene la función del contexto que actualiza la sesión y navega al catálogo.
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // Valida el formulario, solicita autenticación a la API y guarda el usuario recibido.
  const handleLogin = async () => {
    if (!username || !password) {
      Alert.alert('Error', 'Por favor ingresa usuario y contraseña');
      return;
    }
    setLoading(true);
    try {
      // AuthService se encarga de llamar al endpoint de login y obtener el perfil.
      const userData = await AuthService.authenticate(username, password);
      // Entrega el usuario autenticado al contexto global de la aplicación.
      login(userData);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Credenciales incorrectas';
      const isNetworkError = /network|fetch/i.test(message);
      Alert.alert(
        isNetworkError ? 'Sin conexión' : 'Error de acceso',
        isNetworkError
          ? 'No se pudo conectar con el servidor. Verifica tu conexión a internet e inténtalo de nuevo.'
          : message,
      );
    } finally {
      // Habilita nuevamente el botón después de terminar la petición.
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.header}>
        <Text style={styles.headerSubtitle}>FakeStore API</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.title}>Login</Text>

        <View style={styles.inputGroup}>
          <TextInput
            style={styles.input}
            placeholder="Usuario / Username"
            placeholderTextColor="#8E8E93"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
          />
        </View>

        <View style={styles.inputGroup}>
          <TextInput
            style={styles.input}
            placeholder="Contraseña / Password"
            placeholderTextColor="#8E8E93"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
        </View>

        <TouchableOpacity style={styles.loginButton} onPress={handleLogin} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.loginButtonText}>Login</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#2B255B' },
  header: { height: '28%', justifyContent: 'center', alignItems: 'center', paddingTop: 30 },
  headerSubtitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold', letterSpacing: 1 },
  card: {
    flex: 1,
    backgroundColor: '#F2F3F7',
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    paddingHorizontal: 28,
    paddingTop: 36,
  },
  title: { fontSize: 30, fontWeight: 'bold', color: '#583C8E', textAlign: 'center', marginBottom: 28 },
  inputGroup: { marginBottom: 16 },
  input: {
    backgroundColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: '#2B255B',
  },
  loginButton: {
    backgroundColor: '#583C8E',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 12,
  },
  loginButtonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
});