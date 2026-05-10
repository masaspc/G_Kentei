from datetime import UTC, datetime, timedelta

from jose import JWTError, jwt

from app.config import get_settings


def create_access_token(subject: str) -> str:
    settings = get_settings()
    expire = datetime.now(tz=UTC) + timedelta(minutes=settings.jwt_expire_minutes)
    payload = {"sub": subject, "exp": expire}
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def decode_access_token(token: str) -> str | None:
    settings = get_settings()
    try:
        payload = jwt.decode(
            token, settings.jwt_secret, algorithms=[settings.jwt_algorithm]
        )
        subject = payload.get("sub")
        return subject if isinstance(subject, str) else None
    except JWTError:
        return None
