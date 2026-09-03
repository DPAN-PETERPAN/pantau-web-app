// Seeds Supabase with teams/projects/checklist data parsed from sample_data.xlsx
// (the CHECKLIST sheet). Run once after applying supabase/migrations/0001_init.sql:
//
//   npm run seed
//
// Re-running this DELETES all existing projects/checklist/weekly_logs and
// reseeds from the spreadsheet — do not run it again after teams have started
// filing real weekly updates. Team access tokens (access_tokens) are left
// untouched as long as their team still exists.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import xlsx from "xlsx";
import { createClient } from "@supabase/supabase-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

// Minimal .env.local loader (avoids adding a dotenv dependency).
function loadEnvLocal() {
  const envPath = path.join(root, ".env.local");
  try {
    const content = readFileSync(envPath, "utf8");
    for (const line of content.split("\n")) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
    }
  } catch {
    // no .env.local — assume vars are already in the environment
  }
}
loadEnvLocal();

const RAW_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!RAW_SUPABASE_URL || !SERVICE_KEY) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local before seeding.");
  process.exit(1);
}
// Strip a trailing slash and/or a copy-pasted "/rest/v1" suffix — otherwise
// supabase-js builds a doubled path and every query fails with PGRST125
// "Invalid path specified in request URL".
const SUPABASE_URL = RAW_SUPABASE_URL.trim().replace(/\/rest\/v1\/?$/, "").replace(/\/+$/, "");
const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

const BULAN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
function excelDateToISO(serial) {
  if (!serial || typeof serial !== "number") return null;
  const d = new Date(Math.round((serial - 25569) * 86400 * 1000));
  return d.toISOString().slice(0, 10);
}
function formatID(iso) {
  if (!iso) return null;
  const d = new Date(iso + "T00:00:00Z");
  return `${d.getUTCDate()} ${BULAN[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

// namaProyek keyword -> category (A Pembangunan | B Renovasi Besar | C Renovasi | D Pembelian Lahan)
function categoryFor(namaProyek) {
  const n = namaProyek.toLowerCase();
  if (n.includes("renov besar")) return "B";
  if (n.includes("pembelian lahan")) return "D";
  if (n.includes("renovasi") || n.includes("perkuatan struktur") || n.includes("interior") || n.includes("optimalisasi") || n.includes("ruang rapat") || n.includes("cafetaria")) return "C";
  return "A";
}

function trackerToItemStatus(tracker) {
  if (tracker === "BEHIND") return "behind";
  if (tracker === "ON TRACK" || tracker === "AHEAD") return "ontrack";
  return "notstarted";
}

function dueLabel(row) {
  if (row.checklist) return row.realisasi ? formatID(row.realisasi) : "Sudah selesai";
  if (row.end) return `Target ${formatID(row.end)}`;
  if (row.quarter) return `Target ${row.quarter}`;
  return "Belum dijadwalkan";
}

function readChecklistRows() {
  const wb = xlsx.readFile(path.join(root, "sample_data.xlsx"));
  const ws = wb.Sheets["CHECKLIST"];
  const json = xlsx.utils.sheet_to_json(ws, { header: 1, defval: "" });
  return json
    .slice(3)
    .filter((r) => r[1] && r[3] !== "TESTER") // skip blank rows + the dummy test project
    .map((r) => ({
      namaProyek: String(r[1]).trim(),
      tahap: String(r[2]).trim(),
      uker: String(r[3]).trim(),
      tahapan: String(r[4]).trim(),
      deliverable: String(r[5]).trim(),
      checklist: Boolean(r[20]),
      end: excelDateToISO(r[22]),
      quarter: r[23] || "",
      realisasi: excelDateToISO(r[24]),
      tracker: String(r[25] || "").trim(),
      nomorKontrak: String(r[26] || "").trim() || null,
      nomor: String(r[27] || "").trim() || null,
      note: String(r[28] || "").trim() || null,
    }));
}

function groupProjects(rows) {
  const map = new Map();
  for (const row of rows) {
    const key = `${row.namaProyek}|||${row.tahap}|||${row.uker}`;
    if (!map.has(key)) map.set(key, { namaProyek: row.namaProyek, tahap: row.tahap, uker: row.uker, rows: [] });
    map.get(key).rows.push(row);
  }
  return [...map.values()];
}

function groupPhases(rows) {
  const map = new Map();
  for (const row of rows) {
    if (!map.has(row.tahapan)) map.set(row.tahapan, []);
    map.get(row.tahapan).push(row);
  }
  return [...map.entries()].map(([label, items], idx) => ({ label, sort_order: idx, items }));
}

async function main() {
  const rows = readChecklistRows();
  const projectGroups = groupProjects(rows);
  const teamNames = [...new Set(projectGroups.map((p) => p.uker))];

  console.log(`Parsed ${rows.length} checklist rows -> ${projectGroups.length} projects across ${teamNames.length} teams.`);

  const { count: existingCount } = await supabase.from("projects").select("id", { count: "exact", head: true });
  if (existingCount && existingCount > 0 && process.env.SEED_CONFIRM !== "yes") {
    console.error(
      `${existingCount} project(s) already exist. This script deletes all projects/checklist/weekly_logs and reseeds.\n` +
        `Re-run with SEED_CONFIRM=yes if you really want to do this.`
    );
    process.exit(1);
  }
  if (existingCount && existingCount > 0) {
    console.log("Deleting existing projects (cascades to checklist_phases, checklist_items, weekly_logs)...");
    await supabase.from("projects").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  }

  const teamIdByName = new Map();
  for (const name of teamNames) {
    const { data: existing } = await supabase.from("teams").select("id").eq("name", name).maybeSingle();
    if (existing) {
      teamIdByName.set(name, existing.id);
      continue;
    }
    const { data: created, error } = await supabase.from("teams").insert({ name }).select("id").single();
    if (error) throw error;
    teamIdByName.set(name, created.id);
  }
  console.log(`Teams ready: ${[...teamIdByName.keys()].join(", ")}`);

  let created = 0;
  for (const group of projectGroups) {
    const total = group.rows.length;
    const doneCount = group.rows.filter((r) => r.checklist).length;
    const anyBehind = group.rows.some((r) => r.tracker === "BEHIND");
    const anyOnTrack = group.rows.some((r) => r.tracker === "ON TRACK" || r.tracker === "AHEAD");
    const status = anyBehind ? "behind" : doneCount === total ? "done" : anyOnTrack ? "ontrack" : "notstarted";
    const actualPct = total > 0 ? Math.round((doneCount / total) * 100) : 0;
    const targetLabel = group.rows[group.rows.length - 1].deliverable;
    const name = group.tahap && group.tahap !== "1" ? `${group.namaProyek} — Tahap ${group.tahap}` : group.namaProyek;

    const { data: project, error: projectError } = await supabase
      .from("projects")
      .insert({
        team_id: teamIdByName.get(group.uker),
        category: categoryFor(group.namaProyek),
        name,
        target_label: targetLabel,
        status,
        actual_pct: actualPct,
        plan_pct: null,
      })
      .select("id")
      .single();
    if (projectError) throw projectError;

    for (const phase of groupPhases(group.rows)) {
      const { data: phaseRow, error: phaseError } = await supabase
        .from("checklist_phases")
        .insert({ project_id: project.id, label: phase.label, sort_order: phase.sort_order })
        .select("id")
        .single();
      if (phaseError) throw phaseError;

      const items = phase.items.map((row, idx) => ({
        phase_id: phaseRow.id,
        sort_order: idx,
        name: row.deliverable,
        due_label: dueLabel(row),
        done: row.checklist,
        status: row.checklist ? "ontrack" : trackerToItemStatus(row.tracker),
        doc_date: row.checklist ? row.realisasi : null,
        doc_number: row.checklist ? row.nomor : null,
        vendor: null,
        contract_value: row.checklist ? row.nomorKontrak : null,
        doc_link: null,
        notes: row.note,
      }));
      const { error: itemsError } = await supabase.from("checklist_items").insert(items);
      if (itemsError) throw itemsError;
    }

    created++;
  }

  console.log(`Seed complete: ${created} projects created.`);
  console.log("Next step: log in as admin (ADMIN_CODE) at /admin/tokens and generate a login code for each team.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
