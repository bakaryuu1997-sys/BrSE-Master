"use strict";

export async function getYouTubeTranscriptFromPage(locationRef = window.location, documentRef = document) {
  try {
    const videoId = new URLSearchParams(locationRef.search).get("v");
    if (!videoId) return null;

    let playerResponse = extractPlayerResponse(documentRef.documentElement?.innerHTML || "");

    if (!playerResponse || playerResponse?.videoDetails?.videoId !== videoId) {
      const response = await fetch(`https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`);
      playerResponse = extractPlayerResponse(await response.text());
    }

    const captionTracks = playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
    if (!captionTracks || captionTracks.length === 0) {
      throw new Error("No captions found for this video.");
    }

    const selectedTrack = selectCaptionTrack(captionTracks);
    const transcriptResponse = await fetch(selectedTrack.baseUrl);
    return parseTranscriptXml(await transcriptResponse.text());
  } catch (err) {
    console.warn("[BrSE YouTube] Subtitle extraction failed:", err);
    return null;
  }
}

export function extractPlayerResponse(html) {
  const marker = "ytInitialPlayerResponse";
  const markerIndex = html.indexOf(marker);
  if (markerIndex < 0) return null;

  const equalsIndex = html.indexOf("=", markerIndex);
  if (equalsIndex < 0) return null;

  const startIndex = html.indexOf("{", equalsIndex);
  if (startIndex < 0) return null;

  const jsonText = readBalancedJsonObject(html, startIndex);
  if (!jsonText) return null;

  try {
    return JSON.parse(jsonText);
  } catch (err) {
    return null;
  }
}

function readBalancedJsonObject(text, startIndex) {
  let depth = 0;
  let inString = false;
  let escape = false;

  for (let index = startIndex; index < text.length; index += 1) {
    const char = text[index];
    if (escape) {
      escape = false;
      continue;
    }
    if (char === "\\") {
      escape = true;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;

    if (char === "{") depth += 1;
    if (char === "}") {
      depth -= 1;
      if (depth === 0) return text.slice(startIndex, index + 1);
    }
  }
  return "";
}

function selectCaptionTrack(captionTracks) {
  return captionTracks.find((track) => track.languageCode === "vi")
    || captionTracks.find((track) => track.languageCode === "en")
    || captionTracks.find((track) => track.languageCode === "ja")
    || captionTracks[0];
}

function parseTranscriptXml(xmlText) {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlText, "text/xml");
  const textNodes = xmlDoc.getElementsByTagName("text");
  const lines = [];
  for (let index = 0; index < textNodes.length; index += 1) {
    const text = textNodes[index].textContent
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
    lines.push(text);
  }
  return lines.join(" ");
}
