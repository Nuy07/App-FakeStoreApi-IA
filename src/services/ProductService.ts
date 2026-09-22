// services/ProductService.ts

import { Product } from '../models/Product';

export class ProductService {
  private static BASE_URL = 'https://fakestoreapi.com/products';

  /**
   * Consume el endpoint /products y mapea los datos a objetos de la clase Product
   */
  public static async getProducts(): Promise<Product[]> {
    try {
      const response = await fetch(this.BASE_URL);
      
      if (!response.ok) {
        throw new Error(`Error en el servidor: ${response.status}`);
      }

      const data = await response.json();
      
      // Mapeamos cada elemento del JSON a nuestra clase Product
      return data.map((item: any) => Product.fromJson(item));
    } catch (error) {
      console.error('ProductService Error:', error);
      throw new Error('No se pudo conectar con el servidor. Verifica tu conexión a internet.');
    }
  }

  public static async getCategories(): Promise<string[]> {
    try {
      const response = await fetch(`${this.BASE_URL}/categories`);

      if (!response.ok) {
        throw new Error(`Error en el servidor: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('ProductService Error:', error);
      throw new Error('No se pudieron cargar las categorías. Verifica tu conexión a internet.');
    }
  }

  public static async getProductsByCategory(category: string): Promise<Product[]> {
    try {
      const encodedCategory = encodeURIComponent(category);
      const response = await fetch(`${this.BASE_URL}/category/${encodedCategory}`);

      if (!response.ok) {
        throw new Error(`Error en el servidor: ${response.status}`);
      }

      const data = await response.json();
      return data.map((item: any) => Product.fromJson(item));
    } catch (error) {
      console.error('ProductService Error:', error);
      throw new Error('No se pudieron cargar los productos de la categoría.');
    }
  }

  public static async getProductById(id: number): Promise<Product> {
    try {
      const response = await fetch(`${this.BASE_URL}/${id}`);

      if (!response.ok) {
        throw new Error(`Producto no encontrado: ${id}`);
      }

      const data = await response.json();
      if (!data || typeof data !== 'object' || data.id === undefined) {
        throw new Error(`Producto no encontrado: ${id}`);
      }

      return Product.fromJson(data);
    } catch (error) {
      console.error('ProductService Error:', error);
      throw error instanceof Error
        ? error
        : new Error('No se pudo cargar el producto.');
    }
  }
}