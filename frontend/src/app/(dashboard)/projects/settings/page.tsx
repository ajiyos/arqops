"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Loader2,
  Plus,
  Trash2,
} from "lucide-react";
import apiClient from "@/lib/api/client";
import { useAuth } from "@/lib/auth/auth-context";
import { useTenantProjectTypesQuery } from "@/lib/hooks/use-tenant-project-types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils/cn";
import type { ApiResponse } from "@/types";

const TASK_PRIORITIES = ["low", "medium", "high", "urgent"] as const;
const TASK_STATUSES = ["todo", "in_progress", "review", "done"] as const;

type MilestoneTemplateEntry = { name: string; displayOrder: number };

type PhaseTemplateEntry = {
  name: string;
  displayOrder: number;
  milestones: MilestoneTemplateEntry[];
};

type OverviewPayload = {
  templatesByType: Record<string, PhaseTemplateEntry[]>;
};

/** Local editor state: one row of milestones per phase (strings). */
type PhaseDraft = {
  phaseName: string;
  milestones: string[];
};

function serverEntriesToDrafts(entries: PhaseTemplateEntry[] | undefined): PhaseDraft[] {
  const sorted = [...(entries ?? [])].sort((a, b) => a.displayOrder - b.displayOrder);
  if (sorted.length === 0) {
    return [{ phaseName: "", milestones: [""] }];
  }
  return sorted.map((e) => {
    const ms = [...(e.milestones ?? [])].sort((a, b) => a.displayOrder - b.displayOrder).map((m) => m.name);
    return {
      phaseName: e.name,
      milestones: ms.length > 0 ? ms : [""],
    };
  });
}

function normalizeForCompare(drafts: PhaseDraft[]) {
  return drafts
    .map((d) => ({
      phase: d.phaseName.trim(),
      milestones: d.milestones.map((m) => m.trim()).filter(Boolean),
    }))
    .filter((d) => d.phase);
}

function draftsEqual(a: PhaseDraft[], b: PhaseDraft[]) {
  return JSON.stringify(normalizeForCompare(a)) === JSON.stringify(normalizeForCompare(b));
}

// --- Default task templates ---

type TaskTemplateEntry = {
  title: string;
  description: string;
  priority: string;
  status: string;
  displayOrder: number;
};

type TaskTemplatesOverviewPayload = {
  taskTemplatesByType: Record<string, TaskTemplateEntry[]>;
};

type TaskDraft = {
  title: string;
  description: string;
  priority: string;
  status: string;
};

function serverTaskEntriesToDrafts(entries: TaskTemplateEntry[] | undefined): TaskDraft[] {
  const sorted = [...(entries ?? [])].sort((a, b) => a.displayOrder - b.displayOrder);
  if (sorted.length === 0) {
    return [{ title: "", description: "", priority: "medium", status: "todo" }];
  }
  return sorted.map((e) => ({
    title: e.title,
    description: e.description ?? "",
    priority: e.priority || "medium",
    status: e.status || "todo",
  }));
}

function normalizeTasksForCompare(drafts: TaskDraft[]) {
  return drafts
    .map((d) => ({
      title: d.title.trim(),
      description: d.description.trim(),
      priority: d.priority,
      status: d.status,
    }))
    .filter((d) => d.title);
}

function taskDraftsEqual(a: TaskDraft[], b: TaskDraft[]) {
  return (
    JSON.stringify(normalizeTasksForCompare(a)) === JSON.stringify(normalizeTasksForCompare(b))
  );
}

type SettingsTab = "phases" | "tasks";

export default function ProjectSettingsPage() {
  const queryClient = useQueryClient();
  const { user, isLoading: authLoading } = useAuth();
  const isTenantAdmin = user?.roles?.includes("TENANT_ADMIN") ?? false;

  const [settingsTab, setSettingsTab] = useState<SettingsTab>("phases");
  const [projectType, setProjectType] = useState<string>("");
  const [phaseDrafts, setPhaseDrafts] = useState<PhaseDraft[]>([{ phaseName: "", milestones: [""] }]);
  const [taskDrafts, setTaskDrafts] = useState<TaskDraft[]>([
    { title: "", description: "", priority: "medium", status: "todo" },
  ]);

  const { data: overview, isLoading: phasesLoading } = useQuery({
    queryKey: ["project-phase-templates"],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiResponse<OverviewPayload>>(
        "/api/v1/project/settings/phase-templates",
      );
      return data.data;
    },
    enabled: isTenantAdmin,
  });

  const { data: taskOverview, isLoading: tasksLoading } = useQuery({
    queryKey: ["project-task-templates"],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiResponse<TaskTemplatesOverviewPayload>>(
        "/api/v1/project/settings/task-templates",
      );
      return data.data;
    },
    enabled: isTenantAdmin,
  });

  const { data: tenantProjectTypes, isLoading: typesLoading } = useTenantProjectTypesQuery({
    enabled: isTenantAdmin,
  });

  const templatesByType = useMemo(() => overview?.templatesByType ?? {}, [overview]);
  const taskTemplatesByType = useMemo(
    () => taskOverview?.taskTemplatesByType ?? {},
    [taskOverview],
  );

  /** Tenant catalog order first, then any legacy keys present only in saved templates. */
  const projectTypeTabOptions = useMemo(() => {
    const apiOrder = (tenantProjectTypes ?? []).map((t) => t.name);
    const apiSet = new Set(apiOrder);
    const extraSet = new Set<string>();
    for (const k of Object.keys(templatesByType)) {
      if (!apiSet.has(k)) extraSet.add(k);
    }
    for (const k of Object.keys(taskTemplatesByType)) {
      if (!apiSet.has(k)) extraSet.add(k);
    }
    const extras = Array.from(extraSet).sort((a, b) => a.localeCompare(b));
    return [...apiOrder, ...extras];
  }, [tenantProjectTypes, templatesByType, taskTemplatesByType]);

  useEffect(() => {
    if (projectTypeTabOptions.length === 0) return;
    if (!projectTypeTabOptions.includes(projectType)) {
      setProjectType(projectTypeTabOptions[0]);
    }
  }, [projectTypeTabOptions, projectType]);

  const serverDrafts = useMemo(
    () => serverEntriesToDrafts(templatesByType[projectType]),
    [templatesByType, projectType],
  );

  /** Stable fingerprint so we do not reset local edits on every React Query refetch (new object references). */
  const serverSnapshot = useMemo(
    () => JSON.stringify(normalizeForCompare(serverDrafts)),
    [serverDrafts],
  );

  useEffect(() => {
    setPhaseDrafts(serverEntriesToDrafts(templatesByType[projectType]));
  }, [projectType, serverSnapshot, templatesByType]);

  const taskServerDrafts = useMemo(
    () => serverTaskEntriesToDrafts(taskTemplatesByType[projectType]),
    [taskTemplatesByType, projectType],
  );

  const taskServerSnapshot = useMemo(
    () => JSON.stringify(normalizeTasksForCompare(taskServerDrafts)),
    [taskServerDrafts],
  );

  useEffect(() => {
    setTaskDrafts(serverTaskEntriesToDrafts(taskTemplatesByType[projectType]));
  }, [projectType, taskServerSnapshot, taskTemplatesByType]);

  const savePhasesMutation = useMutation({
    mutationFn: async () => {
      const phases = normalizeForCompare(phaseDrafts).map((p) => ({
        name: p.phase,
        milestones: p.milestones,
      }));
      await apiClient.put(
        `/api/v1/project/settings/phase-templates/${encodeURIComponent(projectType)}`,
        { phases },
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-phase-templates"] });
    },
  });

  const saveTasksMutation = useMutation({
    mutationFn: async () => {
      const tasks = normalizeTasksForCompare(taskDrafts).map((t) => ({
        title: t.title,
        description: t.description || "",
        priority: t.priority,
        status: t.status,
      }));
      await apiClient.put(
        `/api/v1/project/settings/task-templates/${encodeURIComponent(projectType)}`,
        { tasks },
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-task-templates"] });
    },
  });

  const phasesDirty = useMemo(() => !draftsEqual(phaseDrafts, serverDrafts), [phaseDrafts, serverDrafts]);
  const tasksDirty = useMemo(() => !taskDraftsEqual(taskDrafts, taskServerDrafts), [taskDrafts, taskServerDrafts]);

  const movePhase = (index: number, dir: -1 | 1) => {
    const j = index + dir;
    if (j < 0 || j >= phaseDrafts.length) return;
    setPhaseDrafts((rows) => {
      const next = [...rows];
      [next[index], next[j]] = [next[j], next[index]];
      return next;
    });
  };

  const moveMilestone = (phaseIndex: number, milestoneIndex: number, dir: -1 | 1) => {
    const j = milestoneIndex + dir;
    setPhaseDrafts((rows) => {
      const phase = rows[phaseIndex];
      if (!phase || j < 0 || j >= phase.milestones.length) return rows;
      const next = [...rows];
      const ms = [...phase.milestones];
      [ms[milestoneIndex], ms[j]] = [ms[j], ms[milestoneIndex]];
      next[phaseIndex] = { ...phase, milestones: ms };
      return next;
    });
  };

  const moveTask = (index: number, dir: -1 | 1) => {
    const j = index + dir;
    if (j < 0 || j >= taskDrafts.length) return;
    setTaskDrafts((rows) => {
      const next = [...rows];
      [next[index], next[j]] = [next[j], next[index]];
      return next;
    });
  };

  if (authLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isTenantAdmin) {
    return (
      <div className="mx-auto max-w-lg space-y-4 text-center">
        <h1 className="text-2xl font-semibold">Project settings</h1>
        <p className="text-muted-foreground">
          Only tenant administrators can configure default phases, milestones, and tasks per project type.
        </p>
        <Button asChild variant="outline">
          <Link href="/projects">Back to projects</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/projects" aria-label="Back to projects">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Project defaults</h1>
          <p className="text-sm text-muted-foreground">
            Tenant-wide defaults per project type: phases and milestones when you create a project without custom
            phases, and starter tasks whenever a new project has that type.
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <div className="space-y-2">
          <label htmlFor="project-type" className="text-sm font-medium">
            Project type
          </label>
          <select
            id="project-type"
            className="h-10 w-full max-w-md rounded-md border border-input bg-background px-3 text-sm"
            value={projectType}
            onChange={(e) => setProjectType(e.target.value)}
            disabled={typesLoading && projectTypeTabOptions.length === 0}
          >
            {projectTypeTabOptions.length === 0 ? (
              <option value="">
                {typesLoading
                  ? "Loading…"
                  : "No project types — add them under Settings → Project types"}
              </option>
            ) : (
              projectTypeTabOptions.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))
            )}
          </select>
        </div>

        <div
          className="inline-flex rounded-lg border border-border bg-muted/40 p-1"
          role="tablist"
          aria-label="Settings section"
        >
          <button
            type="button"
            role="tab"
            aria-selected={settingsTab === "phases"}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              settingsTab === "phases"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
            onClick={() => setSettingsTab("phases")}
          >
            Phases &amp; milestones
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={settingsTab === "tasks"}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              settingsTab === "tasks"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
            onClick={() => setSettingsTab("tasks")}
          >
            Default tasks
          </button>
        </div>
      </div>

      {settingsTab === "phases" && (
      <Card>
        <CardHeader>
          <CardTitle>Phases &amp; milestones</CardTitle>
          <CardDescription>
            Phase order is top-to-bottom. Milestone order within each phase is top-to-bottom on the project page.
            Used when the create form does not supply custom phases.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {phasesLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <ul className="space-y-6">
                {phaseDrafts.map((phase, pi) => (
                  <li
                    key={pi}
                    className="rounded-lg border border-border bg-card/50 p-4 shadow-sm"
                  >
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                      <span className="text-xs font-semibold uppercase text-muted-foreground">Phase</span>
                      <Input
                        value={phase.phaseName}
                        onChange={(e) =>
                          setPhaseDrafts((rows) => {
                            const next = [...rows];
                            next[pi] = { ...next[pi], phaseName: e.target.value };
                            return next;
                          })
                        }
                        placeholder={`Phase ${pi + 1} name`}
                        className="max-w-md flex-1"
                      />
                      <div className="ml-auto flex shrink-0 gap-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-9 w-9"
                          disabled={pi === 0}
                          onClick={() => movePhase(pi, -1)}
                          aria-label="Move phase up"
                        >
                          <ChevronUp className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-9 w-9"
                          disabled={pi === phaseDrafts.length - 1}
                          onClick={() => movePhase(pi, 1)}
                          aria-label="Move phase down"
                        >
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-9 w-9 text-destructive"
                          onClick={() =>
                            setPhaseDrafts((rows) => {
                              const next = rows.filter((_, idx) => idx !== pi);
                              return next.length > 0 ? next : [{ phaseName: "", milestones: [""] }];
                            })
                          }
                          aria-label="Remove phase"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="ml-0 space-y-2 border-l-2 border-muted pl-4 sm:ml-2">
                      <p className="text-xs font-medium text-muted-foreground">Milestones for this phase</p>
                      <ul className="space-y-2">
                        {phase.milestones.map((milestoneName, mi) => (
                          <li key={mi} className="flex items-center gap-2">
                            <Input
                              value={milestoneName}
                              onChange={(e) =>
                                setPhaseDrafts((rows) => {
                                  const next = [...rows];
                                  const ms = [...next[pi].milestones];
                                  ms[mi] = e.target.value;
                                  next[pi] = { ...next[pi], milestones: ms };
                                  return next;
                                })
                              }
                              placeholder={`Milestone ${mi + 1}`}
                              className="flex-1 text-sm"
                            />
                            <div className="flex shrink-0 gap-1">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                disabled={mi === 0}
                                onClick={() => moveMilestone(pi, mi, -1)}
                                aria-label="Move milestone up"
                              >
                                <ChevronUp className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                disabled={mi === phase.milestones.length - 1}
                                onClick={() => moveMilestone(pi, mi, 1)}
                                aria-label="Move milestone down"
                              >
                                <ChevronDown className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive"
                                onClick={() =>
                                  setPhaseDrafts((rows) => {
                                    const next = [...rows];
                                    const ms = next[pi].milestones.filter((_, idx) => idx !== mi);
                                    next[pi] = {
                                      ...next[pi],
                                      milestones: ms.length > 0 ? ms : [""],
                                    };
                                    return next;
                                  })
                                }
                                aria-label="Remove milestone"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </li>
                        ))}
                      </ul>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="mt-1"
                        onClick={() =>
                          setPhaseDrafts((rows) => {
                            const next = [...rows];
                            next[pi] = {
                              ...next[pi],
                              milestones: [...next[pi].milestones, ""],
                            };
                            return next;
                          })
                        }
                      >
                        <Plus className="mr-1.5 h-3.5 w-3.5" />
                        Add milestone
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>

              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() =>
                  setPhaseDrafts((rows) => [...rows, { phaseName: "", milestones: [""] }])
                }
              >
                <Plus className="mr-1.5 h-4 w-4" />
                Add phase
              </Button>

              <div className="flex flex-wrap gap-2 border-t pt-4">
                <Button
                  type="button"
                  disabled={savePhasesMutation.isPending || !phasesDirty}
                  onClick={() => savePhasesMutation.mutate()}
                >
                  {savePhasesMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving…
                    </>
                  ) : (
                    "Save for this type"
                  )}
                </Button>
                {savePhasesMutation.isError && (
                  <p className="text-sm text-destructive">Could not save. Try again.</p>
                )}
                {savePhasesMutation.isSuccess && !phasesDirty && (
                  <p className="text-sm text-muted-foreground">Saved.</p>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>
      )}

      {settingsTab === "tasks" && (
        <Card>
          <CardHeader>
            <CardTitle>Default tasks</CardTitle>
            <CardDescription>
              These tasks are created automatically when someone creates a new project with this type. Order is
              preserved.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {tasksLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                <ul className="space-y-4">
                  {taskDrafts.map((task, ti) => (
                    <li
                      key={ti}
                      className="rounded-lg border border-border bg-card/50 p-4 shadow-sm"
                    >
                      <div className="mb-3 flex flex-wrap items-start gap-2">
                        <span className="mt-2 text-xs font-semibold uppercase text-muted-foreground">Task</span>
                        <div className="min-w-0 flex-1 space-y-3">
                          <Input
                            value={task.title}
                            onChange={(e) =>
                              setTaskDrafts((rows) => {
                                const next = [...rows];
                                next[ti] = { ...next[ti], title: e.target.value };
                                return next;
                              })
                            }
                            placeholder="Task title"
                            className="max-w-xl"
                          />
                          <textarea
                            value={task.description}
                            onChange={(e) =>
                              setTaskDrafts((rows) => {
                                const next = [...rows];
                                next[ti] = { ...next[ti], description: e.target.value };
                                return next;
                              })
                            }
                            placeholder="Description (optional)"
                            rows={2}
                            className="w-full max-w-xl resize-y rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          />
                          <div className="flex flex-wrap gap-3">
                            <div className="space-y-1">
                              <label className="text-xs font-medium text-muted-foreground" htmlFor={`task-p-${ti}`}>
                                Priority
                              </label>
                              <select
                                id={`task-p-${ti}`}
                                className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                                value={task.priority}
                                onChange={(e) =>
                                  setTaskDrafts((rows) => {
                                    const next = [...rows];
                                    next[ti] = { ...next[ti], priority: e.target.value };
                                    return next;
                                  })
                                }
                              >
                                {TASK_PRIORITIES.map((p) => (
                                  <option key={p} value={p}>
                                    {p}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div className="space-y-1">
                              <label className="text-xs font-medium text-muted-foreground" htmlFor={`task-s-${ti}`}>
                                Status
                              </label>
                              <select
                                id={`task-s-${ti}`}
                                className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                                value={task.status}
                                onChange={(e) =>
                                  setTaskDrafts((rows) => {
                                    const next = [...rows];
                                    next[ti] = { ...next[ti], status: e.target.value };
                                    return next;
                                  })
                                }
                              >
                                {TASK_STATUSES.map((s) => (
                                  <option key={s} value={s}>
                                    {s.replaceAll("_", " ")}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                        </div>
                        <div className="ml-auto flex shrink-0 gap-1">
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-9 w-9"
                            disabled={ti === 0}
                            onClick={() => moveTask(ti, -1)}
                            aria-label="Move task up"
                          >
                            <ChevronUp className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-9 w-9"
                            disabled={ti === taskDrafts.length - 1}
                            onClick={() => moveTask(ti, 1)}
                            aria-label="Move task down"
                          >
                            <ChevronDown className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-9 w-9 text-destructive"
                            onClick={() =>
                              setTaskDrafts((rows) => {
                                const next = rows.filter((_, idx) => idx !== ti);
                                return next.length > 0
                                  ? next
                                  : [{ title: "", description: "", priority: "medium", status: "todo" }];
                              })
                            }
                            aria-label="Remove task"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>

                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    setTaskDrafts((rows) => [
                      ...rows,
                      { title: "", description: "", priority: "medium", status: "todo" },
                    ])
                  }
                >
                  <Plus className="mr-1.5 h-4 w-4" />
                  Add task
                </Button>

                <div className="flex flex-wrap gap-2 border-t pt-4">
                  <Button
                    type="button"
                    disabled={saveTasksMutation.isPending || !tasksDirty}
                    onClick={() => saveTasksMutation.mutate()}
                  >
                    {saveTasksMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving…
                      </>
                    ) : (
                      "Save for this type"
                    )}
                  </Button>
                  {saveTasksMutation.isError && (
                    <p className="text-sm text-destructive">Could not save. Try again.</p>
                  )}
                  {saveTasksMutation.isSuccess && !tasksDirty && (
                    <p className="text-sm text-muted-foreground">Saved.</p>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
