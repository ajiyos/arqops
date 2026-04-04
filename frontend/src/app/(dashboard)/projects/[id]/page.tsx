"use client";

import { Fragment, useCallback, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Download,
  Edit,
  Loader2,
  MessageSquare,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import apiClient from "@/lib/api/client";
import { useTenantProjectTypesQuery } from "@/lib/hooks/use-tenant-project-types";
import { downloadAuthenticatedBlob, uploadFileToGoogleDrive } from "@/lib/google-drive-upload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import type {
  ApiResponse,
  Client,
  Project,
  ProjectBudget,
  ProjectBudgetLine,
  ProjectDocument,
  ResourceAssignment,
  Task,
  TaskComment,
} from "@/types";

// ---------------------------------------------------------------------------
// Constants & helpers
// ---------------------------------------------------------------------------

type TabKey = "phases" | "tasks" | "budget" | "documents" | "team";

const PROJECT_STATUSES = ["active", "completed", "on_hold", "cancelled"] as const;
const TASK_PRIORITIES = ["low", "medium", "high", "urgent"] as const;
const TASK_STATUSES = ["todo", "in_progress", "review", "done"] as const;

const NEXT_TASK_STATUS: Record<string, string> = {
  todo: "in_progress",
  in_progress: "review",
  review: "done",
  done: "todo",
};

function projectStatusClass(s: string) {
  switch (s) {
    case "active":
      return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400";
    case "completed":
      return "bg-blue-500/15 text-blue-700 dark:text-blue-400";
    case "on_hold":
      return "bg-amber-500/15 text-amber-800 dark:text-amber-400";
    default:
      return "bg-muted text-muted-foreground";
  }
}

function priorityClass(p: string) {
  switch (p) {
    case "low":
      return "bg-muted text-muted-foreground";
    case "medium":
      return "bg-blue-500/15 text-blue-700 dark:text-blue-400";
    case "high":
      return "bg-amber-500/15 text-amber-800 dark:text-amber-400";
    case "urgent":
      return "bg-red-500/15 text-red-700 dark:text-red-400";
    default:
      return "bg-muted text-muted-foreground";
  }
}

function taskStatusClass(s: string) {
  switch (s) {
    case "todo":
      return "bg-muted text-muted-foreground";
    case "in_progress":
      return "bg-blue-500/15 text-blue-700 dark:text-blue-400";
    case "review":
      return "bg-amber-500/15 text-amber-800 dark:text-amber-400";
    case "done":
      return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400";
    default:
      return "bg-muted text-muted-foreground";
  }
}

function milestoneStatusClass(s: string) {
  switch (s) {
    case "pending":
      return "bg-amber-500/15 text-amber-800 dark:text-amber-400";
    case "in_progress":
      return "bg-blue-500/15 text-blue-700 dark:text-blue-400";
    case "completed":
      return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400";
    default:
      return "bg-muted text-muted-foreground";
  }
}

function titleCase(s: string) {
  return s.replaceAll("_", " ").replaceAll(/\b\w/g, (c) => c.toUpperCase());
}

function milestoneIconColor(s: string) {
  if (s === "completed") return "text-emerald-500";
  if (s === "in_progress") return "text-blue-500";
  return "text-muted-foreground";
}

function Badge({ className, children }: Readonly<{ className: string; children: React.ReactNode }>) {
  return (
    <span className={cn("inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize", className)}>
      {children}
    </span>
  );
}

const EMPTY_TASK_FORM = {
  title: "",
  description: "",
  priority: "medium" as string,
  status: "todo" as string,
  dueDate: "",
  milestoneId: "",
};

const EMPTY_PROJECT_FORM = {
  name: "",
  clientId: "",
  type: "",
  location: "",
  siteAddress: "",
  startDate: "",
  targetEndDate: "",
  value: "",
  status: "active" as string,
};

const MILESTONE_STATUSES = ["pending", "in_progress", "completed"] as const;

const EMPTY_PHASE_FORM = {
  name: "",
  displayOrder: "",
  startDate: "",
  endDate: "",
};

const EMPTY_MILESTONE_FORM = {
  name: "",
  targetDate: "",
  actualDate: "",
  status: "pending" as string,
  deliverables: "",
};

const EMPTY_DOCUMENT_FORM = {
  fileName: "",
  folderPath: "",
};

const EMPTY_RESOURCE_FORM = {
  userId: "",
  role: "",
  startDate: "",
  endDate: "",
};

const EMPTY_BUDGET_LINE_FORM = {
  category: "",
  budgetedAmount: "",
  actualAmount: "",
};

// ---------------------------------------------------------------------------
// Modal shell
// ---------------------------------------------------------------------------

function Modal({
  open,
  onClose,
  children,
}: Readonly<{
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}>) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/50"
        aria-label="Close dialog"
        onClick={onClose}
      />
      <Card className="relative z-10 w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-lg">
        {children}
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const queryClient = useQueryClient();

  const [tab, setTab] = useState<TabKey>("phases");

  // Task modal
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [taskForm, setTaskForm] = useState(EMPTY_TASK_FORM);

  // Edit project modal
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState(EMPTY_PROJECT_FORM);

  // Delete confirmation
  const [deleteOpen, setDeleteOpen] = useState(false);

  // Delete task confirmation
  const [deleteTaskId, setDeleteTaskId] = useState<string | null>(null);

  // Phase modal
  const [phaseModalOpen, setPhaseModalOpen] = useState(false);
  const [editingPhaseId, setEditingPhaseId] = useState<string | null>(null);
  const [phaseForm, setPhaseForm] = useState(EMPTY_PHASE_FORM);

  // Milestone modal
  const [milestoneModalOpen, setMilestoneModalOpen] = useState(false);
  const [editingMilestoneId, setEditingMilestoneId] = useState<string | null>(null);
  const [milestonePhaseId, setMilestonePhaseId] = useState<string | null>(null);
  const [milestoneForm, setMilestoneForm] = useState(EMPTY_MILESTONE_FORM);

  // Delete phase / milestone confirmations
  const [deletePhaseId, setDeletePhaseId] = useState<string | null>(null);
  const [deleteMilestoneId, setDeleteMilestoneId] = useState<string | null>(null);

  // Documents
  const [documentModalOpen, setDocumentModalOpen] = useState(false);
  const [documentForm, setDocumentForm] = useState(EMPTY_DOCUMENT_FORM);
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [deleteDocumentId, setDeleteDocumentId] = useState<string | null>(null);

  // Team / resources
  const [resourceModalOpen, setResourceModalOpen] = useState(false);
  const [editingResourceId, setEditingResourceId] = useState<string | null>(null);
  const [resourceForm, setResourceForm] = useState(EMPTY_RESOURCE_FORM);
  const [deleteResourceId, setDeleteResourceId] = useState<string | null>(null);

  // Budget lines CRUD
  const [budgetLineModalOpen, setBudgetLineModalOpen] = useState(false);
  const [editingBudgetLineId, setEditingBudgetLineId] = useState<string | null>(null);
  const [budgetLineForm, setBudgetLineForm] = useState(EMPTY_BUDGET_LINE_FORM);
  const [deleteBudgetLineId, setDeleteBudgetLineId] = useState<string | null>(null);

  // Task comments: which task rows show the comments panel
  const [taskCommentsOpen, setTaskCommentsOpen] = useState<Record<string, boolean>>({});

  // ---------------------------------------------------------------------------
  // Queries
  // ---------------------------------------------------------------------------

  const {
    data: project,
    isLoading: projectLoading,
    isError: projectError,
  } = useQuery({
    queryKey: ["project", id],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiResponse<Project>>(
        `/api/v1/project/projects/${id}`,
      );
      return data.data;
    },
    enabled: Boolean(id),
  });

  const { data: clientName } = useQuery({
    queryKey: ["client", project?.clientId],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiResponse<Client>>(
        `/api/v1/crm/clients/${project!.clientId}`,
      );
      return data.data?.name;
    },
    enabled: Boolean(project?.clientId),
  });

  const { data: clientsData } = useQuery({
    queryKey: ["clients", "lookup"],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiResponse<Client[]>>(
        "/api/v1/crm/clients",
        { params: { page: 0, size: 500 } },
      );
      return data.data ?? [];
    },
    enabled: editOpen,
  });

  const { data: tenantProjectTypes } = useTenantProjectTypesQuery();
  const typeSelectOptions = useMemo(() => {
    const base = tenantProjectTypes ?? [];
    const v = editForm.type.trim();
    if (v && !base.some((t) => t.name === v)) {
      return [{ id: "__legacy__", name: v, displayOrder: -1 }, ...base];
    }
    return base;
  }, [tenantProjectTypes, editForm.type]);

  const {
    data: tasksData,
    isLoading: tasksLoading,
    isError: tasksError,
  } = useQuery({
    queryKey: ["project-tasks", id],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiResponse<Task[]>>(
        `/api/v1/project/projects/${id}/tasks`,
        { params: { page: 0, size: 100 } },
      );
      return { list: data.data ?? [], meta: data.meta };
    },
    enabled: Boolean(id) && tab === "tasks",
  });

  const {
    data: budget,
    isLoading: budgetLoading,
  } = useQuery({
    queryKey: ["project-budget", id],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiResponse<ProjectBudget>>(
        `/api/v1/project/projects/${id}/budget`,
      );
      return data.data;
    },
    enabled: Boolean(id) && tab === "budget",
  });

  const {
    data: budgetLinesData,
    isLoading: budgetLinesLoading,
    isError: budgetLinesError,
  } = useQuery({
    queryKey: ["project-budget-lines", id],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiResponse<ProjectBudgetLine[]>>(
        `/api/v1/project/projects/${id}/budget-lines`,
      );
      return data.data ?? [];
    },
    enabled: Boolean(id) && tab === "budget",
  });

  const {
    data: documentsData,
    isLoading: documentsLoading,
    isError: documentsError,
  } = useQuery({
    queryKey: ["project-documents", id],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiResponse<ProjectDocument[]>>(
        `/api/v1/project/projects/${id}/documents`,
      );
      return data.data ?? [];
    },
    enabled: Boolean(id) && tab === "documents",
  });

  const {
    data: resourcesData,
    isLoading: resourcesLoading,
    isError: resourcesError,
  } = useQuery({
    queryKey: ["project-resources", id],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiResponse<ResourceAssignment[]>>(
        `/api/v1/project/projects/${id}/resources`,
      );
      return data.data ?? [];
    },
    enabled: Boolean(id) && tab === "team",
  });

  // ---------------------------------------------------------------------------
  // Mutations
  // ---------------------------------------------------------------------------

  const updateProject = useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      const { data } = await apiClient.put<ApiResponse<Project>>(
        `/api/v1/project/projects/${id}`,
        body,
      );
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project", id] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      setEditOpen(false);
    },
  });

  const deleteProject = useMutation({
    mutationFn: async () => {
      await apiClient.delete(`/api/v1/project/projects/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      router.push("/projects");
    },
  });

  const createTask = useMutation({
    mutationFn: async () => {
      const { data } = await apiClient.post<ApiResponse<Task>>(
        `/api/v1/project/projects/${id}/tasks`,
        {
          title: taskForm.title.trim(),
          description: taskForm.description.trim() || undefined,
          priority: taskForm.priority,
          status: taskForm.status,
          dueDate: taskForm.dueDate || undefined,
          milestoneId: taskForm.milestoneId || undefined,
        },
      );
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-tasks", id] });
      closeTaskModal();
    },
  });

  const updateTask = useMutation({
    mutationFn: async ({ taskId, body }: { taskId: string; body: Record<string, unknown> }) => {
      const { data } = await apiClient.put<ApiResponse<Task>>(
        `/api/v1/project/tasks/${taskId}`,
        body,
      );
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-tasks", id] });
      closeTaskModal();
    },
  });

  const deleteTask = useMutation({
    mutationFn: async (taskId: string) => {
      await apiClient.delete(`/api/v1/project/tasks/${taskId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-tasks", id] });
      setDeleteTaskId(null);
    },
  });

  const createPhaseMut = useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      await apiClient.post(`/api/v1/project/projects/${id}/phases`, body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project", id] });
      closePhaseModal();
    },
  });

  const updatePhaseMut = useMutation({
    mutationFn: async ({ phaseId, body }: { phaseId: string; body: Record<string, unknown> }) => {
      await apiClient.put(`/api/v1/project/phases/${phaseId}`, body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project", id] });
      closePhaseModal();
    },
  });

  const deletePhaseMut = useMutation({
    mutationFn: async (phaseId: string) => {
      await apiClient.delete(`/api/v1/project/phases/${phaseId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project", id] });
      setDeletePhaseId(null);
    },
  });

  const createMilestoneMut = useMutation({
    mutationFn: async ({ phaseId, body }: { phaseId: string; body: Record<string, unknown> }) => {
      await apiClient.post(`/api/v1/project/phases/${phaseId}/milestones`, body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project", id] });
      closeMilestoneModal();
    },
  });

  const updateMilestoneMut = useMutation({
    mutationFn: async ({ milestoneId, body }: { milestoneId: string; body: Record<string, unknown> }) => {
      await apiClient.put(`/api/v1/project/milestones/${milestoneId}`, body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project", id] });
      closeMilestoneModal();
    },
  });

  const deleteMilestoneMut = useMutation({
    mutationFn: async (milestoneId: string) => {
      await apiClient.delete(`/api/v1/project/milestones/${milestoneId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project", id] });
      setDeleteMilestoneId(null);
    },
  });

  const createDocumentMut = useMutation({
    mutationFn: async () => {
      if (!documentFile) {
        throw new Error("Choose a file to upload");
      }
      const sub = documentForm.folderPath.trim().replace(/^\/+/, "");
      const driveFolder = sub ? `projects/${id}/${sub}` : `projects/${id}`;
      const storageKey = await uploadFileToGoogleDrive(documentFile, driveFolder);
      const fileName = documentForm.fileName.trim() || documentFile.name;
      const { data } = await apiClient.post<ApiResponse<ProjectDocument>>(
        `/api/v1/project/projects/${id}/documents`,
        {
          fileName,
          folderPath: documentForm.folderPath.trim() || undefined,
          storageKey,
        },
      );
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-documents", id] });
      setDocumentModalOpen(false);
      setDocumentForm(EMPTY_DOCUMENT_FORM);
      setDocumentFile(null);
    },
  });

  const deleteDocumentMut = useMutation({
    mutationFn: async (docId: string) => {
      await apiClient.delete(`/api/v1/project/projects/${id}/documents/${docId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-documents", id] });
      setDeleteDocumentId(null);
    },
  });

  const downloadDocumentMut = useMutation({
    mutationFn: async (docId: string) => {
      return downloadAuthenticatedBlob(`/api/v1/project/projects/${id}/documents/${docId}/download`);
    },
    onSuccess: (blob) => {
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank", "noopener,noreferrer");
      window.setTimeout(() => URL.revokeObjectURL(url), 120_000);
    },
  });

  const createResourceMut = useMutation({
    mutationFn: async () => {
      const { data } = await apiClient.post<ApiResponse<ResourceAssignment>>(
        `/api/v1/project/projects/${id}/resources`,
        {
          userId: resourceForm.userId.trim(),
          role: resourceForm.role.trim() || undefined,
          startDate: resourceForm.startDate || undefined,
          endDate: resourceForm.endDate || undefined,
        },
      );
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-resources", id] });
      setResourceModalOpen(false);
      setEditingResourceId(null);
      setResourceForm(EMPTY_RESOURCE_FORM);
    },
  });

  const updateResourceMut = useMutation({
    mutationFn: async ({ resId }: { resId: string }) => {
      const { data } = await apiClient.put<ApiResponse<ResourceAssignment>>(
        `/api/v1/project/projects/${id}/resources/${resId}`,
        {
          userId: resourceForm.userId.trim(),
          role: resourceForm.role.trim() || undefined,
          startDate: resourceForm.startDate || undefined,
          endDate: resourceForm.endDate || undefined,
        },
      );
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-resources", id] });
      setResourceModalOpen(false);
      setEditingResourceId(null);
      setResourceForm(EMPTY_RESOURCE_FORM);
    },
  });

  const deleteResourceMut = useMutation({
    mutationFn: async (resId: string) => {
      await apiClient.delete(`/api/v1/project/projects/${id}/resources/${resId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-resources", id] });
      setDeleteResourceId(null);
    },
  });

  const createBudgetLineMut = useMutation({
    mutationFn: async () => {
      const budgeted = Number(budgetLineForm.budgetedAmount);
      const actual = Number(budgetLineForm.actualAmount);
      const { data } = await apiClient.post<ApiResponse<ProjectBudgetLine>>(
        `/api/v1/project/projects/${id}/budget-lines`,
        {
          category: budgetLineForm.category.trim(),
          budgetedAmount: Number.isFinite(budgeted) ? budgeted : 0,
          actualAmount: Number.isFinite(actual) ? actual : 0,
        },
      );
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-budget-lines", id] });
      queryClient.invalidateQueries({ queryKey: ["project-budget", id] });
      setBudgetLineModalOpen(false);
      setEditingBudgetLineId(null);
      setBudgetLineForm(EMPTY_BUDGET_LINE_FORM);
    },
  });

  const updateBudgetLineMut = useMutation({
    mutationFn: async ({ lineId }: { lineId: string }) => {
      const budgeted = Number(budgetLineForm.budgetedAmount);
      const actual = Number(budgetLineForm.actualAmount);
      const { data } = await apiClient.put<ApiResponse<ProjectBudgetLine>>(
        `/api/v1/project/projects/${id}/budget-lines/${lineId}`,
        {
          category: budgetLineForm.category.trim(),
          budgetedAmount: Number.isFinite(budgeted) ? budgeted : 0,
          actualAmount: Number.isFinite(actual) ? actual : 0,
        },
      );
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-budget-lines", id] });
      queryClient.invalidateQueries({ queryKey: ["project-budget", id] });
      setBudgetLineModalOpen(false);
      setEditingBudgetLineId(null);
      setBudgetLineForm(EMPTY_BUDGET_LINE_FORM);
    },
  });

  const deleteBudgetLineMut = useMutation({
    mutationFn: async (lineId: string) => {
      await apiClient.delete(`/api/v1/project/projects/${id}/budget-lines/${lineId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-budget-lines", id] });
      queryClient.invalidateQueries({ queryKey: ["project-budget", id] });
      setDeleteBudgetLineId(null);
    },
  });

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  const closeTaskModal = useCallback(() => {
    setTaskModalOpen(false);
    setEditingTaskId(null);
    setTaskForm(EMPTY_TASK_FORM);
  }, []);

  const openCreateTask = useCallback(() => {
    setEditingTaskId(null);
    setTaskForm(EMPTY_TASK_FORM);
    setTaskModalOpen(true);
  }, []);

  const openEditTask = useCallback((t: Task) => {
    setEditingTaskId(t.id);
    setTaskForm({
      title: t.title,
      description: t.description ?? "",
      priority: t.priority,
      status: t.status,
      dueDate: t.dueDate ?? "",
      milestoneId: t.milestoneId ?? "",
    });
    setTaskModalOpen(true);
  }, []);

  const openEditProject = useCallback(() => {
    if (!project) return;
    setEditForm({
      name: project.name,
      clientId: project.clientId ?? "",
      type: project.type ?? "",
      location: project.location ?? "",
      siteAddress: project.siteAddress ?? "",
      startDate: project.startDate ?? "",
      targetEndDate: project.targetEndDate ?? "",
      value: project.value != null ? String(project.value) : "",
      status: project.status,
    });
    setEditOpen(true);
  }, [project]);

  const handleSaveProject = useCallback(() => {
    const valueNum = editForm.value.trim() === "" ? undefined : Number(editForm.value);
    updateProject.mutate({
      name: editForm.name.trim(),
      clientId: editForm.clientId || undefined,
      type: editForm.type.trim() || undefined,
      location: editForm.location.trim() || undefined,
      siteAddress: editForm.siteAddress.trim() || undefined,
      startDate: editForm.startDate || undefined,
      targetEndDate: editForm.targetEndDate || undefined,
      value: typeof valueNum === "number" && Number.isFinite(valueNum) ? valueNum : undefined,
      status: editForm.status,
    });
  }, [editForm, updateProject]);

  const handleSaveTask = useCallback(() => {
    if (editingTaskId) {
      updateTask.mutate({
        taskId: editingTaskId,
        body: {
          title: taskForm.title.trim(),
          description: taskForm.description.trim() || undefined,
          priority: taskForm.priority,
          status: taskForm.status,
          dueDate: taskForm.dueDate || undefined,
          milestoneId: taskForm.milestoneId || undefined,
        },
      });
    } else {
      createTask.mutate();
    }
  }, [editingTaskId, taskForm, updateTask, createTask]);

  const cycleTaskStatus = useCallback(
    (t: Task) => {
      const next = NEXT_TASK_STATUS[t.status] ?? "todo";
      updateTask.mutate({ taskId: t.id, body: { status: next } });
    },
    [updateTask],
  );

  // Phase handlers
  const closePhaseModal = useCallback(() => {
    setPhaseModalOpen(false);
    setEditingPhaseId(null);
    setPhaseForm(EMPTY_PHASE_FORM);
  }, []);

  const openCreatePhase = useCallback(() => {
    setEditingPhaseId(null);
    setPhaseForm(EMPTY_PHASE_FORM);
    setPhaseModalOpen(true);
  }, []);

  const openEditPhase = useCallback(
    (phase: { id: string; name: string; displayOrder: number; startDate?: string | null; endDate?: string | null }) => {
      setEditingPhaseId(phase.id);
      setPhaseForm({
        name: phase.name,
        displayOrder: String(phase.displayOrder),
        startDate: phase.startDate ?? "",
        endDate: phase.endDate ?? "",
      });
      setPhaseModalOpen(true);
    },
    [],
  );

  const handleSavePhase = useCallback(() => {
    const body: Record<string, unknown> = {
      name: phaseForm.name.trim(),
      displayOrder: phaseForm.displayOrder ? Number(phaseForm.displayOrder) : 0,
      startDate: phaseForm.startDate || undefined,
      endDate: phaseForm.endDate || undefined,
    };
    if (editingPhaseId) {
      updatePhaseMut.mutate({ phaseId: editingPhaseId, body });
    } else {
      createPhaseMut.mutate(body);
    }
  }, [phaseForm, editingPhaseId, updatePhaseMut, createPhaseMut]);

  // Milestone handlers
  const closeMilestoneModal = useCallback(() => {
    setMilestoneModalOpen(false);
    setEditingMilestoneId(null);
    setMilestonePhaseId(null);
    setMilestoneForm(EMPTY_MILESTONE_FORM);
  }, []);

  const openCreateMilestone = useCallback((phaseId: string) => {
    setEditingMilestoneId(null);
    setMilestonePhaseId(phaseId);
    setMilestoneForm(EMPTY_MILESTONE_FORM);
    setMilestoneModalOpen(true);
  }, []);

  const openEditMilestone = useCallback(
    (ms: { id: string; name: string; targetDate?: string | null; actualDate?: string | null; status: string; deliverables?: string | null }) => {
      setEditingMilestoneId(ms.id);
      setMilestonePhaseId(null);
      setMilestoneForm({
        name: ms.name,
        targetDate: ms.targetDate ?? "",
        actualDate: ms.actualDate ?? "",
        status: ms.status,
        deliverables: ms.deliverables ?? "",
      });
      setMilestoneModalOpen(true);
    },
    [],
  );

  const handleSaveMilestone = useCallback(() => {
    const body: Record<string, unknown> = {
      name: milestoneForm.name.trim(),
      targetDate: milestoneForm.targetDate || undefined,
      actualDate: milestoneForm.actualDate || undefined,
      status: milestoneForm.status,
      deliverables: milestoneForm.deliverables.trim() || undefined,
    };
    if (editingMilestoneId) {
      updateMilestoneMut.mutate({ milestoneId: editingMilestoneId, body });
    } else if (milestonePhaseId) {
      createMilestoneMut.mutate({ phaseId: milestonePhaseId, body });
    }
  }, [milestoneForm, editingMilestoneId, milestonePhaseId, updateMilestoneMut, createMilestoneMut]);

  const closeResourceModal = useCallback(() => {
    setResourceModalOpen(false);
    setEditingResourceId(null);
    setResourceForm(EMPTY_RESOURCE_FORM);
  }, []);

  const openCreateResource = useCallback(() => {
    setEditingResourceId(null);
    setResourceForm(EMPTY_RESOURCE_FORM);
    setResourceModalOpen(true);
  }, []);

  const openEditResource = useCallback((r: ResourceAssignment) => {
    setEditingResourceId(r.id);
    setResourceForm({
      userId: r.userId,
      role: r.role ?? "",
      startDate: r.startDate ?? "",
      endDate: r.endDate ?? "",
    });
    setResourceModalOpen(true);
  }, []);

  const handleSaveResource = useCallback(() => {
    if (editingResourceId) {
      updateResourceMut.mutate({ resId: editingResourceId });
    } else {
      createResourceMut.mutate();
    }
  }, [editingResourceId, updateResourceMut, createResourceMut]);

  const closeBudgetLineModal = useCallback(() => {
    setBudgetLineModalOpen(false);
    setEditingBudgetLineId(null);
    setBudgetLineForm(EMPTY_BUDGET_LINE_FORM);
  }, []);

  const openCreateBudgetLine = useCallback(() => {
    setEditingBudgetLineId(null);
    setBudgetLineForm(EMPTY_BUDGET_LINE_FORM);
    setBudgetLineModalOpen(true);
  }, []);

  const openEditBudgetLine = useCallback((line: ProjectBudgetLine) => {
    setEditingBudgetLineId(line.id);
    setBudgetLineForm({
      category: line.category,
      budgetedAmount: String(line.budgetedAmount),
      actualAmount: String(line.actualAmount),
    });
    setBudgetLineModalOpen(true);
  }, []);

  const handleSaveBudgetLine = useCallback(() => {
    if (editingBudgetLineId) {
      updateBudgetLineMut.mutate({ lineId: editingBudgetLineId });
    } else {
      createBudgetLineMut.mutate();
    }
  }, [editingBudgetLineId, updateBudgetLineMut, createBudgetLineMut]);

  const toggleTaskComments = useCallback((taskId: string) => {
    setTaskCommentsOpen((prev) => ({ ...prev, [taskId]: !prev[taskId] }));
  }, []);

  // ---------------------------------------------------------------------------
  // Derived
  // ---------------------------------------------------------------------------

  const tasks = useMemo(() => tasksData?.list ?? [], [tasksData]);
  const phases = useMemo(
    () => [...(project?.phases ?? [])].sort((a, b) => a.displayOrder - b.displayOrder),
    [project?.phases],
  );
  const budgetVariance = useMemo(() => {
    if (!budget) return 0;
    return Number(budget.totalBudgeted) - Number(budget.totalActual);
  }, [budget]);

  const taskSaving = createTask.isPending || updateTask.isPending;
  const taskSaveLabel = editingTaskId ? "Save Changes" : "Add Task";

  const phaseSaving = createPhaseMut.isPending || updatePhaseMut.isPending;
  const phaseSaveLabel = editingPhaseId ? "Save Changes" : "Add Phase";
  const milestoneSaving = createMilestoneMut.isPending || updateMilestoneMut.isPending;
  const milestoneSaveLabel = editingMilestoneId ? "Save Changes" : "Add Milestone";

  const budgetLines = useMemo(() => budgetLinesData ?? [], [budgetLinesData]);
  const documents = useMemo(() => documentsData ?? [], [documentsData]);
  const resources = useMemo(() => resourcesData ?? [], [resourcesData]);

  const resourceSaving = createResourceMut.isPending || updateResourceMut.isPending;
  const resourceSaveLabel = editingResourceId ? "Save Changes" : "Add Team Member";
  const budgetLineSaving = createBudgetLineMut.isPending || updateBudgetLineMut.isPending;
  const budgetLineSaveLabel = editingBudgetLineId ? "Save Changes" : "Add Budget Line";

  // ---------------------------------------------------------------------------
  // Guards
  // ---------------------------------------------------------------------------

  if (!id) return <p className="text-muted-foreground">Invalid project.</p>;
  if (projectLoading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading project…
      </div>
    );
  }
  if (projectError || !project) {
    return <p className="text-destructive">Project not found or failed to load.</p>;
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="space-y-6">
      {/* ---- Header ---- */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="mt-1 shrink-0"
            onClick={() => router.push("/projects")}
            aria-label="Back to projects"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold">{project.name}</h1>
              <Badge className={projectStatusClass(project.status)}>
                {project.status.replaceAll("_", " ")}
              </Badge>
            </div>
            {(project.type || project.location) && (
              <p className="mt-1 text-sm text-muted-foreground">
                {[project.type, project.location].filter(Boolean).join(" · ")}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={openEditProject}>
            <Edit className="mr-1.5 h-4 w-4" /> Edit
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-destructive hover:bg-destructive/10"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className="mr-1.5 h-4 w-4" /> Delete
          </Button>
        </div>
      </div>

      {/* ---- Overview ---- */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Overview</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <OverviewItem label="Client" value={project.clientId ? clientName ?? "…" : "—"} />
          <OverviewItem label="Type" value={project.type ?? "—"} />
          <OverviewItem label="Location" value={project.location ?? "—"} />
          <OverviewItem label="Site Address" value={project.siteAddress ?? "—"} />
          <OverviewItem
            label="Start Date"
            value={project.startDate ? formatDate(project.startDate) : "—"}
          />
          <OverviewItem
            label="Target End Date"
            value={project.targetEndDate ? formatDate(project.targetEndDate) : "—"}
          />
          <OverviewItem
            label="Value (INR)"
            value={project.value != null ? formatCurrency(Number(project.value)) : "—"}
            mono
          />
          <OverviewItem label="Status">
            <Badge className={projectStatusClass(project.status)}>
              {project.status.replaceAll("_", " ")}
            </Badge>
          </OverviewItem>
        </CardContent>
      </Card>

      {/* ---- Tabs ---- */}
      <div className="border-b">
        <nav className="flex gap-4">
          {(
            [
              { key: "phases" as const, label: "Phases" },
              { key: "tasks" as const, label: "Tasks" },
              { key: "budget" as const, label: "Budget" },
              { key: "documents" as const, label: "Documents" },
              { key: "team" as const, label: "Team" },
            ] as const
          ).map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={cn(
                "border-b-2 px-1 pb-3 text-sm font-medium transition-colors",
                tab === key
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {label}
            </button>
          ))}
        </nav>
      </div>

      {/* ---- Phases tab ---- */}
      {tab === "phases" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Phases</h2>
            <Button size="sm" onClick={openCreatePhase}>
              <Plus className="mr-1.5 h-4 w-4" /> Add Phase
            </Button>
          </div>
          {phases.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No phases defined. Click &quot;Add Phase&quot; to create one.
              </CardContent>
            </Card>
          ) : (
            phases.map((phase) => (
              <Card key={phase.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-base">{phase.name}</CardTitle>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => openEditPhase(phase)}
                        aria-label="Edit phase"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => setDeletePhaseId(phase.id)}
                        aria-label="Delete phase"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    {(phase.startDate || phase.endDate) && (
                      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <CalendarDays className="h-3.5 w-3.5" />
                        {phase.startDate ? formatDate(phase.startDate) : "—"}
                        {" → "}
                        {phase.endDate ? formatDate(phase.endDate) : "—"}
                      </span>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  {phase.milestones.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No milestones.</p>
                  ) : (
                    <div className="divide-y">
                      {phase.milestones.map((ms) => (
                        <div key={ms.id} className="flex flex-wrap items-start gap-x-6 gap-y-1 py-3 first:pt-0 last:pb-0">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <CheckCircle2
                                className={cn(
                                  "h-4 w-4 shrink-0",
                                  milestoneIconColor(ms.status),
                                )}
                              />
                              <span className="text-sm font-medium">{ms.name}</span>
                              <Badge className={milestoneStatusClass(ms.status)}>
                                {ms.status.replaceAll("_", " ")}
                              </Badge>
                            </div>
                            {ms.deliverables && (
                              <p className="mt-1 pl-6 text-xs text-muted-foreground">
                                {ms.deliverables}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            {ms.targetDate && (
                              <span>Target: {formatDate(ms.targetDate)}</span>
                            )}
                            {ms.actualDate && (
                              <span>Actual: {formatDate(ms.actualDate)}</span>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => openEditMilestone(ms)}
                              aria-label="Edit milestone"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:text-destructive"
                              onClick={() => setDeleteMilestoneId(ms.id)}
                              aria-label="Delete milestone"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4"
                    onClick={() => openCreateMilestone(phase.id)}
                  >
                    <Plus className="mr-1.5 h-4 w-4" /> Add Milestone
                  </Button>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* ---- Tasks tab ---- */}
      {tab === "tasks" && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-lg">Tasks</CardTitle>
            <Button size="sm" onClick={openCreateTask}>
              <Plus className="mr-1.5 h-4 w-4" /> Add Task
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50 text-left text-muted-foreground">
                    <th className="px-4 py-3 font-medium">Title</th>
                    <th className="px-4 py-3 font-medium">Priority</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Due Date</th>
                    <th className="px-4 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {tasksLoading && (
                    <tr>
                      <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                        <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                      </td>
                    </tr>
                  )}
                  {tasksError && !tasksLoading && (
                    <tr>
                      <td colSpan={5} className="px-4 py-10 text-center text-destructive">
                        Could not load tasks.
                      </td>
                    </tr>
                  )}
                  {!tasksLoading && !tasksError && tasks.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                        No tasks yet. Click &quot;Add Task&quot; to create one.
                      </td>
                    </tr>
                  )}
                  {!tasksLoading &&
                    !tasksError &&
                    tasks.map((t) => (
                      <Fragment key={t.id}>
                        <tr className="border-b hover:bg-muted/40">
                          <td className="px-4 py-3">
                            <div className="font-medium">{t.title}</div>
                            {t.description && (
                              <div className="mt-0.5 text-xs text-muted-foreground line-clamp-1">
                                {t.description}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <Badge className={priorityClass(t.priority)}>
                              {t.priority}
                            </Badge>
                          </td>
                          <td className="px-4 py-3">
                            <button
                              type="button"
                              onClick={() => cycleTaskStatus(t)}
                              title="Click to cycle status"
                            >
                              <Badge className={cn(taskStatusClass(t.status), "cursor-pointer hover:opacity-80")}>
                                {t.status.replaceAll("_", " ")}
                              </Badge>
                            </button>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {t.dueDate ? formatDate(t.dueDate) : "—"}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className={cn(
                                  "h-8 w-8",
                                  taskCommentsOpen[t.id] && "bg-muted",
                                )}
                                onClick={() => toggleTaskComments(t.id)}
                                aria-expanded={Boolean(taskCommentsOpen[t.id])}
                                aria-label={taskCommentsOpen[t.id] ? "Hide comments" : "Show comments"}
                                title="Comments"
                              >
                                {taskCommentsOpen[t.id] ? (
                                  <ChevronDown className="h-4 w-4" />
                                ) : (
                                  <MessageSquare className="h-4 w-4" />
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => openEditTask(t)}
                                aria-label="Edit task"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={() => setDeleteTaskId(t.id)}
                                aria-label="Delete task"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                        {taskCommentsOpen[t.id] && (
                          <tr className="border-b last:border-0 bg-muted/20">
                            <td colSpan={5} className="px-4 py-3">
                              <TaskCommentsSection taskId={t.id} open={Boolean(taskCommentsOpen[t.id])} />
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ---- Budget tab ---- */}
      {tab === "budget" && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-lg">Budget</CardTitle>
            <Button size="sm" onClick={openCreateBudgetLine}>
              <Plus className="mr-1.5 h-4 w-4" /> Add Budget Line
            </Button>
          </CardHeader>
          <CardContent className="space-y-6">
            {budgetLoading && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading summary…
              </div>
            )}
            {!budgetLoading && !budget && (
              <p className="text-sm text-muted-foreground">
                No aggregate budget summary yet. You can still manage budget lines below.
              </p>
            )}
            {!budgetLoading && budget && (
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-lg border p-4">
                  <p className="text-xs font-medium uppercase text-muted-foreground">
                    Total Budgeted
                  </p>
                  <p className="mt-1 text-xl font-semibold tabular-nums">
                    {formatCurrency(Number(budget.totalBudgeted))}
                  </p>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-xs font-medium uppercase text-muted-foreground">
                    Total Actual
                  </p>
                  <p className="mt-1 text-xl font-semibold tabular-nums">
                    {formatCurrency(Number(budget.totalActual))}
                  </p>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-xs font-medium uppercase text-muted-foreground">
                    Variance
                  </p>
                  <p
                    className={cn(
                      "mt-1 text-xl font-semibold tabular-nums",
                      budgetVariance >= 0
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-red-600 dark:text-red-400",
                    )}
                  >
                    {budgetVariance >= 0 ? "+" : ""}
                    {formatCurrency(budgetVariance)}
                  </p>
                </div>
              </div>
            )}

            <div>
              <h3 className="mb-3 text-sm font-semibold">Budget lines</h3>
              {budgetLinesLoading && (
                <div className="flex items-center gap-2 py-8 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading lines…
                </div>
              )}
              {budgetLinesError && !budgetLinesLoading && (
                <p className="py-6 text-center text-destructive">Could not load budget lines.</p>
              )}
              {!budgetLinesLoading && !budgetLinesError && budgetLines.length === 0 && (
                <p className="text-muted-foreground">No budget lines yet.</p>
              )}
              {!budgetLinesLoading && !budgetLinesError && budgetLines.length > 0 && (
                <div className="overflow-x-auto rounded-md border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50 text-left text-muted-foreground">
                        <th className="px-4 py-3 font-medium">Category</th>
                        <th className="px-4 py-3 font-medium text-right">Budgeted (INR)</th>
                        <th className="px-4 py-3 font-medium text-right">Actual (INR)</th>
                        <th className="px-4 py-3 font-medium text-right">Variance</th>
                        <th className="px-4 py-3 font-medium text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {budgetLines.map((line) => {
                        const v = Number(line.budgetedAmount) - Number(line.actualAmount);
                        return (
                          <tr key={line.id} className="border-b last:border-0">
                            <td className="px-4 py-3">{line.category}</td>
                            <td className="px-4 py-3 text-right tabular-nums">
                              {formatCurrency(Number(line.budgetedAmount))}
                            </td>
                            <td className="px-4 py-3 text-right tabular-nums">
                              {formatCurrency(Number(line.actualAmount))}
                            </td>
                            <td
                              className={cn(
                                "px-4 py-3 text-right tabular-nums",
                                v >= 0
                                  ? "text-emerald-600 dark:text-emerald-400"
                                  : "text-red-600 dark:text-red-400",
                              )}
                            >
                              {v >= 0 ? "+" : ""}
                              {formatCurrency(v)}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => openEditBudgetLine(line)}
                                  aria-label="Edit budget line"
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive hover:text-destructive"
                                  onClick={() => setDeleteBudgetLineId(line.id)}
                                  aria-label="Delete budget line"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ---- Documents tab ---- */}
      {tab === "documents" && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-lg">Documents</CardTitle>
            <Button
              size="sm"
              onClick={() => {
                setDocumentForm(EMPTY_DOCUMENT_FORM);
                setDocumentForm(EMPTY_DOCUMENT_FORM);
                setDocumentFile(null);
                setDocumentModalOpen(true);
              }}
            >
              <Plus className="mr-1.5 h-4 w-4" /> Upload Document
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50 text-left text-muted-foreground">
                    <th className="px-4 py-3 font-medium">File Name</th>
                    <th className="px-4 py-3 font-medium">Folder Path</th>
                    <th className="px-4 py-3 font-medium">Version</th>
                    <th className="px-4 py-3 font-medium">Uploaded At</th>
                    <th className="px-4 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {documentsLoading && (
                    <tr>
                      <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                        <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                      </td>
                    </tr>
                  )}
                  {documentsError && !documentsLoading && (
                    <tr>
                      <td colSpan={5} className="px-4 py-10 text-center text-destructive">
                        Could not load documents.
                      </td>
                    </tr>
                  )}
                  {!documentsLoading && !documentsError && documents.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                        No documents yet.
                      </td>
                    </tr>
                  )}
                  {!documentsLoading &&
                    !documentsError &&
                    documents.map((doc) => (
                      <tr key={doc.id} className="border-b last:border-0 hover:bg-muted/40">
                        <td className="px-4 py-3 font-medium">{doc.fileName}</td>
                        <td className="px-4 py-3 text-muted-foreground">{doc.folderPath ?? "—"}</td>
                        <td className="px-4 py-3 tabular-nums">{doc.version}</td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {formatDate(doc.createdAt)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              disabled={downloadDocumentMut.isPending}
                              onClick={() => downloadDocumentMut.mutate(doc.id)}
                              aria-label="Download"
                              title="Download"
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => setDeleteDocumentId(doc.id)}
                              aria-label="Delete document"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ---- Team / resources tab ---- */}
      {tab === "team" && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-lg">Team &amp; resources</CardTitle>
            <Button size="sm" onClick={openCreateResource}>
              <Plus className="mr-1.5 h-4 w-4" /> Add Team Member
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50 text-left text-muted-foreground">
                    <th className="px-4 py-3 font-medium">User ID</th>
                    <th className="px-4 py-3 font-medium">Role</th>
                    <th className="px-4 py-3 font-medium">Start Date</th>
                    <th className="px-4 py-3 font-medium">End Date</th>
                    <th className="px-4 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {resourcesLoading && (
                    <tr>
                      <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                        <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                      </td>
                    </tr>
                  )}
                  {resourcesError && !resourcesLoading && (
                    <tr>
                      <td colSpan={5} className="px-4 py-10 text-center text-destructive">
                        Could not load team assignments.
                      </td>
                    </tr>
                  )}
                  {!resourcesLoading && !resourcesError && resources.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                        No team members assigned yet.
                      </td>
                    </tr>
                  )}
                  {!resourcesLoading &&
                    !resourcesError &&
                    resources.map((r) => (
                      <tr key={r.id} className="border-b last:border-0 hover:bg-muted/40">
                        <td className="px-4 py-3 font-mono text-xs">{r.userId}</td>
                        <td className="px-4 py-3">{r.role ?? "—"}</td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {r.startDate ? formatDate(r.startDate) : "—"}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {r.endDate ? formatDate(r.endDate) : "—"}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => openEditResource(r)}
                              aria-label="Edit assignment"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => setDeleteResourceId(r.id)}
                              aria-label="Remove team member"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ---- Task modal (create / edit) ---- */}
      <Modal open={taskModalOpen} onClose={() => !taskSaving && closeTaskModal()}>
        <CardHeader>
          <CardTitle className="text-lg">
            {editingTaskId ? "Edit Task" : "New Task"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field label="Title *">
            <Input
              value={taskForm.title}
              onChange={(e) => setTaskForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="Task title"
            />
          </Field>
          <Field label="Description">
            <textarea
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              value={taskForm.description}
              onChange={(e) => setTaskForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Optional details"
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Priority">
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={taskForm.priority}
                onChange={(e) => setTaskForm((f) => ({ ...f, priority: e.target.value }))}
              >
                {TASK_PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Status">
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={taskForm.status}
                onChange={(e) => setTaskForm((f) => ({ ...f, status: e.target.value }))}
              >
                {TASK_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {titleCase(s)}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <Field label="Due Date">
            <Input
              type="date"
              value={taskForm.dueDate}
              onChange={(e) => setTaskForm((f) => ({ ...f, dueDate: e.target.value }))}
            />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={closeTaskModal} disabled={taskSaving}>
              Cancel
            </Button>
            <Button
              disabled={!taskForm.title.trim() || taskSaving}
              onClick={handleSaveTask}
            >
              {taskSaving && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
              {taskSaving ? "Saving…" : taskSaveLabel}
            </Button>
          </div>
        </CardContent>
      </Modal>

      {/* ---- Delete task confirmation ---- */}
      <Modal open={Boolean(deleteTaskId)} onClose={() => !deleteTask.isPending && setDeleteTaskId(null)}>
        <CardHeader>
          <CardTitle className="text-lg">Delete Task</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete this task? This action cannot be undone.
          </p>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setDeleteTaskId(null)}
              disabled={deleteTask.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleteTask.isPending}
              onClick={() => deleteTaskId && deleteTask.mutate(deleteTaskId)}
            >
              {deleteTask.isPending ? (
                <>
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Deleting…
                </>
              ) : (
                "Delete"
              )}
            </Button>
          </div>
        </CardContent>
      </Modal>

      {/* ---- Edit project modal ---- */}
      <Modal open={editOpen} onClose={() => !updateProject.isPending && setEditOpen(false)}>
        <CardHeader>
          <CardTitle className="text-lg">Edit Project</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field label="Name *">
            <Input
              value={editForm.name}
              onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Project name"
            />
          </Field>
          <Field label="Client">
            <select
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={editForm.clientId}
              onChange={(e) => setEditForm((f) => ({ ...f, clientId: e.target.value }))}
            >
              <option value="">— None —</option>
              {(clientsData ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Type">
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={editForm.type}
                onChange={(e) => setEditForm((f) => ({ ...f, type: e.target.value }))}
              >
                <option value="">— Select —</option>
                {typeSelectOptions.map((t) => (
                  <option key={t.id} value={t.name}>
                    {t.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Location">
              <Input
                value={editForm.location}
                onChange={(e) => setEditForm((f) => ({ ...f, location: e.target.value }))}
                placeholder="City or site"
              />
            </Field>
          </div>
          <Field label="Site Address">
            <Input
              value={editForm.siteAddress}
              onChange={(e) => setEditForm((f) => ({ ...f, siteAddress: e.target.value }))}
              placeholder="Full site address"
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Start Date">
              <Input
                type="date"
                value={editForm.startDate}
                onChange={(e) => setEditForm((f) => ({ ...f, startDate: e.target.value }))}
              />
            </Field>
            <Field label="Target End Date">
              <Input
                type="date"
                value={editForm.targetEndDate}
                onChange={(e) => setEditForm((f) => ({ ...f, targetEndDate: e.target.value }))}
              />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Value (INR)">
              <Input
                type="number"
                min={0}
                step="1"
                value={editForm.value}
                onChange={(e) => setEditForm((f) => ({ ...f, value: e.target.value }))}
                placeholder="0"
              />
            </Field>
            <Field label="Status">
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={editForm.status}
                onChange={(e) => setEditForm((f) => ({ ...f, status: e.target.value }))}
              >
                {PROJECT_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {titleCase(s)}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => setEditOpen(false)}
              disabled={updateProject.isPending}
            >
              Cancel
            </Button>
            <Button
              disabled={!editForm.name.trim() || updateProject.isPending}
              onClick={handleSaveProject}
            >
              {updateProject.isPending ? (
                <>
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Saving…
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </div>
        </CardContent>
      </Modal>

      {/* ---- Delete project confirmation ---- */}
      <Modal open={deleteOpen} onClose={() => !deleteProject.isPending && setDeleteOpen(false)}>
        <CardHeader>
          <CardTitle className="text-lg">Delete Project</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete <strong>{project.name}</strong>? This action
            cannot be undone. All associated tasks, phases, and budget data will be removed.
          </p>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setDeleteOpen(false)}
              disabled={deleteProject.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleteProject.isPending}
              onClick={() => deleteProject.mutate()}
            >
              {deleteProject.isPending ? (
                <>
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Deleting…
                </>
              ) : (
                "Delete Project"
              )}
            </Button>
          </div>
        </CardContent>
      </Modal>

      {/* ---- Phase modal (create / edit) ---- */}
      <Modal open={phaseModalOpen} onClose={() => !phaseSaving && closePhaseModal()}>
        <CardHeader>
          <CardTitle className="text-lg">
            {editingPhaseId ? "Edit Phase" : "New Phase"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field label="Name *">
            <Input
              value={phaseForm.name}
              onChange={(e) => setPhaseForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Phase name"
            />
          </Field>
          <Field label="Display Order">
            <Input
              type="number"
              min={0}
              step="1"
              value={phaseForm.displayOrder}
              onChange={(e) => setPhaseForm((f) => ({ ...f, displayOrder: e.target.value }))}
              placeholder="0"
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Start Date">
              <Input
                type="date"
                value={phaseForm.startDate}
                onChange={(e) => setPhaseForm((f) => ({ ...f, startDate: e.target.value }))}
              />
            </Field>
            <Field label="End Date">
              <Input
                type="date"
                value={phaseForm.endDate}
                onChange={(e) => setPhaseForm((f) => ({ ...f, endDate: e.target.value }))}
              />
            </Field>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={closePhaseModal} disabled={phaseSaving}>
              Cancel
            </Button>
            <Button
              disabled={!phaseForm.name.trim() || phaseSaving}
              onClick={handleSavePhase}
            >
              {phaseSaving && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
              {phaseSaving ? "Saving…" : phaseSaveLabel}
            </Button>
          </div>
        </CardContent>
      </Modal>

      {/* ---- Delete phase confirmation ---- */}
      <Modal open={Boolean(deletePhaseId)} onClose={() => !deletePhaseMut.isPending && setDeletePhaseId(null)}>
        <CardHeader>
          <CardTitle className="text-lg">Delete Phase</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete this phase and all its milestones? This action cannot be undone.
          </p>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setDeletePhaseId(null)}
              disabled={deletePhaseMut.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deletePhaseMut.isPending}
              onClick={() => deletePhaseId && deletePhaseMut.mutate(deletePhaseId)}
            >
              {deletePhaseMut.isPending ? (
                <>
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Deleting…
                </>
              ) : (
                "Delete"
              )}
            </Button>
          </div>
        </CardContent>
      </Modal>

      {/* ---- Milestone modal (create / edit) ---- */}
      <Modal open={milestoneModalOpen} onClose={() => !milestoneSaving && closeMilestoneModal()}>
        <CardHeader>
          <CardTitle className="text-lg">
            {editingMilestoneId ? "Edit Milestone" : "New Milestone"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field label="Name *">
            <Input
              value={milestoneForm.name}
              onChange={(e) => setMilestoneForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Milestone name"
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Target Date">
              <Input
                type="date"
                value={milestoneForm.targetDate}
                onChange={(e) => setMilestoneForm((f) => ({ ...f, targetDate: e.target.value }))}
              />
            </Field>
            {editingMilestoneId && (
              <Field label="Actual Date">
                <Input
                  type="date"
                  value={milestoneForm.actualDate}
                  onChange={(e) => setMilestoneForm((f) => ({ ...f, actualDate: e.target.value }))}
                />
              </Field>
            )}
          </div>
          <Field label="Status">
            <select
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={milestoneForm.status}
              onChange={(e) => setMilestoneForm((f) => ({ ...f, status: e.target.value }))}
            >
              {MILESTONE_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {titleCase(s)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Deliverables">
            <textarea
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              value={milestoneForm.deliverables}
              onChange={(e) => setMilestoneForm((f) => ({ ...f, deliverables: e.target.value }))}
              placeholder="Describe deliverables"
            />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={closeMilestoneModal} disabled={milestoneSaving}>
              Cancel
            </Button>
            <Button
              disabled={!milestoneForm.name.trim() || milestoneSaving}
              onClick={handleSaveMilestone}
            >
              {milestoneSaving && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
              {milestoneSaving ? "Saving…" : milestoneSaveLabel}
            </Button>
          </div>
        </CardContent>
      </Modal>

      {/* ---- Delete milestone confirmation ---- */}
      <Modal open={Boolean(deleteMilestoneId)} onClose={() => !deleteMilestoneMut.isPending && setDeleteMilestoneId(null)}>
        <CardHeader>
          <CardTitle className="text-lg">Delete Milestone</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete this milestone? This action cannot be undone.
          </p>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setDeleteMilestoneId(null)}
              disabled={deleteMilestoneMut.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleteMilestoneMut.isPending}
              onClick={() => deleteMilestoneId && deleteMilestoneMut.mutate(deleteMilestoneId)}
            >
              {deleteMilestoneMut.isPending ? (
                <>
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Deleting…
                </>
              ) : (
                "Delete"
              )}
            </Button>
          </div>
        </CardContent>
      </Modal>

      {/* ---- Upload document modal ---- */}
      <Modal
        open={documentModalOpen}
        onClose={() => {
          if (!createDocumentMut.isPending) {
            setDocumentModalOpen(false);
            setDocumentForm(EMPTY_DOCUMENT_FORM);
            setDocumentFile(null);
          }
        }}
      >
        <CardHeader>
          <CardTitle className="text-lg">Upload Document</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field label="File *">
            <Input
              type="file"
              onChange={(e) => setDocumentFile(e.target.files?.[0] ?? null)}
              className="cursor-pointer"
            />
            {documentFile ? (
              <p className="text-xs text-muted-foreground">Selected: {documentFile.name}</p>
            ) : null}
          </Field>
          <Field label="Display name">
            <Input
              value={documentForm.fileName}
              onChange={(e) => setDocumentForm((f) => ({ ...f, fileName: e.target.value }))}
              placeholder="Defaults to the file name"
            />
          </Field>
          <Field label="Folder path (optional)">
            <Input
              value={documentForm.folderPath}
              onChange={(e) => setDocumentForm((f) => ({ ...f, folderPath: e.target.value }))}
              placeholder="e.g. designs/structural (under this project in Drive)"
            />
          </Field>
          <p className="text-xs text-muted-foreground">
            Files upload to Google Drive under folder{" "}
            <span className="font-mono">ArqOps Files/projects/{id}/…</span>. Connect Google Drive in Settings → Profile
            first.
          </p>
          {createDocumentMut.isError && (
            <p className="text-sm text-destructive">
              {(createDocumentMut.error as Error)?.message ?? "Upload failed"}
            </p>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => {
                setDocumentModalOpen(false);
                setDocumentForm(EMPTY_DOCUMENT_FORM);
                setDocumentFile(null);
              }}
              disabled={createDocumentMut.isPending}
            >
              Cancel
            </Button>
            <Button disabled={!documentFile || createDocumentMut.isPending} onClick={() => createDocumentMut.mutate()}>
              {createDocumentMut.isPending ? (
                <>
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Uploading…
                </>
              ) : (
                "Upload"
              )}
            </Button>
          </div>
        </CardContent>
      </Modal>

      <Modal open={Boolean(deleteDocumentId)} onClose={() => !deleteDocumentMut.isPending && setDeleteDocumentId(null)}>
        <CardHeader>
          <CardTitle className="text-lg">Delete Document</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Remove this document record? This cannot be undone.
          </p>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setDeleteDocumentId(null)}
              disabled={deleteDocumentMut.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleteDocumentMut.isPending}
              onClick={() => deleteDocumentId && deleteDocumentMut.mutate(deleteDocumentId)}
            >
              {deleteDocumentMut.isPending ? (
                <>
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Deleting…
                </>
              ) : (
                "Delete"
              )}
            </Button>
          </div>
        </CardContent>
      </Modal>

      {/* ---- Team member modal ---- */}
      <Modal open={resourceModalOpen} onClose={() => !resourceSaving && closeResourceModal()}>
        <CardHeader>
          <CardTitle className="text-lg">
            {editingResourceId ? "Edit Team Member" : "Add Team Member"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field label="User ID *">
            <Input
              value={resourceForm.userId}
              onChange={(e) => setResourceForm((f) => ({ ...f, userId: e.target.value }))}
              placeholder="User UUID"
              disabled={Boolean(editingResourceId)}
              className={editingResourceId ? "opacity-80" : undefined}
            />
          </Field>
          <Field label="Role">
            <Input
              value={resourceForm.role}
              onChange={(e) => setResourceForm((f) => ({ ...f, role: e.target.value }))}
              placeholder="e.g. Architect, Engineer"
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Start Date">
              <Input
                type="date"
                value={resourceForm.startDate}
                onChange={(e) => setResourceForm((f) => ({ ...f, startDate: e.target.value }))}
              />
            </Field>
            <Field label="End Date">
              <Input
                type="date"
                value={resourceForm.endDate}
                onChange={(e) => setResourceForm((f) => ({ ...f, endDate: e.target.value }))}
              />
            </Field>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={closeResourceModal} disabled={resourceSaving}>
              Cancel
            </Button>
            <Button
              disabled={!resourceForm.userId.trim() || resourceSaving}
              onClick={handleSaveResource}
            >
              {resourceSaving && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
              {resourceSaving ? "Saving…" : resourceSaveLabel}
            </Button>
          </div>
        </CardContent>
      </Modal>

      <Modal open={Boolean(deleteResourceId)} onClose={() => !deleteResourceMut.isPending && setDeleteResourceId(null)}>
        <CardHeader>
          <CardTitle className="text-lg">Remove Team Member</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Remove this resource assignment from the project?
          </p>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setDeleteResourceId(null)}
              disabled={deleteResourceMut.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleteResourceMut.isPending}
              onClick={() => deleteResourceId && deleteResourceMut.mutate(deleteResourceId)}
            >
              {deleteResourceMut.isPending ? (
                <>
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Removing…
                </>
              ) : (
                "Remove"
              )}
            </Button>
          </div>
        </CardContent>
      </Modal>

      {/* ---- Budget line modal ---- */}
      <Modal open={budgetLineModalOpen} onClose={() => !budgetLineSaving && closeBudgetLineModal()}>
        <CardHeader>
          <CardTitle className="text-lg">
            {editingBudgetLineId ? "Edit Budget Line" : "Add Budget Line"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field label="Category *">
            <Input
              value={budgetLineForm.category}
              onChange={(e) => setBudgetLineForm((f) => ({ ...f, category: e.target.value }))}
              placeholder="e.g. Materials, Labor"
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Budgeted Amount *">
              <Input
                type="number"
                min={0}
                step="0.01"
                value={budgetLineForm.budgetedAmount}
                onChange={(e) => setBudgetLineForm((f) => ({ ...f, budgetedAmount: e.target.value }))}
                placeholder="0"
              />
            </Field>
            <Field label="Actual Amount *">
              <Input
                type="number"
                min={0}
                step="0.01"
                value={budgetLineForm.actualAmount}
                onChange={(e) => setBudgetLineForm((f) => ({ ...f, actualAmount: e.target.value }))}
                placeholder="0"
              />
            </Field>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={closeBudgetLineModal} disabled={budgetLineSaving}>
              Cancel
            </Button>
            <Button
              disabled={!budgetLineForm.category.trim() || budgetLineSaving}
              onClick={handleSaveBudgetLine}
            >
              {budgetLineSaving && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
              {budgetLineSaving ? "Saving…" : budgetLineSaveLabel}
            </Button>
          </div>
        </CardContent>
      </Modal>

      <Modal open={Boolean(deleteBudgetLineId)} onClose={() => !deleteBudgetLineMut.isPending && setDeleteBudgetLineId(null)}>
        <CardHeader>
          <CardTitle className="text-lg">Delete Budget Line</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Delete this budget line? Summary totals will update after refresh.
          </p>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setDeleteBudgetLineId(null)}
              disabled={deleteBudgetLineMut.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleteBudgetLineMut.isPending}
              onClick={() => deleteBudgetLineId && deleteBudgetLineMut.mutate(deleteBudgetLineId)}
            >
              {deleteBudgetLineMut.isPending ? (
                <>
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Deleting…
                </>
              ) : (
                "Delete"
              )}
            </Button>
          </div>
        </CardContent>
      </Modal>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Task comments (Tasks tab)
// ---------------------------------------------------------------------------

function TaskCommentsSection({ taskId, open }: Readonly<{ taskId: string; open: boolean }>) {
  const queryClient = useQueryClient();
  const [content, setContent] = useState("");

  const { data: comments, isLoading } = useQuery({
    queryKey: ["task-comments", taskId],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiResponse<TaskComment[]>>(
        `/api/v1/project/projects/tasks/${taskId}/comments`,
      );
      return data.data ?? [];
    },
    enabled: open,
  });

  const postComment = useMutation({
    mutationFn: async () => {
      const { data } = await apiClient.post<ApiResponse<TaskComment>>(
        `/api/v1/project/projects/tasks/${taskId}/comments`,
        { content: content.trim() },
      );
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task-comments", taskId] });
      setContent("");
    },
  });

  return (
    <div className="space-y-3">
      <p className="text-xs font-medium uppercase text-muted-foreground">Comments</p>
      {isLoading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      )}
      {!isLoading && (comments?.length ?? 0) === 0 && (
        <p className="text-sm text-muted-foreground">No comments yet.</p>
      )}
      {!isLoading && (comments?.length ?? 0) > 0 && (
        <ul className="space-y-2">
          {(comments ?? []).map((c) => (
            <li
              key={c.id}
              className="rounded-md border bg-background px-3 py-2 text-sm"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="text-xs text-muted-foreground">
                  {c.authorId ? (
                    <span className="font-mono">{c.authorId}</span>
                  ) : (
                    "Unknown author"
                  )}
                </span>
                <time className="text-xs text-muted-foreground tabular-nums">
                  {formatDate(c.createdAt)}
                </time>
              </div>
              <p className="mt-1 whitespace-pre-wrap">{c.content}</p>
            </li>
          ))}
        </ul>
      )}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1 space-y-2">
          <label className="text-xs font-medium text-muted-foreground" htmlFor={`comment-${taskId}`}>
            Add a comment
          </label>
          <textarea
            id={`comment-${taskId}`}
            className="flex min-h-[72px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Write a comment…"
          />
        </div>
        <Button
          type="button"
          size="sm"
          className="shrink-0"
          disabled={!content.trim() || postComment.isPending}
          onClick={() => postComment.mutate()}
        >
          {postComment.isPending ? (
            <>
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Posting…
            </>
          ) : (
            "Post"
          )}
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Small reusable bits
// ---------------------------------------------------------------------------

function OverviewItem({
  label,
  value,
  mono,
  children,
}: Readonly<{
  label: string;
  value?: string;
  mono?: boolean;
  children?: React.ReactNode;
}>) {
  return (
    <div>
      <p className="text-xs font-medium uppercase text-muted-foreground">{label}</p>
      {children ?? <p className={cn("mt-1", mono && "tabular-nums")}>{value}</p>}
    </div>
  );
}

function Field({ label, children }: Readonly<{ label: string; children: React.ReactNode }>) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>
      {children}
    </div>
  );
}
