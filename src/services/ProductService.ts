// services/ProductService.ts

import { Product } from '../models/Product';
import { AuthService } from './AuthService';

export interface NewProductData {
  title: string;
  price: number;
  description: string;
  category: string;
  image: string;
}

export class ProductService {
  // URL base de todos los endpoints de productos de FakeStore API.
  private static BASE_URL = 'https://fakestoreapi.com/products';

  // Consulta el catálogo completo y transforma cada respuesta JSON en un Product.
  public static async getProducts(): Promise<Product[]> {
    let response: Response;
    try {
      response = await fetch(this.BASE_URL);
    } catch (error) {
      console.warn('No se pudo establecer conexión con Fake Store API:', error);
      throw new Error('No se pudo conectar con el servidor. Verifica tu conexión a internet.');
    }

    if (!response.ok) {
      throw new Error(`El servidor del catálogo respondió con el estado HTTP ${response.status}. Inténtalo de nuevo más tarde.`);
    }

    const data = await response.json();
    return data.map((item: any) => Product.fromJson(item));
  }

  public static async getCategories(): Promise<string[]> {
    try {
      // Consulta el endpoint que devuelve las categorías del catálogo.
      const response = await fetch(`${this.BASE_URL}/categories`);

      // Valida que la API haya respondido correctamente.
      if (!response.ok) {
        throw new Error(`Error en el servidor: ${response.status}`);
      }

      // Devuelve directamente el arreglo de categorías recibido en formato JSON.
      return await response.json();
    } catch (error) {
      console.error('ProductService Error:', error);
      throw new Error('No se pudieron cargar las categorías. Verifica tu conexión a internet.');
    }
  }

  public static async getProductsByCategory(category: string): Promise<Product[]> {
    try {
      // Codifica la categoría para que sus espacios y caracteres especiales sean válidos en la URL.
      const encodedCategory = encodeURIComponent(category);
      // Consulta únicamente los productos pertenecientes a la categoría indicada.
      const response = await fetch(`${this.BASE_URL}/category/${encodedCategory}`);

      // Detiene el flujo si la API devuelve un código HTTP de error.
      if (!response.ok) {
        throw new Error(`Error en el servidor: ${response.status}`);
      }

      // Convierte la respuesta JSON filtrada en objetos Product.
      const data = await response.json();
      return data.map((item: any) => Product.fromJson(item));
    } catch (error) {
      console.error('ProductService Error:', error);
      throw new Error('No se pudieron cargar los productos de la categoría.');
    }
  }

  public static async getProductById(id: number): Promise<Product> {
    try {
      // Solicita a la API el producto identificado por su ID.
      const response = await fetch(`${this.BASE_URL}/${id}`);

      // Informa cuando el producto no existe o el servidor rechaza la petición.
      if (!response.ok) {
        throw new Error(`Producto no encontrado: ${id}`);
      }

      // Comprueba que la respuesta tenga la estructura mínima esperada.
      const data = await response.json();
      if (!data || typeof data !== 'object' || data.id === undefined) {
        throw new Error(`Producto no encontrado: ${id}`);
      }

      // Convierte el JSON validado en una instancia de Product.
      return Product.fromJson(data);
    } catch (error) {
      console.error('ProductService Error:', error);
      throw error instanceof Error
        ? error
        : new Error('No se pudo cargar el producto.');
    }
  }

  // Crea un producto y usa el ID simulado devuelto por Fake Store API.
  public static async createProduct(product: NewProductData): Promise<Product> {
    try {
      const response = await fetch(this.BASE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(product),
      });

      if (!response.ok) {
        throw new Error(`No se pudo crear el producto: ${response.status}`);
      }

      const data = await response.json();
      const id = Number(data?.id);
      if (!Number.isFinite(id)) {
        throw new Error('La respuesta del servidor no contiene un ID válido.');
      }

      return Product.fromJson({
        ...product,
        ...data,
        id,
        rating: data.rating || { rate: 0, count: 0 },
      });
    } catch (error) {
      console.error('ProductService Error:', error);
      throw error instanceof Error
        ? error
        : new Error('No se pudo crear el producto. Verifica tu conexión a internet.');
    }
  }

  // Actualiza un producto mediante PUT y devuelve la respuesta como Product.
  public static async updateProduct(product: Product): Promise<Product> {
    const currentUser = await AuthService.getCurrentUser();
    if (!currentUser?.canManageProducts) {
      throw new Error('No tienes permisos para actualizar productos.');
    }

    try {
      const response = await fetch(`${this.BASE_URL}/${product.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: product.title,
          price: product.price,
          description: product.description,
          category: product.category,
          image: product.image,
        }),
      });

      if (!response.ok) {
        throw new Error(`No se pudo actualizar el producto: ${product.id}`);
      }

      const data = await response.json();
      return Product.fromJson({ ...data, id: product.id });
    } catch (error) {
      console.error('ProductService Error:', error);
      throw error instanceof Error
        ? error
        : new Error('No se pudo actualizar el producto.');
    }
  }

  // Elimina un producto mediante DELETE; Fake Store API solo simula la operación.
  public static async deleteProduct(id: number): Promise<Product> {
    const currentUser = await AuthService.getCurrentUser();
    if (!currentUser?.canManageProducts) {
      throw new Error('No tienes permisos para eliminar productos.');
    }
    if (!Number.isInteger(id) || id <= 0) {
      throw new Error('El identificador del producto no es válido.');
    }

    try {
      const response = await fetch(`${this.BASE_URL}/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`No se pudo eliminar el producto: ${id}`);
      }

      const data = await response.json();
      return Product.fromJson({
        ...data,
        id: Number(data?.id) || id,
        rating: data?.rating || { rate: 0, count: 0 },
      });
    } catch (error) {
      console.error('ProductService Error:', error);
      throw error instanceof Error
        ? error
        : new Error('No se pudo eliminar el producto.');
    }
  }
}