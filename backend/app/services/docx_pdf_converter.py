import os
import sys
import shutil
import logging
import subprocess
import tempfile
from pathlib import Path
from typing import Optional, Tuple
from docx import Document
import html

logger = logging.getLogger(__name__)

# Common paths for LibreOffice / soffice on Windows and Linux
LIBREOFFICE_PATHS = [
    r"C:\Program Files\LibreOffice\program\soffice.exe",
    r"C:\Program Files (x86)\LibreOffice\program\soffice.exe",
    "/mnt/c/Program Files/LibreOffice/program/soffice.exe",
    "/mnt/c/Program Files (x86)/LibreOffice/program/soffice.exe",
    "/usr/bin/soffice",
    "/usr/bin/libreoffice",
    "/snap/bin/libreoffice",
]

# Common paths for Chromium-based browsers for Headless PDF generation
BROWSER_PATHS = [
    r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
    r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
    r"C:\Program Files\Google\Chrome\Application\chrome.exe",
    r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
    r"C:\Users\bakar\AppData\Local\Google\Chrome\Application\chrome.exe",
    "/mnt/c/Program Files/Google/Chrome/Application/chrome.exe",
    "/mnt/c/Program Files (x86)/Google/Chrome/Application/chrome.exe",
    "/mnt/c/Program Files/Microsoft/Edge/Application/msedge.exe",
    "/mnt/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium-browser",
    "/usr/bin/chromium",
    "/usr/bin/msedge",
]


def to_windows_path_if_wsl(path_obj_or_str: Path | str) -> str:
    """Convert a Linux/WSL path to a Windows-compatible path if running under WSL."""
    path_str = str(path_obj_or_str)
    if sys.platform != "win32" and shutil.which("wslpath"):
        try:
            res = subprocess.run(
                ["wslpath", "-w", path_str],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                check=True
            )
            return res.stdout.strip()
        except Exception:
            return path_str
    return path_str


def find_executable(name: str, fallback_paths: list[str]) -> Optional[str]:
    """Find executable in PATH or standard system paths."""
    found = shutil.which(name)
    if found:
        return found
    for path in fallback_paths:
        if os.path.isfile(path) and os.access(path, os.X_OK):
            return path
        # On Windows, os.access X_OK might not be strictly needed
        if sys.platform == "win32" and os.path.isfile(path):
            return path
    return None


def docx_to_clean_html(docx_path: str) -> str:
    """
    Parse a .docx file using python-docx and generate clean, printable HTML.
    Supports headings, text runs with styles (bold, italic, colors), lists, and tables.
    Includes Japanese typography support (Noto Sans JP, Meiryo, Yu Gothic).
    """
    doc = Document(docx_path)
    body_parts: list[str] = []

    # Document properties
    title = ""
    try:
        title = doc.core_properties.title or Path(docx_path).stem
    except Exception:
        title = Path(docx_path).stem

    # Iterate through paragraphs and tables
    # Note: doc.paragraphs and doc.tables don't interleave in docx natively,
    # but we can iterate through document body elements in XML order
    for block in doc.element.body:
        tag_name = block.tag.split("}")[-1] if "}" in block.tag else block.tag
        
        if tag_name == "p":
            # Paragraph
            # Find the corresponding docx Paragraph object
            from docx.text.paragraph import Paragraph
            p = Paragraph(block, doc)
            p_text = p.text.strip()
            style_name = p.style.name if p.style else ""
            
            if not p_text:
                body_parts.append("<div class='spacer'></div>")
                continue

            # Heading styles
            if "Heading 1" in style_name:
                body_parts.append(f"<h1>{html.escape(p_text)}</h1>")
            elif "Heading 2" in style_name:
                body_parts.append(f"<h2>{html.escape(p_text)}</h2>")
            elif "Heading 3" in style_name:
                body_parts.append(f"<h3>{html.escape(p_text)}</h3>")
            elif "Heading 4" in style_name:
                body_parts.append(f"<h4>{html.escape(p_text)}</h4>")
            elif "List" in style_name or "Bullet" in style_name:
                # Build list item
                item_content = "".join(
                    f"<strong>{html.escape(r.text)}</strong>" if r.bold else
                    f"<em>{html.escape(r.text)}</em>" if r.italic else
                    html.escape(r.text)
                    for r in p.runs
                )
                body_parts.append(f"<li class='bullet-item'>{item_content}</li>")
            else:
                # Regular paragraph with run formatting
                run_spans = []
                for r in p.runs:
                    txt = html.escape(r.text)
                    if not txt:
                        continue
                    classes = []
                    if r.bold:
                        classes.append("font-bold")
                    if r.italic:
                        classes.append("italic")
                    if r.underline:
                        classes.append("underline")
                    if classes:
                        run_spans.append(f"<span class='{' '.join(classes)}'>{txt}</span>")
                    else:
                        run_spans.append(txt)
                content = "".join(run_spans)
                body_parts.append(f"<p>{content}</p>")

        elif tag_name == "tbl":
            # Table
            from docx.table import Table
            t = Table(block, doc)
            table_html = ["<table class='docx-table'>"]
            for row_idx, row in enumerate(t.rows):
                table_html.append("<tr>")
                for cell in row.cells:
                    tag = "th" if row_idx == 0 else "td"
                    cell_text = html.escape(cell.text.strip()).replace("\n", "<br/>")
                    table_html.append(f"<{tag}>{cell_text}</{tag}>")
                table_html.append("</tr>")
            table_html.append("</table>")
            body_parts.append("".join(table_html))

    doc_content = "\n".join(body_parts)

    styled_html = f"""<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="utf-8">
<title>{html.escape(title)}</title>
<style>
  @page {{
    size: A4;
    margin: 20mm 18mm 22mm 18mm;
    @bottom-center {{
      content: counter(page) " / " counter(pages);
      font-size: 9pt;
      color: #718096;
    }}
  }}
  * {{
    box-sizing: border-box;
  }}
  body {{
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Hiragino Sans", "Hiragino Kaku Gothic ProN", Meiryo, "Noto Sans JP", sans-serif;
    color: #1a202c;
    background: #ffffff;
    line-height: 1.65;
    font-size: 10.5pt;
    margin: 0;
    padding: 0;
  }}
  h1 {{
    color: #0f172a;
    font-size: 18pt;
    font-weight: 800;
    margin-top: 24pt;
    margin-bottom: 12pt;
    padding-bottom: 6pt;
    border-bottom: 2px solid #2563eb;
    page-break-after: avoid;
  }}
  h2 {{
    color: #1e3a8a;
    font-size: 14pt;
    font-weight: 700;
    margin-top: 18pt;
    margin-bottom: 8pt;
    border-left: 4px solid #3b82f6;
    padding-left: 8pt;
    page-break-after: avoid;
  }}
  h3 {{
    color: #1e293b;
    font-size: 12pt;
    font-weight: 700;
    margin-top: 14pt;
    margin-bottom: 6pt;
    page-break-after: avoid;
  }}
  h4 {{
    color: #334155;
    font-size: 11pt;
    font-weight: 600;
    margin-top: 10pt;
    margin-bottom: 4pt;
  }}
  p {{
    margin: 0 0 8pt 0;
    text-align: justify;
    word-break: break-word;
  }}
  .font-bold {{ font-weight: bold; }}
  .italic {{ font-style: italic; }}
  .underline {{ text-decoration: underline; }}
  .spacer {{ height: 8pt; }}
  
  /* Lists */
  li.bullet-item {{
    margin-bottom: 4pt;
    margin-left: 18pt;
  }}
  
  /* Tables */
  table.docx-table {{
    width: 100%;
    border-collapse: collapse;
    margin: 12pt 0 16pt 0;
    font-size: 9.5pt;
    page-break-inside: avoid;
  }}
  table.docx-table th, table.docx-table td {{
    border: 1px solid #cbd5e1;
    padding: 6pt 8pt;
    text-align: left;
    vertical-align: top;
  }}
  table.docx-table th {{
    background-color: #f1f5f9;
    color: #0f172a;
    font-weight: 700;
  }}
  table.docx-table tr:nth-child(even) td {{
    background-color: #f8fafc;
  }}
  
  /* Print layout tweaks */
  @media print {{
    body {{
      width: 100%;
    }}
    h1, h2, h3 {{
      page-break-after: avoid;
    }}
    table {{
      page-break-inside: avoid;
    }}
  }}
</style>
</head>
<body>
{doc_content}
</body>
</html>"""
    return styled_html


def convert_docx_to_pdf(docx_path: str, output_pdf_path: str) -> Tuple[bool, str]:
    """
    Converts a .docx file to a .pdf file using the best available method:
    1. LibreOffice / soffice CLI headless (Exact 1:1 format reproduction)
    2. Headless Chrome/Edge print-to-pdf via clean HTML conversion
    3. WeasyPrint library (if installed)
    4. Fallback print-ready HTML generation
    
    Returns (success: bool, method_or_error: str)
    """
    docx_path_obj = Path(docx_path).resolve()
    output_pdf_obj = Path(output_pdf_path).resolve()
    output_pdf_obj.parent.mkdir(parents=True, exist_ok=True)

    # -------------------------------------------------------------
    # Method 0: Native Microsoft Word / WPS Office via PowerShell COM (100% 1:1 Pixel-Perfect)
    # -------------------------------------------------------------
    ps_script_path = Path(__file__).resolve().parent.parent.parent / "scripts" / "convert_docx_to_pdf.ps1"
    powershell_bin = shutil.which("powershell.exe") or shutil.which("powershell") or shutil.which("pwsh")

    if ps_script_path.exists() and powershell_bin:
        try:
            logger.info("Converting DOCX to PDF using Native Word/WPS COM via PowerShell...")
            win_docx = to_windows_path_if_wsl(docx_path_obj)
            win_pdf = to_windows_path_if_wsl(output_pdf_obj)
            win_script = to_windows_path_if_wsl(ps_script_path)

            res = subprocess.run(
                [
                    powershell_bin,
                    "-NoProfile",
                    "-ExecutionPolicy", "Bypass",
                    "-File", win_script,
                    "-InputPath", win_docx,
                    "-OutputPath", win_pdf
                ],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                timeout=90
            )
            stdout_str = (res.stdout or b"").decode("utf-8", errors="replace")
            stderr_str = (res.stderr or b"").decode("utf-8", errors="replace")
            if output_pdf_obj.exists() and output_pdf_obj.stat().st_size > 0:
                logger.info("Successfully converted with Native Office COM: %s", stdout_str.strip())
                return True, "native_office_com"
            else:
                logger.warning("PowerShell Office COM conversion did not produce PDF: %s %s", stdout_str, stderr_str)
        except Exception as e:
            logger.warning("Native Office COM conversion failed: %s, falling back to next method...", e)

    # -------------------------------------------------------------
    # Method 1: LibreOffice / soffice headless
    # -------------------------------------------------------------
    soffice_bin = find_executable("soffice", LIBREOFFICE_PATHS) or find_executable("libreoffice", LIBREOFFICE_PATHS)
    if soffice_bin:
        try:
            logger.info("Converting DOCX to PDF using LibreOffice: %s", soffice_bin)
            out_dir = str(output_pdf_obj.parent)
            is_win_exe_on_wsl = soffice_bin.endswith(".exe") and sys.platform != "win32"
            out_dir_arg = to_windows_path_if_wsl(out_dir) if is_win_exe_on_wsl else out_dir
            docx_arg = to_windows_path_if_wsl(docx_path_obj) if is_win_exe_on_wsl else str(docx_path_obj)

            res = subprocess.run(
                [
                    soffice_bin,
                    "--headless",
                    "--convert-to",
                    "pdf",
                    "--outdir",
                    out_dir_arg,
                    docx_arg
                ],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                timeout=90
            )
            # LibreOffice outputs <original_stem>.pdf in out_dir
            generated_pdf = Path(out_dir) / f"{docx_path_obj.stem}.pdf"
            if generated_pdf.exists():
                if generated_pdf != output_pdf_obj:
                    shutil.move(str(generated_pdf), str(output_pdf_obj))
                logger.info("Successfully converted with LibreOffice")
                return True, "libreoffice"
        except Exception as e:
            logger.warning("LibreOffice conversion failed: %s, trying next method...", e)

    # -------------------------------------------------------------
    # Method 2: Headless Browser (Edge / Chrome)
    # -------------------------------------------------------------
    browser_bin = find_executable("msedge", BROWSER_PATHS) or find_executable("chrome", BROWSER_PATHS) or find_executable("google-chrome", BROWSER_PATHS)
    if browser_bin:
        try:
            logger.info("Converting DOCX to PDF using Headless Browser: %s", browser_bin)
            clean_html = docx_to_clean_html(str(docx_path_obj))
            
            with tempfile.NamedTemporaryFile("w", suffix=".html", encoding="utf-8", delete=False) as tf:
                tf.write(clean_html)
                temp_html_path = tf.name

            try:
                is_win_exe_on_wsl = browser_bin.endswith(".exe") and sys.platform != "win32"
                if is_win_exe_on_wsl:
                    pdf_target = to_windows_path_if_wsl(output_pdf_obj)
                    html_source = to_windows_path_if_wsl(temp_html_path)
                else:
                    pdf_target = str(output_pdf_obj)
                    html_source = Path(temp_html_path).as_uri()

                cmd = [
                    browser_bin,
                    "--headless",
                    "--disable-gpu",
                    "--allow-file-access-from-files",
                    "--no-pdf-header-footer",
                    f"--print-to-pdf={pdf_target}",
                    html_source
                ]
                res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=60)
                if output_pdf_obj.exists() and output_pdf_obj.stat().st_size > 0:
                    logger.info("Successfully converted with Headless Browser")
                    return True, "headless_browser"
            finally:
                if os.path.exists(temp_html_path):
                    try:
                        os.remove(temp_html_path)
                    except Exception:
                        pass
        except Exception as e:
            logger.warning("Browser print-to-pdf conversion failed: %s", e)

    # -------------------------------------------------------------
    # Method 3: WeasyPrint
    # -------------------------------------------------------------
    try:
        from weasyprint import HTML
        logger.info("Converting DOCX to PDF using WeasyPrint")
        clean_html = docx_to_clean_html(str(docx_path_obj))
        HTML(string=clean_html).write_pdf(str(output_pdf_obj))
        if output_pdf_obj.exists() and output_pdf_obj.stat().st_size > 0:
            return True, "weasyprint"
    except Exception as e:
        logger.warning("WeasyPrint conversion failed: %s", e)

    # -------------------------------------------------------------
    # Method 4: Fallback HTML Document for direct printing/saving
    # -------------------------------------------------------------
    try:
        clean_html = docx_to_clean_html(str(docx_path_obj))
        fallback_html_path = output_pdf_obj.with_suffix(".html")
        with open(fallback_html_path, "w", encoding="utf-8") as f:
            f.write(clean_html)
        return False, f"Tạo bản HTML sẵn sàng in tại {fallback_html_path.name} (chưa tìm thấy công cụ render PDF trực tiếp)."
    except Exception as e:
        return False, f"Lỗi chuyển đổi: {str(e)}"
