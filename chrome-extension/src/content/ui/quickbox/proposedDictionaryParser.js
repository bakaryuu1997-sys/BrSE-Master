"use strict";

export function splitContentAndDictionary(text, glossarySnapshot = []) {
  if (!text) return { content: "", parsedTerms: [] };
  const marker = "--- DICTIONARY START ---";
  const endMarker = "--- DICTIONARY END ---";
  const index = text.indexOf(marker);

  let content = text;
  let dictionaryBlock = "";

  if (index !== -1) {
    content = text.substring(0, index).trim();
    dictionaryBlock = text.substring(index + marker.length).trim();
    const endIndex = dictionaryBlock.indexOf(endMarker);
    if (endIndex !== -1) {
      dictionaryBlock = dictionaryBlock.substring(0, endIndex).trim();
    }
  } else {
    const extracted = extractDictionaryBlockWithoutMarkers(text);
    if (extracted) {
      content = extracted.content;
      dictionaryBlock = extracted.dictionaryBlock;
    }
  }

  let parsedTerms = [];
  if (dictionaryBlock) {
    const cleanedBlock = cleanDictionaryBlock(dictionaryBlock);
    try {
      parsedTerms = parseStreamingJsonArray(cleanedBlock);
      if (parsedTerms.length === 0) {
        parsedTerms = fallbackParseDictionaryText(cleanedBlock);
      }
    } catch (e) {
      console.warn("Failed progressive parse, falling back to line-by-line:", e);
      parsedTerms = fallbackParseDictionaryText(cleanedBlock);
    }
  }

  parsedTerms = filterProposedTermsNotInGlossary(parsedTerms, glossarySnapshot);
  return { content: content.trim(), parsedTerms };
}

function cleanDictionaryBlock(block) {
  return String(block || "")
    .replace(/```(?:json|JSON)?/g, "")
    .replace(/```/g, "")
    .replace(/^\s*json\s*/i, "")
    .trim();
}

function extractDictionaryBlockWithoutMarkers(text) {
  const fenceRegex = /```(?:json|JSON)?\s*([\s\S]*?\[[\s\S]*?\])\s*```/g;
  let match;
  let lastValid = null;
  while ((match = fenceRegex.exec(text)) !== null) {
    const candidate = cleanDictionaryBlock(match[1]);
    if (parseStreamingJsonArray(candidate).length > 0) {
      lastValid = {
        start: match.index,
        end: match.index + match[0].length,
        dictionaryBlock: candidate,
      };
    }
  }
  if (lastValid) {
    return {
      content: `${text.slice(0, lastValid.start)}${text.slice(lastValid.end)}`.trim(),
      dictionaryBlock: lastValid.dictionaryBlock,
    };
  }

  const openFenceMatch = text.match(/```(?:json|JSON)?\s*(\[\s*\{[\s\S]*)$/i);
  if (openFenceMatch && parseStreamingJsonArray(cleanDictionaryBlock(openFenceMatch[1])).length > 0) {
    return {
      content: text.slice(0, openFenceMatch.index).trim(),
      dictionaryBlock: openFenceMatch[1],
    };
  }

  const rawArrayMatch = text.match(/(\[\s*\{[\s\S]*\}[\s\S]*)$/);
  if (rawArrayMatch && parseStreamingJsonArray(rawArrayMatch[1]).length > 0) {
    const start = rawArrayMatch.index ?? text.length - rawArrayMatch[1].length;
    return {
      content: text.slice(0, start).trim(),
      dictionaryBlock: rawArrayMatch[1],
    };
  }

  return null;
}

function normalizeTermPart(value) {
  return String(value || "").trim().toLowerCase();
}

function getTermParts(value) {
  return String(value || "")
    .split(/[\/,;，、]+/)
    .map(normalizeTermPart)
    .filter(Boolean);
}

function termExistsInGlossary(term, glossarySnapshot) {
  const proposedParts = [
    ...getTermParts(term.english),
    ...getTermParts(term.japanese),
  ];
  if (proposedParts.length === 0 || glossarySnapshot.length === 0) return false;

  return glossarySnapshot.some((existing) => {
    const existingParts = new Set([
      ...getTermParts(existing.english),
      ...getTermParts(existing.japanese),
    ]);
    return proposedParts.some((part) => existingParts.has(part));
  });
}

function filterProposedTermsNotInGlossary(terms, glossarySnapshot) {
  const seen = new Set();
  return (terms || [])
    .filter((term) => term && (term.english || term.japanese || term.vietnamese))
    .filter((term) => {
      const key = `${normalizeTermPart(term.english)}|${normalizeTermPart(term.japanese)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return !termExistsInGlossary(term, glossarySnapshot);
    });
}

function parseStreamingJsonArray(str) {
  const terms = [];
  let depth = 0;
  let startIdx = -1;

  for (let i = 0; i < str.length; i++) {
    if (str[i] === "{") {
      if (depth === 0) {
        startIdx = i;
      }
      depth++;
    } else if (str[i] === "}") {
      depth--;
      if (depth === 0 && startIdx !== -1) {
        const objStr = str.substring(startIdx, i + 1);
        try {
          const obj = JSON.parse(objStr);
          if (obj && (obj.english || obj.japanese || obj.vietnamese)) {
            terms.push(obj);
          }
        } catch (e) {
          try {
            const relaxedObj = Function(`return ${objStr}`)();
            if (relaxedObj && (relaxedObj.english || relaxedObj.japanese || relaxedObj.vietnamese)) {
              terms.push(relaxedObj);
            }
          } catch (err) {
            // Keep streaming parse resilient for partial AI output.
          }
        }
        startIdx = -1;
      }
    }
  }

  if (depth > 0 && startIdx !== -1) {
    let partialStr = str.substring(startIdx).trim();
    if (partialStr.endsWith(",")) {
      partialStr = partialStr.slice(0, -1);
    }
    for (let d = 0; d < depth; d++) {
      partialStr += "}";
    }
    try {
      const obj = JSON.parse(partialStr);
      if (obj && (obj.english || obj.japanese || obj.vietnamese)) {
        terms.push(obj);
      }
    } catch (e) {
      try {
        const relaxedObj = Function(`return ${partialStr}`)();
        if (relaxedObj && (relaxedObj.english || relaxedObj.japanese || relaxedObj.vietnamese)) {
          terms.push(relaxedObj);
        }
      } catch (err) {
        // Keep streaming parse resilient for partial AI output.
      }
    }
  }

  return terms;
}

function fallbackParseDictionaryText(text) {
  const terms = [];
  const lines = text.split("\n");
  let currentTerm = null;

  for (let line of lines) {
    line = line.trim();
    if (!line) continue;

    const match = line.match(/^['"]?(english|japanese|kana|vietnamese|category|note|example)['"]?\s*:\s*['"]?(.*?)['"]?,?$/i);
    if (match) {
      const key = match[1].toLowerCase();
      const val = match[2].trim();

      if (!currentTerm) {
        currentTerm = {};
      }

      currentTerm[key] = val;

      if (key === "example") {
        terms.push(currentTerm);
        currentTerm = null;
      }
    }
  }

  if (currentTerm && (currentTerm.english || currentTerm.japanese)) {
    terms.push(currentTerm);
  }

  return terms;
}
