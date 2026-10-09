"use client";

import React from "react";
import { ShieldAlert } from "lucide-react";
import { ProjectSettingConflict } from "@/lib/projectSettings";

interface ProjectConflictHandlerProps {
  conflicts: ProjectSettingConflict[];
  isSyncing: boolean;
  keepLocalConflict: (projectId: string) => Promise<void>;
  acceptServerConflict: (projectId: string) => void;
}

export function ProjectConflictHandler({
  conflicts,
  isSyncing,
  keepLocalConflict,
  acceptServerConflict
}: ProjectConflictHandlerProps) {
  if (!conflicts.length) return null;

  return (
    <section className="mb-6 brse-section border-gold/30 bg-gold/10 p-4">
      <div className="flex items-start gap-3">
        <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-gold" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-black text-gold">Project Settings conflict</p>
          <p className="mt-1 text-sm leading-6 text-textMuted">
            PostgreSQL có bản mới hơn trong khi browser vẫn còn bản local chưa sync. BrSE OS đang giữ nguyên local cache, không tự ghi đè dữ liệu.
          </p>
          <div className="mt-3 grid gap-3">
            {conflicts.map((conflict) => (
              <div key={conflict.projectId} className="rounded-xl border border-[var(--brse-hairline-border)] bg-background/55 p-3">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="font-semibold text-ink">{conflict.localProject.name || conflict.serverProject.name}</p>
                    <p className="mt-1 text-xs text-textMuted">
                      Local: {new Date(conflict.localProject.updatedAt).toLocaleString()} / PostgreSQL: {new Date(conflict.serverProject.updatedAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={isSyncing}
                      onClick={() => void keepLocalConflict(conflict.projectId)}
                      className="brse-button brse-button-primary px-3 py-2 text-xs font-bold disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Keep Local
                    </button>
                    <button
                      type="button"
                      disabled={isSyncing}
                      onClick={() => acceptServerConflict(conflict.projectId)}
                      className="brse-button px-3 py-2 text-xs font-bold disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Use Server
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
