import { describe, expect, it, vi } from "vitest";
import { injectGlossaryOverlay } from "../src/content/ui/quickbox/glossaryOverlay.js";
import { MESSAGE_TYPES } from "../src/shared/messageTypes.js";

describe("QuickBox glossary overlay", () => {
  it("allows saving an English-only proposed term with Vietnamese meaning", async () => {
    const host = document.createElement("div");
    const shadow = host.attachShadow({ mode: "open" });
    const card = document.createElement("div");
    shadow.appendChild(card);

    const safeSendMessage = vi.fn().mockResolvedValue({ ok: true, term: { id: "defineconfig" } });
    const showToast = vi.fn();
    const notifyGlossaryUpdated = vi.fn();

    injectGlossaryOverlay(
      card,
      shadow,
      (value) => String(value || "").toLowerCase(),
      safeSendMessage,
      MESSAGE_TYPES,
      showToast,
      notifyGlossaryUpdated
    );

    card.querySelector("#g-input-english").value = "defineConfig";
    card.querySelector("#g-input-japanese").value = "";
    card.querySelector("#g-input-vietnamese").value = "Hàm cấu hình";
    card.querySelector("#g-input-category").value = "Technical";
    card.querySelector("#g-btn-submit").click();

    await Promise.resolve();

    expect(safeSendMessage).toHaveBeenCalledWith(expect.objectContaining({
      type: MESSAGE_TYPES.BRSE_ADD_GLOSSARY_TERM,
      term: expect.objectContaining({
        english: "defineConfig",
        japanese: "",
        vietnamese: "Hàm cấu hình",
      }),
    }));
    expect(notifyGlossaryUpdated).toHaveBeenCalled();
  });

  it("restores the submit button when save messaging fails", async () => {
    const host = document.createElement("div");
    const shadow = host.attachShadow({ mode: "open" });
    const card = document.createElement("div");
    shadow.appendChild(card);

    const safeSendMessage = vi.fn().mockRejectedValue(new Error("message port closed"));
    const showToast = vi.fn();
    const notifyGlossaryUpdated = vi.fn();

    injectGlossaryOverlay(
      card,
      shadow,
      (value) => String(value || "").toLowerCase(),
      safeSendMessage,
      MESSAGE_TYPES,
      showToast,
      notifyGlossaryUpdated
    );

    card.querySelector("#g-input-english").value = "description";
    card.querySelector("#g-input-vietnamese").value = "Su mieu ta";
    const submit = card.querySelector("#g-btn-submit");
    submit.click();

    await Promise.resolve();
    await Promise.resolve();

    expect(submit.disabled).toBe(false);
    expect(showToast).toHaveBeenCalledWith(expect.stringContaining("message port closed"));
    expect(notifyGlossaryUpdated).not.toHaveBeenCalled();
  });
});
