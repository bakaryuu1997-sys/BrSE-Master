import os
from docx import Document
from docx.shared import Pt
import markdown
from bs4 import BeautifulSoup
try:
    from weasyprint import HTML
except ImportError:
    HTML = None

class ExportService:
    @staticmethod
    def to_pdf(md_content, output_path):
        """
        Convert Markdown to PDF using WeasyPrint.
        """
        html_content = markdown.markdown(md_content, extensions=['extra', 'codehilite', 'toc', 'tables'])
        
        styled_html = f"""
        <html>
            <head>
                <style>
                    body {{ font-family: 'DejaVu Sans', sans-serif; padding: 40px; line-height: 1.6; color: #333; }}
                    h1 {{ color: #2d3436; border-bottom: 2px solid #0984e3; padding-bottom: 10px; }}
                    h2 {{ color: #0984e3; margin-top: 30px; }}
                    table {{ border-collapse: collapse; width: 100%; margin: 20px 0; }}
                    th, td {{ border: 1px solid #ddd; padding: 12px; text-align: left; }}
                    th {{ background-color: #f8f9fa; }}
                    code {{ background: #f4f4f4; padding: 2px 5px; border-radius: 3px; }}
                </style>
            </head>
            <body>
                {html_content}
            </body>
        </html>
        """
        
        if HTML:
            HTML(string=styled_html).write_pdf(output_path)
        else:
            fallback_html = output_path.replace('.pdf', '.html')
            with open(fallback_html, 'w', encoding='utf-8') as f:
                f.write(styled_html)
            raise ImportError(f"PDF engine is not installed. A print-friendly HTML file was created at {fallback_html}.")

    @staticmethod
    def to_word(md_content, output_path):
        """
        Convert Markdown to Word (.docx).
        """
        doc = Document()
        doc.core_properties.title = os.path.basename(output_path)
        normal_style = doc.styles["Normal"]
        normal_style.font.name = "Arial"
        normal_style.font.size = Pt(10.5)
        
        html = markdown.markdown(md_content, extensions=['extra', 'tables'])
        soup = BeautifulSoup(html, 'html.parser')

        body = soup.body or soup
        for element in body.find_all(['h1', 'h2', 'h3', 'p', 'ul', 'ol', 'table', 'blockquote'], recursive=False):
            if element.name == 'h1':
                doc.add_heading(element.get_text(" ", strip=True), level=1)
            elif element.name == 'h2':
                doc.add_heading(element.get_text(" ", strip=True), level=2)
            elif element.name == 'h3':
                doc.add_heading(element.get_text(" ", strip=True), level=3)
            elif element.name in ['ul', 'ol']:
                style = 'List Bullet' if element.name == 'ul' else 'List Number'
                for item in element.find_all('li', recursive=False):
                    text = item.get_text(" ", strip=True)
                    if text:
                        doc.add_paragraph(text, style=style)
            elif element.name == 'table':
                rows = element.find_all('tr')
                if rows:
                    cols = len(rows[0].find_all(['th', 'td']))
                    table = doc.add_table(rows=0, cols=cols)
                    table.style = 'Table Grid'
                    for row in rows:
                        row_cells = table.add_row().cells
                        for i, cell in enumerate(row_cells):
                            row_cells[i].text = row.find_all(['th', 'td'])[i].get_text(" ", strip=True)
            elif element.name == 'blockquote':
                paragraph = doc.add_paragraph()
                paragraph.style = doc.styles["Quote"]
                paragraph.add_run(element.get_text(" ", strip=True))
            else:
                text = element.get_text(" ", strip=True)
                if text:
                    doc.add_paragraph(text)
                
        doc.save(output_path)
