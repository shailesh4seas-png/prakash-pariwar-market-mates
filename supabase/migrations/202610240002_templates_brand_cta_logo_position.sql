-- Forward-only. Requires 202610240001_templates_backend.sql.
-- Adds editor fields to templates. Already applied to the hosted project.
alter table public.templates
  add column if not exists brand text not null default '' check (length(brand) <= 200),
  add column if not exists cta text not null default 'Visit store today' check (length(cta) <= 100),
  add column if not exists logo_position text not null default 'top-left'
    check (logo_position in ('top-left', 'top-right', 'bottom-left', 'bottom-right'));
