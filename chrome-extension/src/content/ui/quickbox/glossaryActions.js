"use strict";

import { safeSendMessage } from "../../utils/dom.js";
import { romajiToKana } from "../../utils/kana.js";
import { MESSAGE_TYPES } from "../../../shared/messageTypes.js";
import { showToast } from "../Toast.js";

export function suggestCategoryAndRoles(english = "", japanese = "", vietnamese = "") {
  const combined = `${english} ${japanese} ${vietnamese}`.toLowerCase();

  let category = "System Design";
  const roles = ["BrSE"];

  if (/\b(test|bug|defect|qa|testing|quality|assert|validate|validation|verification|check|audit|tiêu chuẩn|kiểm thử|lỗi|chất lượng|kiểm định|sai sót|sprint|agile|scrum|meeting|backlog)\b/i.test(combined) ||
      /kiểm thử|mã lỗi|chất lượng|kiểm định|tiêu chuẩn|quy trình/.test(combined)) {
    category = "Agile";
    roles.push("QA");
  } else if (/\b(security|auth|login|password|encryption|firewall|hacker|bảo mật|xác thực|mã hóa)\b/i.test(combined) ||
              /bảo mật|xác thực|mã hóa/.test(combined)) {
    category = "Security";
    roles.push("Dev");
  } else if (/\b(infra|cloud|aws|azure|gcp|server|network|docker|k8s|kubernetes|host|hosting|mạng|hạ tầng|máy chủ|port)\b/i.test(combined) ||
              /hạ tầng|mạng|máy chủ/.test(combined)) {
    category = "Cloud";
    roles.push("Dev");
  } else if (/\b(db|database|sql|nosql|query|table|schema|cơ sở dữ liệu|truy vấn)\b/i.test(combined) ||
              /cơ sở dữ liệu/.test(combined)) {
    category = "Database";
    roles.push("Dev");
  } else if (/\b(frontend|ui|ux|css|html|react|vue|angular|mặt trước|giao diện)\b/i.test(combined) ||
              /giao diện/.test(combined)) {
    category = "Frontend";
    roles.push("Dev");
  } else if (/\b(backend|api|server|logic|node|python|java|php|mặt sau|xử lý)\b/i.test(combined) ||
              /xử lý/.test(combined)) {
    category = "Backend";
    roles.push("Dev");
  }

  return { category, roles: [...new Set(roles)] };
}

export function executeQuickAdd(shadow, data, btnElement = null, options = {}) {
  let englishVal = "";
  let japaneseVal = "";
  let vietnameseVal = "";
  let kanaVal = "";
  let noteVal = "";
  let exampleVal = "";
  let categoryVal = "";
  let rolesVal = ["BrSE"];

  if (data && data.isProposed) {
    englishVal = (data.english || "").trim();
    japaneseVal = (data.japanese || "").trim();
    kanaVal = (data.kana || "").trim();
    vietnameseVal = (data.vietnamese || "").trim();
    categoryVal = data.category || "";
    noteVal = (data.note || "").trim();
    exampleVal = (data.example || "").trim();
    if (data.roles && Array.isArray(data.roles)) {
      rolesVal = data.roles;
    }
  } else {
    const isJa = (data.sourceLang || "en") === "ja";
    vietnameseVal = (data.translation || "").trim();
    if (isJa) {
      japaneseVal = (data.originalText || "").trim();
      if (data.transliteration) {
        kanaVal = romajiToKana(data.transliteration, data.originalText) || "";
      }
      englishVal = findDictionaryTerm(data, /^[a-zA-Z\s-]+$/).trim();
    } else {
      englishVal = (data.originalText || "").trim();
      japaneseVal = findDictionaryTerm(data, /[\u3040-\u30ff\u4e00-\u9faf]/).trim();
    }

    const definitionMeta = firstDefinitionMeta(data);
    noteVal = definitionMeta.note;
    exampleVal = definitionMeta.example;
  }

  if (!englishVal) {
    englishVal = data.originalText || "";
  }
  if (!vietnameseVal) {
    vietnameseVal = data.translation || "";
  }

  if (!englishVal || !vietnameseVal) {
    showToast("⚠️ Không tìm thấy Tiếng Anh hoặc Tiếng Việt để thêm nhanh.");
    return;
  }

  const suggestions = suggestCategoryAndRoles(englishVal, japaneseVal, vietnameseVal);
  if (!categoryVal) {
    categoryVal = suggestions.category;
  }
  if (!rolesVal || !Array.isArray(rolesVal) || rolesVal.length <= 1) {
    rolesVal = suggestions.roles?.length > 0 ? suggestions.roles : ["BrSE"];
  }

  const term = {
    id: makeSafeSlug(englishVal || japaneseVal),
    english: englishVal,
    japanese: japaneseVal,
    kana: kanaVal || null,
    vietnamese: vietnameseVal,
    roles: rolesVal,
    category: categoryVal,
    note: noteVal || null,
    example: exampleVal || null,
  };

  const oldText = btnElement ? btnElement.innerText : "";
  if (btnElement) {
    btnElement.innerText = "⏳ Adding...";
    btnElement.style.pointerEvents = "none";
  }

  safeSendMessage({
    type: MESSAGE_TYPES.BRSE_ADD_GLOSSARY_TERM,
    term,
  }).then((response) => {
    if (btnElement) {
      btnElement.innerText = oldText;
      btnElement.style.pointerEvents = "auto";
    }

    if (response && response.ok) {
      showToast(`✨ Đã thêm nhanh "${term.english}" vào Glossary!`);
      options.onSavedTerm?.(response.term || term);
      if (btnElement) {
        const card = btnElement.closest(".proposed-term-card");
        if (card) {
          card.style.opacity = "0.55";
          card.style.borderColor = "rgba(78, 201, 165, 0.45)";
        }
        btnElement.innerText = "✓ Đã thêm";
        btnElement.disabled = true;
      }
    } else {
      const errorMsg = response?.error ? response.error : "Trùng ID hoặc Lỗi kết nối";
      showToast(`❌ Thêm nhanh thất bại: ${errorMsg}`);
    }
  }).catch((err) => {
    if (btnElement) {
      btnElement.innerText = oldText;
      btnElement.style.pointerEvents = "auto";
    }
    showToast(`❌ Thêm nhanh thất bại: ${err.message || "Extension message failed"}`);
  });
}

export function openGlossaryDrawer(shadow, data) {
  const overlay = shadow.getElementById("brse-glossary-overlay");
  if (!overlay) return;

  const inputEnglish = overlay.querySelector("#g-input-english");
  const inputJapanese = overlay.querySelector("#g-input-japanese");
  const inputKana = overlay.querySelector("#g-input-kana");
  const inputCategory = overlay.querySelector("#g-input-category");
  const inputVietnamese = overlay.querySelector("#g-input-vietnamese");
  const inputNote = overlay.querySelector("#g-input-note");
  const inputExample = overlay.querySelector("#g-input-example");

  inputEnglish.value = "";
  inputJapanese.value = "";
  inputKana.value = "";
  inputVietnamese.value = "";
  inputNote.value = "";
  inputExample.value = "";
  inputCategory.value = "System Design";

  overlay.querySelectorAll(".role-tag-checkbox").forEach((cb) => {
    cb.checked = cb.value === "BrSE";
  });

  if (data && data.isProposed) {
    inputEnglish.value = data.english || "";
    inputJapanese.value = data.japanese || "";
    inputKana.value = data.kana || "";
    inputVietnamese.value = data.vietnamese || "";
    inputCategory.value = data.category || "System Design";
    inputNote.value = data.note || "";
    inputExample.value = data.example || "";
    if (data.roles && Array.isArray(data.roles)) {
      overlay.querySelectorAll(".role-tag-checkbox").forEach((cb) => {
        cb.checked = data.roles.includes(cb.value);
      });
    }

    const suggestions = suggestCategoryAndRoles(inputEnglish.value, inputJapanese.value, inputVietnamese.value);
    if (!data.category) inputCategory.value = suggestions.category;
    if (!data.roles || data.roles.length === 0) {
      overlay.querySelectorAll(".role-tag-checkbox").forEach((cb) => {
        cb.checked = suggestions.roles.includes(cb.value);
      });
    }

    overlay.classList.add("active");
    return;
  }

  const isJa = (data.sourceLang || "en") === "ja";
  if (isJa) {
    inputJapanese.value = data.originalText || "";
    if (data.transliteration) {
      inputKana.value = romajiToKana(data.transliteration, data.originalText) || "";
    }
    inputVietnamese.value = data.translation || "";
    inputEnglish.value = findDictionaryTerm(data, /^[a-zA-Z\s-]+$/);
  } else {
    inputEnglish.value = data.originalText || "";
    inputVietnamese.value = data.translation || "";
    inputJapanese.value = findDictionaryTerm(data, /[\u3040-\u30ff\u4e00-\u9faf]/);

    const definitionMeta = firstDefinitionMeta(data);
    inputNote.value = definitionMeta.note;
    inputExample.value = definitionMeta.example;
  }

  const suggestions = suggestCategoryAndRoles(inputEnglish.value, inputJapanese.value, inputVietnamese.value);
  inputCategory.value = suggestions.category;
  overlay.querySelectorAll(".role-tag-checkbox").forEach((cb) => {
    cb.checked = suggestions.roles.includes(cb.value);
  });

  overlay.classList.add("active");
}

export function makeSafeSlug(text) {
  if (!text) return `term-${Math.random().toString(36).substring(2, 7)}`;
  const str = text.toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, "d");
  let slug = str
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (!slug || slug.length < 2) {
    slug = `term-${Math.random().toString(36).substring(2, 7)}`;
  }
  return slug;
}

function findDictionaryTerm(data, pattern) {
  if (!data.dictionary || data.dictionary.length === 0) return "";
  for (const item of data.dictionary) {
    for (const term of item.terms) {
      if (pattern.test(term)) {
        return term;
      }
    }
  }
  return "";
}

function firstDefinitionMeta(data) {
  if (!data.definitions || data.definitions.length === 0) {
    return { note: "", example: "" };
  }
  const firstDef = data.definitions[0];
  const entry = firstDef.entries?.[0];
  if (!entry) {
    return { note: "", example: "" };
  }
  return {
    note: `[${firstDef.type ? firstDef.type.toUpperCase() : "WORD"}] ${entry.desc || ""}`.trim(),
    example: entry.example ? `"${entry.example}"` : "",
  };
}
