"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { fetchClientStateValue, saveClientStateValue } from "@/lib/clientState";
import { getActiveProject } from "@/lib/projectSettings";
import { useNotify } from "@/components/ToastProvider";
import { apiBaseUrl } from "@/lib/config";
import type { MindMapNode, NodeState } from "@/components/specs-mindmap/NodeEditModal";

export interface OperationRecord {
  id: string;
  type: string;
  title: string;
  status: string;
  priority: string;
  owner?: string;
}

const NODE_STATES_LS_KEY = "brse.mindmap.nodeStates";

export const defaultMarkdownTemplate = `# [REQ] Quản lý Giỏ hàng Điện tử

## 1. Màn hình chi tiết giỏ hàng
### Danh sách sản phẩm đã chọn
- Hiển thị tên sản phẩm, hình ảnh, giá bán lẻ
- Ô nhập số lượng sản phẩm (bắt buộc > 0)
- Nút xóa sản phẩm khỏi giỏ hàng
### Hộp thông tin thanh toán
- Tính tổng tiền tạm tính
- Nhập mã giảm giá Coupon
- Nút bấm Tiến hành đặt hàng

## 2. Áp dụng mã giảm giá Coupon
### Quy tắc nghiệp vụ Coupon
- Chỉ áp dụng 1 coupon cho mỗi đơn hàng
- Coupon phải còn hạn sử dụng
- Tính lại tổng tiền sau khi giảm giá

## 3. Xử lý thanh toán tích hợp
### Cổng thanh toán Stripe
- Nhập thông tin thẻ Visa/Mastercard
- Luồng xử lý Exception khi thẻ hết hạn`;

export function nodeIdToPath(nodeId: string): string {
  return nodeId
    .replace(/^root\//, "")
    .replace(/\//g, " → ")
    .replace(/_/g, " ");
}

export function flattenNodes(nodes: MindMapNode[]): MindMapNode[] {
  const result: MindMapNode[] = [];
  function walk(n: MindMapNode) {
    result.push(n);
    n.children.forEach(walk);
  }
  nodes.forEach(walk);
  return result;
}

/**
 * Parse a markdown outline (#, ##, ###, - / *) into a nested mind-map tree.
 * Pure so it can be unit-tested; the hook just memoizes it over `markdown`.
 */
export function parseMarkdownToMindMap(markdown: string): MindMapNode[] {
  const lines = markdown.split("\n");
  const rootNodes: MindMapNode[] = [];
  const activePath: MindMapNode[] = [];

  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed) return;

    let level = 0;
    let title = "";

    if (trimmed.startsWith("# ")) {
      level = 1;
      title = trimmed.slice(2).trim();
    } else if (trimmed.startsWith("## ")) {
      level = 2;
      title = trimmed.slice(3).trim();
    } else if (trimmed.startsWith("### ")) {
      level = 3;
      title = trimmed.slice(4).trim();
    } else if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      level = 4;
      title = trimmed.slice(2).trim();
    }

    if (level > 0 && title) {
      // Walk up to the nearest existing shallower node. Strictly using
      // activePath[level - 2] orphans a node when an intermediate level is
      // skipped (e.g. a bullet directly under a "## " with no "### "); scanning
      // upward attaches it to the closest real ancestor instead of the root.
      let parentNode: MindMapNode | null = null;
      for (let i = level - 2; i >= 0; i -= 1) {
        if (activePath[i]) {
          parentNode = activePath[i];
          break;
        }
      }
      const parentId = parentNode ? parentNode.id : "root";
      const nodeId = `${parentId}/${title.replace(/[\s/\\?%#&]+/g, "_")}`;

      const newNode: MindMapNode = {
        id: nodeId,
        title,
        level,
        children: [],
      };

      activePath[level - 1] = newNode;
      activePath.length = level; // Truncate deeper levels

      if (parentNode) {
        parentNode.children.push(newNode);
      } else {
        rootNodes.push(newNode);
      }
    }
  });

  return rootNodes;
}

export function useSpecsMindMap() {
  const { notify } = useNotify();
  const [activeProject, setActiveProject] = useState<any>(null);
  const [markdown, setMarkdown] = useState(defaultMarkdownTemplate);
  const [qnas, setQnas] = useState<OperationRecord[]>([]);
  const [links, setLinks] = useState<Record<string, string>>({}); // nodeId -> qnaId
  const [isLoading, setIsLoading] = useState(true);
  const [isLinkingNode, setIsLinkingNode] = useState<string | null>(null);
  const [qnaSearchQuery, setQnaSearchQuery] = useState("");
  const [statusMessage, setStatusMessage] = useState("");

  // Node status state: Map<nodeId, NodeState>
  const [nodeStates, setNodeStates] = useState<Record<string, NodeState>>({});
  // Modal state for node editing
  const [editingNode, setEditingNode] = useState<MindMapNode | null>(null);

  // Load project context and saved state
  useEffect(() => {
    const proj = getActiveProject() || { id: "default", name: "Sensei Hub" };
    setActiveProject(proj);

    async function loadSavedState() {
      try {
        const savedMd = await fetchClientStateValue(`brse.specs.markdown.${proj.id}`);
        if (savedMd) setMarkdown(savedMd);

        const savedLinks = await fetchClientStateValue(`brse.specs.links.${proj.id}`);
        if (savedLinks) {
          setLinks(JSON.parse(savedLinks));
        }
      } catch (err) {
        console.error("Failed to load saved specs mind-map state:", err);
      } finally {
        setIsLoading(false);
      }
    }

    // Load node states from localStorage
    try {
      const raw = localStorage.getItem(NODE_STATES_LS_KEY);
      if (raw) setNodeStates(JSON.parse(raw));
    } catch {
      // ignore
    }

    // Fetch operations list (Q&As)
    fetch(`${apiBaseUrl}/operations`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setQnas(data))
      .catch((err) => console.error("Failed to fetch operations:", err));

    void loadSavedState();
  }, []);

  // Persist node states to localStorage whenever they change
  const saveNodeStates = useCallback((updated: Record<string, NodeState>) => {
    setNodeStates(updated);
    try {
      localStorage.setItem(NODE_STATES_LS_KEY, JSON.stringify(updated));
    } catch {
      // ignore quota errors
    }
  }, []);

  // Save state helper
  const handleSaveState = useCallback(
    async (newMd: string, newLinks: Record<string, string>) => {
      if (!activeProject) return;
      setStatusMessage("Đang tự động đồng bộ PostgreSQL...");
      try {
        await saveClientStateValue(`brse.specs.markdown.${activeProject.id}`, newMd);
        await saveClientStateValue(
          `brse.specs.links.${activeProject.id}`,
          JSON.stringify(newLinks)
        );
        setStatusMessage("Đã đồng bộ hóa dữ liệu thành công!");
        setTimeout(() => setStatusMessage(""), 3000);
      } catch {
        setStatusMessage("Lỗi đồng bộ. Hệ thống sẽ lưu tạm vào bộ nhớ.");
      }
    },
    [activeProject]
  );

  // Debounced autosave: persist markdown edits ~800ms after typing stops instead
  // of firing a PostgreSQL write on every keystroke. Links are saved immediately by
  // their own handlers, so we read them from a ref here to avoid double-saving.
  const linksRef = useRef(links);
  useEffect(() => {
    linksRef.current = links;
  }, [links]);
  useEffect(() => {
    if (isLoading || !activeProject) return;
    const timer = setTimeout(() => {
      void handleSaveState(markdown, linksRef.current);
    }, 800);
    return () => clearTimeout(timer);
  }, [markdown, isLoading, activeProject, handleSaveState]);

  // Parser: parse Markdown headers and bullet points into tree
  const treeNodes = useMemo(() => parseMarkdownToMindMap(markdown), [markdown]);

  const handleLinkQna = useCallback(
    (nodeId: string, qnaId: string) => {
      const newLinks = { ...links, [nodeId]: qnaId };
      setLinks(newLinks);
      setIsLinkingNode(null);
      void handleSaveState(markdown, newLinks);
    },
    [links, markdown, handleSaveState]
  );

  const handleUnlinkQna = useCallback(
    (nodeId: string) => {
      const newLinks = { ...links };
      delete newLinks[nodeId];
      setLinks(newLinks);
      void handleSaveState(markdown, newLinks);
    },
    [links, markdown, handleSaveState]
  );

  // Handle node status save from modal
  const handleNodeStatusSave = useCallback(
    (nodeId: string, state: NodeState) => {
      const updated = { ...nodeStates, [nodeId]: state };
      saveNodeStates(updated);
    },
    [nodeStates, saveNodeStates]
  );

  // Get Q&A detail for a node
  const getNodeQnaStatus = useCallback(
    (nodeId: string) => {
      const qnaId = links[nodeId];
      if (!qnaId) return null;
      return qnas.find((q) => q.id === qnaId) || null;
    },
    [links, qnas]
  );

  // Filtered Q&As list for modal
  const filteredQnas = useMemo(() => {
    const q = qnaSearchQuery.toLowerCase().trim();
    if (!q) return qnas;
    return qnas.filter(
      (item) =>
          item.title.toLowerCase().includes(q) ||
          item.id.toLowerCase().includes(q) ||
          item.type.toLowerCase().includes(q)
    );
  }, [qnas, qnaSearchQuery]);

  // Count stats
  const allFlatNodes = useMemo(() => flattenNodes(treeNodes), [treeNodes]);
  const pendingCount = useMemo(
    () => allFlatNodes.filter((n) => nodeStates[n.id]?.status === "pending").length,
    [allFlatNodes, nodeStates]
  );
  const clearCount = useMemo(
    () => allFlatNodes.filter((n) => nodeStates[n.id]?.status === "clear").length,
    [allFlatNodes, nodeStates]
  );
  const discussingCount = useMemo(
    () => allFlatNodes.filter((n) => nodeStates[n.id]?.status === "discussing").length,
    [allFlatNodes, nodeStates]
  );

  // Export Q&A email
  const handleExportQAEmail = useCallback(() => {
    const pendingNodes = allFlatNodes.filter(
      (n) => nodeStates[n.id]?.status === "pending" && nodeStates[n.id]?.question?.trim()
    );

    if (pendingNodes.length === 0) {
      setStatusMessage("⚠️ Không có node Pending nào có câu hỏi Q&A để xuất.");
      setTimeout(() => setStatusMessage(""), 4000);
      return;
    }

    // Get spec title from first H1 node
    const specTitle =
      treeNodes.length > 0
        ? treeNodes[0].title.replace(/^\[REQ\]\s*/, "")
        : "仕様書";

    const qaItems = pendingNodes
      .map((node, idx) => {
        const path = nodeIdToPath(node.id);
        const question = nodeStates[node.id]?.question ?? "";
        return `No.${idx + 1}: ${path}\n質問: ${question}`;
      })
      .join("\n\n");

    const email = `件名：【Q&A確認依頼】${specTitle}（${pendingNodes.length}件）

お疲れ様です。
以下の仕様について確認事項がございます。
ご確認のほど、よろしくお願いいたします。

■ Q&A一覧
${qaItems}

以上、ご確認のほどよろしくお願いいたします。`;

    navigator.clipboard
      .writeText(email)
      .then(() => {
        setStatusMessage("✅ Email Q&A đã được copy vào clipboard thành công!");
        setTimeout(() => setStatusMessage(""), 5000);
      })
      .catch(() => {
        setStatusMessage("❌ Không thể copy. Vui lòng copy thủ công.");
        setTimeout(() => setStatusMessage(""), 4000);
      });
  }, [allFlatNodes, nodeStates, treeNodes]);

  // Load from clipboard or local draft
  const handleLoadFromClarifier = useCallback(() => {
    try {
      const draft = localStorage.getItem("brse.memoNotes.draft.v1");
      if (draft) {
        const parsed = JSON.parse(draft);
        if (parsed.body) {
          setMarkdown(parsed.body);
          void handleSaveState(parsed.body, links);
          notify("Đã nạp bản nháp yêu cầu thành công!", "success");
          return;
        }
      }
      notify("Không tìm thấy bản nháp Specs nào trong Cache. Bạn hãy viết hoặc dán nội dung thủ công!", "info");
    } catch {
      notify("Lỗi khi nạp bản nháp.", "error");
    }
  }, [handleSaveState, links, notify]);

  return {
    activeProject,
    markdown,
    setMarkdown,
    qnas,
    links,
    isLoading,
    isLinkingNode,
    setIsLinkingNode,
    qnaSearchQuery,
    setQnaSearchQuery,
    statusMessage,
    setStatusMessage,
    nodeStates,
    editingNode,
    setEditingNode,
    treeNodes,
    allFlatNodes,
    pendingCount,
    clearCount,
    discussingCount,
    handleLinkQna,
    handleUnlinkQna,
    handleNodeStatusSave,
    getNodeQnaStatus,
    filteredQnas,
    handleExportQAEmail,
    handleLoadFromClarifier,
    handleSaveState,
  };
}
