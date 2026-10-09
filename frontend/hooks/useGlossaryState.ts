"use client";

import { useDeferredValue, useEffect, useMemo, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { useUiLanguage } from "@/components/LanguageProvider";
import { glossaryCategories, glossaryRoles, type GlossaryRole, type GlossaryTerm } from "@/lib/glossary";
import { apiBaseUrl } from "@/lib/config";
import { ACTIVE_PROJECT_CHANGED_EVENT, getActiveProject, getActiveProjectId, getProjectSettings } from "@/lib/projectSettings";
import { quarantineLocalStorageValue } from "@/lib/localStorageSafety";
import {
  allRoles,
  allCategories,
  masteredStorageKey,
  customGlossaryStorageKey,
  masteredSyncKey,
  customGlossarySyncKey,
  globalProjectScope,
  scopedBrowserKey,
  scopedClientStateKey,
  parseGlossaryCsv,
  serializeGlossaryToCsv,
  serializeGlossaryToAnkiCsv,
} from "@/lib/glossaryUtils";
import { useGlossaryStudy } from "@/hooks/useGlossaryStudy";

export function useGlossaryState() {
  const { t } = useUiLanguage();
  const searchParams = useSearchParams();
  const [activeProjectId, setActiveProjectId] = useState(() => getActiveProjectId() || globalProjectScope);
  const [query, setQuery] = useState(() => searchParams.get("q") ?? "");
  const [role, setRole] = useState<GlossaryRole | typeof allRoles>(allRoles);
  const [category, setCategory] = useState<(typeof glossaryCategories)[number] | typeof allCategories>(allCategories);
  
  // Database API States
  const [apiTerms, setApiTerms] = useState<GlossaryTerm[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [reloadNonce, setReloadNonce] = useState(0);

  const [masteredIds, setMasteredIds] = useState<string[]>([]);
  const [hideMastered, setHideMastered] = useState(false);
  const [customTerms, setCustomTerms] = useState<GlossaryTerm[]>([]);
  const [importStatus, setImportStatus] = useState("");
  const [importStatusKind, setImportStatusKind] = useState<"success" | "error" | "info">("info");
  const [isHydrated, setIsHydrated] = useState(false);

  function notifyImport(text: string, kind: "success" | "error" | "info" = "info") {
    setImportStatus(text);
    setImportStatusKind(kind);
  }
  
  const deferredQuery = useDeferredValue(query);
  const activeProject = useMemo(() => {
    if (activeProjectId === globalProjectScope) return null;
    return getProjectSettings().find((project) => project.id === activeProjectId) ?? getActiveProject();
  }, [activeProjectId]);

  useEffect(() => {
    const nextQuery = searchParams.get("q");
    if (nextQuery !== null) {
      setQuery(nextQuery);
    }
  }, [searchParams]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [deferredQuery, role, category]);

  // Fetch from API
  useEffect(() => {
    async function fetchTerms() {
      setIsLoading(true);
      try {
        const queryParams = new URLSearchParams({
          page: String(currentPage),
          size: "40",
        });
        if (deferredQuery) queryParams.append("search", deferredQuery);
        if (category !== allCategories) queryParams.append("category", category);
        if (role !== allRoles) queryParams.append("role", role);

        const res = await fetch(`${apiBaseUrl}/glossary/?${queryParams.toString()}`);
        if (res.ok) {
          const data = await res.json();
          setApiTerms(data.items);
          setTotalItems(data.total);
          setTotalPages(data.pages);
        }
      } catch (err) {
        console.error("Glossary fetch failed", err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchTerms();
  }, [currentPage, deferredQuery, category, role, reloadNonce]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setIsHydrated(false);
    const scopedMasteredStorageKey = scopedBrowserKey(masteredStorageKey, activeProjectId);
    const scopedCustomStorageKey = scopedBrowserKey(customGlossaryStorageKey, activeProjectId);
    const scopedMasteredSyncKey = scopedClientStateKey(masteredSyncKey, activeProjectId);
    const scopedCustomSyncKey = scopedClientStateKey(customGlossarySyncKey, activeProjectId);

    async function hydrateGlossary() {
      let localMastered: string[] = [];
      let localCustomTerms: GlossaryTerm[] = [];

      try {
        const raw = window.localStorage.getItem(scopedMasteredStorageKey);
        const parsed = raw ? JSON.parse(raw) : [];
        if (Array.isArray(parsed)) {
          localMastered = parsed.filter((item): item is string => typeof item === "string");
        }
      } catch {
        quarantineLocalStorageValue(scopedMasteredStorageKey);
      }

      try {
        const raw = window.localStorage.getItem(scopedCustomStorageKey);
        const parsed = raw ? JSON.parse(raw) : [];
        if (Array.isArray(parsed)) {
          localCustomTerms = parsed.filter((term): term is GlossaryTerm => {
            return (
              term &&
              typeof term.id === "string" &&
              typeof term.english === "string" &&
              typeof term.japanese === "string" &&
              typeof term.vietnamese === "string" &&
              Array.isArray(term.roles)
            );
          });
        }
      } catch {
        quarantineLocalStorageValue(scopedCustomStorageKey);
      }

      setMasteredIds(localMastered);
      setCustomTerms(localCustomTerms);

      try {
        const [masteredRes, customRes] = await Promise.all([
          fetch(`${apiBaseUrl}/client-state/entry/${encodeURIComponent(scopedMasteredSyncKey)}`),
          fetch(`${apiBaseUrl}/client-state/entry/${encodeURIComponent(scopedCustomSyncKey)}`),
        ]);
        if (masteredRes.ok) {
          const payload = (await masteredRes.json()) as { value?: string };
          const parsed = payload.value ? JSON.parse(payload.value) : [];
          if (Array.isArray(parsed)) {
            setMasteredIds(parsed.filter((item): item is string => typeof item === "string"));
          }
        }
        if (customRes.ok) {
          const payload = (await customRes.json()) as { value?: string };
          const parsed = payload.value ? JSON.parse(payload.value) : [];
          if (Array.isArray(parsed)) {
            setCustomTerms(
              parsed.filter((term): term is GlossaryTerm => {
                return (
                  term &&
                  typeof term.id === "string" &&
                  typeof term.english === "string" &&
                  typeof term.japanese === "string" &&
                  typeof term.vietnamese === "string" &&
                  Array.isArray(term.roles)
                );
              })
            );
          }
        }
      } catch {
        // Local cache remains the fallback when backend sync is unavailable.
      } finally {
        setIsHydrated(true);
      }
    }

    void hydrateGlossary();
  }, [activeProjectId]);

  useEffect(() => {
    if (typeof window === "undefined" || !isHydrated) return;
    const scopedMasteredStorageKey = scopedBrowserKey(masteredStorageKey, activeProjectId);
    const scopedMasteredSyncKey = scopedClientStateKey(masteredSyncKey, activeProjectId);
    window.localStorage.setItem(scopedMasteredStorageKey, JSON.stringify(masteredIds));
    void fetch(`${apiBaseUrl}/client-state/entry/${encodeURIComponent(scopedMasteredSyncKey)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: scopedMasteredSyncKey, value: JSON.stringify(masteredIds) }),
    }).catch(() => undefined);
  }, [activeProjectId, isHydrated, masteredIds]);

  useEffect(() => {
    if (typeof window === "undefined" || !isHydrated) return;
    const scopedCustomStorageKey = scopedBrowserKey(customGlossaryStorageKey, activeProjectId);
    const scopedCustomSyncKey = scopedClientStateKey(customGlossarySyncKey, activeProjectId);
    window.localStorage.setItem(scopedCustomStorageKey, JSON.stringify(customTerms));
    void fetch(`${apiBaseUrl}/client-state/entry/${encodeURIComponent(scopedCustomSyncKey)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: scopedCustomSyncKey, value: JSON.stringify(customTerms) }),
    }).catch(() => undefined);
  }, [activeProjectId, customTerms, isHydrated]);

  useEffect(() => {
    function handleProjectChange() {
      setActiveProjectId(getActiveProjectId() || globalProjectScope);
      setImportStatus("");
    }

    window.addEventListener(ACTIVE_PROJECT_CHANGED_EVENT, handleProjectChange);
    return () => window.removeEventListener(ACTIVE_PROJECT_CHANGED_EVENT, handleProjectChange);
  }, []);

  const masteredSet = useMemo(() => new Set(masteredIds), [masteredIds]);

  const filteredCustomTerms = useMemo(() => {
    const normalizedQuery = deferredQuery.trim().toLowerCase();
    return customTerms.filter((term) => {
      const matchesRole = role === allRoles || term.roles.includes(role as GlossaryRole);
      const matchesCategory = category === allCategories || term.category === category;
      const matchesMastered = !hideMastered || !masteredSet.has(term.id);
      const searchable = [
        term.english, term.japanese, term.kana ?? "", term.vietnamese, term.note, term.example ?? "", term.category, ...term.roles
      ].join(" ").toLowerCase();
      return matchesRole && matchesCategory && matchesMastered && (!normalizedQuery || searchable.includes(normalizedQuery));
    });
  }, [customTerms, category, deferredQuery, hideMastered, masteredSet, role]);

  const visibleApiTerms = useMemo(() => {
    return apiTerms.filter(term => !hideMastered || !masteredSet.has(term.id));
  }, [apiTerms, hideMastered, masteredSet]);

  const displayedTerms = useMemo(() => {
    if (currentPage === 1) {
      return [...filteredCustomTerms, ...visibleApiTerms];
    }
    return visibleApiTerms;
  }, [currentPage, filteredCustomTerms, visibleApiTerms]);

  const toggleMastered = useCallback((termId: string) => {
    setMasteredIds((current) =>
      current.includes(termId) ? current.filter((item) => item !== termId) : [...current, termId]
    );
  }, []);

  // Delegate all Study/Flashcard concerns to useGlossaryStudy!
  const study = useGlossaryStudy({ displayedTerms, toggleMastered });

  async function saveImportedTermToDb(term: GlossaryTerm) {
    const res = await fetch(`${apiBaseUrl}/glossary/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(term),
    });
    if (res.status === 400) {
      const updateRes = await fetch(`${apiBaseUrl}/glossary/${encodeURIComponent(term.id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(term),
      });
      if (!updateRes.ok) throw new Error(`HTTP ${updateRes.status}`);
      return (await updateRes.json()) as GlossaryTerm;
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as GlossaryTerm;
  }

  async function handleCsvImport(file: File | null) {
    if (!file) return;
    const text = await file.text();
    const imported = parseGlossaryCsv(text);

    if (imported.length === 0) {
      notifyImport(t("glossary.status.importFailed"), "error");
      return;
    }

    try {
      await Promise.all(imported.map(saveImportedTermToDb));
      setCurrentPage(1);
      setReloadNonce((current) => current + 1);
      notifyImport(`Đã import ${imported.length} thuật ngữ vào Glossary Database.`, "success");
    } catch {
      setCustomTerms((current) => [...imported, ...current]);
      notifyImport(`${t("glossary.status.importSuccess").replace("{count}", String(imported.length))} Backend DB lỗi nên đã lưu vào custom cache.`, "info");
    }
  }

  async function fetchAllTermsForExport() {
    try {
      const res = await fetch(`${apiBaseUrl}/glossary/?page=1&size=5000`);
      if (res.ok) {
        const data = await res.json();
        return [...customTerms, ...data.items];
      }
    } catch (e) {
      console.error(e);
    }
    return customTerms;
  }

  async function exportCsv() {
    notifyImport("Đang tải toàn bộ dữ liệu từ Database để xuất...", "info");
    const allExportTerms = await fetchAllTermsForExport();
    const csvContent = serializeGlossaryToCsv(allExportTerms);
    downloadTextFile("brse-glossary.csv", csvContent);
    notifyImport(t("glossary.status.exportCsv").replace("{count}", String(allExportTerms.length)), "success");
  }

  async function exportAnkiCsv() {
    notifyImport("Đang tải toàn bộ dữ liệu từ Database để xuất Anki...", "info");
    const allExportTerms = await fetchAllTermsForExport();
    const ankiCsvContent = serializeGlossaryToAnkiCsv(allExportTerms);
    downloadTextFile("brse-glossary-anki.csv", ankiCsvContent);
    notifyImport(t("glossary.status.exportAnki").replace("{count}", String(allExportTerms.length)), "success");
  }

  function downloadTextFile(filename: string, content: string, type = "text/csv;charset=utf-8") {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return {
    query,
    setQuery,
    role,
    setRole,
    category,
    setCategory,
    currentPage,
    setCurrentPage,
    totalPages,
    totalItems,
    isLoading,
    customTerms,
    setCustomTerms,
    importStatus,
    importStatusKind,
    setImportStatus,
    notifyImport,
    hideMastered,
    setHideMastered,
    displayedTerms,
    masteredSet,
    masteredIds,
    activeProjectId,
    activeProject,
    isHydrated,
    
    // Delegated study hook states
    ...study,

    // Actions
    toggleMastered,
    handleCsvImport,
    exportCsv,
    exportAnkiCsv,
  };
}
