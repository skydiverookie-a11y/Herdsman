from datetime import datetime, timedelta, timezone

from jose import jwt
from passlib.context import CryptContext

from app.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Store hashed password at startup; mutable so password change works
_hashed_password: str | None = None


def _get_hashed_password() -> str:
    global _hashed_password
    if _hashed_password is None:
        _hashed_password = pwd_context.hash(settings.ADMIN_PASSWORD)
    return _hashed_password


def set_hashed_password(hashed: str):
    global _hashed_password
    _hashed_password = hashed


def verify_password(plain: str) -> bool:
    return pwd_context.verify(plain, _get_hashed_password())


def hash_password(plain: str) -> str:
    return pwd_context.hash(plain)


def create_token(username: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(hours=settings.JWT_EXPIRY_HOURS)
    payload = {"sub": username, "exp": expire}
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def decode_token(token: str) -> dict:
    return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
