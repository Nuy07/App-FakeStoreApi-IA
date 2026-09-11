// Clase Base Abstracta (Abstracción y Encapsulamiento)
export abstract class User {
  private _id: number;
  private _username: string;
  private _email: string;
  private _fullName: string;
  private _phone: string;
  private _token: string;

  constructor(id: number, username: string, email: string, fullName: string, phone: string, token: string) {
    this._id = id;
    this._username = username;
    this._email = email;
    this._fullName = fullName;
    this._phone = phone;
    this._token = token;
  }

  // Getters para mantener los atributos privados seguros
  get id() { return this._id; }
  get username() { return this._username; }
  get email() { return this._email; }
  get fullName() { return this._fullName; }
  get phone() { return this._phone; }
  get token() { return this._token; }

  // Métodos Abstractos que cada subclase implementa de forma única (Polimorfismo)
  abstract get role(): string;
  abstract get badgeColor(): string;
  abstract getPermissions(): string[];
}

// Subclase Admin (Herencia)
export class AdminUser extends User {
  get role() { return 'Admin'; }
  get badgeColor() { return '#FF3366'; }
  getPermissions() {
    return ['Lectura general', 'Escritura', 'Eliminación de usuarios', 'Panel Admin'];
  }
}

// Subclase Auditor (Herencia)
export class AuditorUser extends User {
  get role() { return 'Auditor'; }
  get badgeColor() { return '#FFCC00'; }
  getPermissions() {
    return ['Lectura de registros', 'Historial de transacciones'];
  }
}

// Subclase Cliente (Herencia)
export class ClientUser extends User {
  get role() { return 'Usuario'; }
  get badgeColor() { return '#00FF9D'; }
  getPermissions() {
    return ['Navegación en catálogo', 'Gestión de carrito de compras'];
  }
}