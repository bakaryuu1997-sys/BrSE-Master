"use strict";

import { getDueCards, reviewCard } from "../shared/srs.js";
import {
  buildCardsFromGlossary,
  loadFlashcardStates,
  loadGlossaryCache,
  saveFlashcardState,
} from "../shared/flashcardStore.js";

export function initFlashcardTool() {
  const toolsMenu = document.querySelector("#tools-menu-list");
  const view = document.querySelector("#flashcard-view");
  const toolCard = document.querySelector("#tool-flashcard");
  const btnBack = document.querySelector("#btn-flashcard-back");

  const dueEl = document.querySelector("#fc-due-count");
  const totalEl = document.querySelector("#fc-total-count");
  const emptyEl = document.querySelector("#fc-empty");
  const doneEl = document.querySelector("#fc-done");
  const cardBox = document.querySelector("#fc-card");
  const frontEl = document.querySelector("#fc-front");
  const readingEl = document.querySelector("#fc-reading");
  const backEl = document.querySelector("#fc-back");
  const flipBtn = document.querySelector("#fc-flip");
  const gradeBox = document.querySelector("#fc-grade");

  if (!view || !toolCard) return;

  let cards = [];
  let queue = [];
  let current = null;

  function showOnly(target) {
    [emptyEl, doneEl, cardBox].forEach((el) => el?.classList.toggle("hidden", el !== target));
  }

  function updateDueCount() {
    if (dueEl) dueEl.textContent = String(queue.length + (current ? 1 : 0));
  }

  function showNext() {
    current = queue.shift() || null;
    updateDueCount();
    if (!current) {
      showOnly(doneEl);
      return;
    }
    showOnly(cardBox);
    frontEl.textContent = current.front;
    readingEl.textContent = current.reading || "";
    readingEl.classList.toggle("hidden", !current.reading);
    const extra = current.english && current.english !== current.back ? ` · ${current.english}` : "";
    backEl.textContent = `${current.back}${extra}`;
    backEl.classList.add("hidden");
    gradeBox.classList.add("hidden");
    flipBtn.classList.remove("hidden");
  }

  function flip() {
    backEl.classList.remove("hidden");
    gradeBox.classList.remove("hidden");
    flipBtn.classList.add("hidden");
  }

  async function grade(value) {
    if (!current) return;
    const updated = reviewCard(current, value);
    cards = cards.map((card) => (card.id === updated.id ? updated : card));
    await saveFlashcardState(updated);
    showNext();
  }

  async function refresh() {
    const [glossary, states] = await Promise.all([loadGlossaryCache(), loadFlashcardStates()]);
    cards = buildCardsFromGlossary(glossary, states);
    if (totalEl) totalEl.textContent = String(cards.length);
    queue = getDueCards(cards);
    current = null;
    updateDueCount();
    if (!cards.length) {
      showOnly(emptyEl);
      return;
    }
    showNext();
  }

  toolCard.addEventListener("click", () => {
    toolsMenu?.classList.add("hidden");
    view.classList.remove("hidden");
    refresh();
  });
  btnBack?.addEventListener("click", () => {
    view.classList.add("hidden");
    toolsMenu?.classList.remove("hidden");
  });
  flipBtn?.addEventListener("click", flip);
  gradeBox?.addEventListener("click", (event) => {
    const btn = event.target.closest("[data-grade]");
    if (btn) grade(btn.dataset.grade);
  });
}
