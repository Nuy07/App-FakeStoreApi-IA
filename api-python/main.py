import logging
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.exc import DBAPIError
from sqlalchemy.exc import TimeoutError as PoolTimeoutError

import config
from auth import create_token, current_user, require_roles
from database import check_status, engine, is_connection_error
from repositories import carts, products, users
from schemas import ProductInput, UserLogin

logger = logging.getLogger("uvicorn.error")

# Quién puede hacer qué (el rol se guarda en la columna usuarios.rol).
admin_only = [Depends(require_roles("admin"))]
staff_only = [Depends(require_roles("admin", "auditor"))]


# Al arrancar sólo avisa cómo está la BD; la API sigue funcionando aunque no responda.
@asynccontextmanager
async def lifespan(app: FastAPI):
    status, error = check_status()
    if status == "ok":
        logger.info("Conectado a PostgreSQL en %s:%s/%s", config.DB_HOST, config.DB_PORT, config.DB_NAME)
    elif status == "unavailable":
        logger.warning("Base de datos no disponible al iniciar (%s). Revisa las variables DB_* (en .env o en Render)", error)
    else:
        logger.warning("La BD %s no tiene la estructura esperada (%s). Ejecuta database/fakestore_db.sql "
                       "(borra y vuelve a crear las tablas con los datos de prueba)", config.DB_NAME, error)
    yield
    engine.dispose()


app = FastAPI(lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# Errores de la BD: 503 si no se puede conectar (servidor apagado, datos de conexión
# incorrectos) y 500 para cualquier otro (por ejemplo, una tabla que no existe). Al
# registrarse para una excepción concreta, la respuesta conserva las cabeceras CORS.
@app.exception_handler(DBAPIError)
def database_error(request, error: DBAPIError):
    if is_connection_error(error):
        logger.error("No se pudo conectar a la BD: %s", error.orig)
        return JSONResponse(status_code=503, content={"detail": "Database unavailable"})
    logger.error("Error de la BD: %s", error.orig)
    return JSONResponse(status_code=500, content={"detail": "Database error"})


# Todas las conexiones del pool están ocupadas esperando a una BD que no responde.
@app.exception_handler(PoolTimeoutError)
def database_busy(request, error: PoolTimeoutError):
    logger.error("No hay conexiones libres hacia la BD: %s", error)
    return JSONResponse(status_code=503, content={"detail": "Database unavailable"})


# --- ESTADO DE LA API Y DE LA BASE DE DATOS ---
# Respuesta inmediata que no toca la BD: Render la usa como health check (debe responder
# en menos de 5 segundos aunque la BD esté lenta o pausada).
@app.get("/")
def root():
    return {"api": "ok", "health": "/health", "docs": "/docs"}

@app.get("/health")
def health():
    status, _ = check_status()
    return {"api": "ok", "database": status}


# --- RUTAS / ENDPOINTS DE PRODUCTOS ---
# Consultar el catálogo es público; crear, editar y eliminar exige un token de admin.
@app.get("/products/categories")
def get_categories():
    return products.get_categories()

@app.get("/products/category/{category_name}")
def get_products_by_category(category_name: str):
    return products.get_by_category(category_name)

@app.get("/products")
def get_products():
    return products.get_all()

@app.get("/products/{product_id}")
def get_product(product_id: int):
    product = products.get_by_id(product_id)
    if product is None:
        raise HTTPException(status_code=404, detail="Product not found")
    return product

@app.post("/products", status_code=201, dependencies=admin_only)
def create_product(product: ProductInput):
    return products.create(product)

@app.put("/products/{product_id}", dependencies=admin_only)
def update_product(product_id: int, product: ProductInput):
    updated_product = products.update(product_id, product)
    if updated_product is None:
        raise HTTPException(status_code=404, detail="Product not found")
    return updated_product

@app.delete("/products/{product_id}", dependencies=admin_only)
def delete_product(product_id: int):
    deleted_product = products.delete(product_id)
    if deleted_product is None:
        raise HTTPException(status_code=404, detail="Product not found")
    return deleted_product


# --- RUTAS / ENDPOINTS DE USUARIOS (sólo admin y auditor: tienen datos personales) ---
@app.get("/users", dependencies=staff_only)
def get_users():
    return users.get_all()

@app.get("/users/{user_id}", dependencies=staff_only)
def get_user(user_id: int):
    user = users.get_by_id(user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return user


# --- RUTAS / ENDPOINTS DE CARRITOS (sólo admin y auditor) ---
@app.get("/carts", dependencies=staff_only)
def get_carts():
    return carts.get_all()

@app.get("/carts/{cart_id}", dependencies=staff_only)
def get_cart(cart_id: int):
    cart = carts.get_by_id(cart_id)
    if cart is None:
        raise HTTPException(status_code=404, detail="Cart not found")
    return cart


# --- ENDPOINTS DE AUTENTICACIÓN ---
# Devuelve un token firmado que la app manda después en "Authorization: Bearer <token>".
@app.post("/auth/login")
def login(user: UserLogin):
    account = users.authenticate(user.username, user.password)
    if account is None:
        raise HTTPException(status_code=401, detail="Authentication failed")
    return {"token": create_token(account)}

# Perfil del usuario dueño del token (la app lo pide justo después del login).
@app.get("/auth/me")
def me(user=Depends(current_user)):
    return user
