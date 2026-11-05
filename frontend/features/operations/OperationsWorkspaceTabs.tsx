"use client";

type OperationsWorkspaceTabsProps = {
  activeTab: "work" | "release";
  onChange: (tab: "work" | "release") => void;
};

export function OperationsWorkspaceTabs({ activeTab, onChange }: OperationsWorkspaceTabsProps) {
  return (
    <div className="brse-card-muted mt-2 mb-1 inline-flex rounded-xl p-0.5">
      <button
        type="button"
        onClick={() => onChange("work")}
        className={`brse-tab px-3 py-1.5 text-xs font-semibold ${
          activeTab === "work" ? "brse-tab-active" : ""
        }`}
      >
        Q&amp;A / Bug / CR
      </button>
      <button
        type="button"
        onClick={() => onChange("release")}
        className={`brse-tab px-3 py-1.5 text-xs font-semibold ${
          activeTab === "release" ? "brse-tab-active" : ""
        }`}
      >
        Release / Logs / UAT
      </button>
    </div>
  );
}
