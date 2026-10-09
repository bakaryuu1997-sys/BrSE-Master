import json
from pathlib import Path

from fastapi import APIRouter, HTTPException

from app.schemas.email_template import EmailTemplateRead

router = APIRouter()
SEED_PATH = Path(__file__).resolve().parents[2] / "seeds" / "email_templates.json"


def load_templates() -> list[EmailTemplateRead]:
    with SEED_PATH.open(encoding="utf-8") as file:
        return [EmailTemplateRead.model_validate(item) for item in json.load(file)]


@router.get("", response_model=list[EmailTemplateRead])
def list_email_templates() -> list[EmailTemplateRead]:
    return load_templates()


@router.get("/{template_id}", response_model=EmailTemplateRead)
def get_email_template(template_id: str) -> EmailTemplateRead:
    for template in load_templates():
        if template.id == template_id:
            return template
    raise HTTPException(status_code=404, detail="Email template not found")
