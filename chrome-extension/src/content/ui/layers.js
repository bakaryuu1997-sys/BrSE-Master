"use strict";

export const BRSE_LAYER = {
  base: 2147482000,
  floating: "var(--brse-z-index)",
  floatingBelow: "calc(var(--brse-z-index) - 1)",
  overlay: "calc(var(--brse-z-index) + 10)",
  overlayBox: "calc(var(--brse-z-index) + 11)",
  overlayResult: "calc(var(--brse-z-index) + 12)",
  injector: "calc(var(--brse-z-index) + 8)",
};

export function installBrseLayerVars(root = document.documentElement) {
  root.style.setProperty("--brse-z-index", String(BRSE_LAYER.base));
}
