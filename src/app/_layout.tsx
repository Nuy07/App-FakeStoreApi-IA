import { useState, createContext, useContext } from 'react';
import { Stack, useRouter } from 'expo-router';
// Importa la CLASE abstracta desde tus modelos, no desde el servicio
import { User } from '../models/User'; 
import { AuthService } from '../services/AuthService';
import React from 'react';

// Tipamos explícitamente con la clase User
interface AuthContextType {
  user: User | null;
  login: (userData: User) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  login: () => {},
  logout: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export default function RootLayout() {
  // Mantiene disponible en toda la aplicación el usuario autenticado.
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();

  // Actualiza el contexto después de una autenticación exitosa.
  const login = (userData: User) => {
    setUser(userData);
    router.replace('/' as any);
  };

  // Cierra la sesión mediante AuthService y redirige a la pantalla de login.
  const logout = async () => {
    await AuthService.logout();
    setUser(null);
    router.replace('/login' as any);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      <Stack screenOptions={{ headerShown: false }} />
    </AuthContext.Provider>
  );
}