import os
import uuid
import logging
from urllib.parse import urlparse
import yt_dlp
from app.core.config import settings

logger = logging.getLogger(__name__)

class URLProcessor:
    def __init__(self, upload_folder=None):
        self.upload_folder = upload_folder or settings.upload_folder

    def download_audio(self, url, progress_callback=None):
        """
        Download audio from URL (YouTube, Vimeo, etc.) using yt-dlp.
        Returns: final_path, title
        """
        parsed = urlparse(str(url or "").strip())
        if parsed.scheme.lower() not in ("http", "https"):
            raise ValueError(f"Invalid URL scheme '{parsed.scheme}'. Only http and https are allowed.")
        if not parsed.netloc:
            raise ValueError("Invalid URL: missing host domain.")

        job_id = str(uuid.uuid4())
        output_template = os.path.join(self.upload_folder, f"url_{job_id}.%(ext)s")
        
        def my_hook(d):
            if d['status'] == 'downloading' and progress_callback:
                p = d.get('_percent_str', '0%')
                progress_callback(p)

        ydl_opts = {
            'format': 'bestaudio/best',
            'outtmpl': output_template,
            'postprocessors': [{
                'key': 'FFmpegExtractAudio',
                'preferredcodec': 'mp3',
                'preferredquality': '192',
            }],
            'progress_hooks': [my_hook],
            'quiet': True,
            'no_warnings': True,
        }

        try:
            logger.info(f"Downloading from URL: {url}")
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(url, download=True)
                title = info.get('title', 'URL Video')
                final_path = os.path.join(self.upload_folder, f"url_{job_id}.mp3")
                return final_path, title
        except Exception as e:
            logger.error(f"❌ yt-dlp Error: {e}")
            raise Exception(f"Failed to download from URL: {str(e)}")
