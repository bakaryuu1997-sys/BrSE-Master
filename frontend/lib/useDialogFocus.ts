"use client";

import { useEffect, useRef, type RefObject } from "react";

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]):not([type="hidden"]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

/**
 * Decide where Tab / Shift+Tab should move focus inside a modal dialog.
 * Returns the index to focus explicitly, or null when the browser's default movement is fine.
 * `currentIndex` is -1 when focus is outside the dialog.
 */
export function nextTrappedFocusIndex(count: number, currentIndex: number, shiftKey: boolean): number | null {
  if (count <= 0) return null;
  if (currentIndex === -1) return shiftKey ? count - 1 : 0;
  if (!shiftKey && currentIndex === count - 1) return 0;
  if (shiftKey && currentIndex === 0) return count - 1;
  return null;
}

function focusableIn(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) => el.getClientRects().length > 0 && getComputedStyle(el).visibility !== "hidden"
  );
}

/**
 * Modal dialog keyboard behaviour: move focus in on open, keep Tab inside, close on Escape and
 * give focus back to the element that opened it.
 */
export function useDialogFocus(containerRef: RefObject<HTMLElement | null>, open: boolean, onClose: () => void) {
  // Keep the latest onClose without re-running the effect (which would steal focus on every render).
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const container = containerRef.current;
    if (!container) return;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const items = focusableIn(container);
    (items.find((el) => el.matches("input,select,textarea")) ?? items[0] ?? container).focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab") return;
      const list = focusableIn(container);
      const index = list.indexOf(document.activeElement as HTMLElement);
      const target = nextTrappedFocusIndex(list.length, index, event.shiftKey);
      if (target !== null) {
        event.preventDefault();
        list[target].focus();
      }
    };

    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
      opener?.focus?.();
    };
  }, [containerRef, open]);
}
