"use strict";

export function switchTabInShadow(shadow, tabName) {
  const dictTab = shadow.getElementById("qb-tab-dict");
  const chatTab = shadow.getElementById("qb-tab-chat");
  const dictContent = shadow.getElementById("brse-tab-content-dict");
  const chatContent = shadow.getElementById("brse-tab-content-chat");

  if (!dictTab || !chatTab || !dictContent || !chatContent) return;

  if (tabName === "dict") {
    dictTab.classList.add("active");
    chatTab.classList.remove("active");
    dictContent.classList.add("active");
    chatContent.classList.remove("active");
  } else {
    chatTab.classList.add("active");
    dictTab.classList.remove("active");
    chatContent.classList.add("active");
    dictContent.classList.remove("active");
    focusChatInput(shadow, 50);
  }
}

export function bindQuickBoxTabs(shadow, activeTab) {
  const dictTab = shadow.getElementById("qb-tab-dict");
  const chatTab = shadow.getElementById("qb-tab-chat");

  if (dictTab) dictTab.onclick = () => switchTabInShadow(shadow, "dict");
  if (chatTab) chatTab.onclick = () => switchTabInShadow(shadow, "chat");

  if (activeTab === "chat") {
    focusChatInput(shadow, 100);
  }
}

function focusChatInput(shadow, delayMs) {
  setTimeout(() => {
    const inputEl = shadow.getElementById("brse-qb-chat-input");
    if (inputEl) inputEl.focus();
  }, delayMs);
}
