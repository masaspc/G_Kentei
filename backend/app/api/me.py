from fastapi import APIRouter, Depends

from app.auth.dependencies import UserContext, get_current_user

router = APIRouter(tags=["me"])


@router.get("/me")
async def read_me(
    current_user: UserContext = Depends(get_current_user),
) -> dict[str, object]:
    return {
        "id": current_user.id,
        "username": current_user.username,
        "role": current_user.role,
    }
