import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
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

type EditableField = 'title' | 'price' | 'description' | 'category';
type EditErrors = Partial<Record<EditableField, string>>;

export default function ProductDetailScreen() {
  // Obtiene la navegación y el ID del producto enviado por la ruta dinámica.
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string | string[] }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const [priceDraft, setPriceDraft] = useState('');
  const [descriptionDraft, setDescriptionDraft] = useState('');
  const [categoryDraft, setCategoryDraft] = useState('');
  const [editErrors, setEditErrors] = useState<EditErrors>({});

  // Verifica la sesión y consulta en la API el producto solicitado.
  useEffect(() => {
    const loadProduct = async () => {
      // La pantalla requiere una sesión activa antes de consultar el detalle.
      const currentUser = await AuthService.getCurrentUser();
      if (!currentUser) {
        router.replace('/login');
        return;
      }
      setUser(currentUser);

      // Expo Router puede entregar el parámetro como string o como arreglo de strings.
      const productId = Array.isArray(id) ? id[0] : id;
      try {
        // Evita enviar a la API un identificador vacío o no numérico.
        if (!productId || Number.isNaN(Number(productId))) {
          throw new Error('Producto no disponible');
        }

        // Solicita el producto y guarda el resultado transformado por ProductService.
        const productData = await ProductService.getProductById(Number(productId));
        setProduct(productData);
        setTitleDraft(productData.title);
        setPriceDraft(productData.price.toString());
        setDescriptionDraft(productData.description);
        setCategoryDraft(productData.category);
      } catch {
        // Informa el fallo y regresa al catálogo si el producto no está disponible.
        Alert.alert('Error', 'Producto no disponible');
        router.back();
      } finally {
        // Finaliza el indicador tanto en éxito como en error.
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

  // Ejecuta la actualización únicamente para usuarios con privilegios administrativos.
  const handleUpdate = async () => {
    if (!user?.canManageProducts) return;

    const nextErrors: EditErrors = {};
    if (!titleDraft.trim()) nextErrors.title = 'El título es obligatorio.';
    if (!priceDraft.trim()) {
      nextErrors.price = 'El precio es obligatorio.';
    } else if (!/^\d+(?:\.\d+)?$/.test(priceDraft.trim())) {
      nextErrors.price = 'Ingresa un precio numérico válido.';
    }
    if (!descriptionDraft.trim()) nextErrors.description = 'La descripción es obligatoria.';
    if (!categoryDraft.trim()) nextErrors.category = 'La categoría es obligatoria.';

    setEditErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    const price = Number(priceDraft.trim());
    setSaving(true);
    try {
      const updatedProduct = await ProductService.updateProduct(
        new Product(
          product.id,
          titleDraft.trim(),
          price,
          descriptionDraft.trim(),
          categoryDraft.trim(),
          product.image,
          product.rating,
        ),
      );
      setProduct(updatedProduct);
      setEditing(false);
      setEditErrors({});
      Alert.alert('Producto actualizado (Simulación)');
    } catch (error) {
      Alert.alert(
        'Error',
        error instanceof Error ? error.message : 'No se pudo actualizar el producto.',
      );
    } finally {
      setSaving(false);
    }
  };

  const beginEditing = () => {
    if (!user?.canManageProducts) {
      router.replace('/');
      return;
    }

    setTitleDraft(product.title);
    setPriceDraft(product.price.toString());
    setDescriptionDraft(product.description);
    setCategoryDraft(product.category);
    setEditErrors({});
    setEditing(true);
  };

  const updateDraft = (field: EditableField, value: string) => {
    setEditErrors((current) => ({ ...current, [field]: undefined }));
    switch (field) {
      case 'title':
        setTitleDraft(value);
        break;
      case 'price':
        setPriceDraft(value);
        break;
      case 'description':
        setDescriptionDraft(value);
        break;
      case 'category':
        setCategoryDraft(value);
        break;
    }
  };

  // Solicita confirmación nativa; DELETE solo ocurre desde la acción destructiva.
  const handleDelete = () => {
    if (!user?.canManageProducts || saving) return;

    Alert.alert('Eliminar producto', '¿Estás seguro de eliminar este producto?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          if (!user.canManageProducts) {
            router.replace('/');
            return;
          }

          setSaving(true);
          try {
            await ProductService.deleteProduct(product.id);
            router.replace({ pathname: '/', params: { deleted: 'success' } });
          } catch (error) {
            Alert.alert(
              'Error',
              error instanceof Error ? error.message : 'No se pudo eliminar el producto.',
            );
          } finally {
            setSaving(false);
          }
        },
      },
    ]);
  };

  // Muestra los datos del producto y las acciones permitidas para el rol actual.
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Image source={{ uri: product.image }} style={styles.productImage} resizeMode="contain" />

        <View style={styles.productCard}>
          {editing ? (
            <View style={styles.editForm}>
              <TextInput
                style={[styles.editInput, editErrors.title && styles.editInputError]}
                value={titleDraft}
                onChangeText={(value) => updateDraft('title', value)}
                placeholder="Título"
                placeholderTextColor="#8E98AC"
                editable={!saving}
              />
              {editErrors.title && <Text style={styles.editErrorText}>{editErrors.title}</Text>}
              <TextInput
                style={[styles.editInput, editErrors.price && styles.editInputError]}
                value={priceDraft}
                onChangeText={(value) => updateDraft('price', value)}
                placeholder="Precio"
                placeholderTextColor="#8E98AC"
                keyboardType="decimal-pad"
                editable={!saving}
              />
              {editErrors.price && <Text style={styles.editErrorText}>{editErrors.price}</Text>}
              <TextInput
                style={[styles.editInput, editErrors.category && styles.editInputError]}
                value={categoryDraft}
                onChangeText={(value) => updateDraft('category', value)}
                placeholder="Categoría"
                placeholderTextColor="#8E98AC"
                editable={!saving}
              />
              {editErrors.category && <Text style={styles.editErrorText}>{editErrors.category}</Text>}
              <TextInput
                style={[
                  styles.editInput,
                  styles.descriptionInput,
                  editErrors.description && styles.editInputError,
                ]}
                value={descriptionDraft}
                onChangeText={(value) => updateDraft('description', value)}
                placeholder="Descripción"
                placeholderTextColor="#8E98AC"
                multiline
                editable={!saving}
              />
              {editErrors.description && (
                <Text style={styles.editErrorText}>{editErrors.description}</Text>
              )}
              <TouchableOpacity style={styles.editButton} onPress={handleUpdate} disabled={saving}>
                {saving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.buttonText}>Guardar cambios</Text>}
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setEditing(false)} disabled={saving}>
                <Text style={styles.buttonText}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <Text style={styles.category}>{product.category.toUpperCase()}</Text>
              <Text style={styles.title}>{product.title}</Text>
              <Text style={styles.price}>{product.formattedPrice}</Text>
              <Text style={styles.description}>{product.description}</Text>
            </>
          )}

          {/* Interfaz dinámica por rol: botones exclusivos para Administrador (US05) */}
          {user?.canManageProducts && (
            <View style={styles.adminActionsContainer}>
              {!editing && <TouchableOpacity 
                style={styles.editButton} 
                onPress={beginEditing}
                disabled={saving}
              >
                <Text style={styles.buttonText}>Editar Producto</Text>
              </TouchableOpacity>}

              {!editing && <TouchableOpacity 
                style={styles.deleteButton} 
                onPress={handleDelete}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.buttonText}>Eliminar Producto</Text>
                )}
              </TouchableOpacity>}
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
  cancelButton: {
    backgroundColor: '#343B4F',
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
  editForm: {
    gap: 10,
  },
  editInput: {
    backgroundColor: '#222839',
    borderColor: '#343B4F',
    borderRadius: 10,
    borderWidth: 1,
    color: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  editInputError: {
    borderColor: '#FF5C5C',
  },
  editErrorText: {
    color: '#FF6B6B',
    fontSize: 12,
    marginTop: -6,
  },
  descriptionInput: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
});