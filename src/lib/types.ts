export type ProjectStatus = "ontrack" | "behind" | "alert" | "notstarted" | "done";
export type ChecklistStatus = "ontrack" | "behind" | "notstarted" | "manual";

/** Categories are admin-managed data (see /api/categories), not a fixed enum — a project's `category` is just the code that references one. */
export interface CategoryDef {
  code: string;
  label: string;
  color: string;
  sort_order: number;
}

export interface Team {
  id: string;
  name: string;
}

export interface Project {
  id: string;
  team_id: string;
  category: string;
  name: string;
  target_label: string;
  status: ProjectStatus;
  plan_pct: number | null;
  actual_pct: number | null;
  closed_at: string | null;
}

export interface ChecklistItem {
  id: string;
  phase_id: string;
  sort_order: number;
  name: string;
  due_label: string;
  done: boolean;
  status: ChecklistStatus;
  doc_date: string | null;
  doc_number: string | null;
  vendor: string | null;
  contract_value: string | null;
  doc_link: string | null;
  notes: string | null;
  updated_at: string | null;
}

export interface ChecklistPhase {
  id: string;
  project_id: string;
  label: string;
  sort_order: number;
  items: ChecklistItem[];
}

export interface WeeklyLog {
  id: string;
  project_id: string;
  period_label: string;
  submitted_at: string;
  status: ProjectStatus;
  progres: string[];
  rencana: string[];
  link_url: string | null;
  edited_at: string | null;
}

export interface ProjectDetail extends Project {
  team_name: string;
  checklist: ChecklistPhase[];
  logs: WeeklyLog[];
}

export const STATUS_LABEL: Record<ProjectStatus, string> = {
  ontrack: "On Track",
  behind: "Behind",
  alert: "Alert",
  notstarted: "Belum Mulai",
  done: "Selesai",
};
