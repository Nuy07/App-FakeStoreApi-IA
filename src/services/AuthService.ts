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
    await SecureStore.setItemAsync('userSession', JSON.stringify({
      id: userInstance.id,
      username: userInstance.username,
      email: userInstance.email,
      fullName: userInstance.fullName,
      phone: userInstance.phone,
      role: userInstance.role,
      token: userInstance.token,
    }));

    return userInstance;
  }

  static async destroySession(): Promise<void> {
    await SecureStore.deleteItemAsync('userSession');
    await SecureStore.deleteItemAsync('cartData');
  }
}