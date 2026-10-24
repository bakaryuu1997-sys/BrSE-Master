import docx

def create_sample():
    doc = docx.Document()
    doc.add_heading("Tài liệu Thiết kế Cơ bản", 0)
    doc.add_paragraph("Dự án BrSE Assistant - Kiểm tra chuyển đổi DOCX sang PDF")
    doc.add_paragraph("日本語テスト: 要件定義書・基本設計書 (Japanese Test)")
    table = doc.add_table(rows=2, cols=2)
    table.cell(0, 0).text = "Mục"
    table.cell(0, 1).text = "Nội dung"
    table.cell(1, 0).text = "Trạng thái"
    table.cell(1, 1).text = "Đang xử lý (進行中)"
    doc.save("/tmp/test_doc.docx")
    print("Sample docx created at /tmp/test_doc.docx")

if __name__ == "__main__":
    create_sample()
