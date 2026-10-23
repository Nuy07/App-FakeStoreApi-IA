import os
from pathlib import Path

from dotenv import load_dotenv

# Carga api-python/.env sin importar desde qué carpeta se ejecute uvicorn.
# Las variables de entorno que ya existan en el sistema (por ejemplo, las que
# se configuran en Render) tienen prioridad.
load_dotenv(Path(__file__).with_name(".env"))

# --- DATOS DE CONEXIÓN A LA BASE DE DATOS (PostgreSQL / Supabase) ---
# Para usar otra BD basta con cambiar estas variables, no el código.
DB_HOST = os.getenv("DB_HOST", "127.0.0.1")
DB_PORT = int(os.getenv("DB_PORT", "5432"))
DB_USER = os.getenv("DB_USER", "postgres")
DB_PASSWORD = os.getenv("DB_PASSWORD", "")
DB_NAME = os.getenv("DB_NAME", "postgres")
# Supabase sólo acepta conexiones cifradas ("require"); un PostgreSQL local sin SSL usa "disable".
DB_SSLMODE = os.getenv("DB_SSLMODE", "require")

# --- TOKENS DE SESIÓN ---
# Clave secreta con la que la API firma los tokens del login. Debe ser larga y aleatoria;
# en Render se genera sola (ver render.yaml).
JWT_SECRET = os.getenv("JWT_SECRET", "")
# Días que dura una sesión antes de pedir login otra vez.
TOKEN_DAYS = int(os.getenv("TOKEN_DAYS", "7"))
