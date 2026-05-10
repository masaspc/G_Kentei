from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel

from app.auth.jwt import create_access_token
from app.auth.password import verify_password
from app.config import get_settings

router = APIRouter(prefix="/auth", tags=["auth"])


class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


@router.post("/login", response_model=TokenResponse)
async def login(payload: LoginRequest) -> TokenResponse:
    settings = get_settings()
    if payload.username != settings.auth_username or not verify_password(
        payload.password, settings.auth_password_hash
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
        )
    return TokenResponse(access_token=create_access_token(payload.username))
