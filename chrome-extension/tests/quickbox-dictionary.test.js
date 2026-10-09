import { describe, expect, it } from 'vitest';
import { renderAiRuntimeMetaHtml, splitContentAndDictionary } from '../src/content/ui/QuickBox.js';
import { renderSupremeDictionaryView } from '../src/content/ui/quickbox/dictionaryRenderer.js';

describe('QuickBox summary dictionary parsing', () => {
  it('extracts dictionary terms from a fenced JSON block without showing raw JSON as content', () => {
    const result = splitContentAndDictionary(`Summary text.

\`\`\`json
[
  {
    "english": "ISO remastering",
    "japanese": "ISOリマスタリング",
    "kana": "",
    "vietnamese": "Tao lai ISO",
    "category": "Technical",
    "note": "Linux ISO rebuild",
    "example": "ISO remastering is used for custom images."
  }
]
\`\`\``);

    expect(result.content).toBe('Summary text.');
    expect(result.parsedTerms).toHaveLength(1);
    expect(result.parsedTerms[0].english).toBe('ISO remastering');
  });

  it('extracts terms from an unfinished streamed fenced JSON block', () => {
    const result = splitContentAndDictionary(`Summary text.

\`\`\`json
[
  {
    "english": "React / Reacts",
    "japanese": "React / Reactions",
    "kana": "",
    "vietnamese": "React framework",
    "category": "Technical",
    "note": "JavaScript UI framework",
    "example": "Use React for the UI."
  },
`);

    expect(result.content).toBe('Summary text.');
    expect(result.parsedTerms).toHaveLength(1);
    expect(result.parsedTerms[0].english).toBe('React / Reacts');
  });

  it('extracts terms from a raw trailing JSON array without fences', () => {
    const result = splitContentAndDictionary(`Summary text.
[
  {
    "english": "Vite",
    "japanese": "",
    "kana": "",
    "vietnamese": "Build tool",
    "category": "Technical"
  }
]`);

    expect(result.content).toBe('Summary text.');
    expect(result.parsedTerms).toHaveLength(1);
    expect(result.parsedTerms[0].english).toBe('Vite');
  });

  it('extracts dictionary terms from marker blocks', () => {
    const result = splitContentAndDictionary(`Summary text.
--- DICTIONARY START ---
[
  {"english":"Boot menu","japanese":"ブートメニュー","vietnamese":"Menu khoi dong","category":"Technical"}
]
--- DICTIONARY END ---`);

    expect(result.content).toBe('Summary text.');
    expect(result.parsedTerms).toHaveLength(1);
    expect(result.parsedTerms[0].english).toBe('Boot menu');
  });

  it('keeps runtime model meta HTML on known model labels only', () => {
    const html = renderAiRuntimeMetaHtml({
      model: '<img src=x onerror=alert(1)>',
      status: 'done',
      elapsedMs: 1200,
    });
    const div = document.createElement('div');
    div.innerHTML = html;

    expect(div.querySelector('img')).toBeNull();
    expect(div.textContent).toContain('Nemotron 3 Super Free');
  });

  it('renders Japanese translation and multiple structured definition rows', () => {
    const host = document.createElement('div');
    const shadow = host.attachShadow({ mode: 'open' });
    shadow.innerHTML = `
      <div id="brse-content"></div>
      <div id="brse-qb-chat-history"></div>
    `;

    renderSupremeDictionaryView(shadow, {
      originalText: "first",
      sourceLang: "en",
      translation: "thứ nhất",
      japaneseTranslation: "最初",
      dictionary: [{ type: "adverb synonyms", terms: ["firstly", "initially"] }],
      definitions: [{
        type: "adverb",
        entries: [
          { desc: "Before anything else.", example: "Finish this first." },
          { desc: "At the beginning.", example: null },
        ],
      }],
    }, {
      addActionsToBubble: () => {},
      executeQuickAdd: () => {},
      getIpaData: () => null,
      openGlossaryDrawer: () => {},
      renderIpaElements: () => {},
      setLastSourceLang: () => {},
      switchTabInShadow: () => {},
    });

    const rendered = shadow.getElementById("brse-content").textContent;
    expect(rendered).toContain("DỊCH NHẬT");
    expect(rendered).toContain("最初");
    expect(rendered).toContain("Before anything else.");
    expect(rendered).toContain("At the beginning.");
  });

  it('labels English-only dictionary fallback honestly and disables quick add', () => {
    const host = document.createElement('div');
    const shadow = host.attachShadow({ mode: 'open' });
    shadow.innerHTML = `
      <div id="brse-content"></div>
      <div id="brse-qb-chat-history"></div>
    `;

    renderSupremeDictionaryView(shadow, {
      originalText: "first",
      sourceLang: "en",
      translation: "The first item in a sequence.",
      translationLanguage: "en",
      dictionary: [],
      definitions: [{ type: "noun", entries: [{ desc: "The first item in a sequence." }] }],
    }, {
      addActionsToBubble: () => {},
      executeQuickAdd: () => {},
      getIpaData: () => null,
      openGlossaryDrawer: () => {},
      renderIpaElements: () => {},
      setLastSourceLang: () => {},
      switchTabInShadow: () => {},
    });

    expect(shadow.getElementById("brse-content").textContent).toContain("EN FALLBACK");
    expect(shadow.getElementById("quick-add-glossary-btn")).toBeNull();
    expect(shadow.getElementById("edit-add-glossary-btn")).not.toBeNull();
  });
});
