"""User management (admin only)."""

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import UserContext, get_current_admin, get_current_user
from app.auth.password import hash_password, verify_password
from app.db import get_db
from app.db.models import User

router = APIRouter(prefix="/users", tags=["users"])


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    role: str
    is_active: bool
    created_at: datetime


class UserCreate(BaseModel):
    username: str = Field(min_length=1, max_length=100)
    password: str = Field(min_length=6, max_length=200)
    role: str = Field(default="user", pattern="^(admin|user)$")
    is_active: bool = True


class UserUpdate(BaseModel):
    password: str | None = Field(default=None, min_length=6, max_length=200)
    role: str | None = Field(default=None, pattern="^(admin|user)$")
    is_active: bool | None = None


class PasswordChangeRequest(BaseModel):
    current_password: str
    new_password: str = Field(min_length=6, max_length=200)


@router.get("", response_model=list[UserRead])
async def list_users(
    db: AsyncSession = Depends(get_db),
    _: UserContext = Depends(get_current_admin),
) -> list[User]:
    rows = (
        await db.execute(select(User).order_by(User.id))
    ).scalars().all()
    return list(rows)


@router.post("", response_model=UserRead, status_code=status.HTTP_201_CREATED)
async def create_user(
    payload: UserCreate,
    db: AsyncSession = Depends(get_db),
    _: UserContext = Depends(get_current_admin),
) -> User:
    existing = (
        await db.execute(select(User).where(User.username == payload.username))
    ).scalar_one_or_none()
    if existing is not None:
        raise HTTPException(
            status.HTTP_409_CONFLICT, "Username already exists"
        )
    user = User(
        username=payload.username,
        password_hash=hash_password(payload.password),
        role=payload.role,
        is_active=payload.is_active,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


@router.patch("/{user_id}", response_model=UserRead)
async def update_user(
    user_id: int,
    payload: UserUpdate,
    db: AsyncSession = Depends(get_db),
    admin: UserContext = Depends(get_current_admin),
) -> User:
    user = await db.get(User, user_id)
    if user is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")

    if payload.password is not None:
        user.password_hash = hash_password(payload.password)
    if payload.role is not None:
        # 自分自身の role 変更は拒否 (admin → user で締め出しを防ぐ)
        if user.id == admin.id and payload.role != admin.role:
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST,
                "Cannot change your own role",
            )
        user.role = payload.role
    if payload.is_active is not None:
        if user.id == admin.id and not payload.is_active:
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST,
                "Cannot deactivate yourself",
            )
        user.is_active = payload.is_active

    await db.commit()
    await db.refresh(user)
    return user


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    admin: UserContext = Depends(get_current_admin),
) -> None:
    if user_id == admin.id:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST, "Cannot delete yourself"
        )
    user = await db.get(User, user_id)
    if user is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")
    await db.delete(user)
    await db.commit()


@router.post("/me/password", status_code=status.HTTP_204_NO_CONTENT)
async def change_my_password(
    payload: PasswordChangeRequest,
    db: AsyncSession = Depends(get_db),
    me: UserContext = Depends(get_current_user),
) -> None:
    """全ユーザーが利用可能: 自分自身のパスワード変更。"""
    user = await db.get(User, me.id)
    if user is None or not verify_password(payload.current_password, user.password_hash):
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED, "Current password is incorrect"
        )
    user.password_hash = hash_password(payload.new_password)
    await db.commit()
