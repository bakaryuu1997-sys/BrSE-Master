import { escapeAttribute, escapeHtml } from "./sanitizer.js";

const EMPTY_LEARNED_TERMS_HTML =
  '<div style="font-size:11px; color:var(--text-muted); font-style:italic; text-align:center; padding:10px 0;">Không có từ khóa nào đang ẩn.</div>';

export function buildLearnedTermsHtml(learnedIds, cachedTerms, options = {}) {
  if (!Array.isArray(learnedIds) || learnedIds.length === 0) {
    return EMPTY_LEARNED_TERMS_HTML;
  }

  const maxWidth = options.maxWidth || "150px";
  const terms = learnedIds.map((id) => {
    const term = Array.isArray(cachedTerms) ? cachedTerms.find((item) => item.id === id) : null;
    return term || { id, english: `ID: ${id}`, japanese: "" };
  });

  return terms
    .map((term) => {
      const display = `${term.english || ""}${term.japanese ? ` (${term.japanese})` : ""}`;
      const safeDisplay = escapeHtml(display);
      const safeTitle = escapeAttribute(display);
      const safeId = escapeAttribute(term.id);
      return `
        <div class="learned-item" style="display: flex; align-items: center; justify-content: space-between; gap: 8px; font-size: 11.5px; padding: 4px 6px; background: rgba(255,255,255,0.02); border-radius: 4px; border: 1px solid rgba(255,255,255,0.05);">
          <span style="color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: ${escapeAttribute(maxWidth)};" title="${safeTitle}">${safeDisplay}</span>
          <button type="button" class="unhide-btn" data-id="${safeId}" style="
            background: rgba(158, 206, 106, 0.15);
            border: 1px solid rgba(158, 206, 106, 0.3);
            color: #9ece6a;
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 10px;
            font-weight: bold;
            cursor: pointer;
            transition: all 0.2s;
            width: auto;
          ">Bỏ ẩn</button>
        </div>
      `;
    })
    .join("");
}
