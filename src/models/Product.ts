// models/Product.ts

export interface Rating {
  rate: number;
  count: number;
}

export class Product {
  private _id: number;
  private _title: string;
  private _price: number;
  private _description: string;
  private _category: string;
  private _image: string;
  private _rating: Rating;

  constructor(
    id: number,
    title: string,
    price: number,
    description: string,
    category: string,
    image: string,
    rating: Rating
  ) {
    this._id = id;
    this._title = title;
    this._price = price;
    this._description = description;
    this._category = category;
    this._image = image;
    this._rating = rating;
  }

  // Getters para acceso seguro a los datos
  get id(): number { return this._id; }
  get title(): string { return this._title; }
  get price(): number { return this._price; }
  get description(): string { return this._description; }
  get category(): string { return this._category; }
  get image(): string { return this._image; }
  get rating(): Rating { return this._rating; }

  // Método helper para dar formato de moneda al precio
  get formattedPrice(): string {
    return `$${this._price.toFixed(2)}`;
  }

  // Método de fábrica (Factory) para convertir el JSON en una instancia de Product
  static fromJson(json: any): Product {
    return new Product(
      json.id,
      json.title,
      Number(json.price),
      json.description,
      json.category,
      json.image,
      json.rating || { rate: 0, count: 0 }
    );
  }
}