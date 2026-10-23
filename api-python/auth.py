import logging
import secrets
from datetime import datetime, timedelta, timezone

import jwt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

import config
from repositories import users

logger = logging.getLogger("uvicorn.error")

# Clave con la que se firman los tokens. Si no está configurada se inventa una al
# arrancar: sirve para probar, pero todas las sesiones se cierran al reiniciar la API.
SECRET = config.JWT_SECRET
if not SECRET:
    SECRET = secrets.token_urlsafe(32)
    logger.warning("JWT_SECRET no está configurado: las sesiones se cerrarán cada vez que se reinicie la API")
ALGORITHM = "HS256"

# Lee el encabezado "Authorization: Bearer <token>" de cada petición.
bearer = HTTPBearer(auto_error=False)


# Token firmado (JWT) con el id y el rol del usuario; vence en config.TOKEN_DAYS días.
def create_token(user):
    expires = datetime.now(timezone.utc) + timedelta(days=config.TOKEN_DAYS)
    return jwt.encode({"sub": str(user["id"]), "role": user["role"], "exp": expires}, SECRET, algorithm=ALGORITHM)


def _unauthorized(detail):
    return HTTPException(status_code=401, detail=detail, headers={"WWW-Authenticate": "Bearer"})


# Dependencia de FastAPI: devuelve el perfil del dueño del token o responde 401.
def current_user(credentials: HTTPAuthorizationCredentials | None = Depends(bearer)):
    if credentials is None:
        raise _unauthorized("Not authenticated")
    try:
        payload = jwt.decode(credentials.credentials, SECRET, algorithms=[ALGORITHM])
        user_id = int(payload["sub"])
    except (jwt.InvalidTokenError, KeyError, ValueError):
        raise _unauthorized("Invalid or expired token")

    # El rol se vuelve a leer de la BD: si el usuario se desactivó o cambió de rol,
    # su token deja de servir para lo que ya no puede hacer.
    user = users.get_by_id(user_id)
    if user is None:
        raise _unauthorized("Invalid or expired token")
    return user


# Dependencia que además exige uno de los roles indicados; si no lo tiene responde 403.
def require_roles(*roles):
    def checker(user=Depends(current_user)):
        if user["role"] not in roles:
            raise HTTPException(status_code=403, detail="Not enough permissions")
        return user

    return checker
