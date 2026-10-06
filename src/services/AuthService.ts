import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { User, AdminUser, AuditorUser, ClientUser } from '../models/User';

export class AuthService {
  // Usa localStorage en web y SecureStore en dispositivos nativos.
  private static async setStorageItem(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') {
      localStorage.setItem(key, value);
      return;
    }

    await SecureStore.setItemAsync(key, value);
  }

  // Recupera un valor sin llamar a SecureStore cuando la app corre en navegador.
  private static async getStorageItem(key: string): Promise<string | null> {
    if (Platform.OS === 'web') {
      return localStorage.getItem(key);
    }

    return SecureStore.getItemAsync(key);
  }

  // Elimina un valor usando el almacenamiento correspondiente a la plataforma.
  private static async deleteStorageItem(key: string): Promise<void> {
    if (Platform.OS === 'web') {
      localStorage.removeItem(key);
      return;
    }

    await SecureStore.deleteItemAsync(key);
  }

  // Convierte el perfil recibido de la API en la subclase de usuario correspondiente.
  private static createUserInstance(profile: any, token: string): User {
    const fullName = `${profile.name.firstname} ${profile.name.lastname}`.toUpperCase();

    if (profile.id === 1 || profile.id === 2) {
      return new AdminUser(profile.id, profile.username, profile.email, fullName, profile.phone, token);
    } else if (profile.id === 3) {
      return new AuditorUser(profile.id, profile.username, profile.email, fullName, profile.phone, token);
    } else {
      return new ClientUser(profile.id, profile.username, profile.email, fullName, profile.phone, token);
    }
  }

  // Autentica las credenciales y después consulta el perfil completo del usuario.
  static async authenticate(username: string, password: string): Promise<User> {
    // Envía las credenciales al endpoint de autenticación de FakeStore API.
    const authRes = await fetch('https://fakestoreapi.com/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    // La API responde con error cuando las credenciales no son válidas.
    if (!authRes.ok) throw new Error('Credenciales incorrectas');

    // Extrae el token generado para la sesión autenticada.
    const { token } = await authRes.json();

    // Obtiene los perfiles para completar los datos del usuario autenticado.
    const usersRes = await fetch('https://fakestoreapi.com/users');
    const usersData = await usersRes.json();
    const userProfile = usersData.find((u: any) => u.username === username);

    if (!userProfile) throw new Error('Usuario no encontrado');

    // Instancia el tipo de usuario usando el perfil devuelto por la API.
    const userInstance = this.createUserInstance(userProfile, token);

    // Guarda los datos necesarios para conservar la sesión entre pantallas.
    await this.setStorageItem('user_data', JSON.stringify({
      id: userInstance.id,
      username: userInstance.username,
      email: userInstance.email,
      fullName: userInstance.fullName,
      phone: userInstance.phone,
      role: userInstance.role,
    }));
    await this.setStorageItem('user_token', userInstance.token);

    return userInstance;
  }

  // Recupera la sesión almacenada localmente; no realiza una nueva petición a la API.
  static async getCurrentUser(): Promise<User | null> {
    const userData = await this.getStorageItem('user_data');
    const token = await this.getStorageItem('user_token');

    if (!userData) return null;

    const storedUser = JSON.parse(userData);
    const storedToken = token ?? '';
    if (storedUser.role === 'Admin') {
      return new AdminUser(
        storedUser.id,
        storedUser.username,
        storedUser.email,
        storedUser.fullName,
        storedUser.phone,
        storedToken,
      );
    }

    if (storedUser.role === 'Auditor') {
      return new AuditorUser(
        storedUser.id,
        storedUser.username,
        storedUser.email,
        storedUser.fullName,
        storedUser.phone,
        storedToken,
      );
    }

    return new ClientUser(
      storedUser.id,
      storedUser.username,
      storedUser.email,
      storedUser.fullName,
      storedUser.phone,
      storedToken,
    );
  }

  // Elimina del dispositivo los datos asociados con la sesión actual.
  public static async logout(): Promise<void> {
    await this.deleteStorageItem('user_data');
    await this.deleteStorageItem('user_token');
  }

  // Alias utilizado para destruir explícitamente la sesión almacenada.
  static async destroySession(): Promise<void> {
    await this.logout();
  }
}