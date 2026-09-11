import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useAuth } from './_layout';
import { useRouter } from 'expo-router';

export default function HomeScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!user) router.replace('/login' as any);
  }, [user]);

  if (!user) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.welcomeLabel}>Panel de Usuario</Text>
        <Text style={styles.headerTitle}>{user.fullName}</Text>
      </View>

      <View style={styles.card}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          
          <View style={styles.profileBox}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{user.username.charAt(0).toUpperCase()}</Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.usernameText}>@{user.username}</Text>
              <View style={[styles.roleBadge, { backgroundColor: user.badgeColor }]}>
                <Text style={styles.roleText}>{user.role}</Text>
              </View>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Información de la Cuenta</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoKey}>ID de Usuario:</Text>
              <Text style={styles.infoValue}>#{user.id}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoKey}>Correo:</Text>
              <Text style={styles.infoValue}>{user.email}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoKey}>Teléfono:</Text>
              <Text style={styles.infoValue}>{user.phone}</Text>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Permisos Asignados</Text>
          <View style={styles.infoCard}>
            {user.getPermissions().map((permission, index) => (
              <View key={index} style={styles.permRow}>
                <Text style={styles.bullet}>•</Text>
                <Text style={styles.permText}>{permission}</Text>
              </View>
            ))}
          </View>

          <TouchableOpacity style={styles.logoutButton} onPress={logout}>
            <Text style={styles.logoutButtonText}>Cerrar Sesión</Text>
          </TouchableOpacity>

        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#2B255B' },
  header: { height: '22%', justifyContent: 'center', paddingHorizontal: 28, paddingTop: 30 },
  welcomeLabel: { color: '#A5A1C9', fontSize: 14, fontWeight: '600' },
  headerTitle: { color: '#FFF', fontSize: 22, fontWeight: 'bold', marginTop: 4 },
  card: {
    flex: 1,
    backgroundColor: '#F2F3F7',
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  scrollContent: { paddingBottom: 30 },
  profileBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 16,
    marginBottom: 20,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#583C8E',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  avatarText: { color: '#FFF', fontSize: 22, fontWeight: 'bold' },
  profileInfo: { flex: 1 },
  usernameText: { fontSize: 16, fontWeight: 'bold', color: '#2B255B', marginBottom: 4 },
  roleBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  roleText: { color: '#2B255B', fontWeight: 'bold', fontSize: 12 },
  sectionTitle: { fontSize: 14, fontWeight: 'bold', color: '#583C8E', marginBottom: 10, marginTop: 8 },
  infoCard: { backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginBottom: 16 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  infoKey: { color: '#6B7280', fontSize: 14 },
  infoValue: { color: '#2B255B', fontSize: 14, fontWeight: '600' },
  permRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4 },
  bullet: { color: '#583C8E', fontSize: 16, marginRight: 8, fontWeight: 'bold' },
  permText: { color: '#374151', fontSize: 14 },
  logoutButton: {
    backgroundColor: '#583C8E',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 12,
  },
  logoutButtonText: { color: '#FFF', fontSize: 15, fontWeight: 'bold' },
});