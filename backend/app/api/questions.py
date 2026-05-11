from fastapi import (
    APIRouter,
    Depends,
    File,
    HTTPException,
    Query,
    UploadFile,
    status,
)
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user
from app.db import get_db
from app.db.models import Question
from app.llm.explanation import generate_explanation
from app.llm.generator import generate_question
from app.llm.usage import is_over_budget, log_usage
from app.schemas.generate import GenerateQuestionRequest, GenerateQuestionResponse
from app.schemas.question import (
    ImportResult,
    QuestionCreate,
    QuestionListResponse,
    QuestionRead,
    QuestionUpdate,
)
from app.services.question_import import (
    import_questions,
    parse_csv,
    parse_json,
)

router = APIRouter(prefix="/questions", tags=["questions"])


@router.get("", response_model=QuestionListResponse)
async def list_questions(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    category: str | None = None,
    difficulty: int | None = Query(None, ge=1, le=3),
    is_active: bool | None = None,
    search: str | None = None,
    db: AsyncSession = Depends(get_db),
    _: str = Depends(get_current_user),
) -> QuestionListResponse:
    stmt = select(Question)
    if category:
        stmt = stmt.where(Question.syllabus_category == category)
    if difficulty is not None:
        stmt = stmt.where(Question.difficulty == difficulty)
    if is_active is not None:
        stmt = stmt.where(Question.is_active == is_active)
    if search:
        stmt = stmt.where(Question.question_text.ilike(f"%{search}%"))

    total_stmt = select(func.count()).select_from(stmt.subquery())
    total = (await db.execute(total_stmt)).scalar_one()

    items_stmt = (
        stmt.order_by(Question.id.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    items = (await db.execute(items_stmt)).scalars().all()

    return QuestionListResponse(
        items=[QuestionRead.model_validate(item) for item in items],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/categories", response_model=list[str])
async def list_categories(
    db: AsyncSession = Depends(get_db),
    _: str = Depends(get_current_user),
) -> list[str]:
    stmt = (
        select(Question.syllabus_category)
        .distinct()
        .order_by(Question.syllabus_category)
    )
    rows = (await db.execute(stmt)).scalars().all()
    return list(rows)


@router.post("/generate", response_model=GenerateQuestionResponse)
async def generate_draft(
    payload: GenerateQuestionRequest,
    db: AsyncSession = Depends(get_db),
    _: str = Depends(get_current_user),
) -> GenerateQuestionResponse:
    if await is_over_budget(db):
        raise HTTPException(
            status.HTTP_402_PAYMENT_REQUIRED,
            "Monthly Claude API budget exceeded",
        )
    try:
        result = await generate_question(
            category=payload.category,
            difficulty=payload.difficulty,
            question_type=payload.question_type,
            model_choice=payload.model,
        )
    except RuntimeError as exc:
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE, str(exc)
        ) from exc
    await log_usage(
        db, model=result.model, purpose="question_gen", usage=result.usage
    )
    q = result.question
    return GenerateQuestionResponse(
        question_text=q.question_text,
        question_type=q.question_type,  # type: ignore[arg-type]
        choices=q.choices,
        correct_answer=q.correct_answer,
        explanation=q.explanation,
        tags=q.tags,
        model=payload.model,
    )


@router.post("/import", response_model=ImportResult)
async def import_questions_endpoint(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    _: str = Depends(get_current_user),
) -> ImportResult:
    content = await file.read()
    filename = (file.filename or "").lower()
    content_type = (file.content_type or "").lower()

    is_csv = filename.endswith(".csv") or "csv" in content_type
    is_json = filename.endswith(".json") or "json" in content_type

    try:
        if is_csv and not is_json:
            records = parse_csv(content)
        elif is_json:
            records = parse_json(content)
        else:
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST,
                "Unsupported file format. Use .csv or .json",
            )
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(exc)) from exc

    return await import_questions(records, db)


@router.post("", response_model=QuestionRead, status_code=status.HTTP_201_CREATED)
async def create_question(
    payload: QuestionCreate,
    db: AsyncSession = Depends(get_db),
    _: str = Depends(get_current_user),
) -> Question:
    question = Question(**payload.model_dump())
    db.add(question)
    await db.commit()
    await db.refresh(question)
    return question


@router.get("/{question_id}", response_model=QuestionRead)
async def get_question(
    question_id: int,
    db: AsyncSession = Depends(get_db),
    _: str = Depends(get_current_user),
) -> Question:
    question = await db.get(Question, question_id)
    if question is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Question not found")
    return question


@router.patch("/{question_id}", response_model=QuestionRead)
async def update_question(
    question_id: int,
    payload: QuestionUpdate,
    db: AsyncSession = Depends(get_db),
    _: str = Depends(get_current_user),
) -> Question:
    question = await db.get(Question, question_id)
    if question is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Question not found")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(question, key, value)
    await db.commit()
    await db.refresh(question)
    return question


@router.delete("/{question_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_question(
    question_id: int,
    db: AsyncSession = Depends(get_db),
    _: str = Depends(get_current_user),
) -> None:
    question = await db.get(Question, question_id)
    if question is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Question not found")
    await db.delete(question)
    await db.commit()


@router.post("/{question_id}/generate-explanation", response_model=QuestionRead)
async def generate_question_explanation(
    question_id: int,
    db: AsyncSession = Depends(get_db),
    _: str = Depends(get_current_user),
) -> Question:
    question = await db.get(Question, question_id)
    if question is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Question not found")

    if await is_over_budget(db):
        raise HTTPException(
            status.HTTP_402_PAYMENT_REQUIRED,
            "Monthly Claude API budget exceeded",
        )

    try:
        result = await generate_explanation(
            question_text=question.question_text,
            correct_answer=question.correct_answer,
            category=question.syllabus_category,
        )
    except RuntimeError as exc:
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE, str(exc)
        ) from exc

    await log_usage(
        db, model=result.model, purpose="explanation", usage=result.usage
    )

    question.explanation = result.text
    question.explanation_source = "claude_haiku"
    await db.commit()
    await db.refresh(question)
    return question
