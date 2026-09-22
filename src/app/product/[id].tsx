import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
// Correcto: importación desde la librería moderna sin advertencias
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { AuthService } from '../../services/AuthService';
import { ProductService } from '../../services/ProductService';
import { Product } from '../../models/Product';
import { User } from '../../models/User';

export default function ProductDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string | string[] }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProduct = async () => {
      const currentUser = await AuthService.getCurrentUser();
      if (!currentUser) {
        router.replace('/login');
        return;
      }
      setUser(currentUser);

      const productId = Array.isArray(id) ? id[0] : id;
      try {
        if (!productId || Number.isNaN(Number(productId))) {
          throw new Error('Producto no disponible');
        }

        const productData = await ProductService.getProductById(Number(productId));
        setProduct(productData);
      } catch {
        Alert.alert('Error', 'Producto no disponible');
        router.back();
      } finally {
        setLoading(false);
      }
    };

    loadProduct();
  }, [id, router]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#583C8E" />
          <Text style={styles.loadingText}>Cargando producto...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!product) return null;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Image source={{ uri: product.image }} style={styles.productImage} resizeMode="contain" />

        <View style={styles.productCard}>
          <Text style={styles.category}>{product.category.toUpperCase()}</Text>
          <Text style={styles.title}>{product.title}</Text>
          <Text style={styles.price}>{product.formattedPrice}</Text>
          <Text style={styles.description}>{product.description}</Text>

          {/* Interfaz dinámica por rol: botones exclusivos para Administrador (US05) */}
          {user?.canManageProducts && (
            <View style={styles.adminActionsContainer}>
              <TouchableOpacity 
                style={styles.editButton} 
                onPress={() => Alert.alert('Editar', 'Modo de edición activado')}
              >
                <Text style={styles.buttonText}>Editar Producto</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.deleteButton} 
                onPress={() => Alert.alert('Eliminar', '¿Deseas eliminar este producto?')}
              >
                <Text style={styles.buttonText}>Eliminar Producto</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0D14',
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#FFFFFF',
    marginTop: 12,
  },
  productImage: {
    width: '100%',
    height: 280,
    backgroundColor: '#151925',
    borderRadius: 18,
    marginBottom: 14,
  },
  productCard: {
    backgroundColor: '#171B29',
    borderColor: '#252B3D',
    borderRadius: 18,
    borderWidth: 1,
    padding: 18,
  },
  category: {
    color: '#A78BFA',
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  price: {
    color: '#C4B5FD',
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  description: {
    color: '#B8BFCE',
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 20,
  },
  adminActionsContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#252B3D',
    gap: 10,
  },
  editButton: {
    backgroundColor: '#583C8E',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  deleteButton: {
    backgroundColor: '#EF4444',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
});