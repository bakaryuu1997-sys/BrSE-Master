import { describe, expect, it } from "vitest";
import { extractPlayerResponse } from "../src/content/youtubeTranscript.js";

describe("YouTube transcript parser", () => {
  it("extracts ytInitialPlayerResponse with nested braces and semicolons in strings", () => {
    const html = `
      <script>
        var ytInitialPlayerResponse = {
          "videoDetails": {"videoId": "abc123", "title": "A; B"},
          "captions": {"playerCaptionsTracklistRenderer": {"captionTracks": [
            {"languageCode": "en", "baseUrl": "https://example.com/caption?fmt=srv3"}
          ]}}
        };
      </script>
    `;

    const parsed = extractPlayerResponse(html);

    expect(parsed.videoDetails.videoId).toBe("abc123");
    expect(parsed.captions.playerCaptionsTracklistRenderer.captionTracks[0].languageCode).toBe("en");
  });
});
