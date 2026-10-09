import json
import os
import shutil
import tempfile
from pathlib import Path
from typing import Any

from urllib.parse import quote

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, BackgroundTasks
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.power_tool import PowerToolsStateRecord
from app.schemas.power_tool import PowerToolsStateRead, PowerToolsStateWrite
from app.services.docx_pdf_converter import convert_docx_to_pdf

router = APIRouter()


def serialize(record: PowerToolsStateRecord) -> dict[str, Any]:
    try:
        payload = json.loads(record.payload or "{}")
    except json.JSONDecodeError:
      payload = {}
    return {
        "project_id": record.project_id,
        "payload": payload if isinstance(payload, dict) else {},
        "created_at": record.created_at,
        "updated_at": record.updated_at,
    }


@router.get("/{project_id}", response_model=PowerToolsStateRead)
def get_power_tools_state(project_id: str, db: Session = Depends(get_db)):
    record = db.query(PowerToolsStateRecord).filter(PowerToolsStateRecord.project_id == project_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Power Tools state not found")
    return serialize(record)


@router.put("/{project_id}", response_model=PowerToolsStateRead)
def save_power_tools_state(project_id: str, payload: PowerToolsStateWrite, db: Session = Depends(get_db)):
    record = db.query(PowerToolsStateRecord).filter(PowerToolsStateRecord.project_id == project_id).first()
    if not record:
        record = PowerToolsStateRecord(project_id=project_id)
        db.add(record)
    record.payload = json.dumps(payload.payload, ensure_ascii=False)
    db.commit()
    db.refresh(record)
    return serialize(record)


@router.post("/convert-docx-to-pdf")
async def convert_docx_to_pdf_endpoint(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...)
):
    """
    Chuyển đổi tệp .docx sang định dạng .pdf chuẩn hóa cho BrSE.
    Hỗ trợ xuất sang PDF chuẩn để gửi khách hàng Nhật hoặc lưu trữ.
    """
    filename = file.filename or "document.docx"
    if not filename.lower().endswith(".docx"):
        raise HTTPException(status_code=400, detail="Chỉ hỗ trợ tệp định dạng .docx")

    original_stem = Path(filename).stem
    temp_dir = tempfile.mkdtemp(prefix="brse_docx_pdf_")
    temp_docx_path = os.path.join(temp_dir, "document.docx")
    temp_pdf_path = os.path.join(temp_dir, "document.pdf")

    # RFC 5987 / RFC 6266 content disposition (ASCII-safe for latin-1 header encoding, UTF-8 for browsers)
    safe_ascii_stem = "".join(c if c.isascii() and (c.isalnum() or c in "-_") else "_" for c in original_stem).strip("_") or "document"
    encoded_pdf = quote(f"{original_stem}.pdf")
    content_disp_pdf = f'attachment; filename="{safe_ascii_stem}.pdf"; filename*=UTF-8\'\'{encoded_pdf}'

    encoded_html = quote(f"{original_stem}.html")
    content_disp_html = f'attachment; filename="{safe_ascii_stem}.html"; filename*=UTF-8\'\'{encoded_html}'

    try:
        content = await file.read()
        with open(temp_docx_path, "wb") as f:
            f.write(content)

        success, method = convert_docx_to_pdf(temp_docx_path, temp_pdf_path)

        if not success or not os.path.exists(temp_pdf_path) or os.path.getsize(temp_pdf_path) == 0:
            fallback_html = os.path.join(temp_dir, "document.html")
            if os.path.exists(fallback_html):
                def cleanup_html():
                    shutil.rmtree(temp_dir, ignore_errors=True)
                background_tasks.add_task(cleanup_html)
                return FileResponse(
                    path=fallback_html,
                    media_type="text/html",
                    headers={"Content-Disposition": content_disp_html}
                )
            raise HTTPException(status_code=500, detail=f"Chuyển đổi DOCX thất bại: {method}")

        def cleanup_all():
            shutil.rmtree(temp_dir, ignore_errors=True)
        background_tasks.add_task(cleanup_all)

        return FileResponse(
            path=temp_pdf_path,
            media_type="application/pdf",
            headers={"Content-Disposition": content_disp_pdf}
        )
    except HTTPException:
        raise
    except Exception as exc:
        shutil.rmtree(temp_dir, ignore_errors=True)
        raise HTTPException(status_code=500, detail=f"Lỗi khi xử lý file: {str(exc)}")

