"use strict";

import { getNormalizedUrl } from "../utils/url.js";

export function getQuickNoteKey(url = window.location.href) {
  return "brse.quickNotes.global";
}

export function getLegacyQuickNoteKey(url = window.location.href) {
  return "brse.quickNotes.global";
}

export function createEmptyNote(title = "Note 1", body = "") {
  const now = Date.now();
  return {
    id: `note-${now}-${Math.random().toString(36).slice(2, 7)}`,
    title,
    body,
    images: [],
    updatedAt: now,
  };
}

export async function loadQuickNoteState(url = window.location.href) {
  const globalKey = "brse.quickNotes.global";
  // Get all chrome.storage.local keys to check for migration
  const result = await chromeLocalGet(null);
  
  let globalState = result[globalKey];

  // Perform migration if global notes don't exist or are empty
  if (!globalState || !Array.isArray(globalState.notes) || globalState.notes.length === 0) {
    const migratedNotes = [];
    const keysToDelete = [];

    for (const key of Object.keys(result)) {
      if (key === globalKey) continue;

      if (key.startsWith("brse.quickNotes.")) {
        const state = result[key];
        if (state && Array.isArray(state.notes)) {
          for (const note of state.notes) {
            if (note && (note.body || note.title !== "Note 1")) {
              migratedNotes.push(note);
            }
          }
        }
        keysToDelete.push(key);
      } else if (key.startsWith("brse.quickNote.")) {
        // Old single-note string values
        const legacyBody = typeof result[key] === "string" ? result[key] : "";
        if (legacyBody.trim()) {
          const domainName = key.replace("brse.quickNote.", "");
          migratedNotes.push(createEmptyNote(`Legacy Note (${domainName})`, legacyBody));
        }
        keysToDelete.push(key);
      }
    }

    if (migratedNotes.length > 0) {
      // De-duplicate notes by ID
      const seenIds = new Set();
      const uniqueNotes = [];
      for (const n of migratedNotes) {
        let id = n.id;
        if (!id || seenIds.has(id)) {
          id = `note-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        }
        seenIds.add(id);
        uniqueNotes.push({ ...n, id });
      }

      globalState = {
        activeId: uniqueNotes[0].id,
        notes: uniqueNotes
      };

      // Save migrated state to global
      await chromeLocalSet({ [globalKey]: globalState });

      // Clean up migrated keys to keep storage tidy
      if (keysToDelete.length > 0) {
        await new Promise((resolve) => {
          chrome.storage.local.remove(keysToDelete, resolve);
        });
      }
    }
  }

  if (globalState && Array.isArray(globalState.notes) && globalState.notes.length > 0) {
    return normalizeState(globalState);
  }

  // Fallback if no notes exist
  const firstNote = createEmptyNote("Note 1", "");
  return { activeId: firstNote.id, notes: [firstNote] };
}

export async function saveQuickNoteState(state, url = window.location.href) {
  const normalized = normalizeState(state);
  await chromeLocalSet({ ["brse.quickNotes.global"]: normalized });
  return normalized;
}

export function appendTextToNote(note, text) {
  const trimmed = String(text || "").trim();
  if (!trimmed) return note;
  const prefix = note.body && !note.body.endsWith("\n") ? "\n\n" : "";
  return {
    ...note,
    body: `${note.body || ""}${prefix}${trimmed}`.slice(0, 5000),
    updatedAt: Date.now(),
  };
}

export function normalizeState(state) {
  const notes = Array.isArray(state?.notes) && state.notes.length > 0
    ? state.notes.map((note, index) => ({
        id: String(note.id || `note-${index + 1}`),
        title: String(note.title || `Note ${index + 1}`).slice(0, 80),
        body: String(note.body || "").slice(0, 5000),
        updatedAt: Number(note.updatedAt || Date.now()),
        images: Array.isArray(note.images) ? note.images : [],
      }))
    : [createEmptyNote()];
  const activeId = notes.some((note) => note.id === state?.activeId) ? state.activeId : notes[0].id;
  return { activeId, notes };
}

function chromeLocalGet(keys) {
  return new Promise((resolve) => {
    chrome.storage.local.get(keys, (result) => resolve(result || {}));
  });
}

function chromeLocalSet(items) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.set(items, () => {
      const err = chrome.runtime?.lastError;
      if (err) {
        reject(new Error(err.message || "chrome.storage.local.set failed"));
        return;
      }
      resolve();
    });
  });
}
