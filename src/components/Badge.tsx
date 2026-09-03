import { STATUS_LABEL, type ProjectStatus } from "@/lib/types";

const CLASS: Record<ProjectStatus, string> = {
  ontrack: "b-green",
  behind: "b-red",
  alert: "b-amber",
  notstarted: "b-gray",
  done: "b-teal",
};

export function Badge({ status }: { status: string }) {
  const s = (status as ProjectStatus) in STATUS_LABEL ? (status as ProjectStatus) : "notstarted";
  return (
    <span className={`badge ${CLASS[s]}`}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: "currentColor" }} />
      {STATUS_LABEL[s]}
    </span>
  );
}

export function ChecklistStatusBadge({ done, status }: { done: boolean; status: string }) {
  if (done) return <span className="badge b-green">Selesai</span>;
  const map: Record<string, { label: string; cls: string }> = {
    ontrack: { label: "On Track", cls: "b-green" },
    behind: { label: "Behind", cls: "b-red" },
    notstarted: { label: "Belum Mulai", cls: "b-gray" },
    manual: { label: "Manual", cls: "b-gray" },
  };
  const m = map[status] ?? map.manual;
  return <span className={`badge ${m.cls}`}>{m.label}</span>;
}

/** `category` is the code (e.g. "A") with its data (label/color) looked up from useCategories(); pass undefined while categories are still loading. */
export function CatChip({ category, code }: { category?: { code: string; label: string; color: string } | null; code?: string }) {
  if (!category) {
    return (
      <div className="cat-chip" style={{ background: "var(--gray)" }}>
        {code ?? "?"}
      </div>
    );
  }
  return (
    <div className="cat-chip" style={{ background: category.color }} title={category.label}>
      {category.code}
    </div>
  );
}
