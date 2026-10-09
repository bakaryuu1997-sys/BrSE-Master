"use client";

import { useCallback, useEffect, useState } from "react";

interface DocumentPictureInPictureApi {
  requestWindow: (options?: { width?: number; height?: number }) => Promise<Window>;
  window: Window | null;
}

function getDocumentPip(): DocumentPictureInPictureApi | null {
  if (typeof window === "undefined") return null;
  return (
    (window as unknown as { documentPictureInPicture?: DocumentPictureInPictureApi })
      .documentPictureInPicture ?? null
  );
}

/** Copy the parent document's stylesheets + theme onto a PiP window so Tailwind
 *  classes and CSS design tokens resolve inside the popout. */
function applyParentStyles(target: Window) {
  const head = target.document.head;
  document.querySelectorAll('link[rel="stylesheet"], style').forEach((node) => {
    head.appendChild(node.cloneNode(true));
  });
  target.document.documentElement.className = document.documentElement.className;
  const theme = document.documentElement.getAttribute("data-theme");
  if (theme) target.document.documentElement.setAttribute("data-theme", theme);
  target.document.body.className = document.body.className;
  target.document.body.style.margin = "0";
}

/**
 * Document Picture-in-Picture popout (Chrome/Edge 116+). Returns the live PiP
 * window (render into it via a React portal), open/close helpers, and a support
 * flag so callers can hide the button on unsupported browsers.
 */
export function useDocumentPip() {
  const [pipWindow, setPipWindow] = useState<Window | null>(null);
  const isSupported = getDocumentPip() != null;

  const openPip = useCallback(async (options?: { width?: number; height?: number }) => {
    const pip = getDocumentPip();
    if (!pip) return;
    try {
      const win = await pip.requestWindow({
        width: options?.width ?? 420,
        height: options?.height ?? 640,
      });
      applyParentStyles(win);
      win.addEventListener("pagehide", () => setPipWindow(null), { once: true });
      setPipWindow(win);
    } catch {
      setPipWindow(null);
    }
  }, []);

  const closePip = useCallback(() => {
    pipWindow?.close();
    setPipWindow(null);
  }, [pipWindow]);

  useEffect(() => {
    return () => {
      getDocumentPip()?.window?.close?.();
    };
  }, []);

  return { pipWindow, openPip, closePip, isSupported };
}
