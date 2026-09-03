import type { SupabaseClient } from "@supabase/supabase-js";

export interface ProjectSummary {
  id: string;
  name: string;
  category: string;
  target_label: string;
  status: string;
  actual_pct: number | null;
  plan_pct: number | null;
  team_id: string;
  team_name: string;
  last_log_period: string | null;
  last_log_at: string | null;
  closed_at: string | null;
}

/** Project list joined with team name and each project's most recent weekly log. */
export async function getProjectSummaries(
  supabase: SupabaseClient,
  opts: { teamId?: string } = {}
): Promise<ProjectSummary[]> {
  let query = supabase
    .from("projects")
    .select("id, name, category, target_label, status, actual_pct, plan_pct, closed_at, team_id, teams(name)")
    .order("name");
  if (opts.teamId) query = query.eq("team_id", opts.teamId);

  const { data: projects, error } = await query;
  if (error) throw error;
  if (!projects || projects.length === 0) return [];

  const projectIds = projects.map((p) => p.id);
  const { data: logs } = await supabase
    .from("weekly_logs")
    .select("project_id, period_label, submitted_at")
    .in("project_id", projectIds)
    .order("submitted_at", { ascending: false });

  const latestByProject = new Map<string, { period_label: string; submitted_at: string }>();
  for (const log of logs ?? []) {
    if (!latestByProject.has(log.project_id)) {
      latestByProject.set(log.project_id, { period_label: log.period_label, submitted_at: log.submitted_at });
    }
  }

  return projects.map((p) => {
    const last = latestByProject.get(p.id);
    return {
      id: p.id,
      name: p.name,
      category: p.category,
      target_label: p.target_label,
      status: p.status,
      actual_pct: p.actual_pct,
      plan_pct: p.plan_pct,
      team_id: p.team_id,
      team_name: (p.teams as unknown as { name: string } | null)?.name ?? "",
      last_log_period: last?.period_label ?? null,
      last_log_at: last?.submitted_at ?? null,
      closed_at: p.closed_at,
    };
  });
}
