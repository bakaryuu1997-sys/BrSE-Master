"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpenText,
  BriefcaseBusiness,
  CalendarDays,
  ChevronRight,
  ClipboardList,
  FileBarChart2,
  FileClock,
  FileText,
  LayoutDashboard,
  Library,
  Mail,
  Mic,
  Network,
  Presentation,
  Settings,
  Shield,
  StickyNote,
  SpellCheck,
  SlidersHorizontal,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { useUiLanguage } from "@/components/LanguageProvider";
import type { TranslationKey } from "@/lib/uiLanguage";
import { cn } from "@/lib/utils";
import { useLiveBadges } from "@/hooks/useLiveBadges";
import {
  ACTIVE_PROJECT_CHANGED_EVENT,
  fetchActiveProjectId,
  fetchProjectSettings,
  getActiveProjectId,
  getProjectSettings,
  setActiveProjectId as setActiveProjectIdCache,
  setActiveProjectIdToDb,
  type ActiveProjectChangedDetail,
  type ProjectSetting,
} from "@/lib/projectSettings";

type NavItem = {
  labelKey: TranslationKey;
  href: string;
  icon: LucideIcon;
  badge?: string;
  /** dynamic live badge — number shown as red dot / count */
  liveBadgeKey?: keyof ReturnType<typeof useLiveBadges>;
};

type NavGroup = {
  id: string;
  labelKey: TranslationKey;
  icon: LucideIcon;
  color: string;
  items: NavItem[];
};

const pinnedItems: NavItem[] = [
  { labelKey: "nav.dashboard", href: "/app",                   icon: LayoutDashboard },
  { labelKey: "nav.todo",      href: "/app/brse-todo",         icon: ClipboardList, liveBadgeKey: "todoOverdue"  },
  { labelKey: "nav.calendar",  href: "/app/calendar",          icon: CalendarDays, liveBadgeKey: "todaySchedules" },
  { labelKey: "nav.notes",     href: "/app/notes",             icon: StickyNote     },
];

const navGroups: NavGroup[] = [
  {
    id: "communication",
    labelKey: "nav.communication",
    icon: Mic,
    color: "text-violet",
    items: [
      { labelKey: "nav.meetingNote",    href: "/app/meeting-note", icon: Mic,      liveBadgeKey: "meetingProcessing" },
      { labelKey: "nav.meetingMinutes", href: "/app/minutes/new",  icon: FileText  },
      { labelKey: "nav.templates",      href: "/app/templates",    icon: Mail      },
      { labelKey: "nav.history",        href: "/app/history",      icon: FileClock },
      { labelKey: "nav.keigo",          href: "/app/keigo",        icon: SpellCheck, badge: "AI" },
    ],
  },
  {
    id: "operations",
    labelKey: "nav.operations",
    icon: BriefcaseBusiness,
    color: "text-sky",
    items: [
      { labelKey: "nav.operationsBoard", href: "/app/operations", icon: BriefcaseBusiness, liveBadgeKey: "totalOperationsPending" },
      { labelKey: "nav.reports",         href: "/app/reports",    icon: FileBarChart2      },
    ],
  },
  {
    id: "knowledge",
    labelKey: "nav.knowledge",
    icon: Library,
    color: "text-emerald",
    items: [
      { labelKey: "nav.knowledgeBase", href: "/app/knowledge", icon: BookOpenText },
      { labelKey: "nav.glossary",      href: "/app/glossary",  icon: Library      },
    ],
  },
  {
    id: "planning",
    labelKey: "nav.planningTools",
    icon: Zap,
    color: "text-amber",
    items: [
      { labelKey: "nav.powerTools",   href: "/app/power-tools",   icon: SlidersHorizontal },
      { labelKey: "nav.slides",       href: "/app/slides",        icon: Presentation      },
      { labelKey: "nav.specsMindMap", href: "/app/specs-mindmap", icon: Network           },
    ],
  },
  {
    id: "system",
    labelKey: "nav.system",
    icon: Settings,
    color: "text-textMuted",
    items: [
      { labelKey: "nav.settings",   href: "/app/settings/projects", icon: Settings },
      { labelKey: "nav.systemHealth", href: "/app/validation",      icon: Shield   },
    ],
  },
];

type SidebarProps = {
  mode?: "sidebar" | "mobile";
};

function isActivePath(pathname: string, href: string) {
  if (href === "/app") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Sidebar({ mode = "sidebar" }: SidebarProps) {
  const pathname = usePathname();
  const { t } = useUiLanguage();
  const badges = useLiveBadges();
  const isMobile = mode === "mobile";
  const [projects, setProjects] = useState<ProjectSetting[]>([]);
  const [activeProjectId, setActiveProjectIdState] = useState("");
  const [projectStatus, setProjectStatus] = useState("");
  const [isSavingProject, setIsSavingProject] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(
      navGroups.map((group) => [
        group.id,
        group.items.some((item) => isActivePath(pathname, item.href)),
      ])
    )
  );

  const allItems = [...pinnedItems, ...navGroups.flatMap((group) => group.items)];
  const selectedProjectId = activeProjectId || projects[0]?.id || "";
  const activeProject = projects.find((project) => project.id === selectedProjectId) ?? null;

  useEffect(() => {
    setOpenGroups((current) => {
      const next = { ...current };
      navGroups.forEach((group) => {
        if (group.items.some((item) => isActivePath(pathname, item.href))) {
          next[group.id] = true;
        }
      });
      return next;
    });
  }, [pathname]);

  useEffect(() => {
    let cancelled = false;

    function applyCachedState() {
      if (cancelled) return;
      setProjects(getProjectSettings());
      setActiveProjectIdState(getActiveProjectId());
    }

    async function loadProjectContext() {
      applyCachedState();
      try {
        const nextProjects = await fetchProjectSettings();
        const nextActiveId = await fetchActiveProjectId();
        if (cancelled) return;
        setProjects(nextProjects);
        setActiveProjectIdState(nextActiveId || getActiveProjectId());
        setProjectStatus("");
      } catch {
        if (cancelled) return;
        applyCachedState();
        setProjectStatus("Using local project cache");
      }
    }

    function handleProjectEvent(event: Event) {
      const detail = (event as CustomEvent<ActiveProjectChangedDetail>).detail;
      setActiveProjectIdState(detail?.projectId ?? getActiveProjectId());
      setProjects(getProjectSettings());
    }

    void loadProjectContext();
    window.addEventListener(ACTIVE_PROJECT_CHANGED_EVENT, handleProjectEvent);
    window.addEventListener("storage", applyCachedState);

    return () => {
      cancelled = true;
      window.removeEventListener(ACTIVE_PROJECT_CHANGED_EVENT, handleProjectEvent);
      window.removeEventListener("storage", applyCachedState);
    };
  }, []);

  async function handleProjectChange(nextProjectId: string) {
    if (!nextProjectId || nextProjectId === selectedProjectId) return;
    setIsSavingProject(true);
    setActiveProjectIdState(nextProjectId);
    setProjectStatus("");
    try {
      await setActiveProjectIdToDb(nextProjectId);
    } catch {
      setActiveProjectIdCache(nextProjectId);
      setProjectStatus("Saved locally; DB sync unavailable");
    } finally {
      setIsSavingProject(false);
    }
  }

  if (isMobile) {
    return (
      <div className="flex items-center gap-1">
        {allItems.map((item) => (
          <NavLink
            key={item.href}
            item={item}
            pathname={pathname}
            label={t(item.labelKey)}
            isMobile
            liveCount={item.liveBadgeKey ? (badges[item.liveBadgeKey] as number) : 0}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <section className="mx-2 rounded-2xl border border-[var(--brse-hairline-border)] bg-[var(--brse-card-bg)] p-3 shadow-[var(--brse-card-shadow)]">
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="text-[9px] font-black uppercase tracking-[0.18em] text-primary">
            Project Context
          </p>
          <Link
            href="/app/settings/projects"
            className="rounded-lg px-2 py-1 text-[10px] font-bold text-textMuted transition hover:bg-[var(--brse-nav-hover-bg)] hover:text-textPrimary"
          >
            Manage
          </Link>
        </div>
        <label className="sr-only" htmlFor="global-project-selector">
          Active project
        </label>
        <select
          id="global-project-selector"
          value={selectedProjectId}
          onChange={(event) => void handleProjectChange(event.target.value)}
          disabled={!projects.length || isSavingProject}
          className="field-control h-9 w-full rounded-xl px-2.5 py-1.5 text-xs font-bold text-textPrimary"
        >
          {projects.length ? null : <option value="">No project configured</option>}
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </select>
        <div className="mt-2 min-h-8 text-[10px] leading-4 text-textMuted">
          {activeProject ? (
            <>
              <div className="flex items-center gap-2">
                {activeProject.health_status ? (
                  <span
                    className={cn(
                      "h-2 w-2 shrink-0 rounded-full",
                      activeProject.health_status === "Red"
                        ? "bg-vermilion"
                        : activeProject.health_status === "Yellow"
                        ? "bg-amber"
                        : "bg-matcha"
                    )}
                  />
                ) : null}
                <p className="min-w-0 truncate font-semibold text-textPrimary">
                  {activeProject.customer_name || "No customer set"}
                </p>
              </div>
              <p className="truncate">
                {activeProject.current_phase || activeProject.timezone || "Asia/Tokyo"}
                {activeProject.next_milestone_date ? ` / ${activeProject.next_milestone_date}` : ""}
              </p>
            </>
          ) : (
            <p>Create a project profile to bind Todo, Reports, AI and Slides.</p>
          )}
          {projectStatus ? <p className="mt-1 text-amber">{projectStatus}</p> : null}
        </div>
      </section>

      {/* Pinned section */}
      <div className="flex flex-col gap-0.5">
        <p className="brse-nav-heading mb-1 px-3 text-[9px] font-bold uppercase">
          General
        </p>
        {pinnedItems.map((item) => (
          <NavLink
            key={item.href}
            item={item}
            pathname={pathname}
            label={t(item.labelKey)}
            liveCount={item.liveBadgeKey ? (badges[item.liveBadgeKey] as number) : 0}
          />
        ))}
      </div>

      {/* Grouped sections */}
      {navGroups.map((group) => {
        // Calculate group-level live count (sum of all items in group)
        const groupLiveCount = group.items.reduce((sum, item) => {
          if (!item.liveBadgeKey) return sum;
          return sum + (badges[item.liveBadgeKey] as number ?? 0);
        }, 0);

        return (
          <div key={group.id} className="flex flex-col gap-0.5">
            <button
              type="button"
              onClick={() =>
                setOpenGroups((current) => ({
                  ...current,
                  [group.id]: !current[group.id],
                }))
              }
              className="brse-nav-group-button group flex items-center justify-between rounded-lg px-3 py-1.5 text-left"
            >
              <span className="flex items-center gap-2 text-[9px] font-bold uppercase">
                <group.icon className={cn("h-3.5 w-3.5", group.color)} />
                {t(group.labelKey)}
                {/* Group-level badge — shows if any items in this group have pending counts */}
                {groupLiveCount > 0 && !openGroups[group.id] && (
                  <span className="brse-live-badge ml-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[8px] font-black">
                    {groupLiveCount > 99 ? "99+" : groupLiveCount}
                  </span>
                )}
              </span>
              <ChevronRight
                className={cn(
                  "h-3.5 w-3.5 opacity-60 transition",
                  openGroups[group.id] && "rotate-90 opacity-100"
                )}
              />
            </button>
            {openGroups[group.id] ? (
              <div className="flex flex-col gap-0.5">
                {group.items.map((item) => (
                  <NavLink
                    key={item.href}
                    item={item}
                    pathname={pathname}
                    label={t(item.labelKey)}
                    liveCount={item.liveBadgeKey ? (badges[item.liveBadgeKey] as number) : 0}
                  />
                ))}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function NavLink({
  item,
  pathname,
  label,
  isMobile,
  liveCount = 0,
}: {
  item: NavItem;
  pathname: string;
  label: string;
  isMobile?: boolean;
  liveCount?: number;
}) {
  const isActive = isActivePath(pathname, item.href);
  const Icon = item.icon;
  const showLiveBadge = liveCount > 0;

  return (
    <Link
      href={item.href}
      className={cn(
        "group relative flex items-center gap-3 transition-all duration-300",
        isMobile
          ? "brse-nav-link shrink-0 rounded-full px-4 py-2 text-xs font-bold"
          : "mx-2 rounded-xl px-3 py-1.5",
        isActive
          ? "brse-nav-link-active"
          : "brse-nav-link"
      )}
    >
      {/* Premium Active Indicator */}
      {isActive && !isMobile && (
        <div className="sidebar-active-indicator absolute -left-2 top-1/2 -translate-y-1/2 h-6 w-1 rounded-r-full" />
      )}

      <div
        className={cn(
          "relative flex h-7 w-7 items-center justify-center rounded-lg transition-all duration-300",
          isActive
            ? "brse-nav-icon-active"
            : "brse-nav-icon group-hover:scale-110 group-hover:text-textPrimary"
        )}
      >
        <Icon className="h-4 w-4" />
        {/* Live count pulse dot (only on icon when item has live badge) */}
        {showLiveBadge && !isActive && (
          <span className="brse-live-badge absolute -right-1 -top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full text-[7px] font-black">
            {liveCount > 9 ? "9+" : liveCount}
          </span>
        )}
      </div>

      <span
        className={cn(
          "font-bold transition-all duration-300 tracking-tight",
          isActive
            ? "translate-x-0.5"
            : "group-hover:translate-x-0.5 group-hover:text-textPrimary",
          isMobile ? "" : "text-[12.5px]"
        )}
      >
        {label}
      </span>

      {/* Static badge (e.g. "AI") */}
      {item.badge && (
        <span className="brse-pill-badge ml-auto rounded-full px-2 py-0.5 text-[9px] font-black uppercase">
          {item.badge}
        </span>
      )}

      {/* Live badge count (full number in sidebar) */}
      {showLiveBadge && !isMobile && (
        <span className="brse-live-badge ml-auto flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[9px] font-black">
          {liveCount > 99 ? "99+" : liveCount}
        </span>
      )}
    </Link>
  );
}
