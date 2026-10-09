from typing import Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, cast, String
from sqlalchemy.exc import IntegrityError

from app.db.session import get_db
from app.models.glossary import GlossaryTerm as GlossaryTermModel
from app.schemas import glossary as glossary_schemas

router = APIRouter()

@router.get("", response_model=glossary_schemas.GlossaryPagination, include_in_schema=False)
@router.get("/", response_model=glossary_schemas.GlossaryPagination)
def read_glossary_terms(
    db: Session = Depends(get_db),
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=200),
    search: Optional[str] = None,
    category: Optional[str] = None,
    role: Optional[str] = None,
) -> Any:
    """
    Retrieve glossary terms with pagination and filters.
    """
    query = db.query(GlossaryTermModel)
    
    if search:
        search_filter = f"%{search}%"
        query = query.filter(
            or_(
                GlossaryTermModel.english.ilike(search_filter),
                GlossaryTermModel.japanese.ilike(search_filter),
                GlossaryTermModel.kana.ilike(search_filter),
                GlossaryTermModel.vietnamese.ilike(search_filter),
            )
        )
    
    if category:
        query = query.filter(GlossaryTermModel.category == category)
    
    query = query.order_by(GlossaryTermModel.english.asc())

    if role:
        # DB-level filtering: Cast JSON column to string pattern matching for cross-db compatibility (SQLite & PostgreSQL)
        escaped_role = role.replace("%", "\\%").replace("_", "\\_")
        query = query.filter(cast(GlossaryTermModel.roles, String).like(f'%"{escaped_role}"%'))

    total = query.count()
    pages = (total + size - 1) // size if total > 0 else 0
    items = query.offset((page - 1) * size).limit(size).all()
    
    return {
        "items": items,
        "total": total,
        "page": page,
        "size": size,
        "pages": pages
    }

@router.get("/{term_id}", response_model=glossary_schemas.GlossaryTerm)
def read_glossary_term(
    term_id: str,
    db: Session = Depends(get_db),
) -> Any:
    """
    Get a specific glossary term by ID.
    """
    term = db.query(GlossaryTermModel).filter(GlossaryTermModel.id == term_id).first()
    if not term:
        raise HTTPException(status_code=404, detail="Term not found")
    return term

@router.post("", response_model=glossary_schemas.GlossaryTerm, include_in_schema=False)
@router.post("/", response_model=glossary_schemas.GlossaryTerm)
def create_glossary_term(
    *,
    db: Session = Depends(get_db),
    term_in: glossary_schemas.GlossaryTermCreate,
) -> Any:
    """
    Create new glossary term.
    """
    term = db.query(GlossaryTermModel).filter(GlossaryTermModel.id == term_in.id).first()
    if term:
        raise HTTPException(status_code=400, detail="Term with this ID already exists")
    
    term = GlossaryTermModel(**term_in.model_dump())
    db.add(term)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        # Check if it's an ID collision or a Term Pair collision
        existing_pair = db.query(GlossaryTermModel).filter(
            GlossaryTermModel.japanese == term_in.japanese,
            GlossaryTermModel.english == term_in.english
        ).first()
        if existing_pair:
            raise HTTPException(status_code=400, detail=f"Thuật ngữ '{term_in.japanese}' đã tồn tại trong Glossary.")
        raise HTTPException(status_code=400, detail="Lỗi dữ liệu: ID hoặc nội dung bị trùng lặp.")
        
    db.refresh(term)
    return term


@router.put("/{term_id}", response_model=glossary_schemas.GlossaryTerm)
def update_glossary_term(
    *,
    term_id: str,
    db: Session = Depends(get_db),
    term_in: glossary_schemas.GlossaryTermUpdate,
) -> Any:
    """
    Update an existing glossary term.
    """
    term = db.query(GlossaryTermModel).filter(GlossaryTermModel.id == term_id).first()
    if not term:
        raise HTTPException(status_code=404, detail="Term not found")

    for field, value in term_in.model_dump(exclude_unset=True).items():
        setattr(term, field, value)
    db.commit()
    db.refresh(term)
    return term


@router.delete("/{term_id}")
def delete_glossary_term(
    term_id: str,
    db: Session = Depends(get_db),
) -> dict[str, str]:
    """
    Delete a glossary term.
    """
    term = db.query(GlossaryTermModel).filter(GlossaryTermModel.id == term_id).first()
    if not term:
        raise HTTPException(status_code=404, detail="Term not found")
    db.delete(term)
    db.commit()
    return {"message": "Term deleted"}
