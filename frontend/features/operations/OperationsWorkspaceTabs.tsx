"use client";

type OperationsWorkspaceTabsProps = {
  activeTab: "work" | "release";
  onChange: (tab: "work" | "release") => void;
};

export function OperationsWorkspaceTabs({ activeTab, onChange }: OperationsWorkspaceTabsProps) {
  return (
    <div className="brse-card-muted mt-5 inline-flex rounded-xl p-1">
      <button
        type="button"
        onClick={() => onChange("work")}
        className={`brse-tab px-4 py-2 text-sm font-semibold ${
          activeTab === "work" ? "brse-tab-active" : ""
        }`}
      >
        Q&amp;A / Bug / CR
      </button>
      <button
        type="button"
        onClick={() => onChange("release")}
        className={`brse-tab px-4 py-2 text-sm font-semibold ${
          activeTab === "release" ? "brse-tab-active" : ""
        }`}
      >
        Release / Logs / UAT
      </button>
    </div>
  );
}
