// app/index.tsx

import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  Image, 
  ActivityIndicator, 
  TouchableOpacity, 
  SafeAreaView 
} from 'react-native';
import { useRouter } from 'expo-router';
import { AuthService } from '../services/AuthService';
import { ProductService } from '../services/ProductService';
import { User } from '../models/User';
import { Product } from '../models/Product';
import { CategoryFilter } from '../components/CategoryFilter';

export default function DashboardScreen() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  
  // Estados para el manejo del catálogo (US03, US04)
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadUserData();
    loadCategories();
    fetchCatalog(null);
  }, []);

  const loadUserData = async () => {
    const currentUser = await AuthService.getCurrentUser();
    if (!currentUser) {
      router.replace('/login');
    } else {
      setUser(currentUser);
    }
  };

  const loadCategories = async () => {
    try {
      const data = await ProductService.getCategories();
      setCategories(data);
    } catch (err: any) {
      setError(err.message || 'Error al cargar las categorías');
    }
  };

  // Función para consumir el catálogo de productos
  const fetchCatalog = async (category: string | null) => {
    setLoading(true);
    setError(null);
    try {
      const data = category === null
        ? await ProductService.getProducts()
        : await ProductService.getProductsByCategory(category);
      setProducts(data);
    } catch (err: any) {
      setError(err.message || 'Error al cargar el catálogo');
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryChange = async (category: string | null) => {
    setSelectedCategory(category);
    setProducts([]);
    setLoading(true);
    await fetchCatalog(category);
  };

  const handleLogout = async () => {
    await AuthService.logout();
    router.replace('/login');
  };

  // Renderizado individual de cada tarjeta de producto (Reciclado por FlatList)
  const renderProductItem = ({ item }: { item: Product }) => (
    <TouchableOpacity
      style={styles.productCard}
      onPress={() => router.push({ pathname: '/product/[id]', params: { id: item.id.toString() } })}
    >
      {/* Carga asíncrona de imagen */}
      <Image 
        source={{ uri: item.image }} 
        style={styles.productImage} 
        resizeMode="contain"
      />
      <View style={styles.productInfo}>
        <Text style={styles.categoryText}>{item.category.toUpperCase()}</Text>
        <Text style={styles.productTitle} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={styles.productPrice}>{item.formattedPrice}</Text>
      </View>
    </TouchableOpacity>
  );

  // Encabezado con la información del Usuario Autenticado
  const renderHeader = () => (
    <View style={styles.headerContainer}>
      {user && (
        <View style={[styles.userCard, { borderColor: user.badgeColor }]}>
          <View style={styles.userHeaderRow}>
            <View>
              <Text style={styles.welcomeText}>Bienvenido,</Text>
              <Text style={styles.userNameText}>{user.fullName}</Text>
            </View>
            <View style={[styles.roleBadge, { backgroundColor: user.badgeColor }]}>
              <Text style={styles.roleBadgeText}>{user.role}</Text>
            </View>
          </View>
          <Text style={styles.userEmail}>{user.email}</Text>
          
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutButtonText}>Cerrar Sesión</Text>
          </TouchableOpacity>
        </View>
      )}

      <Text style={styles.sectionTitle}>Catálogo General de Productos</Text>
      <CategoryFilter
        categories={categories}
        selectedCategory={selectedCategory}
        onSelectCategory={handleCategoryChange}
      />
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Escenario 2: Manejo de Estado de Carga (Loading Spinner) */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#583C8E" />
          <Text style={styles.loadingText}>Cargando catálogo...</Text>
        </View>
      ) : error ? (
        /* Escenario 3: Manejo de Error de Conexión con Botón Reintentar */
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>⚠️ {error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => fetchCatalog(selectedCategory)}>
            <Text style={styles.retryButtonText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      ) : (
        /* Escenario 1: Renderizado Correcto del Catálogo en Vista Reciclable (FlatList) */
        <FlatList
          data={products}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderProductItem}
          ListHeaderComponent={renderHeader}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          numColumns={2}
          columnWrapperStyle={styles.columnWrapper}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0D14',
  },
  listContent: {
    padding: 14,
    paddingBottom: 28,
  },
  headerContainer: {
    marginBottom: 16,
  },
  userCard: {
    backgroundColor: '#171B29',
    borderColor: '#2A3042',
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 18,
    padding: 16,
  },
  userHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  welcomeText: {
    color: '#8E98AC',
    fontSize: 12,
  },
  userNameText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  roleBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roleBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  userEmail: {
    color: '#AEB7C8',
    fontSize: 14,
    marginBottom: 12,
  },
  logoutButton: {
    backgroundColor: '#222839',
    borderColor: '#343B4F',
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    paddingVertical: 10,
  },
  logoutButtonText: {
    color: '#FF6B6B',
    fontWeight: 'bold',
    fontSize: 13,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 21,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  columnWrapper: {
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  productCard: {
    backgroundColor: '#171B29',
    borderColor: '#252B3D',
    borderRadius: 16,
    borderWidth: 1,
    width: '48.5%',
    padding: 10,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.28,
    shadowRadius: 6,
  },
  productImage: {
    width: '100%',
    height: 130,
    borderRadius: 10,
    backgroundColor: '#F5F6F8',
  },
  productInfo: {
    width: '100%',
    marginTop: 9,
  },
  categoryText: {
    fontSize: 9,
    color: '#A78BFA',
    fontWeight: 'bold',
    marginBottom: 2,
  },
  productTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#F4F6FA',
    height: 36,
  },
  productPrice: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#C4B5FD',
    marginTop: 6,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    color: '#B8BFCE',
    marginTop: 12,
    fontSize: 14,
  },
  errorText: {
    color: '#FF6B6B',
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#583C8E',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
});