import { describe, expect, it } from "vitest";
import { appendTextToNote, createEmptyNote, normalizeState } from "../src/content/ui/QuickNoteStore.js";

describe("Quick note store helpers", () => {
  it("normalizes empty state with one editable note", () => {
    const state = normalizeState({});

    expect(state.notes).toHaveLength(1);
    expect(state.activeId).toBe(state.notes[0].id);
  });

  it("appends selected text without losing existing memo body", () => {
    const note = createEmptyNote("Task note", "Existing");
    const updated = appendTextToNote(note, "New selection");

    expect(updated.body).toBe("Existing\n\nNew selection");
    expect(updated.title).toBe("Task note");
  });

  it("keeps attached images through normalizeState round-trips", () => {
    const img = { id: "img-1", name: "shot.jpg", dataUrl: "data:image/jpeg;base64,AAAA", createdAt: "x" };
    const note = { ...createEmptyNote("With image", "body"), images: [img] };
    const state = normalizeState({ activeId: note.id, notes: [note] });

    expect(state.notes[0].images).toHaveLength(1);
    expect(state.notes[0].images[0]).toEqual(img);
  });

  it("preserves images when appending text to a note", () => {
    const img = { id: "img-1", name: "shot.jpg", dataUrl: "data:image/jpeg;base64,AAAA", createdAt: "x" };
    const note = { ...createEmptyNote("With image", "body"), images: [img] };
    const updated = appendTextToNote(note, "more");

    expect(updated.images).toEqual([img]);
    expect(updated.body).toBe("body\n\nmore");
  });
});
