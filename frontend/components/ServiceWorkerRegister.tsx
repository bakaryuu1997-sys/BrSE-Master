"use client";

import { useEffect } from "react";

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    const registerSw = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Offline support is best-effort; the app still works as a normal local web app.
      });
    };

    if (document.readyState === "complete") {
      registerSw();
    } else {
      window.addEventListener("load", registerSw);
    }
  }, []);

  return null;
}
