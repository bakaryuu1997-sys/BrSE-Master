"use strict";

/**
 * Pure geometry helpers for the screenshot annotator. Shapes are stored in the
 * image's *natural* coordinate space so exporting at full resolution is crisp;
 * the canvas is only displayed scaled. Kept DOM-free for unit tests.
 *
 * Shape: { type: "pen"|"arrow"|"box"|"highlight"|"text", color, points:[{x,y}], text? }
 */

/** Convert a point from displayed canvas pixels to natural image pixels. */
export function toNatural(point, scale) {
  const s = scale || 1;
  return { x: point.x / s, y: point.y / s };
}

/** Drop the last shape; returns a new array (pure). */
export function undoLast(shapes) {
  return (Array.isArray(shapes) ? shapes : []).slice(0, -1);
}

/** True if a drag distance is large enough to count as a real shape. */
export function isMeaningfulDrag(a, b, minPx = 3) {
  if (!a || !b) return false;
  return Math.abs(b.x - a.x) >= minPx || Math.abs(b.y - a.y) >= minPx;
}

/** Geometry for an arrow head at the end point, given the line angle. */
export function arrowHead(from, to, size = 14) {
  const angle = Math.atan2(to.y - from.y, to.x - from.x);
  return [
    { x: to.x - size * Math.cos(angle - Math.PI / 6), y: to.y - size * Math.sin(angle - Math.PI / 6) },
    { x: to.x - size * Math.cos(angle + Math.PI / 6), y: to.y - size * Math.sin(angle + Math.PI / 6) },
  ];
}

/** Build a download filename for an annotated screenshot. */
export function annotatedFilename(hostname, now = Date.now()) {
  const host = String(hostname || "page").replace(/[^a-z0-9.-]/gi, "_");
  return `brse-annotated-${host}-${now}.png`;
}
