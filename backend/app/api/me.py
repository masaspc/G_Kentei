from fastapi import APIRouter, Depends

from app.auth.dependencies import get_current_user

router = APIRouter(tags=["me"])


@router.get("/me")
async def read_me(current_user: str = Depends(get_current_user)) -> dict[str, str]:
    return {"username": current_user}
