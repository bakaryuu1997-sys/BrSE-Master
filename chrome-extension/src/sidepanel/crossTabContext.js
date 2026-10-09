"use strict";

import { MESSAGE_TYPES } from "../shared/messageTypes.js";

const RELATED_DOC_WORDS = [
  "swagger",
  "api",
  "specification",
  "github",
  "gitlab",
  "confluence",
  "brief",
  "đặc tả",
  "redmine",
  "trello",
  "teams",
  "slack",
  "wiki",
  "docs",
  "sheets",
  "drive",
  "figma",
  "notion",
];

const TITLE_STOP_WORDS = new Set([
  "jira",
  "confluence",
  "google",
  "chrome",
  "inbox",
  "mail",
  "home",
  "dashboard",
]);

export function initCrossTabContext() {
  const btnCrossTab = document.querySelector("#btn-cross-tab");
  const crossTabDropdown = document.querySelector("#cross-tab-dropdown");
  const crossTabList = document.querySelector("#cross-tab-list");
  const crossTabCount = document.querySelector("#cross-tab-count");
  const selectedTabIds = new Set();
  const loadedTabContexts = {};

  function buildPromptContext() {
    let promptContext = "";
    selectedTabIds.forEach((tabId) => {
      const tab = loadedTabContexts[tabId];
      if (!tab) return;
      promptContext += `=== THÔNG TIN THAM CHIẾU TỪ TAB KHÁC ("${tab.title}") ===\nURL: ${tab.url}\nNỘI DUNG:\n${tab.content}\n=======================================================\n\n`;
    });
    return promptContext;
  }

  function updateCountBadge() {
    if (!crossTabCount || !btnCrossTab) return;
    if (selectedTabIds.size > 0) {
      crossTabCount.innerText = selectedTabIds.size;
      crossTabCount.classList.remove("hidden");
      btnCrossTab.style.borderColor = "var(--primary)";
      btnCrossTab.style.color = "var(--primary)";
    } else {
      crossTabCount.classList.add("hidden");
      btnCrossTab.style.borderColor = "var(--border)";
      btnCrossTab.style.color = "var(--text-main)";
    }
  }

  function renderTabItem(tab, currentContext) {
    loadedTabContexts[tab.id.toString()] = tab;
    const item = document.createElement("div");
    item.className = "cross-tab-item";
    item.dataset.tabId = tab.id.toString();

    let isChecked = selectedTabIds.has(tab.id.toString());
    if (!isChecked && isRelatedTab(tab, currentContext)) {
      isChecked = true;
      selectedTabIds.add(tab.id.toString());
    }

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.id = `tab-check-${tab.id}`;
    checkbox.dataset.tabId = tab.id.toString();
    checkbox.checked = isChecked;
    checkbox.style.cursor = "pointer";

    const title = document.createElement("span");
    title.className = "cross-tab-item-title";
    title.title = tab.title || "Untitled Tab";
    title.innerText = tab.title || "Untitled Tab";

    item.appendChild(checkbox);
    item.appendChild(title);

    item.addEventListener("click", (event) => {
      event.stopPropagation();
      if (event.target !== checkbox) {
        checkbox.checked = !checkbox.checked;
      }
      const tabId = checkbox.dataset.tabId.toString();
      if (checkbox.checked) {
        selectedTabIds.add(tabId);
      } else {
        selectedTabIds.delete(tabId);
      }
      updateCountBadge();
    });

    crossTabList.appendChild(item);
    updateCountBadge();
  }

  function loadTabsIntoDropdown() {
    chrome.runtime.sendMessage({ type: MESSAGE_TYPES.BRSE_COLLECT_VISIBLE_TAB_CONTEXTS }, (response) => {
      if (!response?.ok || !Array.isArray(response.tabs) || !crossTabList || !crossTabDropdown) return;

      for (const key of Object.keys(loadedTabContexts)) delete loadedTabContexts[key];
      crossTabList.innerHTML = "";

      if (response.tabs.length === 0) {
        crossTabList.innerHTML = `<div class="dropdown-empty">Không tìm thấy tab khác...</div>`;
        crossTabDropdown.classList.remove("hidden");
        return;
      }

      chrome.tabs.query({ active: true, currentWindow: true }, (currentTabs) => {
        const currentContext = buildCurrentTabContext(currentTabs[0]);
        response.tabs.forEach((tab) => renderTabItem(tab, currentContext));
        crossTabDropdown.classList.remove("hidden");
      });
    });
  }

  if (btnCrossTab && crossTabDropdown) {
    btnCrossTab.addEventListener("click", (event) => {
      event.stopPropagation();
      if (crossTabDropdown.classList.contains("hidden")) {
        loadTabsIntoDropdown();
      } else {
        crossTabDropdown.classList.add("hidden");
      }
    });

    document.addEventListener("click", (event) => {
      if (crossTabDropdown.classList.contains("hidden")) return;
      if (!crossTabDropdown.contains(event.target) && event.target !== btnCrossTab) {
        crossTabDropdown.classList.add("hidden");
      }
    });
  }

  return { buildPromptContext };
}

function buildCurrentTabContext(currentTab) {
  const title = currentTab?.title || "";
  const url = currentTab?.url || "";
  const jiraMatch = title.match(/([A-Z]+-\d+)/i) || url.match(/([A-Z]+-\d+)/i);
  const jiraKey = jiraMatch ? jiraMatch[1].toLowerCase() : null;
  const titleTokens = title
    .toLowerCase()
    .replace(/[^a-z0-9]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length >= 4 && !TITLE_STOP_WORDS.has(word));

  return {
    isWorkTab: title.toLowerCase().includes("jira") || url.toLowerCase().includes("jira") || Boolean(jiraKey),
    jiraKey,
    titleTokens,
  };
}

function isRelatedTab(tab, currentContext) {
  const title = tab.title.toLowerCase();
  const url = tab.url.toLowerCase();
  const sameJiraKey = currentContext.jiraKey && (title.includes(currentContext.jiraKey) || url.includes(currentContext.jiraKey));
  const isRelatedDoc = currentContext.isWorkTab && RELATED_DOC_WORDS.some((word) => title.includes(word) || url.includes(word));
  const hasKeywordOverlap = currentContext.titleTokens.some((token) => title.includes(token));
  return sameJiraKey || isRelatedDoc || hasKeywordOverlap;
}
