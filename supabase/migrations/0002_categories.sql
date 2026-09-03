-- Project categories become admin-manageable instead of a hardcoded A/B/C/D
-- enum. `code` stays the short label shown in the chip (e.g. "A"), but the
-- meaning/color is data now, and the admin can add more via /admin/projects.

create table categories (
  code text primary key,
  label text not null,
  color text not null,   -- hex, used as the chip background
  sort_order int not null default 0
);

alter table categories enable row level security;
-- No policies: default-deny for anon/authenticated; service role bypasses RLS
-- (same pattern as every other table — see 0001_init.sql).

insert into categories (code, label, color, sort_order) values
  ('A', 'Pembangunan', '#4338CA', 0),
  ('B', 'Renovasi Besar', '#8B5CF6', 1),
  ('C', 'Renovasi', '#0EA5E9', 2),
  ('D', 'Pembelian Lahan', '#0D9488', 3);

alter table projects drop constraint projects_category_check;
alter table projects add constraint projects_category_fkey foreign key (category) references categories(code);
