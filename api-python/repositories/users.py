import logging

import bcrypt
from sqlalchemy import text

from database import engine

logger = logging.getLogger("uvicorn.error")

# Une cada usuario con su dirección principal (o la primera que tenga).
# Nunca selecciona password_hash: las contraseñas no salen de la BD.
USERS_QUERY = """
    SELECT u.id, u.username, u.email, u.nombre, u.apellido, u.telefono, u.rol,
           d.calle, d.numero_ext, d.ciudad, d.codigo_postal, d.latitud, d.longitud
    FROM usuarios u
    LEFT JOIN direcciones d ON d.id = (
        SELECT id FROM direcciones
        WHERE usuario_id = u.id
        ORDER BY es_principal DESC, id
        LIMIT 1
    )
    WHERE u.activo
"""


def _coordinate(value):
    return str(float(value)) if value is not None else None


# Convierte una fila de la BD en el JSON con formato FakeStoreAPI que espera la app.
def _to_json(row):
    address = None
    if row.calle is not None:
        number = row.numero_ext
        address = {
            "geolocation": {"lat": _coordinate(row.latitud), "long": _coordinate(row.longitud)},
            "city": row.ciudad,
            "street": row.calle,
            "number": int(number) if number and number.isdigit() else number,
            "zipcode": row.codigo_postal,
        }
    return {
        "address": address,
        "id": row.id,
        "email": row.email,
        "username": row.username,
        "name": {"firstname": row.nombre, "lastname": row.apellido},
        "phone": row.telefono or "",
        "role": row.rol,                                   # "admin", "auditor" o "cliente"
    }


def get_all():
    with engine.connect() as conn:
        rows = conn.execute(text(USERS_QUERY + " ORDER BY u.id"))
        return [_to_json(row) for row in rows]


def get_by_id(user_id):
    with engine.connect() as conn:
        row = conn.execute(text(USERS_QUERY + " AND u.id = :id"), {"id": user_id}).first()
        return _to_json(row) if row else None


# Compara la contraseña recibida con el hash bcrypt guardado en la BD.
# Devuelve {"id", "role"} si son correctas, o None si no.
def authenticate(username, password):
    with engine.connect() as conn:
        row = conn.execute(
            text("SELECT id, username, password_hash, rol FROM usuarios WHERE lower(username) = lower(:username) AND activo"),
            {"username": username},
        ).first()

    # La búsqueda ignora mayúsculas (como el índice único); el login exige el username exacto.
    if row is None or row.username != username:
        return None

    # bcrypt sólo acepta contraseñas de hasta 72 bytes.
    password_bytes = password.encode("utf-8")
    if len(password_bytes) > 72:
        return None

    try:
        valid = bcrypt.checkpw(password_bytes, row.password_hash.encode("utf-8"))
    except ValueError:
        # password_hash no es un hash bcrypt (por ejemplo, alguien guardó la contraseña en texto plano).
        logger.warning("El usuario %s no tiene un hash bcrypt válido en password_hash", username)
        return None
    return {"id": row.id, "role": row.rol} if valid else None
