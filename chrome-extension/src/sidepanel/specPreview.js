"use strict";

import { DEFAULT_API_BASE } from "../shared/api.js";
import { getStorageItems, STORAGE_KEYS } from "../shared/storage.js";

const LOCAL_PREVIEW_GLOSSARY = [
  { jp: "二重送信防止", vi: "Ngăn chặn gửi trùng lặp (Double submit protection)" },
  { jp: "排他制御", vi: "Điều khiển song hành / Khóa lạc quan (Optimistic concurrency locking)" },
  { jp: "処理中マスク", vi: "Loading mask màn hình khi đang xử lý giao dịch" },
  { jp: "例外スロー", vi: "Ném ngoại lệ (Exception throwing)" },
  { jp: "整合性検証", vi: "Kiểm tra tính nhất quán (Validation check)" },
];

const LOCAL_PREVIEW_CONTRADICTIONS = [
  "Mâu thuẫn logic: Ở tài liệu thiết kế trang 3 yêu cầu nút 'Submit' bị disable sau click, nhưng trang 12 lại hướng dẫn kiểm tra trạng thái double-click bằng mã Javascript. Điều này dễ dẫn đến lọt dữ liệu trùng lặp.",
  "Bất cập nghiệp vụ: Bản vẽ UI thể hiện định dạng ngày sinh có 4 chữ số năm, nhưng schema DB (trang 8) ghi nhận lưu trữ kiểu VARCHAR(8) định dạng YYYYMMDD, thiếu phần gạch nối.",
  "Rủi ro bảo mật: Không có cấu trúc Timeout tự động cho session người dùng khi không thao tác trên màn hình vẽ Admin (trang 15).",
];

const LOCAL_PREVIEW_TASKS = [
  { id: "task_1", text: "Lập bảng Q&A gửi khách hàng làm rõ logic Disable nút Submit", priority: "p1" },
  { id: "task_2", text: "Điều chỉnh Schema DB của trường BirthDate khớp với UI thiết kế", priority: "p2" },
  { id: "task_3", text: "Cập nhật tài liệu thiết kế hệ thống phần Timeout session Admin", priority: "p3" },
];

export function initSpecPreview({ switchTab }) {
  const toolsMenu = document.querySelector("#tools-menu-list");
  const specView = document.querySelector("#spec-analyzer-view");
  const toolSpecCard = document.querySelector("#tool-spec-analyzer");
  const btnSpecBack = document.querySelector("#btn-spec-back");
  const specDropZone = document.querySelector("#spec-drop-zone");
  const specFileInput = document.querySelector("#spec-file-input");
  const btnSelectSpecFile = document.querySelector("#btn-select-spec-file");
  const specLoading = document.querySelector("#spec-loading");
  const specResults = document.querySelector("#spec-results");
  const specProgressBar = document.querySelector("#spec-progress-bar");
  const btnSyncToDashboard = document.querySelector("#btn-sync-to-dashboard");
  const resultTabButtons = document.querySelectorAll(".result-tab-btn");
  const resultTabContents = document.querySelectorAll(".result-subtab-content");

  const state = {
    glossary: [],
    contradictions: [],
    tasks: [],
    fileName: "",
    mode: "local-preview",
  };

  if (toolSpecCard && toolsMenu && specView) {
    toolSpecCard.addEventListener("click", () => {
      toolsMenu.classList.add("hidden");
      specView.classList.remove("hidden");
    });
  }

  if (btnSpecBack && toolsMenu && specView) {
    btnSpecBack.addEventListener("click", () => {
      specView.classList.add("hidden");
      toolsMenu.classList.remove("hidden");
    });
  }

  if (btnSelectSpecFile && specFileInput) {
    btnSelectSpecFile.addEventListener("click", (event) => {
      event.stopPropagation();
      specFileInput.click();
    });
  }

  if (specDropZone && specFileInput) {
    specDropZone.addEventListener("click", () => specFileInput.click());
    specDropZone.addEventListener("dragover", (event) => {
      event.preventDefault();
      specDropZone.classList.add("dragover");
    });
    specDropZone.addEventListener("dragleave", () => {
      specDropZone.classList.remove("dragover");
    });
    specDropZone.addEventListener("drop", (event) => {
      event.preventDefault();
      specDropZone.classList.remove("dragover");
      const file = event.dataTransfer.files[0];
      if (file) handleSpecFile(file);
    });
    specFileInput.addEventListener("change", (event) => {
      const file = event.target.files[0];
      if (file) handleSpecFile(file);
    });
  }

  resultTabButtons.forEach((button) => {
    button.addEventListener("click", () => {
      resultTabButtons.forEach((item) => item.classList.remove("active"));
      resultTabContents.forEach((content) => content.classList.add("hidden"));

      button.classList.add("active");
      document.querySelector(`#result-subtab-${button.dataset.subtab}`)?.classList.remove("hidden");
    });
  });

  if (btnSyncToDashboard) {
    btnSyncToDashboard.addEventListener("click", () => syncToDashboard(state, {
      btnSyncToDashboard,
      specDropZone,
      specResults,
      specView,
      switchTab,
      toolsMenu,
    }));
  }

  function handleSpecFile(file) {
    state.fileName = file.name;
    specDropZone?.classList.add("hidden");
    specResults?.classList.add("hidden");
    specLoading?.classList.remove("hidden");

    let progress = 0;
    if (specProgressBar) specProgressBar.style.width = "0%";
    const interval = setInterval(() => {
      progress += Math.floor(Math.random() * 15) + 5;
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
        showLocalPreview(state, {
          btnSyncToDashboard,
          specLoading,
          specResults,
        });
      }
      if (specProgressBar) specProgressBar.style.width = `${progress}%`;
    }, 150);
  }
}

function showLocalPreview(state, elements) {
  elements.specLoading?.classList.add("hidden");
  elements.specResults?.classList.remove("hidden");
  state.mode = "local-preview";
  state.glossary = LOCAL_PREVIEW_GLOSSARY;
  state.contradictions = LOCAL_PREVIEW_CONTRADICTIONS;
  state.tasks = LOCAL_PREVIEW_TASKS;

  if (elements.btnSyncToDashboard) {
    elements.btnSyncToDashboard.disabled = true;
    elements.btnSyncToDashboard.innerText = "Chưa thể đồng bộ preview";
    elements.btnSyncToDashboard.title = "Spec Analyzer hiện chỉ là local preview. Cần backend AI analyzer trước khi đồng bộ.";
  }

  renderPreviewResults(state);
}

function renderPreviewResults(state) {
  const glossaryTbody = document.querySelector("#glossary-tbody");
  if (glossaryTbody) {
    const rows = state.glossary.map((item) => {
      const row = document.createElement("tr");
      const jpCell = document.createElement("td");
      const viCell = document.createElement("td");

      jpCell.style.fontWeight = "700";
      jpCell.style.color = "var(--primary)";
      jpCell.textContent = item.jp || "";
      viCell.textContent = item.vi || "";

      row.append(jpCell, viCell);
      return row;
    });
    glossaryTbody.replaceChildren(...rows);
  }

  const contradictionList = document.querySelector("#contradiction-list");
  if (contradictionList) {
    const items = state.contradictions.map((item) => {
      const listItem = document.createElement("li");
      listItem.className = "contradiction-item";
      listItem.textContent = item || "";
      return listItem;
    });
    contradictionList.replaceChildren(...items);
  }

  const taskChecklist = document.querySelector("#task-checklist");
  if (taskChecklist) {
    const allowedPriorities = new Set(["p0", "p1", "p2", "p3"]);
    const items = state.tasks.map((item) => {
      const listItem = document.createElement("li");
      const checkbox = document.createElement("input");
      const text = document.createElement("span");
      const priority = document.createElement("span");
      const priorityValue = allowedPriorities.has(item.priority) ? item.priority : "p3";

      listItem.className = "task-item";
      checkbox.type = "checkbox";
      checkbox.id = item.id || "";
      checkbox.checked = true;
      text.className = "task-item-text";
      text.textContent = item.text || "";
      priority.className = `task-priority ${priorityValue}`;
      priority.textContent = priorityValue;

      listItem.append(checkbox, text, priority);
      return listItem;
    });
    taskChecklist.replaceChildren(...items);
  }
}

async function syncToDashboard(state, elements) {
  if (state.mode !== "backend") {
    elements.btnSyncToDashboard.innerText = "Preview local, không đồng bộ";
    setTimeout(() => {
      elements.btnSyncToDashboard.innerText = "Chưa thể đồng bộ preview";
    }, 1800);
    return;
  }

  elements.btnSyncToDashboard.innerText = "Đang đồng bộ...";
  elements.btnSyncToDashboard.disabled = true;

  try {
    const stored = await getStorageItems([STORAGE_KEYS.API_BASE_URL]);
    const baseUrl = (stored[STORAGE_KEYS.API_BASE_URL] || DEFAULT_API_BASE).replace(/\/$/, "");
    const project = await createSpecProject(baseUrl, state.fileName);
    await createSpecTasks(baseUrl, project.id, state.fileName, state.tasks);
    await createSpecDecisionLogs(baseUrl, state.contradictions);

    elements.btnSyncToDashboard.innerText = "✓ Đồng bộ thành công!";
    setTimeout(() => {
      elements.btnSyncToDashboard.innerText = "Đồng bộ về Dashboard";
      elements.btnSyncToDashboard.disabled = false;
      elements.specResults?.classList.add("hidden");
      elements.specDropZone?.classList.remove("hidden");
      elements.specView?.classList.add("hidden");
      elements.toolsMenu?.classList.remove("hidden");
      elements.switchTab("project");
    }, 2000);
  } catch (error) {
    console.error(error);
    elements.btnSyncToDashboard.innerText = "❌ Lỗi đồng bộ backend!";
    setTimeout(() => {
      elements.btnSyncToDashboard.innerText = "Đồng bộ về Dashboard";
      elements.btnSyncToDashboard.disabled = false;
    }, 3000);
  }
}

async function createSpecProject(baseUrl, fileName) {
  const response = await fetch(`${baseUrl}/todos/projects`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: `Spec Backend Analysis: ${fileName || "Tài liệu thiết kế"}`,
      preset: "standard",
      active_phase: "2. Detail Design & Spec Check",
    }),
  });
  if (!response.ok) throw new Error("Failed to create todo project");
  return response.json();
}

async function createSpecTasks(baseUrl, projectId, fileName, tasks) {
  const checkedTasks = tasks.filter((task) => document.getElementById(task.id)?.checked);
  for (const task of checkedTasks) {
    await fetch(`${baseUrl}/todos/projects/${projectId}/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phase: "2. Detail Design & Spec Check",
        title: task.text,
        detail: `Trích xuất từ backend Spec Analyzer: ${fileName}`,
        priority: task.priority.toUpperCase(),
        done: false,
        source: "workflow",
      }),
    });
  }
}

async function createSpecDecisionLogs(baseUrl, contradictions) {
  for (const description of contradictions) {
    await fetch(`${baseUrl}/operations/decision-logs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Mâu thuẫn Spec phát hiện bởi Analyzer",
        description,
        status: "OPEN",
        owner: "BrSE OS",
      }),
    });
  }
}
