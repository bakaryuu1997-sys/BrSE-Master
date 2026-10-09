"use strict";

import { DEFAULT_API_BASE } from "../shared/api.js";
import { escapeAttribute, escapeHtml } from "../shared/sanitizer.js";
import { getStorageItems, STORAGE_KEYS } from "../shared/storage.js";

export async function loadProjectStatus(projectArea = document.querySelector("#project-status")) {
  if (!projectArea) return;

  const stored = await getStorageItems([STORAGE_KEYS.API_BASE_URL, STORAGE_KEYS.SECRET_TOKEN]);
  const baseUrl = (stored[STORAGE_KEYS.API_BASE_URL] || DEFAULT_API_BASE).replace(/\/$/, "");

  try {
    const headers = { "Content-Type": "application/json" };
    if (stored[STORAGE_KEYS.SECRET_TOKEN]) headers["X-BrSE-Token"] = stored[STORAGE_KEYS.SECRET_TOKEN];
    const response = await fetch(`${baseUrl}/command-center`, { headers, signal: AbortSignal.timeout(4000) });
    const data = await response.json();
    const todos = Array.isArray(data.next_focus) ? data.next_focus : [];
    projectArea.innerHTML = `
      <div class="project-summary">
        <div class="stat-card"><span class="label">Open work</span><span class="value">${Number(data.metrics?.todo_total ?? 0)}</span></div>
        <div class="stat-card"><span class="label">Waiting Q&A</span><span class="value">${Number(data.metrics?.waiting_qna ?? 0)}</span></div>
      </div>
      <div class="todo-list-mini">${todos.map(renderTodoMiniItem).join("")}</div>
    `;
  } catch (error) {
    projectArea.innerHTML = `<div class="error-msg">Check backend at ${escapeHtml(baseUrl)}</div>`;
  }
}

function renderTodoMiniItem(todo) {
  const priority = escapeHtml(todo.priority || "P2");
  const priorityClass = escapeAttribute(todo.priority || "P2");
  const title = escapeHtml(todo.title || "Untitled");
  return `<div class="todo-mini-item"><span class="priority ${priorityClass}">${priority}</span><span class="title">${title}</span></div>`;
}
