from pydantic import BaseModel


class TemplateVariable(BaseModel):
    key: str
    label: str
    required: bool = True
    default: str = ""
    input_type: str = "text"


class EmailTemplateRead(BaseModel):
    id: str
    slug: str
    category: str
    title_vi: str
    title_ja: str
    subject_template: str
    body_template: str
    variables: list[TemplateVariable]
    keigo_level: str = "formal"
