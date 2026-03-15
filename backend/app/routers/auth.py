from fastapi import APIRouter, HTTPException, status

from app.config import settings
from app.schemas.auth import LoginRequest, TokenResponse
from app.services.auth import verify_password, create_token

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
async def login(request: LoginRequest):
    if request.username != settings.ADMIN_USER or not verify_password(request.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
        )
    token = create_token(request.username)
    return TokenResponse(access_token=token)
