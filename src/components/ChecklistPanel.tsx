import type { ChecklistItem, ChecklistPhase } from "@/lib/types";
import { ChecklistStatusBadge } from "./Badge";

export function ChecklistPanel({
  phases,
  readOnly,
  onItemClick,
}: {
  phases: ChecklistPhase[];
  readOnly: boolean;
  onItemClick?: (item: ChecklistItem) => void;
}) {
  return (
    <>
      {phases.map((phase) => (
        <div className="phase-block" key={phase.id}>
          <div className="phase-title">{phase.label}</div>
          {phase.items.map((item) => (
            <ChecklistRow key={item.id} item={item} onClick={readOnly ? undefined : () => onItemClick?.(item)} />
          ))}
        </div>
      ))}
    </>
  );
}

function ChecklistRow({ item, onClick }: { item: ChecklistItem; onClick?: () => void }) {
  const detailBits: string[] = [];
  if (item.doc_number) detailBits.push(`No. ${item.doc_number}`);
  if (item.vendor) detailBits.push(item.vendor);
  if (item.contract_value) detailBits.push(item.contract_value);

  return (
    <button className="deliv-row" onClick={onClick} disabled={!onClick} type="button">
      <div className={`deliv-check ${item.done ? "done" : ""}`}>{item.done ? "✓" : ""}</div>
      <div className="deliv-main">
        <div className="deliv-name">{item.name}</div>
        <div className="deliv-date">{item.due_label}</div>
        {item.done && detailBits.length > 0 && (
          <div className="deliv-detail">
            <span className="dic">📄</span>
            {detailBits.join(" · ")}
            {item.doc_link && (
              <>
                <span className="sep">·</span>
                <a
                  href={item.doc_link}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  style={{ color: "var(--blue)", fontWeight: 600 }}
                >
                  Lihat dokumen ↗
                </a>
              </>
            )}
          </div>
        )}
      </div>
      <div className="deliv-status">
        <ChecklistStatusBadge done={item.done} status={item.status} />
      </div>
    </button>
  );
}
