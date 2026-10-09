"use client";

import { CheckCircle2, Pencil, Plus, RotateCcw, Save, Trash2 } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useConfirm } from "@/components/ConfirmProvider";
import {
  deleteAiPromptProfile,
  getAiPromptProfiles,
  resolveAiPromptProfile,
  saveAiPromptProfile,
  type AiPromptProfile,
  type AiPromptProfileInput,
  type AiPromptUseCase,
} from "@/lib/aiPromptProfiles";
import type { ProjectSetting } from "@/lib/projectSettings";

const useCases: Array<{ id: AiPromptUseCase; label: string }> = [
  { id: "keigo", label: "Keigo" },
  { id: "report", label: "Daily Report" },
  { id: "minutes", label: "Meeting Minutes" },
  { id: "requirements", label: "Requirement Chat" },
  { id: "slides", label: "Slide Studio" },
  { id: "knowledge", label: "Knowledge Q&A" },
];

const emptyProfile: AiPromptProfileInput = {
  name: "",
  use_case: "report",
  system_prompt: "",
  project_id: "",
  customer_name: "",
  notes: "",
  is_default: true,
};

type Props = {
  projects: ProjectSetting[];
  activeProjectId: string;
};

export function AiPromptProfilesPanel({ projects, activeProjectId }: Props) {
  const { confirm } = useConfirm();
  const [profiles, setProfiles] = useState<AiPromptProfile[]>([]);
  const [editingId, setEditingId] = useState("");
  const [form, setForm] = useState<AiPromptProfileInput>({ ...emptyProfile, project_id: activeProjectId });
  const [filterUseCase, setFilterUseCase] = useState<AiPromptUseCase | "all">("all");
  const [filterProjectId, setFilterProjectId] = useState<string>("all");
  const [status, setStatus] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const projectById = useMemo(() => new Map(projects.map((project) => [project.id, project])), [projects]);
  const filteredProfiles = useMemo(
    () =>
      profiles.filter((profile) => {
        const useCaseMatch = filterUseCase === "all" || profile.use_case === filterUseCase;
        const projectMatch = filterProjectId === "all" || profile.project_id === filterProjectId;
        return useCaseMatch && projectMatch;
      }),
    [filterProjectId, filterUseCase, profiles],
  );

  useEffect(() => {
    void loadProfiles();
  }, []);

  async function loadProfiles() {
    setIsLoading(true);
    try {
      setProfiles(await getAiPromptProfiles());
      setStatus("");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Không tải được prompt profiles.");
    } finally {
      setIsLoading(false);
    }
  }

  function updateField<K extends keyof AiPromptProfileInput>(key: K, value: AiPromptProfileInput[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setStatus("");
  }

  function resetForm() {
    setEditingId("");
    setForm({ ...emptyProfile, project_id: activeProjectId });
    setStatus("");
  }

  function startEdit(profile: AiPromptProfile) {
    setEditingId(profile.id);
    setForm({
      name: profile.name,
      use_case: profile.use_case,
      system_prompt: profile.system_prompt,
      project_id: profile.project_id,
      customer_name: profile.customer_name,
      notes: profile.notes,
      is_default: profile.is_default,
    });
    setStatus("");
  }

  async function submitProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      const saved = await saveAiPromptProfile(form, editingId || undefined);
      setEditingId(saved.id);
      setForm({
        name: saved.name,
        use_case: saved.use_case,
        system_prompt: saved.system_prompt,
        project_id: saved.project_id,
        customer_name: saved.customer_name,
        notes: saved.notes,
        is_default: saved.is_default,
      });
      await loadProfiles();
      setStatus("Đã lưu prompt profile.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Lưu prompt profile thất bại.");
    }
  }

  async function setDefault(profile: AiPromptProfile) {
    try {
      await saveAiPromptProfile(
        {
          name: profile.name,
          use_case: profile.use_case,
          system_prompt: profile.system_prompt,
          project_id: profile.project_id,
          customer_name: profile.customer_name,
          notes: profile.notes,
          is_default: true,
        },
        profile.id,
      );
      await loadProfiles();
      setStatus("Đã chọn default prompt profile.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Không chọn được default profile.");
    }
  }

  async function deleteProfile(profile: AiPromptProfile) {
    const ok = await confirm({ type: "warning", message: `Xóa prompt profile "${profile.name}"?` });
    if (!ok) return;
    try {
      await deleteAiPromptProfile(profile.id);
      if (editingId === profile.id) resetForm();
      await loadProfiles();
      setStatus("Đã xóa prompt profile.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Xóa prompt profile thất bại.");
    }
  }

  async function testResolve() {
    try {
      const resolved = await resolveAiPromptProfile({
        useCase: form.use_case,
        projectId: form.project_id,
        promptProfileId: editingId,
      });
      setStatus(`Resolve: ${resolved.name}`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Không resolve được profile.");
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
      <section className="brse-section p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--brse-panel-border)] pb-4">
          <div>
            <h2 className="text-xl font-semibold text-ink">Prompt Profiles</h2>
            <p className="mt-1 text-sm text-textMuted">Keigo / report / minutes prompts by project</p>
          </div>
          <button
            type="button"
            onClick={resetForm}
            className="inline-flex items-center gap-2 rounded-md border border-[var(--brse-panel-border)] bg-background/70 px-3 py-2 text-sm font-semibold text-ink transition hover:border-primary/40"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            New
          </button>
        </div>

        <form onSubmit={submitProfile} className="mt-5 grid gap-4">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-2">
              <span className="text-sm font-semibold text-ink">Name</span>
              <input
                required
                value={form.name}
                onChange={(event) => updateField("name", event.target.value)}
                className="min-h-11 rounded-md border border-[var(--brse-panel-border)] bg-background/70 px-3 py-2 text-sm text-ink outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                placeholder="Finance client report"
              />
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-semibold text-ink">Use case</span>
              <select
                value={form.use_case}
                onChange={(event) => updateField("use_case", event.target.value as AiPromptUseCase)}
                className="min-h-11 rounded-md border border-[var(--brse-panel-border)] bg-background/70 px-3 py-2 text-sm text-ink outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              >
                {useCases.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-2">
              <span className="text-sm font-semibold text-ink">Project</span>
              <select
                value={form.project_id}
                onChange={(event) => {
                  const projectId = event.target.value;
                  updateField("project_id", projectId);
                  updateField("customer_name", projectById.get(projectId)?.customer_name ?? "");
                }}
                className="min-h-11 rounded-md border border-[var(--brse-panel-border)] bg-background/70 px-3 py-2 text-sm text-ink outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              >
                <option value="">Global default</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-semibold text-ink">Customer</span>
              <input
                value={form.customer_name}
                onChange={(event) => updateField("customer_name", event.target.value)}
                className="min-h-11 rounded-md border border-[var(--brse-panel-border)] bg-background/70 px-3 py-2 text-sm text-ink outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                placeholder="Customer name"
              />
            </label>
          </div>
          <label className="grid gap-2">
            <span className="text-sm font-semibold text-ink">System prompt</span>
            <textarea
              required
              rows={10}
              value={form.system_prompt}
              onChange={(event) => updateField("system_prompt", event.target.value)}
              className="rounded-md border border-[var(--brse-panel-border)] bg-background/70 px-3 py-2 font-mono text-sm leading-6 text-ink outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              placeholder="You are a BrSE assistant..."
            />
          </label>
          <label className="grid gap-2">
            <span className="text-sm font-semibold text-ink">Notes</span>
            <textarea
              rows={3}
              value={form.notes}
              onChange={(event) => updateField("notes", event.target.value)}
              className="rounded-md border border-[var(--brse-panel-border)] bg-background/70 px-3 py-2 text-sm leading-6 text-ink outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              placeholder="Tone, customer constraints, expected output"
            />
          </label>
          <label className="flex items-center gap-3 rounded-lg border border-[var(--brse-panel-border)] bg-background/50 p-3 text-sm font-semibold text-ink">
            <input
              type="checkbox"
              checked={form.is_default}
              onChange={(event) => updateField("is_default", event.target.checked)}
              className="h-4 w-4 rounded border-[var(--brse-panel-border)] text-primary focus:ring-primary/20"
            />
            Default for this project and use case
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primaryHover"
            >
              <Save className="h-4 w-4" aria-hidden="true" />
              Save profile
            </button>
            <button
              type="button"
              onClick={testResolve}
              className="inline-flex items-center gap-2 rounded-md border border-cyan/35 bg-cyan/10 px-4 py-2 text-sm font-semibold text-cyan transition hover:bg-cyan/15"
            >
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              Resolve
            </button>
          </div>
          {status ? <p className="text-sm text-matcha">{status}</p> : null}
        </form>
      </section>

      <section className="brse-section p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--brse-panel-border)] pb-4">
          <h2 className="text-xl font-semibold text-ink">Saved Profiles</h2>
          <button
            type="button"
            onClick={loadProfiles}
            disabled={isLoading}
            className="inline-flex items-center gap-2 rounded-md border border-[var(--brse-panel-border)] bg-background/70 px-3 py-2 text-sm font-semibold text-ink transition hover:border-primary/40 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            Refresh
          </button>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <label className="grid gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-textMuted">Use case</span>
            <select
              value={filterUseCase}
              onChange={(event) => setFilterUseCase(event.target.value as AiPromptUseCase | "all")}
              className="min-h-10 rounded-md border border-[var(--brse-panel-border)] bg-background/70 px-3 py-2 text-sm text-ink outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            >
              <option value="all">All</option>
              {useCases.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-textMuted">Project</span>
            <select
              value={filterProjectId}
              onChange={(event) => setFilterProjectId(event.target.value)}
              className="min-h-10 rounded-md border border-[var(--brse-panel-border)] bg-background/70 px-3 py-2 text-sm text-ink outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            >
              <option value="all">All</option>
              <option value="">Global default</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="mt-5 grid gap-3">
          {filteredProfiles.length === 0 ? (
            <p className="rounded-lg bg-background/45 p-4 text-sm text-textMuted ring-1 ring-border/35">
              {isLoading ? "Loading profiles..." : "No prompt profiles."}
            </p>
          ) : (
            filteredProfiles.map((profile) => (
              <article key={profile.id} className="rounded-lg bg-background/45 p-4 ring-1 ring-border/35">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-ink">{profile.name}</h3>
                      <span className="rounded-sm bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">
                        {useCases.find((item) => item.id === profile.use_case)?.label ?? profile.use_case}
                      </span>
                      {profile.is_default ? (
                        <span className="rounded-sm bg-matcha/10 px-2 py-1 text-xs font-semibold text-matcha">default</span>
                      ) : null}
                    </div>
                    <p className="mt-2 text-sm text-ink/65">
                      {profile.project_id ? projectById.get(profile.project_id)?.name ?? profile.project_id : "Global default"}
                      {profile.customer_name ? ` / ${profile.customer_name}` : ""}
                    </p>
                    {profile.notes ? <p className="mt-2 text-xs leading-5 text-textMuted">{profile.notes}</p> : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setDefault(profile)}
                      disabled={profile.is_default}
                      className="rounded-md border border-matcha/30 bg-matcha/10 px-3 py-2 text-sm font-semibold text-matcha transition hover:bg-matcha/15 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Default
                    </button>
                    <button
                      type="button"
                      onClick={() => startEdit(profile)}
                      className="inline-flex items-center gap-2 rounded-md border border-[var(--brse-panel-border)] bg-background/70 px-3 py-2 text-sm font-semibold text-ink transition hover:border-primary/40"
                    >
                      <Pencil className="h-4 w-4" aria-hidden="true" />
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteProfile(profile)}
                      className="inline-flex items-center gap-2 rounded-md border border-vermilion/20 bg-background/70 px-3 py-2 text-sm font-semibold text-vermilion transition hover:bg-vermilion/10"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                      Delete
                    </button>
                  </div>
                </div>
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
