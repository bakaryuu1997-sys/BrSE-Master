"use strict";

import { clampQuickBoxElement, clampQuickBoxFrame } from "./position.js";

const RESIZE_HANDLES = [
  ["resize-left", ["left"]],
  ["resize-right", ["right"]],
  ["resize-top", ["top"]],
  ["resize-bottom", ["bottom"]],
  ["resize-top-left", ["top", "left"]],
  ["resize-top-right", ["top", "right"]],
  ["resize-bottom-left", ["bottom", "left"]],
  ["resize-bottom-right", ["bottom", "right"]],
];

export function appendQuickBoxResizeHandles(shadow) {
  RESIZE_HANDLES.forEach(([className]) => {
    const handle = document.createElement("div");
    handle.className = `resize-handle ${className}`;
    shadow.appendChild(handle);
  });
}

export function bindQuickBoxResize(quickBox, shadow) {
  RESIZE_HANDLES.forEach(([className, directions]) => {
    const handle = shadow.querySelector(`.${className}`);
    if (handle) {
      handle.addEventListener("mousedown", (event) => initResize(event, quickBox, directions));
    }
  });
}

function initResize(event, quickBox, directions) {
  event.preventDefault();
  event.stopPropagation();

  const startWidth = quickBox.offsetWidth;
  const startHeight = quickBox.offsetHeight;
  const startX = event.clientX;
  const startY = event.clientY;
  const rect = quickBox.getBoundingClientRect();
  const startLeft = rect.left;
  const startTop = rect.top;

  const doResize = (moveEvent) => {
    const deltaX = moveEvent.clientX - startX;
    const deltaY = moveEvent.clientY - startY;

    let newWidth = startWidth;
    let newHeight = startHeight;
    let newLeft = startLeft;
    let newTop = startTop;

    if (directions.includes("left")) {
      newWidth = Math.max(320, startWidth - deltaX);
      newLeft = startLeft + (startWidth - newWidth);
    } else if (directions.includes("right")) {
      newWidth = Math.max(320, startWidth + deltaX);
    }

    if (directions.includes("top")) {
      newHeight = Math.max(250, startHeight - deltaY);
      newTop = startTop + (startHeight - newHeight);
    } else if (directions.includes("bottom")) {
      newHeight = Math.max(250, startHeight + deltaY);
    }

    const safeFrame = clampQuickBoxFrame({
      left: newLeft,
      top: newTop,
      width: newWidth,
      height: newHeight,
    });

    quickBox.style.width = `${safeFrame.width}px`;
    quickBox.style.height = `${safeFrame.height}px`;
    quickBox.style.left = `${safeFrame.left}px`;
    quickBox.style.top = `${safeFrame.top}px`;
  };

  const stopResize = () => {
    document.removeEventListener("mousemove", doResize);
    document.removeEventListener("mouseup", stopResize);
    clampQuickBoxElement(quickBox);
  };

  document.addEventListener("mousemove", doResize);
  document.addEventListener("mouseup", stopResize);
}
