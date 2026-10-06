// Pantalla principal del catálogo de productos.

// Hooks y componentes base de React Native utilizados por la pantalla.
import React, { useCallback, useEffect, useState } from 'react';
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
import { useLocalSearchParams, useRouter } from 'expo-router';
import { AuthService } from '../services/AuthService';
import { ProductService } from '../services/ProductService';
import { User } from '../models/User';
import { Product } from '../models/Product';
import { CategoryFilter } from '../components/CategoryFilter';

export default function DashboardScreen() {
  // Router utilizado para navegar al login y al detalle de cada producto.
  const router = useRouter();
  const { deleted } = useLocalSearchParams<{ deleted?: string | string[] }>();

  // Estado del usuario autenticado que se muestra en el encabezado.
  const [user, setUser] = useState<User | null>(null);
  
  // Estados para cargar, filtrar y mostrar el catálogo (US03, US04).
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Obtiene las categorías disponibles para el filtro del catálogo.
  const loadCategories = useCallback(async () => {
    try {
      const data = await ProductService.getCategories();
      setCategories(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar las categorías');
    }
  }, []);

  // Obtiene todos los productos o únicamente los de la categoría seleccionada.
  const fetchCatalog = useCallback(async (category: string | null) => {
    setLoading(true);
    setError(null);
    try {
      const data = category === null
        ? await ProductService.getProducts()
        : await ProductService.getProductsByCategory(category);
      setProducts(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar el catálogo');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const deletionNotice = Array.isArray(deleted) ? deleted[0] : deleted;
    if (deletionNotice === 'success') {
      setToastMessage('Producto eliminado correctamente (simulación).');
      router.setParams({ deleted: undefined });
    }
  }, [deleted, router]);

  useEffect(() => {
    if (!toastMessage) return;

    const timeout = setTimeout(() => setToastMessage(null), 3000);
    return () => clearTimeout(timeout);
  }, [toastMessage]);

  // Comprueba la sesión primero; los datos del catálogo no se solicitan sin autenticar.
  useEffect(() => {
    let mounted = true;

    const loadUserData = async () => {
      try {
        const currentUser = await AuthService.getCurrentUser();
        if (!mounted) return;

        if (!currentUser) {
          router.replace('/login');
          return;
        }

        setUser(currentUser);
      } catch (err) {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : 'No se pudo verificar la sesión.');
        setLoading(false);
      }
    };

    void loadUserData();
    return () => {
      mounted = false;
    };
  }, [router]);

  // Carga el catálogo y sus categorías únicamente después de validar la sesión.
  useEffect(() => {
    if (!user) return;

    void loadCategories();
    void fetchCatalog(null);
  }, [user, loadCategories, fetchCatalog]);

  // Actualiza el filtro seleccionado y vuelve a cargar el catálogo.
  const handleCategoryChange = async (category: string | null) => {
    setSelectedCategory(category);
    setProducts([]);
    setLoading(true);
    // El cambio del filtro dispara una nueva consulta al endpoint correspondiente.
    await fetchCatalog(category);
  };

  // Cierra la sesión actual y devuelve al usuario a la pantalla de login.
  const handleLogout = async () => {
    await AuthService.logout();
    router.replace('/login');
  };

  // Renderiza una tarjeta individual; FlatList reutiliza este bloque por producto.
  const renderProductItem = ({ item }: { item: Product }) => (
    <TouchableOpacity
      style={styles.productCard}
      onPress={() => router.push({ pathname: '/product/[id]', params: { id: item.id.toString() } })}
    >
      {/* Muestra la imagen remota asociada al producto. */}
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

  // Construye el encabezado con el usuario, el botón de cierre y el filtro.
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
      {user?.canManageProducts && (
        <TouchableOpacity
          style={styles.addProductButton}
          onPress={() => router.push('/product/create')}
          accessibilityRole="button"
        >
          <Text style={styles.addProductButtonText}>+ Agregar producto</Text>
        </TouchableOpacity>
      )}
      <CategoryFilter
        categories={categories}
        selectedCategory={selectedCategory}
        onSelectCategory={handleCategoryChange}
      />
    </View>
  );

  // Selecciona la vista correspondiente al estado actual de la carga.
  return (
    <SafeAreaView style={styles.container}>
      {toastMessage && (
        <View style={styles.toast}>
          <Text style={styles.toastText}>{toastMessage}</Text>
        </View>
      )}
      {/* Estado de carga mientras se consulta el catálogo. */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#583C8E" />
          <Text style={styles.loadingText}>Cargando catálogo...</Text>
        </View>
      ) : error ? (
        /* Estado de error con una acción para repetir la consulta. */
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>⚠️ {error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => fetchCatalog(selectedCategory)}>
            <Text style={styles.retryButtonText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      ) : (
        /* Estado exitoso: catálogo optimizado mediante una lista reciclable. */
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

// Estilos visuales de la pantalla, del encabezado y de las tarjetas.
const styles = StyleSheet.create({
  // Estructura general de la pantalla y del contenido de la lista.
  container: {
    flex: 1,
    backgroundColor: '#0B0D14',
  },
  toast: {
    position: 'absolute',
    top: 12,
    left: 20,
    right: 20,
    zIndex: 1,
    backgroundColor: '#166534',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    elevation: 6,
  },
  toastText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  listContent: {
    padding: 14,
    paddingBottom: 28,
  },
  headerContainer: {
    marginBottom: 16,
  },

  // Tarjeta con la información y las acciones del usuario.
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

  // Botón para cerrar la sesión y sus textos asociados.
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
  addProductButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#583C8E',
    borderRadius: 10,
    marginTop: 8,
    marginBottom: 14,
    paddingHorizontal: 16,
    paddingVertical: 11,
  },
  addProductButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },

  // Distribución de las columnas y apariencia de cada producto.
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

  // Estados de carga, error y acción para reintentar la consulta.
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