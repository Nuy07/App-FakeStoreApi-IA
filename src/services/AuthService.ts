import * as SecureStore from 'expo-secure-store';
import { User, AdminUser, AuditorUser, ClientUser } from '../models/User';

export class AuthService {
  // Patrón Factory (POO): Instancia la clase correcta según el ID
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

  static async authenticate(username: string, password: string): Promise<User> {
    const authRes = await fetch('https://fakestoreapi.com/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    if (!authRes.ok) throw new Error('Credenciales incorrectas');

    const { token } = await authRes.json();
    const usersRes = await fetch('https://fakestoreapi.com/users');
    const usersData = await usersRes.json();
    const userProfile = usersData.find((u: any) => u.username === username);

    if (!userProfile) throw new Error('Usuario no encontrado');

    // Instanciamos el objeto real usando POO
    const userInstance = this.createUserInstance(userProfile, token);

    // Persistencia
    await SecureStore.setItemAsync('user_data', JSON.stringify({
      id: userInstance.id,
      username: userInstance.username,
      email: userInstance.email,
      fullName: userInstance.fullName,
      phone: userInstance.phone,
      role: userInstance.role,
    }));
    await SecureStore.setItemAsync('user_token', userInstance.token);

    return userInstance;
  }

  static async getCurrentUser(): Promise<User | null> {
    const userData = await SecureStore.getItemAsync('user_data');
    const token = await SecureStore.getItemAsync('user_token');

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

  public static async logout(): Promise<void> {
    await SecureStore.deleteItemAsync('user_data');
    await SecureStore.deleteItemAsync('user_token');
  }

  static async destroySession(): Promise<void> {
    await this.logout();
  }
}