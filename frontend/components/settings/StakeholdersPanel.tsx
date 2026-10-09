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
    <section className="brse-card brse-card-muted p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-ink">Stakeholders</p>
          <p className="mt-1 text-xs leading-5 text-textMuted">
            Role, email và Chatwork/Slack ID để AI draft mail/minutes đúng PIC.
          </p>
        </div>
        <button
          type="button"
          onClick={addStakeholder}
          className="brse-button inline-flex items-center gap-2 px-3 py-2 text-xs font-bold"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
          Add PIC
        </button>
      </div>
      <div className="mt-4 grid gap-3">
        {items.map((stakeholder, index) => (
          <div key={`${index}-${stakeholder.email}-${stakeholder.name}`} className="grid gap-2 md:grid-cols-[1fr_1fr_1.25fr_1fr_auto] md:items-center">
            <input
              value={stakeholder.role}
              onChange={(event) => updateStakeholder(index, "role", event.target.value)}
              className="field-control px-3 py-2 text-sm"
              placeholder="Role: Client PO"
            />
            <input
              value={stakeholder.name}
              onChange={(event) => updateStakeholder(index, "name", event.target.value)}
              className="field-control px-3 py-2 text-sm"
              placeholder="Name"
            />
            <input
              type="email"
              value={stakeholder.email}
              onChange={(event) => updateStakeholder(index, "email", event.target.value)}
              className="field-control px-3 py-2 text-sm"
              placeholder="email@example.co.jp"
            />
            <input
              value={stakeholder.chatId}
              onChange={(event) => updateStakeholder(index, "chatId", event.target.value)}
              className="field-control px-3 py-2 text-sm"
              placeholder="Slack / Chatwork ID"
            />
            <button
              type="button"
              onClick={() => removeStakeholder(index)}
              disabled={!stakeholders.length}
              className="brse-button h-10 px-3 text-vermilion disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Remove stakeholder"
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
