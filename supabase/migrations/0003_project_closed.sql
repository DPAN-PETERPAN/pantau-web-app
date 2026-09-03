-- Explicit, reversible "close project" action — replaces the earlier
-- automatic actual_pct>=100 hiding on /update. A project can be 100% on its
-- checklist and still need weekly narrative updates (e.g. operational notes,
-- follow-ups), so completion is a deliberate team/admin action, not inferred.

alter table projects add column closed_at timestamptz null;
