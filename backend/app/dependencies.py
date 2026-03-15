from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.services.auth import decode_token

security = HTTPBearer()


async def verify_token(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> str:
    try:
        payload = decode_token(credentials.credentials)
        username: str | None = payload.get("sub")
        if username is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token",
            )
        return username
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )
