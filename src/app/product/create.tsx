import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { AuthService } from '../../services/AuthService';
import { NewProductData, ProductService } from '../../services/ProductService';
import { User } from '../../models/User';

type ProductForm = {
  title: string;
  price: string;
  description: string;
  image: string;
  category: string;
};

type FormErrors = Partial<Record<keyof ProductForm, string>>;

const EMPTY_FORM: ProductForm = {
  title: '',
  price: '',
  description: '',
  image: '',
  category: '',
};

function isValidImageUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (url.protocol === 'http:' || url.protocol === 'https:') && Boolean(url.hostname);
  } catch {
    return false;
  }
}

export default function CreateProductScreen() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [authorized, setAuthorized] = useState(false);
  const [form, setForm] = useState<ProductForm>(EMPTY_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let mounted = true;

    const checkAccess = async () => {
      try {
        const currentUser = await AuthService.getCurrentUser();
        if (!mounted) return;

        if (!currentUser) {
          router.replace('/login');
          return;
        }

        if (!currentUser.canManageProducts) {
          router.replace('/');
          return;
        }

        setUser(currentUser);
        setAuthorized(true);
      } catch {
        if (mounted) {
          Alert.alert('Error de sesión', 'No se pudo verificar tu acceso.');
          router.replace('/login');
        }
      }
    };

    checkAccess();
    return () => {
      mounted = false;
    };
  }, [router]);

  const updateField = (field: keyof ProductForm, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const validateForm = (): FormErrors => {
    const nextErrors: FormErrors = {};
    const requiredFields: (keyof ProductForm)[] = [
      'title',
      'price',
      'description',
      'image',
      'category',
    ];

    for (const field of requiredFields) {
      if (!form[field].trim()) {
        nextErrors[field] = 'Este campo es obligatorio.';
      }
    }

    if (form.price.trim() && !/^\d+(?:\.\d+)?$/.test(form.price.trim())) {
      nextErrors.price = 'Ingresa un precio numérico válido.';
    }

    if (form.image.trim() && !isValidImageUrl(form.image.trim())) {
      nextErrors.image = 'Ingresa una URL válida que comience con http:// o https://.';
    }

    return nextErrors;
  };

  const handleSave = async () => {
    if (!user?.canManageProducts || saving) return;

    const validationErrors = validateForm();
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    const product: NewProductData = {
      title: form.title.trim(),
      price: Number(form.price.trim()),
      description: form.description.trim(),
      image: form.image.trim(),
      category: form.category.trim(),
    };

    setSaving(true);
    try {
      const createdProduct = await ProductService.createProduct(product);
      setForm(EMPTY_FORM);
      setErrors({});
      Alert.alert(
        'Producto creado',
        `El producto se creó con el ID ${createdProduct.id}.\n\nFake Store API simula esta creación; el producto no aparecerá en consultas posteriores.`,
      );
    } catch (error) {
      Alert.alert(
        'Error',
        error instanceof Error ? error.message : 'No se pudo crear el producto.',
      );
    } finally {
      setSaving(false);
    }
  };

  if (!authorized) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#A78BFA" />
          <Text style={styles.loadingText}>Verificando acceso...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const renderInput = (
    field: keyof ProductForm,
    label: string,
    placeholder: string,
    options: {
      keyboardType?: 'default' | 'decimal-pad' | 'url';
      multiline?: boolean;
      autoCapitalize?: 'none' | 'sentences';
    } = {},
  ) => (
    <View style={styles.fieldGroup}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[
          styles.input,
          options.multiline && styles.descriptionInput,
          errors[field] && styles.inputError,
        ]}
        value={form[field]}
        onChangeText={(value) => updateField(field, value)}
        placeholder={placeholder}
        placeholderTextColor="#8E98AC"
        keyboardType={options.keyboardType}
        multiline={options.multiline}
        autoCapitalize={options.autoCapitalize}
        autoCorrect={field !== 'image'}
        editable={!saving}
        accessibilityLabel={label}
        accessibilityHint={errors[field]}
      />
      {errors[field] && <Text style={styles.errorText}>{errors[field]}</Text>}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>Agregar producto</Text>
          <Text style={styles.subtitle}>Registra un artículo nuevo en el catálogo.</Text>

          {renderInput('title', 'Título', 'Nombre del producto')}
          {renderInput('price', 'Precio', '0.00', { keyboardType: 'decimal-pad' })}
          {renderInput('description', 'Descripción', 'Describe el producto', { multiline: true })}
          {renderInput('image', 'URL de imagen', 'https://ejemplo.com/imagen.jpg', {
            keyboardType: 'url',
            autoCapitalize: 'none',
          })}
          {renderInput('category', 'Categoría', 'Ej. electronics')}

          <TouchableOpacity
            style={[styles.saveButton, saving && styles.disabledButton]}
            onPress={handleSave}
            disabled={saving}
            accessibilityRole="button"
          >
            {saving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.saveButtonText}>Guardar</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => router.replace('/')}
            disabled={saving}
          >
            <Text style={styles.cancelButtonText}>Volver al catálogo</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0D14',
  },
  flex: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 36,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  subtitle: {
    color: '#AEB7C8',
    fontSize: 14,
    marginBottom: 24,
  },
  fieldGroup: {
    marginBottom: 16,
  },
  label: {
    color: '#E5E7EB',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 7,
  },
  input: {
    backgroundColor: '#171B29',
    borderColor: '#343B4F',
    borderRadius: 10,
    borderWidth: 1,
    color: '#FFFFFF',
    fontSize: 15,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  inputError: {
    borderColor: '#FF5C5C',
  },
  descriptionInput: {
    minHeight: 110,
    textAlignVertical: 'top',
  },
  errorText: {
    color: '#FF6B6B',
    fontSize: 12,
    marginTop: 5,
  },
  saveButton: {
    alignItems: 'center',
    backgroundColor: '#583C8E',
    borderRadius: 10,
    marginTop: 6,
    paddingVertical: 14,
  },
  disabledButton: {
    opacity: 0.65,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cancelButton: {
    alignItems: 'center',
    marginTop: 12,
    paddingVertical: 12,
  },
  cancelButtonText: {
    color: '#C4B5FD',
    fontSize: 14,
    fontWeight: '600',
  },
  centerContainer: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  loadingText: {
    color: '#B8BFCE',
    fontSize: 14,
    marginTop: 12,
  },
});
