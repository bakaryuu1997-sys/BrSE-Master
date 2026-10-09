import uuid

from fastapi.testclient import TestClient

from app.db.session import SessionLocal
from app.main import app
from app.models.glossary import GlossaryTerm
from app.models.knowledge import KnowledgeItem
from app.services.meeting_processor import extract_and_save_glossary


client = TestClient(app)


def _term_payload(term_id: str) -> dict:
    return {
        "id": term_id,
        "english": "requirement freeze",
        "japanese": "要件凍結",
        "kana": "ようけんとうけつ",
        "vietnamese": "đóng băng yêu cầu",
        "roles": ["BrSE", "PM"],
        "category": "Business",
        "note": "Used when scope is fixed before release.",
        "example": "Requirement freeze is planned for Friday.",
    }


def test_glossary_crud_and_role_filter() -> None:
    term_id = "pytest-requirement-freeze"
    client.delete(f"/api/glossary/{term_id}")

    create_response = client.post("/api/glossary/", json=_term_payload(term_id))
    assert create_response.status_code == 200
    created = create_response.json()
    assert created["id"] == term_id
    assert created["roles"] == ["BrSE", "PM"]

    list_response = client.get("/api/glossary/?search=freeze&role=BrSE")
    assert list_response.status_code == 200
    listed = list_response.json()
    assert listed["total"] >= 1
    assert any(item["id"] == term_id for item in listed["items"])

    update_response = client.put(f"/api/glossary/{term_id}", json={"note": "Updated note"})
    assert update_response.status_code == 200
    assert update_response.json()["note"] == "Updated note"

    delete_response = client.delete(f"/api/glossary/{term_id}")
    assert delete_response.status_code == 200

    get_response = client.get(f"/api/glossary/{term_id}")
    assert get_response.status_code == 404


def test_glossary_collection_no_slash_alias_for_extension_proxy() -> None:
    term_id = "pytest-extension-no-slash"
    client.delete(f"/api/glossary/{term_id}")

    create_response = client.post(
        "/api/glossary",
        json=_term_payload(term_id),
        follow_redirects=False,
    )
    assert create_response.status_code == 200
    assert create_response.json()["id"] == term_id

    list_response = client.get("/api/glossary", follow_redirects=False)
    assert list_response.status_code == 200

    client.delete(f"/api/glossary/{term_id}")


def test_glossary_and_knowledge_keep_separate_runtime_ownership() -> None:
    term_id = "pytest-runtime-glossary-owner"
    knowledge_project_id = "pytest-knowledge-owner-project"
    shared_phrase = "Runtime Ownership Boundary Pytest"

    client.delete(f"/api/glossary/{term_id}")
    created_knowledge_id = None

    try:
        glossary_response = client.post(
            "/api/glossary/",
            json={
                "id": term_id,
                "english": shared_phrase,
                "japanese": "実行時所有境界",
                "kana": "じっこうじしょゆうきょうかい",
                "vietnamese": "ranh giới sở hữu runtime",
                "roles": ["BrSE"],
                "category": "Runtime Glossary",
                "note": "GlossaryTerm owns runtime bilingual terms.",
                "example": "Use glossary entry in runtime term lookup.",
            },
        )
        assert glossary_response.status_code == 200
        glossary_item = glossary_response.json()
        assert glossary_item["id"] == term_id
        assert glossary_item["japanese"] == "実行時所有境界"
        assert glossary_item["roles"] == ["BrSE"]
        assert "content" not in glossary_item
        assert "project_id" not in glossary_item

        knowledge_response = client.post(
            "/api/knowledge/",
            json={
                "title": shared_phrase,
                "content": "KnowledgeItem owns generic article content, not glossary term fields.",
                "category": "process",
                "project_id": knowledge_project_id,
            },
        )
        assert knowledge_response.status_code == 200
        knowledge_item = knowledge_response.json()
        created_knowledge_id = knowledge_item["id"]
        assert knowledge_item["title"] == shared_phrase
        assert knowledge_item["content"] == "KnowledgeItem owns generic article content, not glossary term fields."
        assert knowledge_item["project_id"] == knowledge_project_id
        assert "japanese" not in knowledge_item
        assert "roles" not in knowledge_item

        glossary_search = client.get("/api/glossary/", params={"search": shared_phrase})
        assert glossary_search.status_code == 200
        glossary_matches = [item for item in glossary_search.json()["items"] if item["id"] == term_id]
        assert len(glossary_matches) == 1
        assert glossary_matches[0]["english"] == shared_phrase
        assert "content" not in glossary_matches[0]

        knowledge_search = client.get(
            "/api/knowledge/search",
            params={"q": shared_phrase, "project_id": knowledge_project_id},
        )
        assert knowledge_search.status_code == 200
        knowledge_matches = [item for item in knowledge_search.json() if item["id"] == created_knowledge_id]
        assert len(knowledge_matches) == 1
        assert knowledge_matches[0]["title"] == shared_phrase
        assert "japanese" not in knowledge_matches[0]

        delete_glossary = client.delete(f"/api/glossary/{term_id}")
        assert delete_glossary.status_code == 200
        assert client.get(f"/api/knowledge/{created_knowledge_id}").status_code == 200

        delete_knowledge = client.delete(f"/api/knowledge/{created_knowledge_id}")
        assert delete_knowledge.status_code == 200
        created_knowledge_id = None
        assert client.get(f"/api/glossary/{term_id}").status_code == 404
    finally:
        client.delete(f"/api/glossary/{term_id}")
        if created_knowledge_id is not None:
            client.delete(f"/api/knowledge/{created_knowledge_id}")


def test_meeting_glossary_extraction_uses_glossary_terms_not_knowledge() -> None:
    suffix = uuid.uuid4().hex[:8]
    english = f"Contract Freeze {suffix}"
    japanese = f"FreezeJP{suffix}"
    db = SessionLocal()
    try:
        db.query(GlossaryTerm).filter(
            (GlossaryTerm.english == english) | (GlossaryTerm.japanese == japanese)
        ).delete(synchronize_session=False)
        db.commit()
        knowledge_count = db.query(KnowledgeItem).count()

        extract_and_save_glossary(
            db,
            f"Glossary source {suffix}",
            f"## Summary\nScope notes.\n\n## Glossary\n- {english} / {japanese}: Scope is locked for release.\n\n## Actions\n- Confirm release window.",
        )

        term = db.query(GlossaryTerm).filter(GlossaryTerm.english == english).first()
        assert term is not None
        assert term.japanese == japanese
        assert term.vietnamese == "Scope is locked for release."
        assert term.note == f"Auto-extracted from meeting: Glossary source {suffix}"
        assert db.query(KnowledgeItem).count() == knowledge_count
    finally:
        db.query(GlossaryTerm).filter(
            (GlossaryTerm.english == english) | (GlossaryTerm.japanese == japanese)
        ).delete(synchronize_session=False)
        db.commit()
        db.close()
