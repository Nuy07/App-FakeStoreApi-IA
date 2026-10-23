from sqlalchemy import URL, create_engine, text
from sqlalchemy.exc import DBAPIError, OperationalError

import config

# Versión de la estructura de BD que espera esta API. Debe coincidir con la fila de la
# tabla version_esquema que crea database/fakestore_db.sql: si cambias la estructura
# de la BD, sube el número en los dos lugares.
SCHEMA_VERSION = 2

# URL.create escapa la contraseña, así que puede llevar @, # o / sin romper la conexión.
DATABASE_URL = URL.create(
    "postgresql+psycopg",
    username=config.DB_USER,
    password=config.DB_PASSWORD,
    host=config.DB_HOST,
    port=config.DB_PORT,
    database=config.DB_NAME,
)

# El engine no se conecta al importarse: la API arranca aunque la BD no responda.
# pool_pre_ping revisa cada conexión antes de usarla, así la API se recupera sola si la
# BD se reinicia. El pool es pequeño porque el plan gratis de Supabase limita las conexiones.
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    pool_recycle=1800,
    pool_size=3,
    max_overflow=2,
    pool_timeout=10,
    connect_args={
        "sslmode": config.DB_SSLMODE,
        "connect_timeout": 5,
        # Sin sentencias preparadas: así también funciona con el pooler de Supabase en
        # modo transacción (puerto 6543), que no las admite.
        "prepare_threshold": None,
    },
)


# En psycopg, OperationalError significa que no se pudo usar la conexión (servidor
# apagado o inalcanzable, usuario o contraseña incorrectos, BD inexistente, demasiadas
# conexiones). Los errores de estructura (tabla o columna que no existe) son de otro tipo.
def is_connection_error(error: DBAPIError) -> bool:
    return error.connection_invalidated or isinstance(error, OperationalError)


# Revisa que la BD responda y que tenga la estructura que espera la API.
# Devuelve el estado ("ok", "unavailable" u "outdated_schema") y el error, si hubo.
def check_status():
    # Cualquier falla al abrir la conexión significa que la BD no está disponible.
    try:
        conn = engine.connect()
    except Exception as error:
        return "unavailable", getattr(error, "orig", None) or error

    with conn:
        try:
            version = conn.execute(text("SELECT version FROM version_esquema")).scalar()
        except DBAPIError as error:
            return ("unavailable" if is_connection_error(error) else "outdated_schema"), error.orig

    if version != SCHEMA_VERSION:
        return "outdated_schema", f"la BD tiene la versión {version} y la API espera la {SCHEMA_VERSION}"
    return "ok", None
