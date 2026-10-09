import { FileArchive, Loader2, Lock, ShieldCheck, Upload } from "lucide-react";
import type { ChangeEvent } from "react";
import { useUiLanguage } from "@/components/LanguageProvider";

type SystemBackupVaultProps = {
  isBusy: boolean;
  onCreateBackup: () => void;
  onRestoreBackup: (event: ChangeEvent<HTMLInputElement>) => void;
};

export function SystemBackupVault({ isBusy, onCreateBackup, onRestoreBackup }: SystemBackupVaultProps) {
  const { t } = useUiLanguage();

  return (
    <section className="mb-6 rounded-2xl bg-teal-500/10 p-5 ring-1 ring-teal-500/20 backdrop-blur-md">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-lg border border-teal-500/30 bg-background/60 text-cyan">
            <ShieldCheck className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan">System Backup Vault</p>
            <h2 className="mt-1 text-lg font-semibold text-ink">{t("settings.backupVaultTitle")}</h2>
            <p className="mt-1 max-w-5xl text-sm leading-6 text-textMuted">
              {t("settings.backupVaultDesc")}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onCreateBackup}
            disabled={isBusy}
            className="inline-flex items-center gap-2 rounded-md border border-cyan/35 bg-cyan/15 px-4 py-2 text-sm font-semibold text-cyan transition hover:bg-cyan/25 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isBusy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileArchive className="h-4 w-4" aria-hidden="true" />
            )}
            {t("settings.downloadFullBackup")}
          </button>
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-primary/35 bg-primary/15 px-4 py-2 text-sm font-semibold text-primary transition hover:bg-primary/25 disabled:opacity-60">
            <Upload className="h-4 w-4" aria-hidden="true" />
            {t("settings.restoreFromBackup")}
            <input
              type="file"
              accept=".brsebackup,.zip"
              onChange={onRestoreBackup}
              disabled={isBusy}
              className="hidden"
            />
          </label>
        </div>
      </div>
      <div className="mt-3.5 space-y-2 rounded-xl bg-background/45 p-4 text-xs text-textMuted ring-1 ring-border/35">
        <p className="flex items-center gap-1.5 font-bold text-cyan">
          <Lock className="h-4 w-4 text-cyan" />
          {t("settings.vaultGuideTitle")}
        </p>
        <ul className="list-inside list-disc space-y-1 pl-1.5">
          <li>{t("settings.vaultGuideItem1")}</li>
          <li>{t("settings.vaultGuideItem2")}</li>
          <li>{t("settings.vaultGuideItem3")}</li>
        </ul>
      </div>
    </section>
  );
}