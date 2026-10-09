import ffmpeg
import os
import uuid
import logging
from app.core.config import settings

logger = logging.getLogger(__name__)

class VideoEditor:
    def __init__(self, upload_folder=None):
        self.upload_folder = upload_folder or settings.upload_folder

    def trim_video(self, input_path, start_time, end_time):
        """
        Trim video/audio from start_time to end_time (seconds).
        """
        if not os.path.exists(input_path):
            raise FileNotFoundError(f"Input file not found: {input_path}")

        output_filename = f"trimmed_{uuid.uuid4()}{os.path.splitext(input_path)[1]}"
        output_path = os.path.join(self.upload_folder, output_filename)

        try:
            logger.info(f"Trimming media: {input_path} from {start_time}s to {end_time}s")
            (
                ffmpeg
                .input(input_path, ss=start_time, to=end_time)
                .output(output_path, acodec='copy', vcodec='copy' if input_path.endswith(('.mp4', '.webm')) else None)
                .overwrite_output()
                .run(capture_stdout=True, capture_stderr=True)
            )
            return output_path
        except ffmpeg.Error as e:
            error_detail = e.stderr.decode() if e.stderr else str(e)
            logger.error(f"❌ FFMPEG Error: {error_detail}")
            raise Exception(f"Failed to trim video: {error_detail}")
