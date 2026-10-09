"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export function RouteScrollReset() {
  const pathname = usePathname();

  useEffect(() => {
    let frameOne = 0;
    let frameTwo = 0;

    frameOne = window.requestAnimationFrame(() => {
      frameTwo = window.requestAnimationFrame(() => {
        window.scrollTo(0, 0);
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;

        document.querySelectorAll<HTMLElement>("[data-route-scroll-root]").forEach((element) => {
          element.scrollTo({ top: 0, left: 0, behavior: "auto" });
          element.scrollTop = 0;
          element.scrollLeft = 0;
        });
      });
    });

    return () => {
      window.cancelAnimationFrame(frameOne);
      window.cancelAnimationFrame(frameTwo);
    };
  }, [pathname]);

  return null;
}
