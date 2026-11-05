"use client";

import React from "react";
import { Plus, Trash2 } from "lucide-react";

interface ProjectStakeholder {
  role: string;
  name: string;
  email: string;
  chatId: string;
}

const emptyStakeholder: ProjectStakeholder = {
  role: "",
  name: "",
  email: "",
  chatId: "",
};

interface StakeholdersPanelProps {
  stakeholders: ProjectStakeholder[];
  updateStakeholders: (nextStakeholders: ProjectStakeholder[]) => void;
}

export function StakeholdersPanel({
  stakeholders,
  updateStakeholders
}: StakeholdersPanelProps) {
  
  function updateStakeholder(index: number, key: keyof ProjectStakeholder, value: string) {
    const nextStakeholders = stakeholders.length ? [...stakeholders] : [{ ...emptyStakeholder }];
    nextStakeholders[index] = { ...nextStakeholders[index], [key]: value };
    updateStakeholders(nextStakeholders);
  }

  function addStakeholder() {
    updateStakeholders([...stakeholders, { ...emptyStakeholder }]);
  }

  function removeStakeholder(index: number) {
    updateStakeholders(stakeholders.filter((_, itemIndex) => itemIndex !== index));
  }

  const items = stakeholders.length ? stakeholders : [emptyStakeholder];

  return (
    <section className="brse-card brse-card-muted p-3.5 sm:p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs font-bold text-ink">Stakeholders (Người liên quan)</p>
          <p className="text-[11px] leading-4 text-textMuted">
            Role, email và Chatwork/Slack ID để AI gán đúng PIC khi xuất mail và biên bản.
          </p>
        </div>
        <button
          type="button"
          onClick={addStakeholder}
          className="brse-button inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
          Thêm PIC
        </button>
      </div>

      <div className="mt-3 grid gap-2.5">
        {items.map((stakeholder, index) => (
          <div
            key={index}
            className="rounded-xl border border-[var(--brse-hairline-border)] bg-background/50 p-2.5 space-y-2 transition hover:border-[var(--brse-panel-border)]"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-primary">
                PIC #{index + 1}
              </span>
              {stakeholders.length > 0 && (
                <button
                  type="button"
                  onClick={() => removeStakeholder(index)}
                  className="inline-flex h-6 w-6 items-center justify-center rounded-md text-vermilion hover:bg-vermilion/10 transition"
                  aria-label="Remove stakeholder"
                  title="Xóa PIC"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              )}
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="grid gap-1">
                <span className="text-[10px] font-semibold text-textMuted">Vai trò</span>
                <input
                  value={stakeholder.role}
                  onChange={(event) => updateStakeholder(index, "role", event.target.value)}
                  className="field-control w-full text-xs"
                  placeholder="Vd: Client PO, Tech Lead"
                />
              </label>
              <label className="grid gap-1">
                <span className="text-[10px] font-semibold text-textMuted">Họ và tên</span>
                <input
                  value={stakeholder.name}
                  onChange={(event) => updateStakeholder(index, "name", event.target.value)}
                  className="field-control w-full text-xs"
                  placeholder="Họ và tên PIC"
                />
              </label>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="grid gap-1">
                <span className="text-[10px] font-semibold text-textMuted">Email</span>
                <input
                  type="email"
                  value={stakeholder.email}
                  onChange={(event) => updateStakeholder(index, "email", event.target.value)}
                  className="field-control w-full text-xs"
                  placeholder="email@example.co.jp"
                />
              </label>
              <label className="grid gap-1">
                <span className="text-[10px] font-semibold text-textMuted">Chatwork / Slack ID</span>
                <input
                  value={stakeholder.chatId}
                  onChange={(event) => updateStakeholder(index, "chatId", event.target.value)}
                  className="field-control w-full text-xs"
                  placeholder="Slack / Chatwork ID"
                />
              </label>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
